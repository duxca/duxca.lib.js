import {EventEmitter} from "events";


export abstract class EventTargetLike implements EventTarget {
  private emitter: EventEmitter;
  constructor(){
    this.emitter = new EventEmitter();
  }
  addEventListener(event, listener) {
    this.emitter.addListener(event, listener);
  }
  removeEventListener(event, listener) {
    this.emitter.removeListener(event, listener);
  }
  dispatchEvent<E extends Event>(event: E) {
    return this.emitter.emit(event.type, event);
  }
}

export function fetchEvent<EV extends Event>(target: EventTarget, event: string, error?: string): Promise<EV> {
  return createFromEvent<EV>(target.addEventListener, target.removeEventListener)(target, event, error);
}

/**
 * @example
 * ```ts
 * (async ()=>{
 *   const waitEvent = createFromEvent(EventTarget.prototype.addEventListener, EventTarget.prototype.removeEventListener);
 *   const reader = new FileReader();
 *   reader.readAsText(textfile_blob);
 *   const text = await waitEvent(reader, "loadend", "error");
 *   console.log(text);
 * })().catch((err: ErrorEvent)=>{
 *   console.error(err.error);
 * });
 * ```
 */
export function createFromEvent<EVENT>(
  addListener: (event: string, listener: (ev: EVENT)=> any)=> void,
  removeListener: (event: string, listener: (ev: EVENT)=> any)=> void
): <THIS>(target: THIS, event: string, error?: string)=> Promise<EVENT> {
  return (target, event, error?)=>{
    return new Promise<EVENT>((resolve, reject)=>{
      addListener.call(target, event, _resolve);
      if(typeof error === "string"){
        addListener.call(target, error, _reject);
      }
      function _removeListener(){
        removeListener.call(target, event, _resolve);
        if(typeof error === "string"){
          removeListener.call(target, error, _reject);
        }
      }
      function _resolve(ev: EVENT){
        _removeListener();
        resolve(ev);
      }
      function _reject(ev: EVENT){
        _removeListener();
        reject(ev);
      }
    });
  };
}
