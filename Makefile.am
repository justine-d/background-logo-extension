UUID := background-logo@fedorahosted.org
SCHEMA := org.fedorahosted.background-logo-extension
NULL :=

extensiondir = $(datadir)/gnome-shell/extensions/$(UUID)
dist_extension_DATA =	\
	COPYING		\
	convenience.js	\
	extension.js	\
	$(NULL)
nodist_extension_DATA = metadata.json

EXTRA_DIST = metadata.json.in

metadata.json: metadata.json.in $(builddir)/config.status
	$(AM_V_GEN) sed \
            -e "s|[@]uuid@|$(UUID)|" \
            -e "s|[@]shell_version@|$(SHELL_VERSION)|" \
            -e "s|[@]settings_schema@|$(SCHEMA)|" \
            $< > $@

CLEANFILES = metadata.json

gsettings_SCHEMAS = $(srcdir)/schemas/$(SCHEMA).gschema.xml
@GSETTINGS_RULES@

EXTRA_DIST +=	\
	$(gsettings_SCHEMAS)		\
	$(NULL)

CLEANFILES += schemas/gschemas.compiled

zip_content =				\
	$(dist_extension_DATA)		\
	$(nodist_extension_DATA)	\
	$(gsettings_SCHEMAS)		\
	schemas/gschemas.compiled	\
	$(NULL)

schemas/gschemas.compiled: schemas/$(SCHEMA).gschema.xml
	$(AM_V_GEN) $(GLIB_COMPILE_SCHEMAS) schemas

zip: $(UUID).zip $(zip_content)
$(UUID).zip: $(zip_content)
	@rm -f $(builddir)/*.zip
	$(AM_V_GEN) zip -qr $@ $^
