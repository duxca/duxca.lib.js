declare module duxca.lib {
    class Metronome {
        actx: AudioContext;
        interval: number;
        lastTime: number;
        nextTime: number;
        nextTick: () => void;
        constructor(actx: AudioContext, interval: number);
        step(): void;
    }
}
