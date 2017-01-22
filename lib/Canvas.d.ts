/**
 *  copy canvas as new object
 * this copy technic is faster than getImageData full copy, but some pixels are bad copy.
 * see also: http://stackoverflow.com/questions/4405336/how-to-copy-contents-of-one-canvas-to-another-canvas-locally
 */
export declare function copy(cnv: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement): HTMLCanvasElement;
export declare function toBlob(cnv: HTMLCanvasElement, mimeType: "image/jpeg" | "image/png", qualityArgument: number): Promise<Blob>;
