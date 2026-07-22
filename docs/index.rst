tabby-k8s-exec documentation
=============================

A `Tabby <https://tabby.sh>`_ plugin that opens an interactive shell into a
Kubernetes pod/container — like ``kubectl exec -it <pod> -- sh`` — without
depending on the ``kubectl`` binary at runtime.

The plugin talks directly to the cluster's exec WebSocket endpoint using the
official ``@kubernetes/client-node`` SDK
(`kubernetes-client/javascript <https://github.com/kubernetes-client/javascript>`_):
it reads your kubeconfig, resolves credentials (including ``exec``-based
auth plugins such as ``aws eks get-token`` or ``gke-gcloud-auth-plugin``),
and drives the Kubernetes exec sub-protocol directly — no ``kubectl``
process is ever spawned.

.. toctree::
   :maxdepth: 2
   :caption: Contents

   prerequisites
   installation
   usage
   architecture
   troubleshooting

Indices and tables
===================

* :ref:`genindex`
* :ref:`search`
