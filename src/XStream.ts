import xs, {Stream} from 'xstream';
import sampleCombine from "xstream/extra/sampleCombine";
import dropRepeats from "xstream/extra/dropRepeats";
import delay from 'xstream/extra/delay'

import {EventEmitter} from "events";

import * as $ from "jquery";

import * as Hammer from "hammerjs";

import {Fisheye2Panorama, convertCnvCoord2CameraCoord, calcZoom} from "./Fisheye2Panorama";

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


export function on($elm: JQuery, event: string, selector?: string): Stream<JQueryEventObject>{
  /*
  jquery の on から stream を発生させる
  */
  const emitter = new EventEmitter();
  return xs.create<JQueryEventObject>({
    start: (o)=>{
      const next = o.next.bind(o);
      if(typeof selector === "string"){
        $elm.on(event, selector, next);
        emitter.on("stop", function _listener(){
          $elm.off(event, selector, next);
          emitter.removeListener("stop", _listener);
        });
      }else{
        $elm.on(event, next);
        emitter.on("stop", function _listener(){
          $elm.off(event, next);
          emitter.removeListener("stop", _listener);
        });
      }
    },
    stop: ()=>{
      emitter.emit("stop");
    },
  })//.map((ev)=>{console.log(ev["type"]);return ev;});
}


