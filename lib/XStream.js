"use strict";
var xstream_1 = require('xstream');
var sampleCombine_1 = require("xstream/extra/sampleCombine");
var dropRepeats_1 = require("xstream/extra/dropRepeats");
var events_1 = require("events");
function fromEvent(target, name) {
    /*
     * EventTarget からのイベントから Stream を作り出す
     */
    var emitter = new events_1.EventEmitter();
    return xstream_1.default.create({
        start: function (o) {
            var next = o.next.bind(o);
            if (target instanceof events_1.EventEmitter) {
                target.addListener(name, next);
                emitter.on("stop", function listener() {
                    target.removeListener(name, next);
                    emitter.removeListener("stop", listener);
                });
            }
            else {
                target.addEventListener(name, next);
                emitter.on("stop", function listener() {
                    target.removeEventListener(name, next);
                    emitter.removeListener("stop", listener);
                });
            }
        },
        stop: function () { emitter.emit("stop"); },
    });
}
exports.fromEvent = fromEvent;
function flushable_buffer(flush$) {
    return function (input) {
        /*
         * input を溜め込み flush で溜め込んだのを返して内部状態は空になる
         */
        return xstream_1.default.merge(input, flush$)
            .fold(function (lst, o) { return o != null ? lst.concat(o) : []; }, []) // flush の時に バッファ 初期化
            .fold(function (que, o) {
            que.push(o); // 新しいのを最後に追加
            if (que.length > 2)
                que.shift(); // 一番先頭 -> 一番古いのを消す
            return que;
        }, [])
            .filter(function (que) { return que.length == 2 && que[1].length == 0; }) // 新しいのが初期化されている -> 一つ前の値は最後の値
            .map(function (que) { return que[0]; }); // 古いのを返す
    };
}
exports.flushable_buffer = flushable_buffer;
function reconnect(nested$) {
    // stream の stream が送られてきたときに再接続する
    // flatten と似ているが...違いは？
    var emitter = new events_1.EventEmitter();
    emitter.setMaxListeners(1);
    runEff(nested$.map(function (newone$) {
        emitter.emit("clear");
        var listener = ({
            next: emitter.emit.bind(emitter, "update"),
            complete: function () { },
            error: function (err) {
                console.error("reconnect: error", err);
                alert(err);
                alert(err.message);
                alert(err.stack);
            }
        });
        newone$.addListener(listener);
        emitter.on("clear", function _listener() {
            newone$.removeListener(listener);
            emitter.removeListener("clear", _listener);
        });
    }));
    var out$ = xstream_1.default.create({
        start: function (o) {
            var next = o.next.bind(o);
            emitter.on("update", next);
        },
        stop: function () {
            emitter.removeAllListeners("update");
        }
    });
    return out$;
}
exports.reconnect = reconnect;
function adapter(main) {
    return function (sources) {
        var wrapped = {};
        var sinks = main(sources);
        Object.keys(sinks).forEach(function (key) {
            var val = sinks[key];
            wrapped[key] = xstream_1.default.of(val);
        });
        return wrapped;
    };
}
exports.adapter = adapter;
/*
// usage:

Cycle.run(adapter(main),  {
  DOM: (o$: Stream<{element$: Stream<HTMLElement>}>)=>{
    const element$ = o$.compose(reconnectUnwrap<HTMLElement>("element$"));
    element$.addListener({next: (element)=>{
      $("#container").append(element);
    }})
    return {};
  }
});

*/
function runEff(eff$) {
    eff$.addListener({
        next: function () { },
        complete: function () { },
        error: function (err) {
            console.error("runEff: error", err);
            alert(err.message);
            alert(err.stack);
        }
    });
}
exports.runEff = runEff;
function timeout(period) {
    // period < 0: 停止
    // period = 0: requestAnimationFrame
    // period > 0: setTimeout
    var emitter = new events_1.EventEmitter();
    var nextTick = period === 0 ? requestAnimationFrame :
        function (fn) { return setTimeout(fn, period); };
    var clearTick = period === 0 ? cancelAnimationFrame :
        clearTimeout;
    emitter.emit("clear");
    emitter.on("clear", function _listener() {
        clearTick(tid);
        emitter.removeListener("clear", _listener);
    });
    var tid = 0;
    function _loop() {
        emitter.emit("timeout");
        tid = nextTick(_loop);
    }
    if (period >= 0) {
        _loop();
    }
    var frame$ = fromEvent(emitter, 'timeout');
    return frame$;
}
exports.timeout = timeout;
function fromMediaElement(sources) {
    return function (video$) {
        sources.seek$ = sources.seek$ == null ? xstream_1.default.never() : sources.seek$;
        var emitter = new events_1.EventEmitter();
        video$ = video$.compose(dropRepeats_1.default())
            .fold(function (old, video) {
            setTimeout(function () {
                if (!old.paused) {
                    old.pause();
                }
            });
            return video;
        }, document.createElement("video"));
        runEff(xstream_1.default.merge(sources.play$.compose(sampleCombine_1.default(video$)).map(function (_a) {
            var t = _a[0], video = _a[1];
            if (video.paused)
                video.play();
        }), sources.pause$.compose(sampleCombine_1.default(video$)).map(function (_a) {
            var t = _a[0], video = _a[1];
            if (!video.paused)
                video.pause();
        }), sources.seek$.compose(sampleCombine_1.default(video$)).map(function (_a) {
            var t = _a[0], video = _a[1];
            if (t === video.duration) {
                // video.currentTime = video.duration すると ended が発動してしまうがこれはシークバーの操作としてはよろしくない
                video.currentTime = t - 0.001; // ので絶対 ended させないマン
            }
            else {
                video.currentTime = t; // 一気に飛ぶ
            }
        })));
        var timeupdate$ = video$.map(function (video) { return fromEvent(video, 'timeupdate'); }).compose(reconnect);
        var seeked$ = video$.map(function (video) { return fromEvent(video, 'seeked'); }).compose(reconnect);
        var playing$ = video$.map(function (video) { return fromEvent(video, 'playing'); }).compose(reconnect);
        var seeking$ = video$.map(function (video) { return fromEvent(video, 'seeking'); }).compose(reconnect);
        var play$ = video$.map(function (video) { return fromEvent(video, 'play'); }).compose(reconnect);
        var pause$ = video$.map(function (video) { return fromEvent(video, 'pause'); }).compose(reconnect);
        var ended$ = video$.map(function (video) { return fromEvent(video, 'ended'); }).compose(reconnect);
        var state$ = video$.map(function () {
            return xstream_1.default.merge(pause$, play$, ended$)
                .map(function (ev) { return ev.type; })
                .startWith("pause")
                .compose(dropRepeats_1.default());
        })
            .compose(reconnect);
        return { timeupdate$: timeupdate$, seeked$: seeked$, playing$: playing$, seeking$: seeking$, play$: play$, pause$: pause$, ended$: ended$, state$: state$ };
    };
}
exports.fromMediaElement = fromMediaElement;
