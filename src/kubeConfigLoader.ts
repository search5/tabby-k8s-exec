import * as os from 'os'
import * as path from 'path'
import type { Context, KubeConfig } from '@kubernetes/client-node'

/**
 * `@kubernetes/client-node` ships as an ESM-only package. It must always be
 * loaded via a dynamic `import()` from this CommonJS-targeted plugin bundle —
 * a static top-level `import`/`require` triggers ERR_REQUIRE_ESM at runtime.
 */
async function loadClientNode () {
    return import('@kubernetes/client-node')
}

export function expandTilde (inputPath: string): string {
    if (!inputPath) {
        return inputPath
    }
    if (inputPath === '~') {
        return os.homedir()
    }
    if (inputPath.startsWith('~/') || inputPath.startsWith('~\\')) {
        return path.join(os.homedir(), inputPath.slice(2))
    }
    return inputPath
}

export async function createKubeConfig (kubeconfigPath: string, context?: string): Promise<KubeConfig> {
    const k8s = await loadClientNode()
    const kc = new k8s.KubeConfig()
    kc.loadFromFile(expandTilde(kubeconfigPath))
    if (context) {
        if (!kc.getContextObject(context)) {
            throw new Error(`Context "${context}" was not found in ${kubeconfigPath}`)
        }
        kc.setCurrentContext(context)
    }
    return kc
}

export async function listContexts (kubeconfigPath: string): Promise<Context[]> {
    const kc = await createKubeConfig(kubeconfigPath)
    return kc.getContexts()
}

// A CoreV1Api client wraps a single KubeConfig instance. For kubeconfigs using an
// exec-based auth plugin (EKS, GKE, oidc-login, ...), credential resolution spawns an
// external process, and even for static-auth kubeconfigs a fresh KubeConfig means a fresh
// HTTPS agent/TLS handshake — building one per API call (as createKubeConfig() does on its
// own) pays that cost again on every single call. Clients are cached here at module scope,
// keyed by kubeconfig path + context, so switching back to a context already used in this
// Tabby session — even from a re-opened settings dialog on a different profile — reuses the
// existing client instead of reconnecting from scratch. Pass forceFresh when the user
// explicitly asked to refresh, so stale/broken connections don't get stuck being reused.
const apiClientCache = new Map<string, any>()

export async function createCoreV1Api (kubeconfigPath: string, context?: string, forceFresh = false): Promise<any> {
    const key = `${kubeconfigPath}::${context ?? ''}`
    if (!forceFresh && apiClientCache.has(key)) {
        return apiClientCache.get(key)
    }
    const k8s = await loadClientNode()
    const kc = await createKubeConfig(kubeconfigPath, context)
    const client = kc.makeApiClient(k8s.CoreV1Api)
    apiClientCache.set(key, client)
    return client
}

// Belt-and-suspenders: even with keep-alive disabled, a genuinely unreachable cluster or a
// network partition could still leave a request pending indefinitely. Nothing calling into
// these functions should ever hang forever waiting on a K8s API response.
function withTimeout<T> (promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), timeoutMs)),
    ])
}

const API_TIMEOUT_MS = 8000

export async function listNamespaces (api: any): Promise<string[]> {
    const result: any = await withTimeout<any>(api.listNamespace(), API_TIMEOUT_MS, 'Timed out listing namespaces.')
    return result.items.map((ns: any) => ns.metadata?.name).filter((name: any): name is string => !!name)
}

export interface PodSummary {
    name: string
    phase: string
    containerNames: string[]
}

export async function listPods (api: any, namespace: string): Promise<PodSummary[]> {
    const result: any = await withTimeout<any>(api.listNamespacedPod({ namespace }), API_TIMEOUT_MS, 'Timed out listing pods.')
    return result.items.map((pod: any) => ({
        name: pod.metadata?.name ?? '',
        phase: pod.status?.phase ?? 'Unknown',
        containerNames: [
            ...(pod.spec?.initContainers ?? []),
            ...(pod.spec?.containers ?? []),
        ].map((c: any) => c.name),
    })).filter((pod: PodSummary) => !!pod.name)
}
