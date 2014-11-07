UUID := background-logo@fedorahosted.org
NULL :=

extensiondir = $(datadir)/gnome-shell/extensions/$(UUID)
dist_extension_DATA =	\
	COPYING		\
	extension.js	\
	stylesheet.css	\
	$(NULL)
nodist_extension_DATA = metadata.json

EXTRA_DIST = metadata.json.in

metadata.json: metadata.json.in $(builddir)/config.status
	$(AM_V_GEN) sed \
            -e "s|[@]uuid@|$(UUID)|" \
            -e "s|[@]shell_version@|$(SHELL_VERSION)|" \
            $< > $@

CLEANFILES = metadata.json

zip: $(UUID).zip $(dist_extension_DATA) $(nodist_extension_DATA)
$(UUID).zip: $(dist_extension_DATA) $(nodist_extension_DATA)
	@rm -f $(builddir)/*.zip
	$(AM_V_GEN) zip -qr $@ $^
