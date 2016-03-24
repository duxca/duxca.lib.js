/// <reference path="../../typings/tsd.d.ts" />
declare class FPS {
    period: number;
    lastTime: number;
    fps: number;
    counter: number;
    constructor(period: number);
    step(): void;
    valueOf(): number;
}
export = FPS;
