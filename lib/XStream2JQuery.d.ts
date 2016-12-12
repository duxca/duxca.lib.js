/// <reference types="jquery" />
import { Stream } from 'xstream';
export declare function on($elm: JQuery, event: string, selector?: string): Stream<JQueryEventObject>;
export declare function createResizeRatioStream($elm: JQuery): Stream<number>;
export declare function touchstart($elm: JQuery, selector?: string): Stream<JQueryEventObject>;
export declare function touchend($elm: JQuery, selector?: string): Stream<JQueryEventObject>;
