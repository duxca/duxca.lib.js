"use strict";
var xstream_1 = require('xstream');
var events_1 = require("events");
var XStream_1 = require("./XStream");
function on($elm, event, selector) {
    /*
    jquery の on から stream を発生させる
    */
    var emitter = new events_1.EventEmitter();
    return xstream_1.default.create({
        start: function (o) {
            var next = o.next.bind(o);
            if (typeof selector === "string") {
                $elm.on(event, selector, next);
                emitter.on("stop", function _listener() {
                    $elm.off(event, selector, next);
                    emitter.removeListener("stop", _listener);
                });
            }
            else {
                $elm.on(event, next);
                emitter.on("stop", function _listener() {
                    $elm.off(event, next);
                    emitter.removeListener("stop", _listener);
                });
            }
        },
        stop: function () {
            emitter.emit("stop");
        },
    }); //.map((ev)=>{console.log(ev["type"]);return ev;});
}
exports.on = on;
function createResizeRatioStream($elm) {
    /*
     css width が 100% なときの 現在の大きさ / 本来の大きさ 比率を返す
    */
    return XStream_1.fromEvent(window, "resize").map(function () {
        return $elm.width() / $elm.offsetParent().width();
    }).startWith($elm.width() / $elm.offsetParent().width());
}
exports.createResizeRatioStream = createResizeRatioStream;
function touchstart($elm, selector) {
    return xstream_1.default.merge(on($elm, "mousedown", selector), on($elm, "touchstart", selector));
}
exports.touchstart = touchstart;
function touchend($elm, selector) {
    return xstream_1.default.merge(on($elm, "touchend", selector), on($elm, "touchcancel"), on($elm, "mouseup", selector));
}
exports.touchend = touchend;
