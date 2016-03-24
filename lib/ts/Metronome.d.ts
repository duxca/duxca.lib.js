/// <reference path="../../typings/tsd.d.ts" />
declare class Metronome {
    actx: AudioContext;
    interval: number;
    lastTime: number;
    nextTime: number;
    nextTick: () => void;
    constructor(actx: AudioContext, interval: number);
    step(): void;
}
export = Metronome;
