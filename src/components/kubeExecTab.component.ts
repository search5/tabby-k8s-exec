import { Component, Injector } from '@angular/core'
import { GetRecoveryTokenOptions, RecoveryToken } from 'tabby-core'
import { BaseTerminalTabComponent, ConnectableTerminalTabComponent } from 'tabby-terminal'
import { KubeExecProfile } from '../api'
import { KubeExecSession } from '../kubeExec.session'

@Component({
    selector: 'kube-exec-tab',
    template: BaseTerminalTabComponent.template,
    styles: BaseTerminalTabComponent.styles,
    animations: BaseTerminalTabComponent.animations,
})
export class KubeExecTabComponent extends ConnectableTerminalTabComponent<KubeExecProfile> {
    session: KubeExecSession | null = null

    constructor (injector: Injector) {
        super(injector)
    }

    ngOnInit (): void {
        this.logger = this.log.create('k8s-exec-tab')
        super.ngOnInit()
    }

    // saveTabs() JSON.stringifies every open tab's token in one batch with no per-tab try/catch,
    // so one bad token (circular ref, non-serializable value) would silently kill recovery for
    // every other open tab too. Isolate that failure to just this tab instead.
    async getRecoveryToken (options?: GetRecoveryTokenOptions): Promise<RecoveryToken | null> {
        try {
            const token = await super.getRecoveryToken(options)
            JSON.stringify(token)
            return token
        } catch (e) {
            this.logger.error('getRecoveryToken() failed:', e)
            return null
        }
    }

    async initializeSession (): Promise<void> {
        await super.initializeSession()
        const session = new KubeExecSession(this.injector, this.profile)
        if (this.size) {
            // Must happen before start() — see setInitialSize()'s comment for why.
            session.setInitialSize(this.size.columns, this.size.rows)
        }
        this.setSession(session)
        try {
            await session.start()
        } catch (e) {
            this.write('\r\n\x1b[31m' + e.message + '\x1b[0m\r\n')
        }
    }
}
