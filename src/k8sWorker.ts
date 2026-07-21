// Standalone worker process (forked via child_process.fork()) that runs all K8s list
// API calls completely outside the Electron renderer/Angular zone.js — no zone.js patching,
// and its own separate libuv threadpool with no contention from renderer-side rendering,
// terminal I/O, or other plugins. This is what actually makes latency deterministic; running
// the same calls in-process, even wrapped in NgZone.runOutsideAngular(), still occasionally
// saw multi-hundred-millisecond jitter that a plain `curl` against the same API server never
// showed, pointing at renderer-process-level contention rather than the cluster or network.
import * as http from 'http'
import * as https from 'https'
import { createCoreV1Api, listContexts, listNamespaces, listPods } from './kubeConfigLoader'

// @kubernetes/client-node's requests fall back to Node's global http/https agent when no
// explicit agent is configured, which pools and reuses keep-alive sockets across calls even
// when a "fresh" client/KubeConfig object is built each time. If the k3s/API server ever
// closes an idle pooled socket server-side (or a network blip half-closes one), a later
// request reusing that socket can sit waiting for a very long time before the OS finally
// surfaces the failure — this is what caused the occasional 10+ second stalls even with the
// worker process fix in place. Disabling keep-alive here forces every request in this
// dedicated, low-traffic worker to open a fresh connection, trading a few extra ms of TCP/TLS
// handshake for full immunity to stale-socket reuse.
// The Agent instance does have a mutable `keepAlive` property at runtime (set from
// constructor options), it's just not part of @types/node's public Agent type declaration.
;(http.globalAgent as any).keepAlive = false
;(https.globalAgent as any).keepAlive = false

process.on('uncaughtException', (err) => {
    console.error('[k8s-exec worker] uncaughtException:', err)
})
process.on('unhandledRejection', (err) => {
    console.error('[k8s-exec worker] unhandledRejection:', err)
})

interface WorkerRequest {
    id: number
    action: 'listContexts' | 'listNamespaces' | 'listPods'
    params: any
}

async function handle (req: WorkerRequest): Promise<any> {
    const t0 = Date.now()
    const mark = (label: string) => console.log(`[k8s-exec worker][timing] req#${req.id} ${label}: +${Date.now() - t0}ms`)
    switch (req.action) {
        case 'listContexts': {
            const contexts = await listContexts(req.params.kubeconfigPath)
            mark('listContexts done')
            return contexts.map(c => c.name)
        }
        case 'listNamespaces': {
            const api = await createCoreV1Api(req.params.kubeconfigPath, req.params.context, req.params.forceFresh)
            mark('createCoreV1Api done')
            const result = await listNamespaces(api)
            mark('listNamespaces done')
            return result
        }
        case 'listPods': {
            const api = await createCoreV1Api(req.params.kubeconfigPath, req.params.context, req.params.forceFresh)
            mark('createCoreV1Api done')
            const result = await listPods(api, req.params.namespace)
            mark('listPods done')
            return result
        }
        default:
            throw new Error(`Unknown worker action: ${(req as any).action}`)
    }
}

process.on('message', (req: WorkerRequest) => {
    handle(req)
        .then(result => process.send?.({ id: req.id, result }))
        .catch((e: any) => process.send?.({ id: req.id, error: e?.message ?? String(e) }))
})

process.send?.({ ready: true })
