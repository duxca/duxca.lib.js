import xs, {Stream} from 'xstream';
import sampleCombine from "xstream/extra/sampleCombine";
import dropRepeats from "xstream/extra/dropRepeats";
import delay from 'xstream/extra/delay'

import {EventEmitter} from "events";

import * as $ from "jquery";

import {gensym} from "./Algorithm";


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
    return xs.merge(input, <Stream<T>><any>flush$)
      .fold<(T)[]>((lst, o)=> o != null ? lst.concat(o): [], []) // flush の時に バッファ 初期化
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
  console.warn("reconnect is deprecated", new Error("").stack);
  
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


export function adapter<Sources, Sinks>(main: (sources: Sources)=>Sinks) {
  return function (sources: Sources): { [key: string]: Stream<any>; } {
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

export function runEff(eff$: Stream<any>): void {
  eff$.addListener({
    next:     ()=>{},//console.info.bind(console, "next"),
    complete: ()=>{ /*console.warn("runEff: complete");*/ },
    error:    (err: any)=>{ setTimeout(()=>{ throw err; }, 0); }
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

export function fromMediaElement(video: HTMLMediaElement): {
  timeupdate$: Stream<Event>;
  seeked$: Stream<Event>;
  playing$: Stream<Event>;
  seeking$: Stream<Event>;
  play$: Stream<Event>;
  pause$: Stream<Event>;
  ended$: Stream<Event>;
  state$: Stream<MediaState>;
} {    
  const timeupdate$ = fromEvent<Event>(video, 'timeupdate');
  const seeked$     = fromEvent<Event>(video, 'seeked'    );
  const playing$    = fromEvent<Event>(video, 'playing'   );
  const seeking$    = fromEvent<Event>(video, 'seeking'   );
  const play$       = fromEvent<Event>(video, 'play'      );
  const pause$      = fromEvent<Event>(video, 'pause'     );
  const ended$      = fromEvent<Event>(video, 'ended'     );
  const state$      = xs.merge(pause$, play$, ended$)
    .map((ev)=> <MediaState>ev.type )
    .startWith("pause")
    .compose(dropRepeats());

  return {timeupdate$, seeked$, playing$, seeking$, play$, pause$, ended$, state$};
}



export function xsasync<RET, S, T>(generatorFunc: (arg?: S)=> Iterator<Stream<T>> ): (arg?: S)=> Stream<RET> {
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
  return function (arg?: S): Stream<RET> {
    const generator = generatorFunc(arg);
    return <Stream<RET>>next(null);
    function next(arg: T|null): Stream<T|RET>{
      const result = generator.next(arg);
      if (result.done) {
        if (result.value instanceof Stream) {
          return result.value;
        }else{
          return xs.of(result.value); // return で done されたときは async に習って モナド で包む
        }
      }else{
        return result.value.map(next).flatten(); }
    }
  }
}


export function fromPromise<T>(prm: Promise<T>, replacer=(err:any):T|void=>{ console.error(err); }): Stream<T> {
  const id = gensym();
  return <Stream<T>>xs.fromPromise(
    prm.catch((err)=>{
      const alt = replacer(err);
      if(alt !== undefined){
        return alt;
      }
      return id;
    })
  ).filter((a)=> a !== id);
}
