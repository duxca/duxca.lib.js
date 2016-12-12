"use strict";
var xstream_1 = require('xstream');
var sampleCombine_1 = require("xstream/extra/sampleCombine");
var dropRepeats_1 = require("xstream/extra/dropRepeats");
var events_1 = require("events");
var Hammer = require("hammerjs");
var Fisheye2Panorama_1 = require("./Fisheye2Panorama");
function ham($elm, event, selector, options) {
    /*
    hammerjs と jquery と xstream をつなげる
    jquery で選択した HTMLElement に対して hammerjs でタッチイベントキャプチャして xstream でイベントストリームを返す
    */
    var opt = {};
    var slct = "";
    if (typeof selector === "string") {
        opt = options == null ? {} : options;
        slct = selector;
    }
    else if (selector != null) {
        opt = selector;
    }
    var emitter = new events_1.EventEmitter();
    function delegater(next, ev) {
        //console.log("delegater", event, ev.target, $elm, slct, $elm.find(slct).length)
        if ($elm.find(slct).length >= 0) {
            //ev.srcEvent.stopPropagation();
            next(ev);
        }
    }
    return xstream_1.default.create({
        start: function (o) {
            var next = o.next.bind(o);
            $elm.each(function (i, elm) {
                var ham = new Hammer(elm, opt);
                if (/^pinch/.test(event)) {
                    ham.get("pinch").set({ enable: true });
                }
                if (slct.length === 0) {
                    // デリゲートなし
                    ham.on(event, next);
                    emitter.on("stop", function _listener() {
                        ham.off(event, next);
                        emitter.removeListener("stop", _listener);
                    });
                }
                else {
                    // デリゲートあり
                    var _next_1 = delegater.bind(null, next);
                    ham.on(event, _next_1);
                    emitter.on("stop", function _listener() {
                        ham.off(event, _next_1);
                        emitter.removeListener("stop", _listener);
                    });
                }
            });
        },
        stop: function () {
            emitter.emit("stop");
        },
    }); //.map((ev)=>{console.log(ev.type, ev.srcEvent.target);return ev;}); // for debug
}
exports.ham = ham;
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
    return fromEvent(window, "resize").map(function () {
        return $elm.width() / $elm.offsetParent().width();
    }).startWith($elm.width() / $elm.offsetParent().width());
}
exports.createResizeRatioStream = createResizeRatioStream;
function createZoomStream($elm) {
    var start$ = ham($elm, "pinchstart");
    var move$ = ham($elm, "pinchmove");
    /*
    // for debug
    const start$ = xs.of({scale: 1, center: {x: 0, y: 0}}).compose(delay(1000));
    const move$  = xs.periodic(100);
      .compose(delay(1000))
      .map((i)=>{
        // 1 ~ 2 で
        const scale = ((Math.sin(i/10)/2)+1.5);
        console.log("sin", scale)
        return {scale, center: {x: 200, y: 64}};
      });
    */
    // 1 < scale で拡大 (pinchin)
    // 0 < scale < 1 で縮小 (pinchout)
    return start$
        .map(function (start) {
        return move$
            .fold(function (_a, cur) {
            var pre = _a.pre, delta = _a.delta;
            var scale = cur.scale / pre.scale; // scale の delta
            return { pre: cur, delta: { centerX: cur.center.x, centerY: cur.center.y, scale: scale } };
        }, { pre: start, delta: { centerX: 0, centerY: 0, scale: 1 } });
    })
        .compose(reconnect).map(function (_a) {
        var delta = _a.delta;
        return delta;
    });
}
exports.createZoomStream = createZoomStream;
function createInertiaScrollStream($elm, ACCELERATION, STEP_MILLIS) {
    /*
    $elm の hammer input イベントを監視して慣性つきのスクロール量を発生させる
    $elm そのものの位置については変更しない。
    */
    if (ACCELERATION === void 0) { ACCELERATION = 0.001; }
    if (STEP_MILLIS === void 0) { STEP_MILLIS = 30; }
    var panstart$ = ham($elm, "panstart");
    var panmove$ = ham($elm, "panmove");
    var panend$ = ham($elm, "panend");
    var move$ = panstart$
        .map(function (start) {
        return panmove$
            .fold(function (_a, cur) {
            var pre = _a.pre, delta = _a.delta;
            var x = pre.deltaX - cur.deltaX; // 1フレーム毎のdelta
            var y = pre.deltaY - cur.deltaY;
            return { pre: cur, delta: { x: x, y: y } };
        }, { pre: start, delta: { x: 0, y: 0 } });
    })
        .compose(reconnect);
    var tid = 0;
    var emitter = new events_1.EventEmitter();
    runEff(xstream_1.default.merge(
    // panstart 時に以前のスクロールを停止 ・・・したいが panstart は反応が遅いので touchstart を取る
    xstream_1.default.merge(on($elm, "touchstart"), on($elm, "mousedown")).map(function () { clearTimeout(tid); }), 
    // panend 時に慣性スクロールストリームを発生
    panend$
        .compose(sampleCombine_1.default(move$))
        .map(function (_a) {
        var ev = _a[0], _b = _a[1], pre = _b.pre, delta = _b.delta;
        var lastTime = Date.now();
        var velocityX = ev.velocityX !== 0 ? -ev.velocityX : 0.000001; // ゼロ除算対策
        var velocityY = ev.velocityY !== 0 ? -ev.velocityY : 0.000001; // ゼロ除算対策
        var flagX = velocityX / Math.abs(velocityX); // 現在の速度ベクトルの向き
        var flagY = velocityY / Math.abs(velocityY); // 現在の速度ベクトルの向き
        // 動摩擦抵抗
        var accelerationX = -flagX * ACCELERATION; //　等加速度ベクトル(速度ベクトルに対してマイナスで減速)
        var accelerationY = -flagY * ACCELERATION; //　等加速度ベクトル(速度ベクトルに対してマイナスで減速)
        // 慣性を発生させる
        function _loop() {
            // フレーム毎の速度と位置の計算
            var now = Date.now();
            var deltaT = now - lastTime;
            var deltaX = velocityX * deltaT + 1 / 2 * accelerationX * deltaT * deltaT;
            var deltaY = velocityY * deltaT + 1 / 2 * accelerationY * deltaT * deltaT;
            velocityX = velocityX + accelerationX * deltaT; // 本当は 動摩擦係数*重力加速度*t 
            velocityY = velocityY + accelerationY * deltaT;
            if (flagX * velocityX <= 0.0001) {
                accelerationX = 0;
            } // 十分減速したら加速度をゼロにする
            if (flagY * velocityY <= 0.0001) {
                accelerationY = 0;
            } // 静止摩擦
            if (accelerationX !== 0 || accelerationY !== 0) {
                tid = setTimeout(_loop, STEP_MILLIS); // 十分早いうちはスクロール継続
            }
            lastTime = now;
            emitter.emit("delta", { deltaX: deltaX, deltaY: deltaY });
        }
        _loop();
    })));
    // 慣性ストリームジェネレータ
    var inertia$ = xstream_1.default.create({
        start: function (o) {
            var next = o.next.bind(o);
            emitter.on("delta", next);
            emitter.on("stop", function _listener() {
                emitter.removeListener("delta", next);
                emitter.removeListener("stop", _listener);
                clearTimeout(tid);
            });
        },
        stop: function () { emitter.emit("stop"); },
    });
    return xstream_1.default.merge(move$.map(function (_a) {
        var delta = _a.delta;
        return ({ deltaX: delta.x, deltaY: delta.y });
    }), inertia$).map(function (_a) {
        var deltaX = _a.deltaX, deltaY = _a.deltaY;
        return ({ deltaX: deltaX, deltaY: -deltaY });
    });
}
exports.createInertiaScrollStream = createInertiaScrollStream;
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
function touchstart($elm, selector) {
    return xstream_1.default.merge(on($elm, "mousedown", selector), on($elm, "touchstart", selector));
}
exports.touchstart = touchstart;
function touchend($elm, selector) {
    return xstream_1.default.merge(on($elm, "touchend", selector), on($elm, "touchcancel"), on($elm, "mouseup", selector));
}
exports.touchend = touchend;
function updateCameraRect(canvasSize$, // window.onresize したいとき
    panoramaSize$, // world 座標系上の panorama size
    cameraRect$, // world 座標系上の 位置 x,y(カメラ中心基準) と大きさ width|height, clipping したいときに便利
    delta$, // 前回のtouchmove位置からの delta、 canvas座標
    zoom$) {
    var _cameraRect$ = xstream_1.default.combine(canvasSize$, panoramaSize$, cameraRect$)
        .map(function (_a) {
        var cnv = _a[0], pano = _a[1], cam = _a[2];
        var camD$ = delta$
            .map(function (_a) {
            var deltaX = _a.deltaX, deltaY = _a.deltaY;
            // canvas 座標系 -> camera 座標系
            var _b = Fisheye2Panorama_1.convertCnvCoord2CameraCoord(cnv, cam, { x: deltaX, y: deltaY }), _deltaX = _b.x, _deltaY = _b.y;
            var x = cam.x, y = cam.y, width = cam.width, height = cam.height;
            return {
                x: x + _deltaX,
                y: y + _deltaY,
                width: width,
                height: height
            };
        });
        var camZ$ = zoom$
            .map(function (_a) {
            var centerX = _a.centerX, centerY = _a.centerY, scale = _a.scale;
            var _b = Fisheye2Panorama_1.convertCnvCoord2CameraCoord(cnv, cam, { x: centerX, y: centerY }), _cX = _b.x, _cY = _b.y;
            var _cam = Fisheye2Panorama_1.calcZoom(cam, { x: _cX, y: _cY, scale: scale });
            return _cam;
        });
        return xstream_1.default.merge(camD$, camZ$);
    }).compose(reconnect);
    return _cameraRect$;
}
exports.updateCameraRect = updateCameraRect;
