declare module duxca.lib {
    class FDTF {
        DELTA_T: number;
        DELTA_X: number;
        DENSITY: number;
        BLUK_MODULUS: number;
        width: number;
        height: number;
        pressures: [Float32Array, Float32Array];
        velocities: [[Float32Array, Float32Array], [Float32Array, Float32Array]];
        counter: number;
        constructor(width?: number, height?: number);
        step(): void;
        draw(cnv: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void;
    }
}
