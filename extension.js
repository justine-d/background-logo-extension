const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const St = imports.gi.St;

const Layout = imports.ui.layout;
const Main = imports.ui.main;

const LOGO_URI = 'file:///usr/share/icons/hicolor/scalable/apps/start-here.svg';

const BackgroundLogo = new Lang.Class({
    Name: 'BackgroundLogo',

    _init: function(bgManager) {
        this._bgManager = bgManager;

        this.actor = new St.Widget({ layout_manager: new Clutter.BinLayout() });
        bgManager._container.add_actor(this.actor);

        let monitorIndex = bgManager._monitorIndex;
        let constraint = new Layout.MonitorConstraint({ index: monitorIndex });
        this.actor.add_constraint(constraint);

        let file = Gio.File.new_for_uri(LOGO_URI);
        this._icon = new St.Icon({ style_class: 'background-logo-icon',
                                   gicon: new Gio.FileIcon({ file: file }),
                                   x_expand: true, y_expand: true,
                                   x_align: Clutter.ActorAlign.END,
                                   y_align: Clutter.ActorAlign.END });
        this.actor.add_actor(this._icon);

        bgManager.backgroundActor.connect('destroy', Lang.bind(this, this._backgroundDestroyed));

        bgManager.connect('changed', Lang.bind(this, this._updateVisibility));
        this._updateVisibility();
    },

    _updateVisibility: function() {
        let background = this._bgManager.backgroundActor.background._delegate;
        let defaultUri = background._settings.get_default_value('picture-uri');
        let file = Gio.File.new_for_commandline_arg(defaultUri.deep_unpack());

        this.actor.visible = (background._file && file.equal(background._file));
    },

    _backgroundDestroyed: function() {
        if (this._bgManager._backgroundSource) // background swapped
            this._bgManager.backgroundActor.connect('destroy',
                                                    Lang.bind(this, this._backgroundDestroyed));
        else // bgManager destroyed
            this.actor.destroy();
    }
});

function forEachBackgroundManager(func) {
    Main.overview._bgManagers.forEach(func);
    Main.layoutManager._bgManagers.forEach(func);
}

function monitorsChanged() {
    forEachBackgroundManager(function(bgManager) {
        bgManager._logo = new BackgroundLogo(bgManager);
    });
};

let monitorsChangedId = 0;

function init() {
}

function enable() {
    monitorsChangedId = Main.layoutManager.connect('monitors-changed',
                                                   monitorsChanged);
    monitorsChanged();
}

function disable() {
    if (monitorsChangedId)
        Main.layoutManager.disconnect(monitorsChangedId);
    monitorsChangedId = 0;

    forEachBackgroundManager(function(bgManager) {
        bgManager._logo.actor.destroy();
        delete bgManager._logo;
    });
}