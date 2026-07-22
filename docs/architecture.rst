Architecture
============

Source layout
--------------

All of the plugin's logic lives under ``src/``:

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - File
     - Responsibility
   * - ``api.ts``
     - Defines ``KubeExecProfileOptions``/``KubeExecProfile`` and
       ``KubeExecProfileProvider``, which registers the "Kubernetes Exec"
       profile type with Tabby.
   * - ``kubeConfigLoader.ts``
     - Plain Node helpers with no Angular/Tabby dependency: kubeconfig
       parsing, context listing, a cached ``CoreV1Api`` client per
       kubeconfig path + context, namespace/pod listing, and the
       pod-phase pre-check used before connecting.
   * - ``kubeExec.session.ts``
     - ``KubeExecSession``, implementing Tabby's ``BaseSession`` on top of
       the Kubernetes exec WebSocket.
   * - ``index.ts``
     - The plugin's Angular ``NgModule`` entry point.
   * - ``components/kubeExecProfileSettings.component.ts``
     - The profile settings form: the cascading context/namespace/pod/
       container pickers.
   * - ``components/kubeExecTab.component.ts``
     - The terminal tab component, extending Tabby's
       ``ConnectableTerminalTabComponent``.

Request flow
-------------

.. code-block:: text

   kubeExecProfileProvider (api.ts)  -->  registers the profile type
        |
        v
   kubeConfigLoader.ts        -->  load kubeconfig, resolve credentials,
        |                          check the target pod's phase
        v
   kubeExec.session.ts          -->  open the pods/exec WebSocket,
        |                            drive stdin/stdout/resize over it
        v
   components/kubeExecTab.component.ts  -->  interactive shell rendered in the tab

No step in this chain shells out to ``kubectl``; credential resolution,
the exec sub-protocol, and I/O framing are all handled by
``@kubernetes/client-node`` and driven directly from TypeScript.

A note on Angular's change detection
------------------------------------------------

All Kubernetes API calls run directly in Tabby's renderer process.
Responses to them (and to any ``exec``-based auth subprocess) arrive via
plain Node.js ``http``/``child_process`` events, which zone.js's browser
bundle does not patch — so without help, the settings dialog's
namespace/pod pickers would correctly fetch data but not visibly update
until some unrelated UI event happened to trigger a redraw.
``kubeExecProfileSettings.component.ts`` works around this by explicitly
re-entering Angular's zone (``NgZone.run(...)``) once each API call
resolves.

Bundled dependencies
----------------------

The plugin bundles ``@kubernetes/client-node``
(`kubernetes-client/javascript <https://github.com/kubernetes-client/javascript>`_),
pinned to an exact version (not a ``^`` range) since its WebSocket/exec
internals are not part of its stable public API surface. The package is
ESM-only, so it is always loaded via a dynamic ``import()`` rather than a
static import, avoiding an ``ERR_REQUIRE_ESM`` failure in this
CommonJS-targeted plugin bundle.

Beyond this one library, the plugin has **no runtime dependencies** other
than what Tabby itself provides (Angular, Tabby's core APIs, etc.).
