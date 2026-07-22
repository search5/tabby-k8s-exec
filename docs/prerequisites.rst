Prerequisites
=============

Before using **tabby-k8s-exec**, make sure the following are in place.

1. A working kubeconfig file
------------------------------

The plugin reads a kubeconfig file directly — by default ``~/.kube/config``,
though you can point it at any file in the profile settings. It does not
create or modify this file; it must already have at least one context
pointing at a cluster you can reach.

If you can already run ``kubectl get pods`` successfully against your
cluster, your kubeconfig is ready to use with this plugin as-is.

2. Credentials for your kubeconfig's auth method
---------------------------------------------------

The plugin resolves credentials using the same logic ``kubectl`` itself
uses, so whatever your kubeconfig already relies on continues to work
unchanged:

* **Static token / client certificate** — nothing extra is needed.
* **``exec``-based auth plugins** (used by managed clusters such as Amazon
  EKS, GKE, or any setup using ``kubelogin``) — the referenced binary
  (``aws``, ``gke-gcloud-auth-plugin``, ``kubelogin``, ...) must be
  installed and available on ``PATH``, and **you must have an active,
  unexpired session with that provider at the moment you connect**. For
  example, an EKS kubeconfig's ``exec`` entry runs ``aws eks get-token``
  under the hood — if your AWS CLI session has expired, that command
  fails, and so does the connection. This is inherent to how ``exec``-based
  auth works and applies equally to plain ``kubectl``; the plugin cannot
  work around it.

.. note::

   Once a token has been obtained, it is cached in memory for its stated
   lifetime (an EKS token is normally valid for about 15 minutes), so the
   underlying ``aws``/``gke-gcloud-auth-plugin``/etc. command is **not**
   re-run on every action — only when no valid cached token exists yet, or
   the cached one has expired. Every new connection (opening a new tab)
   starts with its own cache, though, so it can trigger a fresh credential
   fetch even if another tab or the settings dialog already has one cached.

Once both are in place, continue to :doc:`installation`.
