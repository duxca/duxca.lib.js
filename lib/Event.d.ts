export interface CustomEventLike<T> extends CustomEvent {
    detail: T;
}
export declare abstract class EventTargetLike implements EventTarget {
    private emitter;
    constructor();
    addEventListener(event: string, listener: (ev: Event) => void): void;
    removeEventListener(event: string, listener: (ev: Event) => void): void;
    removeAllListener(): void;
    dispatchEvent<E extends Event>(event: E): boolean;
    /**
     * equals
     *  `EventTargetLike.dispatchEvent(new CustomEvent(type, {detail}))`
     */
    emit(type: string, detail?: any): boolean;
    /**
     * @deprecated
     */
    fetchEvent<EV extends Event>(event: string, error?: string): Promise<EV>;
    autoEventListener<T>(remove_event: string): (remove_event: string) => (on: (ev: string, listener: (arg: T) => any) => any, off: (ev: string, listener: (arg: T) => any) => any) => (target: any) => Onable<T>;
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
export declare function autoEventListener<T>(that: EventTarget): (remove_event: string) => (on: (ev: string, listener: (arg: T) => any) => any, off: (ev: string, listener: (arg: T) => any) => any) => (target: any) => Onable<T>;
export interface Onable<T> {
    on(ev: string, listener: (arg: T) => any): Onable<T>;
    on<S>(ev: string, listener: (arg: S) => any): Onable<T>;
}
/**
 * @deprecated
 */
export declare function fetchEvent<EV extends Event>(target: EventTarget, event: string, error?: string): Promise<EV>;
export declare function waitEvent<EV extends Event>(target: EventTarget, event: string, error?: string): Promise<EV>;
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
export declare function createFromEvent<EVENT>(addListener: (event: string, listener: (ev: EVENT) => any) => void, removeListener: (event: string, listener: (ev: EVENT) => any) => void): <THIS>(target: THIS, event: string, error?: string) => Promise<EVENT>;
