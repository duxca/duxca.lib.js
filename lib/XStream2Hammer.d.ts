/// <reference types="jquery" />
/// <reference types="hammerjs" />
import { Stream } from 'xstream';
export declare type HammerEvents = "tap" | "doubletap" | "pan" | "panstart" | "panmove" | "panend" | "pancancel" | "panup" | "pandown" | "panleft" | "panright" | "pinch" | "pinchstart" | "pinchmove" | "pinchend" | "pinchcancel" | "pinchin" | "pinchout" | "rotate" | "rotatestart" | "rotatemove" | "rotateend" | "rotatecancel" | "swipe" | "swipeleft" | "swiperight" | "swipeup" | "swipedown" | "press" | "pressup";
export declare function ham($elm: JQuery, event: HammerEvents): Stream<HammerInput>;
export declare function ham($elm: JQuery, event: HammerEvents, selector: string): Stream<HammerInput>;
export declare function ham($elm: JQuery, event: HammerEvents, options: HammerOptions): Stream<HammerInput>;
export declare function createZoomStream($elm: JQuery): Stream<{
    centerX: number;
    centerY: number;
    scale: number;
}>;
export declare function createInertiaScrollStream($elm: JQuery, ACCELERATION?: number, STEP_MILLIS?: number): Stream<{
    deltaX: number;
    deltaY: number;
}>;
