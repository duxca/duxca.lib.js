import xs, {Stream} from 'xstream';
import sampleCombine from "xstream/extra/sampleCombine";
import dropRepeats from "xstream/extra/dropRepeats";
import delay from 'xstream/extra/delay'

import {EventEmitter} from "events";

import * as $ from "jquery";



import {Fisheye2Panorama, convertCnvCoord2CameraCoord, calcZoom} from "./Fisheye2Panorama";




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