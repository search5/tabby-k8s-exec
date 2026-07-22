import { Injector } from '@angular/core'
import { EventEmitter } from 'events'
import { PassThrough } from 'stream'
import { LogService } from 'tabby-core'
import { BaseSession } from 'tabby-terminal'
import type { V1Status } from '@kubernetes/client-node'
import { KubeExecProfile } from './api'
import { createKubeConfig, getPodPhase } from './kubeConfigLoader'

async function loadClientNode () {
    return import('@kubernetes/client-node')
}

/**
 * A minimal stdout-like sink satisfying @kubernetes/client-node's duck-typed
 * `isResizable()` check (`'rows' in x && 'columns' in x && typeof x.on === 'function'`).
 * client-node writes pod output bytes into this via `.write()`, and listens for
 * a `'resize'` event to know when to push a resize frame down the exec resize channel.
 * There is no other public API to trigger a resize.
 */
class KubeExecOutputSink extends EventEmitter {
    constructor (public rows: number, public columns: number) {
        super()
    }

    write (chunk: Buffer | string): boolean {
        this.emit('_data', Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        return true
    }

    // client-node calls stdout.end() itself when the exec session's status stream
    // arrives (see WebSocketHandler.handleStandardStreams/closeStream) — a no-op is
    // enough here since real teardown is driven by this session's own 'close' handler.
    end (): void { /* no-op */ }

    setSize (rows: number, columns: number): void {
        this.rows = rows
        this.columns = columns
        this.emit('resize')
    }
}

export class KubeExecSession extends BaseSession {
    private exec: any = null
    private ws: any = null
    private stdoutSink: KubeExecOutputSink | null = null
    private stdin: PassThrough | null = null
    private cols = 80
    private rows = 24
    private exitStatusReceived = false
    private wsClosed = false
    private stdinBytesWritten = 0
    private hasRetriedShellFallback = false

    constructor (injector: Injector, public profile: KubeExecProfile) {
        super(injector.get(LogService).create('k8s-exec-session'))
    }

    // Must be called before start(), if the real terminal size is already known, so the
    // very first resize frame client-node sends on connect (it always sends one, using
    // whatever rows/columns the stdout sink has at that moment) already carries the real
    // size. Calling session.resize() again immediately after connecting — mirroring the
    // SSH-based sibling plugins — sends a second, redundant resize frame right at startup;
    // some shells redraw/reprint their prompt on every SIGWINCH, which made connecting look
    // like Enter had been pressed an extra couple of times.
    setInitialSize (columns: number, rows: number): void {
        this.cols = columns
        this.rows = rows
    }

    private status (message: string): void {
        this.emitOutput(Buffer.from(`\x1b[90m[K8s Exec] ${message}\x1b[0m\r\n`))
    }

    private errorLine (message: string): void {
        this.emitOutput(Buffer.from(`\x1b[31m[K8s Exec] ${message}\x1b[0m\r\n`))
    }

    async start (_options?: unknown): Promise<void> {
        this.releaseInitialDataBuffer()

        const options = this.profile.options
        const target = `${options.namespace}/${options.podName}${options.containerName ? ':' + options.containerName : ''}`
        const contextPart = options.context ? ` (context: ${options.context})` : ''
        this.status(`Connecting to ${target}${contextPart}...`)

        const k8s = await loadClientNode()
        const kc = await createKubeConfig(options.kubeconfigPath, options.context)

        await this.assertPodIsRunning(kc.makeApiClient(k8s.CoreV1Api), options.namespace, options.podName)

        this.exec = new k8s.Exec(kc)

        await this.runExec(this.tokenize(options.command))
    }

    // The exec WebSocket upgrade fails with an opaque "Unexpected server response: 500" when
    // the pod/container isn't actually running (already exited, crash-looping, not yet
    // scheduled, ...). Checking the phase first lets this surface a message that actually
    // explains why, instead of that raw transport error. Best-effort only — if the check
    // itself fails (permissions, transient API hiccup), let the real exec attempt proceed and
    // surface its own error rather than blocking the connection on this.
    private async assertPodIsRunning (api: any, namespace: string, podName: string): Promise<void> {
        let phase: string | null
        try {
            phase = await getPodPhase(api, namespace, podName)
        } catch {
            return
        }
        if (phase && phase !== 'Running') {
            throw new Error(`Pod "${podName}" is not running (phase: ${phase}) — it may have already exited or failed. Check with "kubectl get pod".`)
        }
    }

