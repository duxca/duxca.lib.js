export declare function formatDate(date: Date, format?: string): string;
export declare function sleep(ms: number): Promise<void>;
export declare class FPS {
    period: number;
    lastTime: number;
    fps: number;
    counter: number;
    constructor(period: number);
    step(): void;
    valueOf(): number;
}
export declare class Metronome {
    actx: AudioContext;
    interval: number;
    lastTime: number;
    nextTime: number;
    nextTick: () => void;
    constructor(actx: AudioContext, interval: number);
    step(): void;
}
