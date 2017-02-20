"use strict";
var Event_1 = require("./Event");
var AsyncEmitter = require("carrack");
var EventTargetLike = (function () {
    function EventTargetLike() {
        this.emitter = new AsyncEmitter();
    }
    EventTargetLike.prototype.addEventListener = function (event, listener) {
        this.emitter.addListener(event, listener);
    };
    EventTargetLike.prototype.removeEventListener = function (event, listener) {
        this.emitter.removeListener(event, listener);
    };
    EventTargetLike.prototype.removeAllListener = function () {
        this.emitter.removeAllListeners();
    };
    EventTargetLike.prototype.dispatchEvent = function (event) {
        return this.emitter.emit(event.type, event);
    };
    /**
     * equals
     *  `EventTargetLike.dispatchEvent(new CustomEvent(type, {detail}))`
     */
    EventTargetLike.prototype.emit = function (type, detail) {
        if (detail == null) {
            return this.dispatchEvent(new Event(type));
        }
        return this.dispatchEvent(new CustomEvent(type, { detail: detail }));
    };
    EventTargetLike.prototype.emitPararel = function (type, detail) {
        if (detail == null) {
            return this.emitter.emitParallel(type, new Event(type));
        }
        return this.emitter.emitParallel(type, new CustomEvent(type, { detail: detail }));
    };
    EventTargetLike.prototype.emitSerial = function (type, detail) {
        if (detail == null) {
            return this.emitter.emitSerial(type, new Event(type));
        }
        return this.emitter.emitSerial(type, new CustomEvent(type, { detail: detail }));
    };
    EventTargetLike.prototype.fetchEvent = function (event, error) {
        return Event_1.fetchEvent(this, event, error);
    };
    /**
     * addListener|removeListener できる target に対して event 時に自動で removeListener される listener を addListener する
     * @example
     * ```ts
     * const onerror = evTargetLike.autoEventListener("error");
     * const body = document.body;
     * const $ = onerror(body.addEventListener, body.removeEventListener);
     * $(body)
     *   .on("click", console.log)
     *   .on("load", console.log);
     * // document.body.onerror 時に上記イベントハンドラを自動的に removeEventListener する
     * ```
     */
    EventTargetLike.prototype.autoEventListener = function (remove_event) {
        var _this = this;
        return function (on, off) {
            return function (target) {
                var $ = {
                    on: function (ev, listener) {
                        on.call(target, ev, listener);
                        _this.fetchEvent(remove_event)
                            .then(function () {
                            off.call(target, ev, listener);
                        });
                        return $;
                    }
                };
                return $;
            };
        };
    };
    return EventTargetLike;
}());
exports.EventTargetLike = EventTargetLike;
