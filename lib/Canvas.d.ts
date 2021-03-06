export declare function fastcopy(cnv: HTMLCanvasElement | HTMLImageElement, tmpctx: CanvasRenderingContext2D): void;
export declare function fetchImageFromArrayBuffer(buffer: ArrayBuffer, mimetype?: string): Promise<HTMLImageElement>;
export declare function copy(cnv: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement): HTMLCanvasElement;
export declare function cnvToBlob(cnv: HTMLCanvasElement, mimeType: string, qualityArgument: number): Promise<Blob>;
export declare function createVideoCanvasRenderer(video: HTMLVideoElement): {
    renderer: () => void;
    ctx: CanvasRenderingContext2D;
};
export declare function create_video_canvas(video: HTMLVideoElement, step: (cnv: HTMLCanvasElement) => void): CanvasRenderingContext2D;
export declare function createCanvas(width?: number, height?: number): HTMLCanvasElement;
export declare const loadImage: typeof load_image;
export declare function load_image(url: string): Promise<HTMLImageElement>;
export declare const loadCanvas: typeof load_cnv;
export declare function load_cnv(src: string): Promise<HTMLCanvasElement>;
