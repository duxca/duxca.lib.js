export interface CustomEventLike<T> extends CustomEvent {
    detail: T;
}
export declare abstract class EventTargetLike implements EventTarget {
    private emitter;
    constructor();
    addEventListener<T>(event: string, listener: (ev: CustomEventLike<T>) => void): void;
    removeEventListener(event: string, listener: (ev: Event) => void): void;
    removeAllListener(): void;
    dispatchEvent<E extends Event>(event: E): boolean;
    /**
     * EventTargetLike.dispatchEvent(new CustomEvent(type, {detail}))
     */
    emit(type: string, detail: any): boolean;
}
export declare function fetchEvent<EV extends Event>(target: EventTarget, event: string, error?: string): Promise<EV>;
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
