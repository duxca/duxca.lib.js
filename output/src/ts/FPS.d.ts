declare module duxca.lib {
    class FPS {
        period: number;
        lastTime: number;
        fps: number;
        counter: number;
        constructor(period: number);
        step(): void;
        valueOf(): number;
    }
}
