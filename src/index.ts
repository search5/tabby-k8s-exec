import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ProfileProvider, TabRecoveryProvider } from 'tabby-core'
import { KubeExecProfileProvider } from './api'
import { KubeExecRecoveryProvider } from './kubeExec.recoveryProvider'
import { KubeExecProfileSettingsComponent } from './components/kubeExecProfileSettings.component'
import { KubeExecTabComponent } from './components/kubeExecTab.component'

console.log('[tabby-k8s-exec] module loaded')

@NgModule({
    imports: [CommonModule, FormsModule],
    declarations: [KubeExecProfileSettingsComponent, KubeExecTabComponent],
    exports: [KubeExecProfileSettingsComponent, KubeExecTabComponent],
    providers: [
        { provide: ProfileProvider, useClass: KubeExecProfileProvider, multi: true },
        { provide: TabRecoveryProvider, useClass: KubeExecRecoveryProvider, multi: true },
    ],
})
export default class KubeExecModule { }
