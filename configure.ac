AC_PREREQ(2.63)
AC_INIT([background-logo-extension],[3.15.1])

AC_CONFIG_AUX_DIR([config])

AM_INIT_AUTOMAKE([1.10 dist-xz no-dist-gzip foreign tar-ustar])

m4_ifdef([AM_SILENT_RULES],[AM_SILENT_RULES([yes])])

GLIB_GSETTINGS

dnl From gnome-shell-extensions
SHELL_VERSION="$PACKAGE_VERSION"
shell_major=`echo "$PACKAGE_VERSION" | cut -d'.' -f1`
shell_minor=`echo "$PACKAGE_VERSION" | cut -d'.' -f2`
if test "$(($shell_minor % 2))" -eq 0; then
        SHELL_VERSION="$shell_major.$shell_minor"
fi
AC_SUBST([SHELL_VERSION])

AC_CONFIG_FILES([
  Makefile
])
AC_OUTPUT