export function createResizeRatioStream($elm: JQuery): Stream<number> {
  /*
   css width が 100% なときの 現在の大きさ / 本来の大きさ 比率を返す
  */
  return fromEvent(window, "resize").map(()=>{
    return $elm.width()/$elm.offsetParent().width();
  }).startWith($elm.width()/$elm.offsetParent().width());
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


export function fromEvent<S>(target: EventTarget|EventEmitter, name: string): Stream<S> {
  /*
   * EventTarget からのイベントから Stream を作り出す
   */
  const emitter = new EventEmitter();
  return xs.create<S>({
    start: (o)=>{
      const next = o.next.bind(o);
      if(target instanceof EventEmitter){
        target.addListener(name, next);
        emitter.on("stop", function listener(){
          target.removeListener(name, next);
          emitter.removeListener("stop", listener);
        });
      }else{
        target.addEventListener(name, next);
        emitter.on("stop", function listener(){
          target.removeEventListener(name, next);
          emitter.removeListener("stop", listener);
        });
      }
    },
    stop: ()=>{ emitter.emit("stop"); },
  })
}



export function flushable_buffer(flush$: Stream<void>){
  return <T>(input: Stream<T>): Stream<T[]> =>{
    /*
     * input を溜め込み flush で溜め込んだのを返して内部状態は空になる
     */
    return xs.merge(input, flush$)
      .fold<T[]>((lst, o)=> o != null ? lst.concat(o): [], []) // flush の時に バッファ 初期化
      .fold<T[][]>((que, o)=>{ // 要素数 2 のキューを使って一つ前の値を返す
        que.push(o); // 新しいのを最後に追加
        if(que.length > 2) que.shift(); // 一番先頭 -> 一番古いのを消す
        return que;
      }, [])
      .filter((que)=> que.length == 2 && que[1].length == 0) // 新しいのが初期化されている -> 一つ前の値は最後の値
      .map((que)=> que[0]) // 古いのを返す
  }
}



export function reconnect<T>(nested$: Stream<Stream<T>>): Stream<T> {
  // stream の stream が送られてきたときに再接続する
  // flatten と似ているが...違いは？
  const emitter = new EventEmitter();
  emitter.setMaxListeners(1);
  
  runEff(nested$.map((newone$)=>{
    emitter.emit("clear");
    const listener = ({
      next: emitter.emit.bind(emitter, "update"),
      complete: ()=>{ /*console.warn("reconnect: complete");*/ },
      error:    (err: any)=>{
        console.error("reconnect: error", err);
        alert(err);
        alert(err.message);
        alert(err.stack);
      }
    });
    newone$.addListener(listener);
    emitter.on("clear", function _listener(){
      newone$.removeListener(listener);
      emitter.removeListener("clear", _listener);
    });
  }));
  
  const out$ = xs.create<T>({
    start: (o)=>{
      const next = o.next.bind(o);
      emitter.on("update", next);
    },
    stop: ()=>{
      emitter.removeAllListeners("update");
    }
  });
  return out$;
}


export function adapter<Sources, Sinks>(main: (sources: Sources)=>Sinks){
  return function (sources: Sources): {[key:string]: Stream<any>;} {
    const wrapped = <{[key: string]: Stream<any>}>{};
    const sinks = main(sources);
    Object.keys(sinks).forEach((key)=>{
      const val = sinks[key];
      wrapped[key] = xs.of(val);
    });
    return wrapped;
  };
}

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

export function runEff(eff$: Stream<void>): void {
  eff$.addListener({
    next:     ()=>{},//console.info.bind(console, "next"),
    complete: ()=>{ /*console.warn("runEff: complete");*/ },
    error:    (err: any)=>{
      console.error("runEff: error", err);
      alert(err.message);
      alert(err.stack); 
    }
  });
}

export function timeout(period: number): Stream<void> {
  // period < 0: 停止
  // period = 0: requestAnimationFrame
  // period > 0: setTimeout
  const emitter = new EventEmitter();
  const nextTick = period === 0 ? requestAnimationFrame :
                                  (fn)=> setTimeout(fn, period);
  const clearTick = period === 0 ? cancelAnimationFrame :
                                    clearTimeout;
  emitter.emit("clear");
  emitter.on("clear", function _listener(){
    clearTick(tid);
    emitter.removeListener("clear", _listener);
  });
  let tid: any = 0; 
  function _loop(){
    emitter.emit("timeout");
    tid = nextTick(_loop);
  }
  if(period >= 0){
    _loop();
  }
  const frame$ = fromEvent<void>(emitter, 'timeout');
  return frame$;
}




export type MediaState = "play"|"pause"|"ended";

export function fromMediaElement(
  sources: {
    play$: Stream<void>;
    pause$: Stream<void>;
    seek$?: Stream<number>; // 単位は秒。一気に飛ぶ
  }
): (video$: Stream<HTMLMediaElement>)=> {
  timeupdate$: Stream<Event>;
  seeked$: Stream<Event>;
  playing$: Stream<Event>;
  seeking$: Stream<Event>;
  play$: Stream<Event>;
  pause$: Stream<Event>;
  ended$: Stream<Event>;
  state$: Stream<MediaState>;
} {
  return function(video$: Stream<HTMLMediaElement>){
    sources.seek$ = sources.seek$ == null ? xs.never() : sources.seek$;
    const emitter = new EventEmitter();

    video$ = video$.compose(dropRepeats())
      .fold<HTMLMediaElement>((old, video)=>{
        setTimeout(()=>{
          if(!old.paused){// 古い video は停止
            old.pause();
          }
        });
        
        return video;
      }, document.createElement("video"))


    runEff(xs.merge(
      sources.play$.compose(sampleCombine(video$)).map(([t, video])=>{ if( video.paused) video.play(); }),
      sources.pause$.compose(sampleCombine(video$)).map(([t, video])=>{ if(!video.paused) video.pause(); }),
      sources.seek$.compose(sampleCombine(video$)).map(([t, video])=>{
        if(t === video.duration){
          // video.currentTime = video.duration すると ended が発動してしまうがこれはシークバーの操作としてはよろしくない
          video.currentTime = t - 0.001; // ので絶対 ended させないマン
        }else{
          video.currentTime = t; // 一気に飛ぶ
        }
      }),
    ));
    
    const timeupdate$ = video$.map((video)=> fromEvent<Event>(video, 'timeupdate')).compose(reconnect);
    const seeked$     = video$.map((video)=> fromEvent<Event>(video, 'seeked'    )).compose(reconnect);
    const playing$    = video$.map((video)=> fromEvent<Event>(video, 'playing'   )).compose(reconnect);
    const seeking$    = video$.map((video)=> fromEvent<Event>(video, 'seeking'   )).compose(reconnect);
    const play$       = video$.map((video)=> fromEvent<Event>(video, 'play'      )).compose(reconnect);
    const pause$      = video$.map((video)=> fromEvent<Event>(video, 'pause'     )).compose(reconnect);
    const ended$      = video$.map((video)=> fromEvent<Event>(video, 'ended'     )).compose(reconnect);
    const state$      = video$.map(()=>
      xs.merge(pause$, play$, ended$)
        .map((ev)=> <MediaState>ev.type )
        .startWith("pause")
        .compose(dropRepeats()) )
      .compose(reconnect);

    return {timeupdate$, seeked$, playing$, seeking$, play$, pause$, ended$, state$};
  }
}

export function touchstart($elm: JQuery, selector?: string): Stream<JQueryEventObject>{
  return xs.merge(on($elm, "mousedown", selector), on($elm, "touchstart", selector));
}

export function touchend($elm: JQuery, selector?: string): Stream<JQueryEventObject>{
  return xs.merge(on($elm,  "touchend", selector), on($elm,  "touchcancel"), on($elm,  "mouseup", selector));
}



export function updateCameraRect(
  canvasSize$: Stream<{width: number, height: number}>, // window.onresize したいとき
  panoramaSize$: Stream<{width: number, height: number}>, // world 座標系上の panorama size
  cameraRect$: Stream<{x: number, y: number, width: number, height: number}>, // world 座標系上の 位置 x,y(カメラ中心基準) と大きさ width|height, clipping したいときに便利
  delta$: Stream<{deltaX: number, deltaY: number}>, // 前回のtouchmove位置からの delta、 canvas座標
  zoom$: Stream<{centerX: number, centerY: number, scale: number}>, // 前回の pinchmove からの zoom の delta、 (cx,cy)は canvas座標
): Stream<{x: number, y: number, width: number, height: number}> { // 拡大、平行移動が適用された新しい camera rect
const _cameraRect$ = xs.combine(canvasSize$, panoramaSize$, cameraRect$)
    .map(([cnv, pano, cam])=>{
      const camD$ = delta$
        .map(({deltaX, deltaY})=>{
          // canvas 座標系 -> camera 座標系
          const {x: _deltaX, y: _deltaY} = convertCnvCoord2CameraCoord(cnv, cam, {x: deltaX, y: deltaY});
          const {x, y, width, height} = cam;
          return {
            x: x + _deltaX,
            y: y + _deltaY,
            width,
            height
          };
        });
      const camZ$ = zoom$
        .map(({centerX, centerY, scale})=>{
          const {x: _cX, y: _cY} = convertCnvCoord2CameraCoord(cnv, cam, {x: centerX, y: centerY});
          const _cam = calcZoom(cam, {x: _cX, y: _cY, scale});
          return _cam;
        });
      return xs.merge(camD$, camZ$);
    }).compose(reconnect);
  return _cameraRect$;
}