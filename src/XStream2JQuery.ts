import xs, {Stream} from 'xstream';
import sampleCombine from "xstream/extra/sampleCombine";
import dropRepeats from "xstream/extra/dropRepeats";
import delay from 'xstream/extra/delay'

import {EventEmitter} from "events";
import * as $ from "jquery";


import {fromEvent} from "./XStream";



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


export function touchstart($elm: JQuery, selector?: string): Stream<JQueryEventObject>{
  return xs.merge(on($elm, "mousedown", selector), on($elm, "touchstart", selector));
}

export function touchmove($elm: JQuery, selector?: string): Stream<JQueryEventObject>{
  return xs.merge(on($elm,  "touchmove", selector), on($elm,  "mousemove"));
}

export function touchend($elm: JQuery, selector?: string): Stream<JQueryEventObject>{
  return xs.merge(on($elm,  "touchend", selector), on($elm,  "touchcancel"), on($elm,  "mouseup", selector));
}


export type JSONString = string;
export interface JSONStorage {
  getItem(key: string): JSONString | null;
  setItem(key: string, data: JSONString): void;
}

export function getItem<T>(storage: JSONStorage, key: string, tester: (a: T)=> boolean, _default: T): T {
  try{
    const val = <any>storage.getItem(key);
    const o   = <T>JSON.parse(val); // パースしてみる
    if(tester(o)){
      return o;
    }else{
      throw {};
    }
  }catch(err){
    return _default;
  }
}

export function getInputStreamWithStorage
<T>(Storage: JSONStorage, $elm: JQuery, key: string, event="input"): Stream<T> {
  const val = Storage.getItem(key);
  const default_str = val !== null ? val : ""+$elm.val();
  const default_prim = <T>JSON.parse(default_str);
  $elm.val(default_str);
  const ev$ = on($elm, event)
    .map((ev)=>{
      const str = ""+$(ev.target).val();
      Storage.setItem(key, str);
      try{
        return <T>JSON.parse(str);  
      }catch(err){
        return default_prim;
      }
    })
    .startWith(default_prim);
  return ev$;
}

export function getCombinedInputStreamWithStorage
<T>(Storage: JSONStorage, o: {[P in keyof T]: JQuery}): Stream<T> {
  const opt$ = < {[P in keyof T]: Stream<T[P]>}>{};
  Object.keys(o).forEach((key: keyof T)=>{
    const $elm = o[key];
    const ev$ = getInputStreamWithStorage<any>(Storage, $elm, key);
    opt$[key] = ev$;
  });
  const keys = <(keyof T)[]>Object.keys(opt$);
  const opts$ = keys.map((key: keyof T)=> opt$[key]);
  const vals$: Stream<T[keyof T][]> = xs.combine.apply(xs, opts$);
  const ret$ = vals$.map((vals)=>
    keys.reduce((o, key, i)=> (o[key] = vals[i], o), <T>{}) );
  return ret$;
}

export function getCombinedSelectStreamWithStorage
<T extends {[key: string]: {$: JQuery, opt: {[id: string]: string}}}>
(Storage: JSONStorage, o: T): Stream<{[P in keyof T]: keyof T[P]["opt"]}> {
  const opt$ = < {[P in keyof T]: Stream<keyof T[P]["opt"]>}>{};
  Object.keys(o).forEach((key: keyof T)=>{
    const $elm = o[key].$;
    const opts = o[key].opt;
    const ids = Object.keys(opts);
    $elm.empty(); // 以前の状態を DOM から削除
    if(ids.length === 0){
      opt$[key] = xs.never(); 
    }else{
      const $flag = $(document.createDocumentFragment());
      ids.forEach((id)=>{
        const label = opts[id];
        $("<option />")
          .val(id)
          .html(label)
          .appendTo($flag);
      });
      $elm.append($flag);
      const couho = Storage.getItem(key); // 以前の起動時の値が使えそうなら使う
      const default_id = couho !== null ? couho : ids[0];
      $elm.val(default_id); // デフォルト値を DOM に反映
      // イベントストリームに登録
      const ev$ = on($elm,  "change")
        .map((ev)=> ""+$(ev.target).val() ) // val は id
        .startWith(default_id)
        .map((id)=>{
          Storage.setItem(key, id); // 変化したら書き込み
          return id;
        });
      opt$[key] = ev$;
    }
  });
  const keys = <(keyof T)[]>Object.keys(opt$);
  const opts$ = keys.map((key: keyof T)=> opt$[key]);
  const vals$: Stream<string[]> = xs.combine.apply(xs, opts$);
  const ret$ = vals$.map((vals)=>
    keys.reduce((o, key, i)=> (o[key] = vals[i], o), <{[P in keyof T]: keyof T[P]["opt"]}>{}) );
  return ret$;
}