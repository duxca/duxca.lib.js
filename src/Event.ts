import {EventEmitter} from "events";

export interface CustomEventLike<T> extends CustomEvent {
  detail: T;
}

export abstract class EventTargetLike implements EventTarget {
  private emitter: EventEmitter;
  constructor(){
    this.emitter = new EventEmitter();
  }
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
   * equals
   *  `EventTargetLike.dispatchEvent(new CustomEvent(type, {detail}))`
   */
  emit(type: string, detail?: any): boolean {
    if(detail == null){
      return this.dispatchEvent(new Event(type));
    }
    return this.dispatchEvent(new CustomEvent(type, {detail}));
  }

  /**
   * @deprecated
   */
  fetchEvent<EV extends Event>(event: string, error?: string): Promise<EV> {
    return fetchEvent(this, event, error);
  }

  autoEventListener<T>(remove_event: string){
    return autoEventListener<T>(this);
  }

}

/**
 * addListener|removeListener できる target に対して event 時に自動で removeListener される listener を addListener する
 * @example
 * ```ts
 * const onerror = evTargetLike.autoEventListener("error");
 * const body = document.body;
 * const $ = onerror(body.addEventListener, body.removeEventListener);
 * $(body)
 *   .on("click", console.log)
 *   .on("load", console.log);
 * // document.body.onerror 時に上記イベントハンドラを自動的に removeEventListener する
 * ```
 */
export function autoEventListener<T>(that: EventTarget): (remove_event: string)=> (
  on: (ev: string, listener: (arg: T)=> any)=> any,
  off: (ev: string, listener: (arg: T)=> any)=> any,
)=> (target: any)=> Onable<T> {
  return (remove_event)=> (on, off)=> (target)=>{
    const $ = {
      on: (ev, listener)=>{
        on.call(target, ev, listener);
        waitEvent(that, remove_event)
          .then(()=>{
            off.call(target, ev, listener);
          });
        return $;
      }
    };
    return $;
  };
}


export interface Onable<T> {
  on(ev: string, listener: (arg: T)=> any): Onable<T>;
  on<S>(ev: string, listener: (arg: S)=> any): Onable<T>;
}

/**
 * @deprecated
 */
export function fetchEvent<EV extends Event>(target: EventTarget, event: string, error?: string): Promise<EV> {
  return waitEvent(target, event, error);
}
export function waitEvent<EV extends Event>(target: EventTarget, event: string, error?: string): Promise<EV> {
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


