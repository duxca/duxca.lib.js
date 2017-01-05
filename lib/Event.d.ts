/// <reference types="jquery" />
/// <reference types="node" />
import { EventEmitter } from "events";
export interface IEventListener<T> {
    addListener<K extends keyof T>(event: K, listener: (arg: T[K]) => any): this;
    on<K extends keyof T>(event: K, listener: (arg: T[K]) => any): this;
    once<K extends keyof T>(event: K, listener: (arg: T[K]) => any): this;
    removeListener<K extends keyof T>(event: K, listener: (arg: T[K]) => any): this;
    removeAllListeners<K extends keyof T>(event?: K): this;
    emit<K extends keyof T>(event: K, arg: T[K]): boolean;
}
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
export declare function fromEvent<S>(target: EventTarget | EventEmitter, name: string, opt?: {
    rejectable?: string;
    timeout?: number;
}): Promise<S>;
export declare function stopPrevent<E extends Event>(ev: E): E;
export declare function stopPropagation<E extends Event>(ev: E): E;
export declare function preventDefault<E extends Event>(ev: E): E;
