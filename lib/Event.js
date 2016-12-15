"use strict";
var $ = require("jquery");
var events_1 = require("events");
function convertToJQueryEvent(ev) {
    return new $.Event(ev);
}
exports.convertToJQueryEvent = convertToJQueryEvent;
function getEventPosition(ev) {
    if (/^touch/.test(ev.type)) {
        if (ev.originalEvent.touches.length > 0) {
            var pageX_1 = ev.originalEvent.touches[0].pageX;
            var pageY_1 = ev.originalEvent.touches[0].pageY;
            var clientX_1 = ev.originalEvent.touches[0].clientX;
            var clientY_1 = ev.originalEvent.touches[0].clientY;
            var screenX_1 = ev.originalEvent.touches[0].screenX;
            var screenY_1 = ev.originalEvent.touches[0].screenY;
            return { pageX: pageX_1, pageY: pageY_1, clientX: clientX_1, clientY: clientY_1, screenX: screenX_1, screenY: screenY_1 };
        }
        // touchend のときは touches.length === 0 
        return null;
    }
    var pageX = ev.pageX;
    var pageY = ev.pageY;
    var clientX = ev.clientX;
    var clientY = ev.clientY;
    var screenX = ev.screenX;
    var screenY = ev.screenY;
    return { pageX: pageX, pageY: pageY, clientX: clientX, clientY: clientY, screenX: screenX, screenY: screenY };
}
exports.getEventPosition = getEventPosition;
function relEventPosition(pos1, pos2) {
    var rel = { clientX: 0, clientY: 0, pageX: 0, pageY: 0, screenX: 0, screenY: 0 }; // ホールドから動いた量
    Object.keys(rel).forEach(function (key) { rel[key] = pos2[key] - pos1[key]; }); // mousedown 時の位置と moudemove 時の相対距離
    return rel;
}
exports.relEventPosition = relEventPosition;
function fromEvent(target, name, opt) {
    /*
     * EventTarget からのイベントから Promise を作り出す
     */
    var _opt = opt == null ? {} : opt;
    var timeout = _opt.timeout;
    var rejectable = _opt.rejectable == null ? "error" : _opt.rejectable;
    return new Promise(function (resolve, reject) {
        if (timeout != null) {
            setTimeout(reject.bind(this, new Error("promise timeout")));
        }
        if (target instanceof events_1.EventEmitter) {
            target.addListener(name, _resolve);
            target.addListener(rejectable, _reject);
        }
        else {
            target.addEventListener(name, _resolve);
            target.addEventListener(rejectable, _reject);
        }
        return;
        function removeListeners() {
            if (target instanceof events_1.EventEmitter) {
                target.removeListener(name, _resolve);
                target.removeListener(rejectable, _reject);
            }
            else {
                target.removeEventListener(name, _resolve);
                target.removeEventListener(rejectable, _reject);
            }
        }
        function _resolve(a) {
            removeListeners();
            return resolve(a);
        }
        function _reject(a) {
            removeListeners();
            return reject(a);
        }
    });
}
exports.fromEvent = fromEvent;
function stopPrevent(ev) {
    return stopPropagation(preventDefault(ev));
}
exports.stopPrevent = stopPrevent;
function stopPropagation(ev) {
    ev.stopPropagation();
    return ev;
}
exports.stopPropagation = stopPropagation;
function preventDefault(ev) {
    ev.preventDefault();
    return ev;
}
exports.preventDefault = preventDefault;
