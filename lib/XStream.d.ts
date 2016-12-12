/// <reference types="jquery" />
/// <reference types="hammerjs" />
/// <reference types="node" />
import xs, { Stream } from 'xstream';
import { EventEmitter } from "events";
export declare type HammerEvents = "tap" | "doubletap" | "pan" | "panstart" | "panmove" | "panend" | "pancancel" | "panup" | "pandown" | "panleft" | "panright" | "pinch" | "pinchstart" | "pinchmove" | "pinchend" | "pinchcancel" | "pinchin" | "pinchout" | "rotate" | "rotatestart" | "rotatemove" | "rotateend" | "rotatecancel" | "swipe" | "swipeleft" | "swiperight" | "swipeup" | "swipedown" | "press" | "pressup";
export declare function ham($elm: JQuery, event: HammerEvents): Stream<HammerInput>;
export declare function ham($elm: JQuery, event: HammerEvents, selector: string): Stream<HammerInput>;
export declare function ham($elm: JQuery, event: HammerEvents, options: HammerOptions): Stream<HammerInput>;
export declare function on($elm: JQuery, event: string, selector?: string): Stream<JQueryEventObject>;
export declare function createResizeRatioStream($elm: JQuery): Stream<number>;
export declare function createZoomStream($elm: JQuery): Stream<{
    centerX: number;
    centerY: number;
    scale: number;
}>;
export declare function createInertiaScrollStream($elm: JQuery, ACCELERATION?: number, STEP_MILLIS?: number): Stream<{
    deltaX: number;
    deltaY: number;
}>;
export declare function fromEvent<S>(target: EventTarget | EventEmitter, name: string): Stream<S>;
export declare function flushable_buffer(flush$: Stream<void>): <T>(input: xs<T>) => xs<T[]>;
export declare function reconnect<T>(nested$: Stream<Stream<T>>): Stream<T>;
export declare function adapter<Sources, Sinks>(main: (sources: Sources) => Sinks): (sources: Sources) => {
    [key: string]: xs<any>;
};
export declare function runEff(eff$: Stream<void>): void;
export declare function timeout(period: number): Stream<void>;
export declare type MediaState = "play" | "pause" | "ended";
export declare function fromMediaElement(sources: {
    play$: Stream<void>;
    pause$: Stream<void>;
    seek$?: Stream<number>;
}): (video$: Stream<HTMLMediaElement>) => {
    timeupdate$: Stream<Event>;
    seeked$: Stream<Event>;
    playing$: Stream<Event>;
    seeking$: Stream<Event>;
    play$: Stream<Event>;
    pause$: Stream<Event>;
    ended$: Stream<Event>;
    state$: Stream<MediaState>;
};
export declare function touchstart($elm: JQuery, selector?: string): Stream<JQueryEventObject>;
export declare function touchend($elm: JQuery, selector?: string): Stream<JQueryEventObject>;
export declare function updateCameraRect(canvasSize$: Stream<{
    width: number;
    height: number;
}>, panoramaSize$: Stream<{
    width: number;
    height: number;
}>, cameraRect$: Stream<{
    x: number;
    y: number;
    width: number;
    height: number;
}>, delta$: Stream<{
    deltaX: number;
    deltaY: number;
}>, zoom$: Stream<{
    centerX: number;
    centerY: number;
    scale: number;
}>): Stream<{
    x: number;
    y: number;
    width: number;
    height: number;
}>;
