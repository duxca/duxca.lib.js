/// <reference types="jquery" />
/// <reference types="node" />
import { EventEmitter } from "events";
export declare function convertToJQueryEvent(ev: UIEvent): JQueryEventObject;
export interface UIEventPosition {
    pageX: number;
    pageY: number;
    clientX: number;
    clientY: number;
    screenX: number;
    screenY: number;
}
export declare function getEventPosition(ev: JQueryEventObject): UIEventPosition | null;
export declare function relEventPosition(pos1: UIEventPosition, pos2: UIEventPosition): UIEventPosition;
export declare function prmFromEvent<S>(target: EventTarget | EventEmitter, name: string, error?: string, timeout?: number): Promise<S>;
export declare function stopPrevent<E extends Event>(ev: E): E;
export declare function stopPropagation<E extends Event>(ev: E): E;
export declare function preventDefault<E extends Event>(ev: E): E;
