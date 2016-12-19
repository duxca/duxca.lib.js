"use strict";
var xstream_1 = require("xstream");
var dropRepeats_1 = require("xstream/extra/dropRepeats");
var events_1 = require("events");
var Algorithm_1 = require("./Algorithm");
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
    console.warn("reconnect is deprecated", new Error("").stack);
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
        error: function (err) { setTimeout(function () { throw err; }, 0); }
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
function fromMediaElement(video) {
    var timeupdate$ = fromEvent(video, 'timeupdate');
    var seeked$ = fromEvent(video, 'seeked');
    var playing$ = fromEvent(video, 'playing');
    var seeking$ = fromEvent(video, 'seeking');
    var play$ = fromEvent(video, 'play');
    var pause$ = fromEvent(video, 'pause');
    var ended$ = fromEvent(video, 'ended');
    var state$ = xstream_1.default.merge(pause$, play$, ended$)
        .map(function (ev) { return ev.type; })
        .startWith("pause")
        .compose(dropRepeats_1.default());
    return { timeupdate$: timeupdate$, seeked$: seeked$, playing$: playing$, seeking$: seeking$, play$: play$, pause$: pause$, ended$: ended$, state$: state$ };
}
exports.fromMediaElement = fromMediaElement;
function xsasync(generatorFunc) {
    /*
  usage:
  
  const hoge = xsasync(function * _hoge(a: string): Iterator<Stream<string|number>> {
    console.log("a", a);
    const b: string = yield xs.of("b");
    console.log("b", b);
    const c: number = yield xs.of(0);
    console.log("c", c);
    return "fin";
  });
  
  hoge("a").addListener({next:console.log})
  */
    return function (arg) {
        var generator = generatorFunc(arg);
        return next(null);
        function next(arg) {
            var result = generator.next(arg);
            if (result.done) {
                if (result.value instanceof xstream_1.Stream) {
                    return result.value;
                }
                else {
                    return xstream_1.default.of(result.value); // return で done されたときは async に習って モナド で包む
                }
            }
            else {
                return result.value.map(next).flatten();
            }
        }
    };
}
exports.xsasync = xsasync;
function fromPromise(prm, replacer) {
    if (replacer === void 0) { replacer = function (err) { console.error(err); }; }
    var id = Algorithm_1.gensym();
    return xstream_1.default.fromPromise(prm.catch(function (err) {
        var alt = replacer(err);
        if (alt !== undefined) {
            return alt;
        }
        return id;
    })).filter(function (a) { return a !== id; });
}
exports.fromPromise = fromPromise;
