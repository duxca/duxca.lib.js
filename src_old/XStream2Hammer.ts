import xs, {Stream} from 'xstream';
import sampleCombine from "xstream/extra/sampleCombine";
import dropRepeats from "xstream/extra/dropRepeats";
import delay from 'xstream/extra/delay'

import {EventEmitter} from "events";

import * as $ from "jquery";

import * as Hammer from "hammerjs";

import {reconnect, runEff} from "./XStream";
import {on} from "./XStream2JQuery";



export type HammerEvents = "tap" | "doubletap"
                         | "pan" | "panstart" | "panmove" | "panend" | "pancancel" | "panup" | "pandown" | "panleft" | "panright"
                         | "pinch" | "pinchstart" | "pinchmove" | "pinchend" | "pinchcancel" | "pinchin" | "pinchout"
                         | "rotate" | "rotatestart" | "rotatemove" | "rotateend" | "rotatecancel"
                         | "swipe" | "swipeleft" | "swiperight" | "swipeup" | "swipedown"
                         | "press" | "pressup";


export function ham($elm: JQuery, event: HammerEvents): Stream<HammerInput> ;
export function ham($elm: JQuery, event: HammerEvents, selector: string): Stream<HammerInput> ;
export function ham($elm: JQuery, event: HammerEvents, options: HammerOptions): Stream<HammerInput> ;
export function ham($elm: JQuery, event: HammerEvents, selector?: string|HammerOptions, options?: HammerOptions): Stream<HammerInput> {
  /*
  hammerjs と jquery と xstream をつなげる
  jquery で選択した HTMLElement に対して hammerjs でタッチイベントキャプチャして xstream でイベントストリームを返す
  */
  let opt: HammerOptions = {};
  var slct: string = "";
  if(typeof selector === "string"){
    opt = options == null ? {} : options;
    slct = selector;
  }else if(selector != null){
    opt = selector;
  }
  const emitter = new EventEmitter();
  function delegater(next: (ev: HammerInput)=> void, ev: HammerInput){
    //console.log("delegater", event, ev.target, $elm, slct, $elm.find(slct).length)
    if( $elm.find(slct).length >= 0 ) {
      //ev.srcEvent.stopPropagation();
      next(ev);
    }
  }
  return xs.create<HammerInput>({
    start: (o)=>{
      const next = o.next.bind(o);
      $elm.each((i, elm)=>{
        const ham = new Hammer(<HTMLElement>elm, opt);
        if(/^pinch/.test(event)){
          ham.get("pinch").set({enable: true});
        }
        if(slct.length === 0){
          // デリゲートなし
          ham.on(event, next);
          emitter.on("stop", function _listener(){
            ham.off(event, next);
            emitter.removeListener("stop", _listener);
          });
        }else{
          // デリゲートあり
          const _next = delegater.bind(null, next);
          ham.on(event, _next);
          emitter.on("stop", function _listener(){
            ham.off(event, _next);
            emitter.removeListener("stop", _listener);
          });
        }
      });
    },
    stop: ()=>{
      emitter.emit("stop");
    },
  });//.map((ev)=>{console.log(ev.type, ev.srcEvent.target);return ev;}); // for debug
}




export function createZoomStream($elm: JQuery): Stream<{centerX: number, centerY: number, scale: number}> {
  const start$ = ham($elm, "pinchstart");
  const move$  = ham($elm, "pinchmove");
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
    .map((start)=>
      move$
        .fold(({pre, delta}, cur)=>{
          const scale = cur.scale/pre.scale; // scale の delta
          return {pre: cur, delta: {centerX: cur.center.x, centerY: cur.center.y, scale}};
        }, {pre: start, delta:{centerX: 0, centerY: 0, scale: 1}}) )
    .compose(reconnect).map(({delta})=> delta);
}


export function createInertiaScrollStream(
  $elm: JQuery,
  ACCELERATION= 0.001,
  STEP_MILLIS= 30
): Stream<{deltaX: number, deltaY: number}> { // イベント間の delta 移動量
  /*
  $elm の hammer input イベントを監視して慣性つきのスクロール量を発生させる
  $elm そのものの位置については変更しない。
  */

  const panstart$ = ham($elm, "panstart");
  const panmove$  = ham($elm, "panmove");
  const panend$   = ham($elm, "panend");

  const move$   = panstart$
    .map((start)=>
      panmove$
        .fold(({pre, delta}, cur)=>{
          const x = pre.deltaX - cur.deltaX; // 1フレーム毎のdelta
          const y = pre.deltaY - cur.deltaY;
          return {pre:cur, delta: {x, y}};
        }, {pre: start, delta:{x:0, y:0}}) )
    .compose(reconnect);

  let tid: any = 0;
  const emitter = new EventEmitter();
  runEff(xs.merge(
    // panstart 時に以前のスクロールを停止 ・・・したいが panstart は反応が遅いので touchstart を取る
    xs.merge(on($elm, "touchstart"), on($elm, "mousedown")).map(()=>{ clearTimeout(tid); }),
    // panend 時に慣性スクロールストリームを発生
    panend$
      .compose(sampleCombine(move$))
      .map(([ev, {pre, delta}])=>{
        let lastTime  = Date.now();
        let velocityX = ev.velocityX !== 0 ? -ev.velocityX : 0.000001; // ゼロ除算対策
        let velocityY = ev.velocityY !== 0 ? -ev.velocityY : 0.000001; // ゼロ除算対策
        const flagX = velocityX / Math.abs(velocityX); // 現在の速度ベクトルの向き
        const flagY = velocityY / Math.abs(velocityY); // 現在の速度ベクトルの向き
        // 動摩擦抵抗
        let accelerationX = -flagX * ACCELERATION; //　等加速度ベクトル(速度ベクトルに対してマイナスで減速)
        let accelerationY = -flagY * ACCELERATION; //　等加速度ベクトル(速度ベクトルに対してマイナスで減速)
        // 慣性を発生させる
        function _loop() {
          // フレーム毎の速度と位置の計算
          const now = Date.now();
          const deltaT = now - lastTime;
          const deltaX = velocityX * deltaT + 1/2 * accelerationX * deltaT * deltaT;
          const deltaY = velocityY * deltaT + 1/2 * accelerationY * deltaT * deltaT;
          velocityX = velocityX + accelerationX * deltaT; // 本当は 動摩擦係数*重力加速度*t 
          velocityY = velocityY + accelerationY * deltaT;
          if(flagX * velocityX <= 0.0001){ accelerationX = 0; } // 十分減速したら加速度をゼロにする
          if(flagY * velocityY <= 0.0001){ accelerationY = 0; } // 静止摩擦
          if( accelerationX !== 0 || accelerationY !== 0){
            tid = setTimeout(_loop, STEP_MILLIS); // 十分早いうちはスクロール継続
          }
          lastTime = now;
          emitter.emit("delta", {deltaX, deltaY});
        }
        _loop();
      })
  ));

  // 慣性ストリームジェネレータ
  const inertia$ = xs.create<{deltaX: number, deltaY: number}>({
    start: (o)=>{
      const next = o.next.bind(o);
      emitter.on("delta", next);
      emitter.on("stop", function _listener(){
        emitter.removeListener("delta", next);
        emitter.removeListener("stop", _listener);
        clearTimeout(tid);
      });
    },
    stop: ()=>{ emitter.emit("stop"); },
  });

  return xs.merge(
    move$.map(({delta})=> ({deltaX: delta.x, deltaY: delta.y})),
    inertia$
  ).map(({deltaX, deltaY})=> ({deltaX, deltaY: -deltaY}));
}
