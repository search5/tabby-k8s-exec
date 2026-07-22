Usage
=====

Creating a new Kubernetes Exec connection
---------------------------------------------

1. Open Tabby and choose **New tab → Kubernetes Exec**.
2. Fill in the profile settings:

.. list-table::
   :header-rows: 1

   * - Field
     - Description
   * - Kubeconfig Path
     - Path to the kubeconfig file. Defaults to ``~/.kube/config``.
   * - Context
     - Kubeconfig context to use. Populated from the local kubeconfig file
       (no cluster connection needed for this one); leave unset to use the
       file's ``current-context``.
   * - Namespace
     - Namespace containing the target pod. Click **Refresh** to list
       namespaces from the cluster using the selected context.
   * - Pod
     - Pod to exec into. Click **Refresh** to list pods in the selected
       namespace; each entry shows its current phase, e.g. ``my-pod
       (Running)``.
   * - Container
     - Container within the pod. Auto-selected if the pod has exactly one
       container; otherwise pick one from the pod's actual
       ``containers``/``initContainers``.
   * - Command
     - Shell or command to run on connect. Defaults to ``/bin/sh``. Supports
       shell-style quoting, e.g. ``/bin/sh -c "echo hello world"`` runs as
       three arguments rather than exploding on every space.
   * - Shell fallback
     - Only shown when Command is ``/bin/bash`` (or ``bash``). If enabled
       (the default), the plugin retries with ``/bin/sh`` automatically if
       bash isn't available in the container.

.. note::

   Selecting a context does **not** automatically load its namespaces —
   click the **Refresh** button next to Namespace explicitly. This avoids
   firing off a cluster API call every time you're just browsing contexts.

3. Save the profile and connect.

.. note::

   If the selected pod isn't actually running (already exited, crashed,
   still pending, ...), the plugin detects this before attempting to
   connect and shows a clear message naming the pod's current phase,
   instead of a raw transport error. See :doc:`troubleshooting`.

What happens behind the scenes
----------------------------------

1. **Kubeconfig load** — the selected kubeconfig file and context are
   parsed, and credentials are resolved using the same logic ``kubectl``
   uses (static token, client certificate, or an ``exec``-based auth
   plugin).
2. **Pod status check** — the target pod's phase is read once via the
   Kubernetes API before connecting.
3. **Exec** — an interactive session is opened directly against the
   cluster's exec WebSocket endpoint (the ``pods/exec`` subresource),
   running the configured command with a TTY attached.
4. **I/O** — terminal input/output, resizing, and teardown are all driven
   over that same WebSocket — no local ``kubectl`` process is involved at
   any point.

See :doc:`architecture` for how these stages map onto the plugin's source
files.

Tab recovery
----------------

If Tabby restarts (or you quit and reopen it), any kube-exec tabs that were
open get reopened automatically and reconnect to the same pod, with the
terminal scrollback restored. No manual reconnection is needed.

Development workflow
------------------------

If you are working on the plugin itself (see :doc:`installation`), you can
iterate with:

.. code-block:: bash

   npm run watch          # rebuild on file change
   npm run install-plugin # then restart Tabby

Open Tabby's developer console (**View → Toggle Developer Tools**) to see
the plugin's log output while you work.
