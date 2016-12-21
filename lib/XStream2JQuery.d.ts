/// <reference types="jquery" />
import { Stream } from 'xstream';
export declare function on($elm: JQuery, event: string, selector?: string): Stream<JQueryEventObject>;
export declare function createResizeRatioStream($elm: JQuery): Stream<number>;
export declare function touchstart($elm: JQuery, selector?: string): Stream<JQueryEventObject>;
export declare function touchmove($elm: JQuery, selector?: string): Stream<JQueryEventObject>;
export declare function touchend($elm: JQuery, selector?: string): Stream<JQueryEventObject>;
export declare type JSONString = string;
export interface JSONStorage {
    getItem(key: string): JSONString | null;
    setItem(key: string, data: JSONString): void;
}
export declare function getInputStreamWithStorage<T>(Storage: JSONStorage, $elm: JQuery, key: string, event?: string): Stream<T>;
export declare function getCombinedInputStreamWithStorage<T>(Storage: JSONStorage, o: {
    [P in keyof T]: JQuery;
}): Stream<T>;
export declare function getCombinedSelectStreamWithStorage<T extends {
    [key: string]: {
        $: JQuery;
        opt: {
            [id: string]: string;
        };
    };
}>(Storage: JSONStorage, o: T): Stream<{
    [P in keyof T]: keyof T[P]["opt"];
}>;
