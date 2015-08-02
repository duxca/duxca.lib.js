declare class CanvasRender {
    element: HTMLCanvasElement;
    cnv: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    constructor(width: number, height: number);
    clear(): void;
    drawSignal(signal: Float32Array, flagX?: boolean, flagY?: boolean): void;
    drawColLine(x: number): void;
    drawRowLine(y: number): void;
    cross(x: number, y: number, size: number): void;
    arc(x: number, y: number, size: number): void;
    drawSpectrogram(spectrogram: Float32Array[], max?: number): void;
    _drawSpectrogram(rawdata: Float32Array, sampleRate: number): void;
}
declare module CanvasRender {
    function hue2rgb(p: number, q: number, t: number): number;
    function hslToRgb(h: number, s: number, l: number): [number, number, number];
}
export = CanvasRender;
