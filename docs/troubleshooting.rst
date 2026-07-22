Troubleshooting & FAQ
======================

"Pod is not running" error on connect
------------------------------------------

**Symptom:** connecting fails immediately with a message like ``Pod
"my-pod" is not running (phase: Completed) — it may have already exited or
failed.``

**Cause:** the plugin checks the target pod's phase before opening the
exec session. A pod that has already exited, failed, or hasn't been
scheduled yet cannot be exec'd into — the same restriction ``kubectl exec``
has.

**Fix:** confirm the pod is actually running:

.. code-block:: bash

   kubectl get pod POD_NAME -n NAMESPACE

If it shows ``Completed`` or ``Error``, the pod's container has already
exited (for example, a pod running a one-shot command rather than a
long-lived process); if it shows ``Pending``, it hasn't been scheduled yet.
Either way, the plugin can't attach to it in that state — pick a pod that's
actually ``Running``, or recreate/restart it first.

Connection fails with an authentication error
----------------------------------------------------

**Symptom:** the connection fails with an authentication-related error,
even though the same context worked before.

**Cause:** if your kubeconfig context uses an ``exec``-based auth plugin
(EKS, GKE, ``kubelogin``, ...), the plugin runs that binary to obtain a
token — the same one ``kubectl`` itself would run. If your underlying CLI
session (e.g. an ``aws`` SSO/login session) has expired, that command
fails, and so does the connection.

**Fix:** re-authenticate with your cluster's identity provider (for
example, re-run ``aws login`` / re-authenticate your AWS SSO session), then
retry the connection. See :doc:`prerequisites` for details on how
``exec``-based auth is handled.

Confirming the plugin actually loaded
-----------------------------------------

**Symptom:** the "Kubernetes Exec" tab type doesn't appear, or connections
behave unexpectedly, and you're not sure whether the plugin is even loaded.

**Fix:** open **View → Toggle Developer Tools** in Tabby and check the
console for:

.. code-block:: text

   [tabby-k8s-exec] module loaded

If this line is missing, the plugin failed to load — check that it was
installed into the correct plugin directory for your OS (see
:doc:`installation`) and that Tabby was fully restarted afterwards.

The terminal disconnects after a few minutes idle
-------------------------------------------------------

**Symptom:** a session that's been left idle for a while (roughly 5
minutes or more) disconnects on its own.

**Cause:** this is a known limitation of the underlying Kubernetes exec
protocol / client library, not something specific to this plugin — some
proxies and load balancers in front of the API server close idle exec
connections after a timeout, and there is currently no keepalive
implemented around it.

**Fix:** reconnect via Tabby's reconnect hotkey or by reopening the tab.

``/bin/bash`` session ends immediately
--------------------------------------------

**Symptom:** connecting with Command set to ``/bin/bash`` ends the session
right away, before you've typed anything.

**Cause:** the container image doesn't have ``bash`` installed (common
with minimal images like ``busybox`` or ``alpine`` without extra
packages).

**Fix:** if **Shell fallback** is enabled (the default), the plugin
detects this and automatically retries with ``/bin/sh`` — you should see a
status line announcing the fallback. If it's disabled, either enable it or
set Command to ``/bin/sh`` directly.

The plugin doesn't update after ``git pull``
--------------------------------------------------

**Symptom:** you pulled the latest source changes, but Tabby still behaves
like the old version.

**Cause:** installing from source requires an explicit rebuild and
redeploy step — pulling new source alone does not update the files Tabby
actually loads.

**Fix:** run the full update sequence from :doc:`installation`:

.. code-block:: bash

   git pull
   npm run build
   npm run install-plugin

Then fully restart Tabby (not just reload the window).
