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
    protected emit(type: string, detail?: any): boolean;
    protected emitPararel(type: string, detail?: any): Promise<any[]>;
    protected emitSerial(type: string, detail?: any): Promise<any[]>;
    fetchEvent<EV extends Event>(event: string, error?: string): Promise<EV>;
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
    autoEventListener<T>(remove_event: string): (on: (ev: string, listener: (arg: T) => any) => any, off: (ev: string, listener: (arg: T) => any) => any) => (target: any) => Onable<T>;
}
export interface Onable<T> {
    on(ev: string, listener: (arg: T) => any): Onable<T>;
    on<S>(ev: string, listener: (arg: S) => any): Onable<T>;
}
