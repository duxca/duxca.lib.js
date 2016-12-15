import * as $ from "jquery";
import {EventEmitter} from "events";


export function convertToJQueryEvent(ev: UIEvent): JQueryEventObject {
  return new $.Event(<any>ev);
}

// JQueryEventObject からタッチ・マウスを正規化して座標値を抜き出す便利関数
export interface UIEventPosition {
  pageX: number,
  pageY: number,
  clientX: number,
  clientY: number,
  screenX: number,
  screenY: number
} 

export function getEventPosition (ev: JQueryEventObject): UIEventPosition | null {
  if (/^touch/.test(ev.type)){
    if( (<TouchEvent>ev.originalEvent).touches.length > 0){
      const pageX = (<TouchEvent>ev.originalEvent).touches[0].pageX;
      const pageY = (<TouchEvent>ev.originalEvent).touches[0].pageY;
      const clientX = (<TouchEvent>ev.originalEvent).touches[0].clientX;
      const clientY = (<TouchEvent>ev.originalEvent).touches[0].clientY;
      const screenX = (<TouchEvent>ev.originalEvent).touches[0].screenX;
      const screenY = (<TouchEvent>ev.originalEvent).touches[0].screenY;
      return {pageX, pageY, clientX, clientY, screenX, screenY};
    }
    // touchend のときは touches.length === 0 
    return null;
  }
  const pageX = ev.pageX;
  const pageY = ev.pageY;
  const clientX = ev.clientX;
  const clientY = ev.clientY;
  const screenX = ev.screenX;
  const screenY = ev.screenY;
  return {pageX, pageY, clientX, clientY, screenX, screenY};
}

export function relEventPosition (pos1: UIEventPosition, pos2: UIEventPosition): UIEventPosition {
  const rel = <UIEventPosition>{clientX:0, clientY:0, pageX:0, pageY:0, screenX:0, screenY:0}; // ホールドから動いた量
  Object.keys(rel).forEach((key)=>{ rel[key] = pos2[key] - pos1[key]; }); // mousedown 時の位置と moudemove 時の相対距離
  return rel;
}



export function fromEvent<S>(target: EventTarget|EventEmitter, name: string, opt?: {rejectable?: string, timeout?: number}): Promise<S> {
  /*
   * EventTarget からのイベントから Promise を作り出す
   */
  const _opt       = opt == null ? {} : opt;
  const timeout    = _opt.timeout;
  const rejectable = _opt.rejectable == null ? "error" : _opt.rejectable;
  return new Promise<S>(function(resolve, reject){
    if(timeout != null){
      setTimeout(reject.bind(this, new Error("promise timeout")));
    }
    if(target instanceof EventEmitter){
      target.addListener(name, _resolve);
      target.addListener(rejectable, _reject);
    }else{
      target.addEventListener(name, <any>_resolve);
      target.addEventListener(rejectable, _reject);
    }
    return;
    function removeListeners(){
      if(target instanceof EventEmitter){
        target.removeListener(name, _resolve);
        target.removeListener(rejectable, _reject);
      }else{
        target.removeEventListener(name, <any>_resolve);
        target.removeEventListener(rejectable, _reject);
      }
    }
    function _resolve(a: S){
      removeListeners();
      return resolve(a);
    }
    function _reject(a: any){
      removeListeners();
      return reject(a);
    }
  });
}

export function stopPrevent<E extends Event>(ev: E): E {
  return stopPropagation(preventDefault(ev));
}

export function stopPropagation<E extends Event>(ev: E): E {
  ev.stopPropagation();
  return ev;
}

export function preventDefault<E extends Event>(ev: E): E {
  ev.preventDefault();
  return ev;
}
 
