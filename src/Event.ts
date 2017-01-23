import {EventEmitter} from "events";

export interface CustomEventLike<T> extends CustomEvent {
  detail: T;
}

export abstract class EventTargetLike implements EventTarget {
  private emitter: EventEmitter;
  constructor(){
    this.emitter = new EventEmitter();
  }
  addEventListener<T>(event: string, listener: (ev: CustomEventLike<T>)=> void): void;
  addEventListener(event: string, listener: (ev: Event)=> void): void {
    this.emitter.addListener(event, listener);
  }
  removeEventListener(event: string, listener: (ev: Event)=> void): void {
    this.emitter.removeListener(event, listener);
  }
  removeAllListener(): void {
    this.emitter.removeAllListeners();
  }
  dispatchEvent<E extends Event>(event: E): boolean {
    return this.emitter.emit(event.type, event);
  }
  /**
   * EventTargetLike.dispatchEvent(new CustomEvent(type, {detail}))
   */
  emit(type: string, detail: any): boolean {
    return this.dispatchEvent(new CustomEvent(type, {detail}));
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
