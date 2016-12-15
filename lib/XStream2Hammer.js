"use strict";
var xstream_1 = require("xstream");
var sampleCombine_1 = require("xstream/extra/sampleCombine");
var events_1 = require("events");
var Hammer = require("hammerjs");
var XStream_1 = require("./XStream");
var XStream2JQuery_1 = require("./XStream2JQuery");
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
        .compose(XStream_1.reconnect).map(function (_a) {
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
        .compose(XStream_1.reconnect);
    var tid = 0;
    var emitter = new events_1.EventEmitter();
    XStream_1.runEff(xstream_1.default.merge(
    // panstart 時に以前のスクロールを停止 ・・・したいが panstart は反応が遅いので touchstart を取る
    xstream_1.default.merge(XStream2JQuery_1.on($elm, "touchstart"), XStream2JQuery_1.on($elm, "mousedown")).map(function () { clearTimeout(tid); }), 
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
