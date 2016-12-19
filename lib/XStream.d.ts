/// <reference types="node" />
import xs, { Stream } from 'xstream';
import { EventEmitter } from "events";
export declare function fromEvent<S>(target: EventTarget | EventEmitter, name: string): Stream<S>;
export declare function flushable_buffer(flush$: Stream<void>): <T>(input: xs<T>) => xs<T[]>;
export declare function reconnect<T>(nested$: Stream<Stream<T>>): Stream<T>;
export declare function adapter<Sources, Sinks>(main: (sources: Sources) => Sinks): (sources: Sources) => {
    [key: string]: xs<any>;
};
export declare function runEff(eff$: Stream<any>): void;
export declare function timeout(period: number): Stream<void>;
export declare type MediaState = "play" | "pause" | "ended";
export declare function fromMediaElement(video: HTMLMediaElement): {
    timeupdate$: Stream<Event>;
    seeked$: Stream<Event>;
    playing$: Stream<Event>;
    seeking$: Stream<Event>;
    play$: Stream<Event>;
    pause$: Stream<Event>;
    ended$: Stream<Event>;
    state$: Stream<MediaState>;
};
export declare function xsasync<RET, S, T>(generatorFunc: (arg?: S) => Iterator<Stream<T>>): (arg?: S) => Stream<RET>;
export declare function fromPromise<T>(prm: Promise<T>, replacer?: (err: any) => void | T): Stream<T>;
