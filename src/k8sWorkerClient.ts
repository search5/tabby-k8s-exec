import { ChildProcess, fork } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { createCoreV1Api, listContexts, listNamespaces, listPods, PodSummary } from './kubeConfigLoader'

// child_process.fork() defaults to re-executing process.execPath — inside Electron, that's
// the Electron binary itself, not a plain Node runtime. Setting ELECTRON_RUN_AS_NODE is the
// documented way to make Electron's binary behave as Node instead, but on this Tabby build it
// still tries to initialize Chromium's sandbox and aborts (FATAL: SUID sandbox helper ...).
// The reliable fix is to fork using a genuine system Node.js binary via fork()'s `execPath`
// option, sidestepping Electron entirely. If no system Node can be found, list operations
// fall back to running in-process (see callWorker()) rather than failing outright.
function findSystemNode (): string | null {
    const nodeNames = process.platform === 'win32' ? ['node.exe'] : ['node']

    const pathDirs = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean)
    for (const dir of pathDirs) {
        for (const name of nodeNames) {
            const candidate = path.join(dir, name)
            if (fs.existsSync(candidate)) {
                return candidate
            }
        }
    }

    try {
        const nvmDir = path.join(os.homedir(), '.nvm', 'versions', 'node')
        if (fs.existsSync(nvmDir)) {
            const versions = fs.readdirSync(nvmDir).sort()
            for (let i = versions.length - 1; i >= 0; i--) {
                const candidate = path.join(nvmDir, versions[i], 'bin', 'node')
                if (fs.existsSync(candidate)) {
                    return candidate
                }
            }
        }
    } catch {
        // ignore — fall through to fixed candidates
    }

    const fixedCandidates = process.platform === 'win32'
        ? ['C:\\Program Files\\nodejs\\node.exe']
        : ['/usr/local/bin/node', '/usr/bin/node', '/opt/homebrew/bin/node']
    for (const candidate of fixedCandidates) {
        if (fs.existsSync(candidate)) {
            return candidate
        }
    }

    return null
}

let worker: ChildProcess | null = null
let nodePathCache: string | null | undefined
let nextId = 1
const pending = new Map<number, { resolve: (value: any) => void, reject: (error: any) => void }>()

function getNodePath (): string | null {
    if (nodePathCache === undefined) {
        nodePathCache = findSystemNode()
    }
    return nodePathCache
}

function ensureWorker (): ChildProcess | null {
    if (worker && !worker.killed) {
        return worker
    }
    const nodePath = getNodePath()
    if (!nodePath) {
        return null
    }
    // dist/k8sWorker.js is built as a sibling of dist/index.js by a second webpack entry —
    // see webpack.config.js.
    worker = fork(path.join(__dirname, 'k8sWorker.js'), [], {
        execPath: nodePath,
        stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    })
    const currentWorker = worker
    currentWorker.on('message', (msg: any) => {
        if (msg?.ready) {
            return
        }
        const entry = pending.get(msg.id)
        if (!entry) {
            return
        }
        pending.delete(msg.id)
        if (msg.error) {
            entry.reject(new Error(msg.error))
        } else {
            entry.resolve(msg.result)
        }
    })
    currentWorker.on('exit', () => {
        for (const [id, entry] of pending) {
            entry.reject(new Error('k8s-exec worker process exited unexpectedly'))
            pending.delete(id)
        }
        if (worker === currentWorker) {
            worker = null
        }
    })
    currentWorker.on('error', (err) => {
        for (const [id, entry] of pending) {
            entry.reject(err)
            pending.delete(id)
        }
    })
    return currentWorker
}

function callWorker<T> (action: string, params: any, fallback: () => Promise<T>): Promise<T> {
    const w = ensureWorker()
    if (!w) {
        return fallback()
    }
    return new Promise((resolve, reject) => {
        const id = nextId++
        pending.set(id, { resolve, reject })
        w.send({ id, action, params })
    })
}

export function listContextsViaWorker (kubeconfigPath: string): Promise<string[]> {
    return callWorker('listContexts', { kubeconfigPath }, async () => {
        const contexts = await listContexts(kubeconfigPath)
        return contexts.map(c => c.name)
    })
}

export function listNamespacesViaWorker (kubeconfigPath: string, context?: string, forceFresh = false): Promise<string[]> {
    return callWorker('listNamespaces', { kubeconfigPath, context, forceFresh }, async () => {
        const api = await createCoreV1Api(kubeconfigPath, context, forceFresh)
        return listNamespaces(api)
    })
}

export function listPodsViaWorker (kubeconfigPath: string, context: string | undefined, namespace: string, forceFresh = false): Promise<PodSummary[]> {
    return callWorker('listPods', { kubeconfigPath, context, namespace, forceFresh }, async () => {
        const api = await createCoreV1Api(kubeconfigPath, context, forceFresh)
        return listPods(api, namespace)
    })
}
