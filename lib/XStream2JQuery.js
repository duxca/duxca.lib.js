"use strict";
var xstream_1 = require("xstream");
var events_1 = require("events");
var $ = require("jquery");
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
function touchmove($elm, selector) {
    return xstream_1.default.merge(on($elm, "touchmove", selector), on($elm, "mousemove"));
}
exports.touchmove = touchmove;
function touchend($elm, selector) {
    return xstream_1.default.merge(on($elm, "touchend", selector), on($elm, "touchcancel"), on($elm, "mouseup", selector));
}
exports.touchend = touchend;
function getItem(storage, key, tester, _default) {
    try {
        var val = storage.getItem(key);
        var o = JSON.parse(val); // パースしてみる
        if (tester(o)) {
            return o;
        }
        else {
            throw {};
        }
    }
    catch (err) {
        return _default;
    }
}
exports.getItem = getItem;
function getInputStreamWithStorage(Storage, $elm, key, event) {
    if (event === void 0) { event = "input"; }
    var val = Storage.getItem(key);
    var default_str = val !== null ? val : "" + $elm.val();
    var default_prim = JSON.parse(default_str);
    $elm.val(default_str);
    var ev$ = on($elm, event)
        .map(function (ev) {
        var str = "" + $(ev.target).val();
        Storage.setItem(key, str);
        try {
            return JSON.parse(str);
        }
        catch (err) {
            return default_prim;
        }
    })
        .startWith(default_prim);
    return ev$;
}
exports.getInputStreamWithStorage = getInputStreamWithStorage;
function getCombinedInputStreamWithStorage(Storage, o) {
    var opt$ = {};
    Object.keys(o).forEach(function (key) {
        var $elm = o[key];
        var ev$ = getInputStreamWithStorage(Storage, $elm, key);
        opt$[key] = ev$;
    });
    var keys = Object.keys(opt$);
    var opts$ = keys.map(function (key) { return opt$[key]; });
    var vals$ = xstream_1.default.combine.apply(xstream_1.default, opts$);
    var ret$ = vals$.map(function (vals) {
        return keys.reduce(function (o, key, i) { return (o[key] = vals[i], o); }, {});
    });
    return ret$;
}
exports.getCombinedInputStreamWithStorage = getCombinedInputStreamWithStorage;
function getCombinedSelectStreamWithStorage(Storage, o) {
    var opt$ = {};
    Object.keys(o).forEach(function (key) {
        var $elm = o[key].$;
        var opts = o[key].opt;
        var ids = Object.keys(opts);
        $elm.empty(); // 以前の状態を DOM から削除
        if (ids.length === 0) {
            opt$[key] = xstream_1.default.never();
        }
        else {
            var $flag_1 = $(document.createDocumentFragment());
            ids.forEach(function (id) {
                var label = opts[id];
                $("<option />")
                    .val(id)
                    .html(label)
                    .appendTo($flag_1);
            });
            $elm.append($flag_1);
            var couho = Storage.getItem(key); // 以前の起動時の値が使えそうなら使う
            var default_id = couho !== null ? couho : ids[0];
            $elm.val(default_id); // デフォルト値を DOM に反映
            // イベントストリームに登録
            var ev$ = on($elm, "change")
                .map(function (ev) { return "" + $(ev.target).val(); }) // val は id
                .startWith(default_id)
                .map(function (id) {
                Storage.setItem(key, id); // 変化したら書き込み
                return id;
            });
            opt$[key] = ev$;
        }
    });
    var keys = Object.keys(opt$);
    var opts$ = keys.map(function (key) { return opt$[key]; });
    var vals$ = xstream_1.default.combine.apply(xstream_1.default, opts$);
    var ret$ = vals$.map(function (vals) {
        return keys.reduce(function (o, key, i) { return (o[key] = vals[i], o); }, {});
    });
    return ret$;
}
exports.getCombinedSelectStreamWithStorage = getCombinedSelectStreamWithStorage;
