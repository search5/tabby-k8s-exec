Installation
============

Make sure you have completed the steps in :doc:`prerequisites` first.

.. note::

   **tabby-k8s-exec** is not yet published to npm, so it does not appear in
   Tabby's built-in Plugin Manager search. For now, install it from source
   as described below.

Clone the Git repository and build from source
---------------------------------------------------

**Requirements:** `Node.js <https://nodejs.org/>`_ 18 or later.

.. code-block:: bash

   git clone https://github.com/search5/tabby-k8s-exec.git
   cd tabby-k8s-exec
   npm install
   npm run build
   npm run install-plugin

``npm run install-plugin`` detects your operating system and copies the
built files to the correct Tabby plugin directory automatically:

.. list-table::
   :header-rows: 1

   * - OS
     - Plugin directory
   * - macOS
     - ``~/Library/Application Support/tabby/plugins/node_modules/tabby-k8s-exec/``
   * - Linux
     - ``~/.config/tabby/plugins/node_modules/tabby-k8s-exec/``
   * - Windows
     - ``%APPDATA%\tabby\plugins\node_modules\tabby-k8s-exec\``

Restart Tabby after installation. To confirm the plugin loaded, open
**View → Toggle Developer Tools** and look for the following line in the
console:

.. code-block:: text

   [tabby-k8s-exec] module loaded

If you don't see it, see :doc:`troubleshooting`.

Updating
--------

Keep the plugin up to date by pulling the latest changes and rebuilding:

.. code-block:: bash

   git pull
   npm run build
   npm run install-plugin

Then restart Tabby.

Once installed, continue to :doc:`usage`.
