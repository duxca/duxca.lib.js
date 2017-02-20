import {EventEmitter} from "events";
import {fetchEvent} from "./Event";
const AsyncEmitter: AsyncEmitterConstructor = require("carrack");

interface AsyncEmitterConstructor {
  new (concurrency?: number): AsyncEmitter;
}

interface AsyncEmitter extends NodeJS.EventEmitter {
  setConcurrency(max?: number): this;
  emitParallel(ev: string, ...args: any[]): Promise<any[]>;
  emitSerial(ev: string, ...args: any[]): Promise<any[]>;
  emitReduce(ev: string, ...args: any[]): Promise<any[]>;
  emitReduceRight(ev: string, ...args: any[]): Promise<any[]>;
  once(ev: string, listener: (...args: any[])=> any): this;
    subscribe(ev: string, listener: (...args: any[])=> any, once?:boolean): ()=> void;
}


export abstract class EventTargetLike implements EventTarget {
  private emitter: AsyncEmitter;
  constructor(){
    this.emitter = new AsyncEmitter();
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
  protected emit(type: string, detail?: any): boolean {
    if(detail == null){
      return this.dispatchEvent(new Event(type));
    }
    return this.dispatchEvent(new CustomEvent(type, {detail}));
  }
  
  protected emitPararel(type: string, detail?: any): Promise<any[]> {
    if(detail == null){
      return this.emitter.emitParallel(type, new Event(type));
    }
    return this.emitter.emitParallel(type, new CustomEvent(type, {detail}));
  }
  
  protected emitSerial(type: string, detail?: any): Promise<any[]> {
    if(detail == null){
      return this.emitter.emitSerial(type, new Event(type));
    }
    return this.emitter.emitSerial(type, new CustomEvent(type, {detail}));
  }

  fetchEvent<EV extends Event>(event: string, error?: string): Promise<EV> {
    return fetchEvent(this, event, error);
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
  autoEventListener<T>(remove_event: string): (
    on: (ev: string, listener: (arg: T)=> any)=> any,
    off: (ev: string, listener: (arg: T)=> any)=> any,
  )=> (target: any)=> Onable<T> {
    return (on, off)=>{
      return (target)=>{
        const $ = {
          on: (ev, listener)=>{
            on.call(target, ev, listener);
            this.fetchEvent(remove_event)
              .then(()=>{
                off.call(target, ev, listener);
              });
            return $;
          }
        };
        return $;
      };
    };
  }
}

export interface Onable<T> {
  on(ev: string, listener: (arg: T)=> any): Onable<T>;
  on<S>(ev: string, listener: (arg: S)=> any): Onable<T>;
}
