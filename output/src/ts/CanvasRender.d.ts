declare module duxca.lib {
    class CanvasRender {
        element: HTMLCanvasElement;
        cnv: HTMLCanvasElement;
        ctx: CanvasRenderingContext2D;
        constructor(width: number, height: number);
        clear(): void;
        drawSignal(signal: Float32Array, flagX?: boolean, flagY?: boolean): void;
        drawColLine(x: number): void;
        drawRowLine(y: number): void;
        drawSpectrogram(spectrogram: Float32Array[], max?: number): void;
        _drawSpectrogram(rawdata: Float32Array, sampleRate: number): void;
    }
}