    private tokenize (command: string): string[] {
        return command.trim().split(/\s+/).filter(Boolean)
    }

    private isBashCommand (argv: string[]): boolean {
        return argv[0] === '/bin/bash' || argv[0] === 'bash'
    }

    private canFallbackToSh (argv: string[]): boolean {
        return this.profile.options.shellFallback && this.isBashCommand(argv) && !this.hasRetriedShellFallback
    }

    private async runExec (argv: string[]): Promise<void> {
        const options = this.profile.options

        this.stdoutSink = new KubeExecOutputSink(this.rows, this.cols)
        this.stdoutSink.on('_data', (chunk: Buffer) => this.emitOutput(chunk))
        this.stdin = new PassThrough()
        this.exitStatusReceived = false
        this.stdinBytesWritten = 0

        let ws: any
        try {
            ws = await this.exec.exec(
                options.namespace,
                options.podName,
                options.containerName ?? '',
                argv,
                this.stdoutSink as any,
                null,
                this.stdin,
                true,
                (status: V1Status) => this.handleExecStatus(status, argv),
            )
        } catch (e) {
            if (this.canFallbackToSh(argv)) {
                this.hasRetriedShellFallback = true
                this.status('/bin/bash not available, falling back to /bin/sh...')
                return this.runExec(['/bin/sh'])
            }
            throw e
        }

        this.ws = ws
        this.open = true
        this.status('Connection established.')
        this.ws.on('close', () => this.handleClose())
        this.ws.on('error', (err: Error) => this.handleError(err))
    }

    private handleExecStatus (status: V1Status, argv: string[]): void {
        this.exitStatusReceived = true
        if (status.status !== 'Failure') {
            return
        }
        // A bash session that fails before the user ever typed anything is a strong signal
        // that the shell itself couldn't start (missing binary, etc.) rather than a command
        // the user ran failing — worth one silent retry with /bin/sh rather than surfacing
        // a dead terminal. Exact upstream error text varies by container runtime, so this is
        // a deliberately loose heuristic rather than a precise error-code match.
        if (this.stdinBytesWritten === 0 && this.canFallbackToSh(argv)) {
            this.hasRetriedShellFallback = true
            this.status('/bin/bash session ended immediately, falling back to /bin/sh...')
            void this.runExec(['/bin/sh'])
            return
        }
        const causes = status.details?.causes?.map(c => c.message).filter(Boolean).join('; ')
        this.status(`Session ended: ${status.reason ?? 'Unknown'}${causes ? ' — ' + causes : ''}`)
    }

    private handleClose (): void {
        if (this.wsClosed) {
            return
        }
        this.wsClosed = true
        if (!this.exitStatusReceived) {
            // Known upstream unreliability: the status callback does not always fire.
            // Treat an abrupt close with no prior status as "ended, unknown exit" rather
            // than leaving the tab looking connected forever.
            this.status('Connection closed (exit status unknown).')
        }
        void this.destroy()
    }

    private handleError (err: Error): void {
        this.errorLine(`Error: ${err.message}`)
        void this.destroy()
    }

    write (data: Buffer): void {
        this.stdinBytesWritten += data.length
        this.stdin?.write(data)
    }

    resize (columns: number, rows: number): void {
        this.cols = columns
        this.rows = rows
        this.stdoutSink?.setSize(rows, columns)
    }

    kill (_signal?: string): void {
        // Known upstream issue: ws.close() alone does not terminate the remote process,
        // only the socket — terminate() is required for a hard stop.
        try {
            this.ws?.terminate()
        } catch {
            // ignore — best-effort teardown
        }
    }

    async gracefullyKillProcess (): Promise<void> {
        // No signal-over-exec channel exists in this transport (unlike SSH). Best effort:
        // send Ctrl-C to give an interactive shell a chance to exit its foreground command.
        try {
            this.stdin?.write(Buffer.from([0x03]))
        } catch {
            // ignore
        }
        await new Promise(resolve => setTimeout(resolve, 300))
        this.kill()
    }

    supportsWorkingDirectory (): boolean {
        return false
    }

    async getWorkingDirectory (): Promise<string | null> {
        return null
    }

    async destroy (): Promise<void> {
        this.wsClosed = true
        try {
            this.ws?.terminate()
        } catch {
            // ignore
        }
        try {
            this.stdin?.end()
        } catch {
            // ignore
        }
        this.ws = null
        this.stdoutSink = null
        this.stdin = null
        await super.destroy()
    }
}
