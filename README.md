# tabby-k8s-exec

📖 **[Documentation](https://search5.github.io/tabby-k8s-exec/)** (English / 한국어)

A [Tabby](https://tabby.sh) terminal plugin that opens an interactive shell into a Kubernetes pod/container — like `kubectl exec -it <pod> -- sh` — implemented natively via the official [`@kubernetes/client-node`](https://github.com/kubernetes-client/javascript) SDK. No `kubectl` binary is required at runtime.

## Features

- **Native Kubernetes exec protocol** — connects directly to the cluster's exec WebSocket endpoint using `@kubernetes/client-node`, no `kubectl` process spawned.
- **Cascading connection picker** — pick a kubeconfig context, then a namespace, then a pod, then a container, each populated live from the cluster (namespace/pod lists have a manual Refresh button; the context list is read from the local kubeconfig file).
- **Clear pre-connect diagnostics** — if the selected pod isn't actually running, the plugin checks its phase before attempting to connect and shows exactly why, instead of a raw transport error.
- **Shell fallback** — optionally try `/bin/bash` first and fall back to `/bin/sh` automatically if the container doesn't have bash.
- **Multi-container pod support** — the container picker is derived from the selected pod's actual `containers`/`initContainers`.
- **Tab recovery** — if Tabby restarts, open kube-exec tabs reopen automatically and reconnect to the same pod, with the terminal scrollback restored.

## Prerequisites

- [Tabby](https://tabby.sh) desktop app.
- A working kubeconfig file (`~/.kube/config` by default) with a context pointing at a reachable cluster.
- If your kubeconfig uses an `exec`-based auth plugin (e.g. `aws eks get-token`, `gke-gcloud-auth-plugin`, `kubelogin`), that binary must be installed and on `PATH` — this is inherent to how that kubeconfig auth style works (the same requirement `kubectl` itself has), not something this plugin can avoid. Static token, client-certificate, and standard OIDC auth need nothing extra.

## Installation

### Option A — Tabby Plugin Manager (recommended)

Search for `k8s-exec` in **Tabby Settings → Plugins** and click Install. Restart Tabby when prompted.

### Option B — From source

**Requirements:** [Node.js](https://nodejs.org/) 18 or later

```bash
git clone https://github.com/search5/tabby-k8s-exec.git
cd tabby-k8s-exec
npm install
npm run build
npm run install-plugin
```

`npm run install-plugin` copies the built plugin into Tabby's plugin directory (`~/.config/tabby/plugins` on Linux, `~/Library/Application Support/tabby/plugins` on macOS, `%APPDATA%\tabby\plugins` on Windows). Restart Tabby afterwards to load it.

## Usage

Create a new connection, choose type **Kubernetes Exec**, and fill in:

| Field | Description |
|---|---|
| Kubeconfig Path | Path to the kubeconfig file, default `~/.kube/config` |
| Context | Kubeconfig context to use (leave unset to use the file's current-context) |
| Namespace | Namespace containing the target pod |
| Pod | Pod to exec into (Refresh to list pods in the selected namespace) |
| Container | Container within the pod (auto-selected if the pod has only one) |
| Command | Shell/command to run, default `/bin/sh` |

Selecting a context does not automatically load its namespaces — click the Namespace field's Refresh button explicitly to avoid firing off a cluster API call every time you're just browsing contexts.

## Known limitations

- Exec sessions may be disconnected after roughly 5 minutes of idle time behind some proxies/load balancers (an upstream `@kubernetes/client-node` limitation, not implemented around in v1) — reconnect via Tabby's reconnect hotkey if this happens.
- Only a single kubeconfig file is supported per profile (no `KUBECONFIG`-style multi-file merging).

## Development

```bash
npm run watch          # rebuild on change
npm run install-plugin # copy dist/ into Tabby's plugin directory
```

## License

MIT — see [LICENSE](LICENSE).
