declare module duxca.lib {
    class CanvasRender {
        element: HTMLElement;
        cnv: HTMLCanvasElement;
        ctx: CanvasRenderingContext2D;
        constructor(width: number, height: number);
        drawSignal(signal: number[] | Float32Array, flagX?: boolean, flagY?: boolean): void;
        drawColLine(x: number): void;
        drawRowLine(y: number): void;
    }
}
