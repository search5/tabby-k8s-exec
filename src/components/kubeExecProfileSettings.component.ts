import { Component, Input } from '@angular/core'
import { ProfileSettingsComponent, LocaleService } from 'tabby-core'
import { KubeExecProfile } from '../api'
import { PodSummary } from '../kubeConfigLoader'
import { listContextsViaWorker, listNamespacesViaWorker, listPodsViaWorker } from '../k8sWorkerClient'

// To add a language, create src/locale/<code>.json and register it here.
// @ngx-translate/core is not exposed to plugins by Tabby, so LocaleService (which
// tabby-core does expose) is used only to read the current locale code, and lookups
// go against this plugin's own bundled dictionaries.
const locales: Record<string, Record<string, string>> = {
    en: require('../locale/en.json'),
    ko: require('../locale/ko.json'),
}

@Component({
    selector: 'kube-exec-profile-settings',
    template: `
        <div class="form-group row mb-3">
            <label class="col-sm-3 col-form-label">{{ t('Kubeconfig Path') }}</label>
            <div class="col-sm-9">
                <input type="text" class="form-control" [(ngModel)]="profile.options.kubeconfigPath" placeholder="~/.kube/config" />
            </div>
        </div>

        <div class="form-group row mb-3">
            <label class="col-sm-3 col-form-label">{{ t('Context') }}</label>
            <div class="col-sm-9">
                <div class="d-flex" style="gap: 0.5rem;">
                    <select class="form-control" [(ngModel)]="context" (change)="onContextChange()">
                        <option [ngValue]="null">{{ t('Select a context') }}</option>
                        <option *ngFor="let c of contexts" [ngValue]="c">{{ c }}</option>
                    </select>
                    <button type="button" class="btn btn-secondary btn-sm" style="white-space: nowrap;" [disabled]="loadingContexts" (click)="loadContexts()">
                        {{ loadingContexts ? t('Loading...') : t('Refresh') }}
                    </button>
                </div>
                <div class="text-danger small mt-1" *ngIf="contextsError">{{ contextsError }}</div>
            </div>
        </div>

        <div class="form-group row mb-3">
            <label class="col-sm-3 col-form-label">{{ t('Namespace') }}</label>
            <div class="col-sm-9">
                <div class="d-flex" style="gap: 0.5rem;">
                    <select class="form-control" [(ngModel)]="namespace" (change)="onNamespaceChange()" [disabled]="!namespaces.length">
                        <option [ngValue]="null">{{ t('Select a namespace') }}</option>
                        <option *ngFor="let n of namespaces" [ngValue]="n">{{ n }}</option>
                    </select>
                    <button type="button" class="btn btn-secondary btn-sm" style="white-space: nowrap;" [disabled]="loadingNamespaces" (click)="loadNamespaces(true)">
                        {{ loadingNamespaces ? t('Loading...') : t('Refresh') }}
                    </button>
                </div>
                <div class="text-danger small mt-1" *ngIf="namespacesError">{{ namespacesError }}</div>
            </div>
        </div>

        <div class="form-group row mb-3">
            <label class="col-sm-3 col-form-label">{{ t('Pod') }}</label>
            <div class="col-sm-9">
                <div class="d-flex" style="gap: 0.5rem;">
                    <select class="form-control" [(ngModel)]="podName" (change)="onPodChange()" [disabled]="!pods.length">
                        <option [ngValue]="null">{{ t('Select a pod') }}</option>
                        <option *ngFor="let p of pods" [ngValue]="p.name">{{ p.name }} ({{ p.phase }})</option>
                    </select>
                    <button type="button" class="btn btn-secondary btn-sm" style="white-space: nowrap;" [disabled]="loadingPods" (click)="loadPods(true)">
                        {{ loadingPods ? t('Loading...') : t('Refresh') }}
                    </button>
                </div>
                <div class="text-danger small mt-1" *ngIf="podsError">{{ podsError }}</div>
            </div>
        </div>

        <div class="form-group row mb-3">
            <label class="col-sm-3 col-form-label">{{ t('Container') }}</label>
            <div class="col-sm-9">
                <select class="form-control" [(ngModel)]="containerName" [disabled]="containerOptions.length <= 1">
                    <option [ngValue]="null">{{ t('Select a container') }}</option>
                    <option *ngFor="let c of containerOptions" [ngValue]="c">{{ c }}</option>
                </select>
                <div class="text-muted small mt-1">{{ t('Leave empty to use the pod\\'s only container, or the first one if it has several.') }}</div>
            </div>
        </div>

        <div class="form-group row mb-3">
            <label class="col-sm-3 col-form-label">{{ t('Command') }}</label>
            <div class="col-sm-9">
                <input type="text" class="form-control" [(ngModel)]="profile.options.command" placeholder="/bin/sh" />
                <div class="text-muted small mt-1">{{ t('e.g. /bin/sh, /bin/bash, or "sh -c ..."') }}</div>
            </div>
        </div>

        <div class="form-group row mb-3" *ngIf="isBashCommand">
            <div class="col-sm-9 offset-sm-3">
                <div class="form-check">
                    <input type="checkbox" class="form-check-input" id="k8sExecShellFallback" [(ngModel)]="profile.options.shellFallback" />
                    <label class="form-check-label" for="k8sExecShellFallback">{{ t('Try /bin/bash, fall back to /bin/sh if unavailable') }}</label>
                </div>
            </div>
        </div>
    `,
})
export class KubeExecProfileSettingsComponent implements ProfileSettingsComponent<KubeExecProfile> {
    @Input() profile: any

