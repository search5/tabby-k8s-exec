# Minimal makefile for Sphinx documentation
#

# You can set these variables from the command line, and also
# from the environment for the first two.
SPHINXOPTS    ?=
SPHINXBUILD   ?= sphinx-build
SOURCEDIR     = .
BUILDDIR      = _build

# Put it first so that "make" without argument is like "make help".
help:
	@$(SPHINXBUILD) -M help "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

.PHONY: help Makefile

# Catch-all target: route all unknown targets to Sphinx using the new
# "make mode" option.  $(O) is meant as a shortcut for $(SPHINXOPTS).
%: Makefile
	@$(SPHINXBUILD) -M $@ "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

# -- Multilingual (en + ko) HTML/EPUB build targets --------------------------
#
# Sphinx is installed as a `uv tool` (not a project dependency of this npm
# package), which exposes `sphinx-build` / `sphinx-intl` directly on PATH.
# See docs/README or the repo root for details.

.PHONY: html-en html-ko html-all epub-en epub-ko epub-all gettext intl-update intl-build

gettext:
	sphinx-build -b gettext . _build/gettext

intl-update: gettext
	sphinx-intl update -p _build/gettext -l ko --locale-dir locale

intl-build:
	sphinx-intl build --locale-dir locale

html-en:
	sphinx-build -b html -d _build/doctrees/html-en -D language=en . _build/html/en

html-ko: intl-build
	sphinx-build -b html -d _build/doctrees/html-ko -D language=ko . _build/html/ko

html-all: html-en html-ko
	mkdir -p _build/html
	printf '<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=en/"></head><body>Redirecting to <a href="en/">English docs</a>...</body></html>' > _build/html/index.html

epub-en:
	sphinx-build -b epub -d _build/doctrees/epub-en -D language=en . _build/epub/en

epub-ko: intl-build
	sphinx-build -b epub -d _build/doctrees/epub-ko -D language=ko . _build/epub/ko

epub-all: epub-en epub-ko
