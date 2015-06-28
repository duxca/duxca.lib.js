declare module duxca.lib.Canvas {
    function hue2rgb(p: number, q: number, t: number): number;
    function hslToRgb(h: number, s: number, l: number): [number, number, number];
    function initCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D];
    function strokeArray(cnv: HTMLCanvasElement, ctx: CanvasRenderingContext2D, ary: number[], flagX?: boolean, flagY?: boolean): void;
    function colLine(cnv: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number): void;
    function rowLine(cnv: HTMLCanvasElement, ctx: CanvasRenderingContext2D, y: number): void;
    function drawSpectrogramToImageData(cnv: HTMLCanvasElement, ctx: CanvasRenderingContext2D, spectrogram: number[][], max?: number): ImageData;
}
