Installation
============

Make sure you have completed the steps in :doc:`prerequisites` first.

**tabby-k8s-exec** can be installed in two ways: directly from within Tabby,
or by cloning the source repository and building it yourself.

Method 1 — Install from the Tabby Plugin Manager
--------------------------------------------------

This is the recommended method for most users.

1. Open Tabby and go to **Settings → Plugins**.
2. In the search box, search for ``k8s-exec``.
3. Click **Install**, then restart Tabby when prompted.

Method 2 — Clone the Git repository and build from source
-------------------------------------------------------------

Use this method if you want to build from a specific commit, contribute to
the plugin, or install it on a machine without access to the Tabby Plugin
Manager.

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

If you installed from source (Method 2), keep the plugin up to date by
pulling the latest changes and rebuilding:

.. code-block:: bash

   git pull
   npm run build
   npm run install-plugin

Then restart Tabby.

If you installed via the Plugin Manager (Method 1), Tabby will surface
available updates for ``k8s-exec`` in **Settings → Plugins** the same way it
does for any other plugin.

Once installed, continue to :doc:`usage`.
