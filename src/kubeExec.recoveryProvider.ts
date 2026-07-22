import { Injectable } from '@angular/core'
import { NewTabParameters, RecoveryToken, TabRecoveryProvider } from 'tabby-core'
import { KubeExecTabComponent } from './components/kubeExecTab.component'

@Injectable()
export class KubeExecRecoveryProvider extends TabRecoveryProvider<KubeExecTabComponent> {
    async applicableTo (recoveryToken: RecoveryToken): Promise<boolean> {
        return recoveryToken.type === 'app:k8s-exec-tab'
    }

    async recover (recoveryToken: RecoveryToken): Promise<NewTabParameters<KubeExecTabComponent>> {
        return {
            type: KubeExecTabComponent,
            inputs: {
                profile: recoveryToken.profile,
                savedState: recoveryToken.savedState,
            },
        }
    }
}
