"use strict";
var events_1 = require("events");
var EventTargetLike = (function () {
    function EventTargetLike() {
        this.emitter = new events_1.EventEmitter();
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
    EventTargetLike.prototype.fetchEvent = function (event, error) {
        return fetchEvent(this, event, error);
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
function fetchEvent(target, event, error) {
    return createFromEvent(target.addEventListener, target.removeEventListener)(target, event, error);
}
exports.fetchEvent = fetchEvent;
/**
 * @example
 * ```ts
 * (async ()=>{
 *   const waitEvent = createFromEvent(EventTarget.prototype.addEventListener, EventTarget.prototype.removeEventListener);
 *   const reader = new FileReader();
 *   reader.readAsText(textfile_blob);
 *   const text = await waitEvent(reader, "loadend", "error");
 *   console.log(text);
 * })().catch((err: ErrorEvent)=>{
 *   console.error(err.error);
 * });
 * ```
 */
function createFromEvent(addListener, removeListener) {
    return function (target, event, error) {
        return new Promise(function (resolve, reject) {
            addListener.call(target, event, _resolve);
            if (typeof error === "string") {
                addListener.call(target, error, _reject);
            }
            function _removeListener() {
                removeListener.call(target, event, _resolve);
                if (typeof error === "string") {
                    removeListener.call(target, error, _reject);
                }
            }
            function _resolve(ev) {
                _removeListener();
                resolve(ev);
            }
            function _reject(ev) {
                _removeListener();
                reject(ev);
            }
        });
    };
}
exports.createFromEvent = createFromEvent;