    contexts: string[] = []
    loadingContexts = false
    contextsError = ''

    namespaces: string[] = []
    loadingNamespaces = false
    namespacesError = ''

    pods: PodSummary[] = []
    loadingPods = false
    podsError = ''

    constructor (private localeService: LocaleService) { }

    t (key: string): string {
        const lang = (this.localeService.getLocale() || 'en').slice(0, 2)
        return locales[lang]?.[key] ?? locales.en[key] ?? key
    }

    // The placeholder options above use [ngValue]="null", so undefined must be normalized
    // to null on every read — never just once in ngOnInit — because profile.options can be
    // swapped to a fresh object reference under Tabby's "new profile" flow.
    get context (): string | null {
        return this.profile.options.context ?? null
    }

    set context (value: string | null) {
        this.profile.options.context = value ?? undefined
    }

    get namespace (): string | null {
        return this.profile.options.namespace ?? null
    }

    set namespace (value: string | null) {
        this.profile.options.namespace = value ?? undefined
    }

    get podName (): string | null {
        return this.profile.options.podName || null
    }

    set podName (value: string | null) {
        this.profile.options.podName = value ?? ''
    }

    get containerName (): string | null {
        return this.profile.options.containerName ?? null
    }

    set containerName (value: string | null) {
        this.profile.options.containerName = value ?? undefined
    }

    get containerOptions (): string[] {
        const pod = this.pods.find(p => p.name === this.profile.options.podName)
        return pod?.containerNames ?? []
    }

    get isBashCommand (): boolean {
        const argv = (this.profile.options.command || '').trim().split(/\s+/)
        return argv[0] === '/bin/bash' || argv[0] === 'bash'
    }

    async ngOnInit (): Promise<void> {
        // profile.options is a getter-only property on Tabby's profile object — reassigning
        // it wholesale throws, so defaults must be applied by mutating individual keys.
        this.profile.options.kubeconfigPath = this.profile.options.kubeconfigPath || '~/.kube/config'
        this.profile.options.namespace = this.profile.options.namespace || 'default'
        this.profile.options.command = this.profile.options.command || '/bin/sh'
        this.profile.options.shellFallback = this.profile.options.shellFallback ?? true

        await this.loadContexts()
        await this.loadNamespaces()
        if (this.profile.options.podName) {
            // Pre-populate so reopening settings on an existing profile shows the current
            // selection instead of a blank pod/container dropdown.
            await this.loadPods()
        }
    }

    async loadContexts (): Promise<void> {
        this.loadingContexts = true
        this.contextsError = ''
        try {
            this.contexts = await listContextsViaWorker(this.profile.options.kubeconfigPath)
        } catch (e: any) {
            this.contexts = []
            this.contextsError = this.t('Unable to read kubeconfig. Check the path.') + (e?.message ? ` (${e.message})` : '')
        } finally {
            this.loadingContexts = false
        }
    }

    onContextChange (): void {
        this.namespaces = []
        this.pods = []
        this.profile.options.podName = ''
        this.profile.options.containerName = undefined
        // Namespace loading is manual now (click Refresh) — no longer auto-triggered here.
    }

    async loadNamespaces (forceFresh = false): Promise<void> {
        this.loadingNamespaces = true
        this.namespacesError = ''
        try {
            // Runs in a separate forked process (see k8sWorkerClient.ts), not in this
            // Angular/zone.js renderer — that's what makes latency actually consistent
            // (in-process calls, even outside Angular's zone, still occasionally saw
            // multi-hundred-ms jitter from renderer-process contention that a plain `curl`
            // against the same API server never showed).
            this.namespaces = await listNamespacesViaWorker(this.profile.options.kubeconfigPath, this.profile.options.context, forceFresh)
            if (!this.namespaces.length) {
                this.namespacesError = this.t('No namespaces found.')
            }
        } catch (e: any) {
            this.namespaces = []
            this.namespacesError = this.t('Unable to list namespaces. Check your kubeconfig and cluster connectivity.') + (e?.message ? ` (${e.message})` : '')
        } finally {
            this.loadingNamespaces = false
        }
    }

    onNamespaceChange (): void {
        this.pods = []
        this.profile.options.podName = ''
        this.profile.options.containerName = undefined
    }

    async loadPods (forceFresh = false): Promise<void> {
        if (!this.profile.options.namespace) {
            this.podsError = this.t('Select a namespace first.')
            return
        }
        this.loadingPods = true
        this.podsError = ''
        try {
            this.pods = await listPodsViaWorker(this.profile.options.kubeconfigPath, this.profile.options.context, this.profile.options.namespace, forceFresh)
            if (!this.pods.length) {
                this.podsError = this.t('No pods found in this namespace.')
            }
            this.onPodChange()
        } catch (e: any) {
            this.pods = []
            this.podsError = this.t('Unable to list pods.') + (e?.message ? ` (${e.message})` : '')
        } finally {
            this.loadingPods = false
        }
    }

    onPodChange (): void {
        const containers = this.containerOptions
        if (containers.length === 1) {
            this.profile.options.containerName = containers[0]
        } else if (!containers.includes(this.profile.options.containerName)) {
            this.profile.options.containerName = undefined
        }
    }
}
