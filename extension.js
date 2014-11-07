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

const LOGO_URI = 'file:///usr/share/icons/hicolor/scalable/apps/start-here.svg';

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

        this.actor = new St.Widget({ layout_manager: new Clutter.BinLayout(),
                                     opacity: 0 });
        bgManager._container.add_actor(this.actor);

        let monitorIndex = bgManager._monitorIndex;
        let constraint = new WorkAreaConstraint({ index: monitorIndex });
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

        let visible;
        if (background._file) // > 3.14
            visible = background._file.equal(file);
        else if (background._filename) // <= 3.14
            visible = background._filename == file.get_path();
        else // background == NONE
            visible = false;

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

function forEachBackgroundManager(func) {
    Main.overview._bgManagers.forEach(func);
    Main.layoutManager._bgManagers.forEach(func);
}

let monitorsChangedId = 0;
let startupPreparedId = 0;

function init() {
}

function enable() {
    let addLogo = function() {
        forEachBackgroundManager(function(bgManager) {
            bgManager._logo = new BackgroundLogo(bgManager);
        });
    };

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

    forEachBackgroundManager(function(bgManager) {
        bgManager._logo.actor.destroy();
        delete bgManager._logo;
    });
}
