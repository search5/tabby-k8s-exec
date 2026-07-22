# Configuration file for the Sphinx documentation builder.
#
# For the full list of built-in configuration values, see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Project information -----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#project-information

project = "tabby-k8s-exec"
copyright = "2026, Ji-Ho Lee"
author = "Ji-Ho Lee"
release = "1.0.0"
version = "1.0.0"

# -- General configuration ----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#general-configuration

extensions = [
    "sphinx.ext.autosectionlabel",
]

templates_path = ["_templates"]
exclude_patterns = ["_build", "Thumbs.db", ".DS_Store"]

# -- Internationalization ------------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-internationalization

language = "en"
locale_dirs = ["locale/"]
gettext_compact = False
gettext_uuid = True

# -- Options for HTML output ---------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output

html_theme = "sphinx_book_theme"
html_static_path = ["_static"]
html_js_files = ["custom.js"]
html_title = f"{project} Documentation"

html_theme_options = {
    "repository_url": "https://github.com/search5/tabby-k8s-exec",
    "use_repository_button": True,
    "use_issues_button": True,
    "use_edit_page_button": False,
    "path_to_docs": "docs",
    "navbar_end": ["version-switcher"],
    "switcher": {
        "json_url": "_static/switcher.json",
        # Placeholder so the config-inited hook below can safely assign to
        # this key without raising a KeyError, regardless of build order.
        "version_match": "en",
    },
}

html_context = {
    "default_mode": "auto",
}

# -- Options for EPUB output ---------------------------------------------------

epub_title = project
epub_author = author
epub_publisher = author
epub_copyright = copyright
epub_show_urls = "footnote"

# Sphinx's switcher.json (used only by the HTML theme's language dropdown)
# has no meaningful MIME type for an EPUB package, and doctree caches are
# not content either -- exclude both from the "unpackaged file" scan so
# the epub builder doesn't warn about them.
epub_exclude_files = ["_static/switcher.json", "_static/custom.js"]


# -- Dynamic per-language titles (HTML tab title + EPUB title) -----------------
#
# Sphinx builds each language as a separate `-D language=xx` invocation, so we
# hook into `config-inited` to set the human-facing titles (and the theme's
# version/language switcher state) based on whichever language this
# particular build run is using.


def update_language_titles(app, config):
    app.config.html_theme_options["switcher"]["version_match"] = config.language
    if config.language == "ko":
        app.config.html_title = f"{project} 문서 (한국어)"
        app.config.epub_title = f"{project} (한국어)"
    else:
        app.config.html_title = f"{project} Documentation (EN)"
        app.config.epub_title = f"{project} (English)"


def setup(app):
    app.connect("config-inited", update_language_titles)
