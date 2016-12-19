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

