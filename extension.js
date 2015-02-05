/*
 * Copyright 2014 Red Hat, Inc
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2, or (at your option)
 * any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, see <http://www.gnu.org/licenses/>.
 */
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const St = imports.gi.St;

const Background = imports.ui.background;
const Layout = imports.ui.layout;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const WorkAreaConstraint = new Lang.Class({
    Name: 'WorkAreaConstraint',
    Extends: Layout.MonitorConstraint,

    vfunc_set_actor: function(actor) {
        if (actor) {
            if (!this._workareasChangedId) {
                this._workareasChangedId = global.screen.connect('workareas-changed', Lang.bind(this, function() {
                    this.actor.queue_relayout();
                }));
            }
        } else {
            if (this._workareasChangedId)
                global.screen.disconnect(this._workareasChangedId);
            this._workareasChangedId = 0;
        }

        this.parent(actor);
    },

    vfunc_update_allocation: function(actor, actorBox) {
        if (!this._primary && this._index < 0)
            return;

        let index;
        if (this._primary)
            index = Main.layoutManager.primaryIndex;
        else
            index = Math.min(this._index, Main.layoutManager.monitors.length - 1);

        let ws = global.screen.get_workspace_by_index(0);
        let workArea = ws.get_work_area_for_monitor(index);
        actorBox.init_rect(workArea.x, workArea.y, workArea.width, workArea.height);
    }
});

const BackgroundLogo = new Lang.Class({
    Name: 'BackgroundLogo',

    _init: function(bgManager) {
        this._bgManager = bgManager;

        this._settings = Convenience.getSettings();

        this._settings.connect('changed::logo-file',
                               Lang.bind(this, this._updateLogo));
        this._settings.connect('changed::logo-size',
                               Lang.bind(this, this._updateScale));
        this._settings.connect('changed::logo-position',
                               Lang.bind(this, this._updatePosition));
        this._settings.connect('changed::logo-border',
                               Lang.bind(this, this._updateBorder));
        this._settings.connect('changed::always-show',
                               Lang.bind(this, this._updateVisibility));

        this._textureCache = St.TextureCache.get_default();

        this.actor = new St.Widget({ layout_manager: new Clutter.BinLayout(),
                                     opacity: 0 });
        bgManager._container.add_actor(this.actor);

        let monitorIndex = bgManager._monitorIndex;
        let constraint = new WorkAreaConstraint({ index: monitorIndex });
        this.actor.add_constraint(constraint);

        this._bin = new St.Widget({ x_expand: true, y_expand: true });
        this.actor.add_actor(this._bin);

        this._settings.bind('logo-opacity', this._bin, 'opacity',
                            Gio.SettingsBindFlags.DEFAULT);

        this._updateLogo();
        this._updatePosition();
        this._updateBorder();

        bgManager.backgroundActor.connect('destroy', Lang.bind(this, this._backgroundDestroyed));

        bgManager.connect('changed', Lang.bind(this, this._updateVisibility));
        this._updateVisibility();
    },

    _updateLogo: function() {
        if (this._icon)
            this._icon.destroy();

        let filename = this._settings.get_string('logo-file');
        let file = Gio.File.new_for_commandline_arg(filename);
        let scaleFactor = St.ThemeContext.get_for_stage(global.stage).scale_factor;
        if (this._textureCache.load_file_async) { // > 3.14
            this._icon = this._textureCache.load_file_async(file, -1, -1, scaleFactor);
        } else { // <= 3.14
            this._icon = this._textureCache.load_uri_async(file.get_uri(), -1, -1, scaleFactor);
        }
        this._icon.connect('allocation-changed',
                           Lang.bind(this, this._updateScale));
        this._bin.add_actor(this._icon);
    },

    _updateScale: function() {
        if (this._icon.width == 0)
            return;

        let size = this._settings.get_double('logo-size');
        let width = this.actor.width * size / 100;
        let height = this._icon.height * width / this._icon.width;
        this._icon.set_size(width, height);
    },

    _updatePosition: function() {
        let xAlign, yAlign;
        switch (this._settings.get_string('logo-position')) {
            case 'center':
                xAlign = Clutter.ActorAlign.CENTER;
                yAlign = Clutter.ActorAlign.CENTER;
                break;
            case 'bottom-left':
                xAlign = Clutter.ActorAlign.START;
                yAlign = Clutter.ActorAlign.END;
                break;
            case 'bottom-center':
                xAlign = Clutter.ActorAlign.CENTER;
                yAlign = Clutter.ActorAlign.END;
                break;
            case 'bottom-right':
                xAlign = Clutter.ActorAlign.END;
                yAlign = Clutter.ActorAlign.END;
                break;
        }
        this._bin.x_align = xAlign;
        this._bin.y_align = yAlign;
    },

    _updateBorder: function() {
        let border = this._settings.get_uint('logo-border');
        this.actor.style = 'padding: %dpx;'.format(border);
    },

    _updateVisibility: function() {
        let background = this._bgManager.backgroundActor.background._delegate;
        let defaultUri = background._settings.get_default_value('picture-uri');
        let file = Gio.File.new_for_commandline_arg(defaultUri.deep_unpack());

        let visible;
        if (this._settings.get_boolean('always-show'))
            visible = true;
        else if (background._file) // > 3.14
            visible = background._file.equal(file);
        else /* if (background._filename) // <= 3.14 */
            visible = background._filename == file.get_path();
        /*
        else // background == NONE
            visible = false;
            */

        Tweener.addTween(this.actor,
                         { opacity: visible ? 255 : 0,
                           time: Background.FADE_ANIMATION_TIME,
                           transition: 'easeOutQuad'
                         });
    },

    _backgroundDestroyed: function() {
        if (this._bgManager._backgroundSource) // background swapped
            this._bgManager.backgroundActor.connect('destroy',
                                                    Lang.bind(this, this._backgroundDestroyed));
        else // bgManager destroyed
            this.actor.destroy();
    }
});


let monitorsChangedId = 0;
let startupPreparedId = 0;
let logos = [];

function forEachBackgroundManager(func) {
    Main.overview._bgManagers.forEach(func);
    Main.layoutManager._bgManagers.forEach(func);
}

function addLogo() {
    destroyLogo();
    forEachBackgroundManager(function(bgManager) {
        logos.push(new BackgroundLogo(bgManager));
    });
}

function destroyLogo() {
    logos.forEach(function(l) { l.actor.destroy(); });
    logos = [];
}

function init() {
}

function enable() {

    monitorsChangedId = Main.layoutManager.connect('monitors-changed', addLogo);
    startupPreparedId = Main.layoutManager.connect('startup-prepared', addLogo);
    addLogo();
}

function disable() {
    if (monitorsChangedId)
        Main.layoutManager.disconnect(monitorsChangedId);
    monitorsChangedId = 0;

    if (startupPreparedId)
        Main.layoutManager.disconnect(startupPreparedId);
    startupPreparedId = 0;

    destroyLogo();
}
