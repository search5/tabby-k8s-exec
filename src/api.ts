import { Injectable } from '@angular/core'
import { NewTabParameters, PartialProfile, ProfileProvider } from 'tabby-core'
import { ConnectableTerminalProfile } from 'tabby-terminal'
import { KubeExecProfileSettingsComponent } from './components/kubeExecProfileSettings.component'
import { KubeExecTabComponent } from './components/kubeExecTab.component'

export interface KubeExecProfileOptions {
    kubeconfigPath: string
    context?: string
    namespace: string
    podName: string
    containerName?: string
    command: string
    shellFallback: boolean
}

export interface KubeExecProfile extends ConnectableTerminalProfile {
    options: KubeExecProfileOptions
}

const defaultOptions: KubeExecProfileOptions = {
    kubeconfigPath: '~/.kube/config',
    context: undefined,
    namespace: 'default',
    podName: '',
    containerName: undefined,
    command: '/bin/sh',
    shellFallback: true,
}

@Injectable()
export class KubeExecProfileProvider extends ProfileProvider<KubeExecProfile> {
    id = 'k8s-exec'
    name = 'Kubernetes Exec'
    settingsComponent = KubeExecProfileSettingsComponent as any

    configDefaults = {
        options: { ...defaultOptions },
    }

    async getBuiltinProfiles (): Promise<PartialProfile<KubeExecProfile>[]> {
        return [{
            id: 'k8s-exec:template',
            type: 'k8s-exec',
            name: 'Kubernetes Exec',
            icon: 'fas fa-dharmachakra',
            options: { ...defaultOptions },
            isBuiltin: true,
            isTemplate: true,
            weight: -1,
        } as any]
    }

    async getNewTabParameters (profile: KubeExecProfile): Promise<NewTabParameters<KubeExecTabComponent>> {
        return { type: KubeExecTabComponent, inputs: { profile } }
    }

    getDescription (profile: PartialProfile<KubeExecProfile>): string {
        if (!profile.options?.podName) {
            return ''
        }
        const ctxPart = profile.options.context ? `${profile.options.context}/` : ''
        const containerPart = profile.options.containerName ? `:${profile.options.containerName}` : ''
        return `${ctxPart}${profile.options.namespace}/${profile.options.podName}${containerPart}`
    }
}
