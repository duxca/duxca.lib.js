/// <reference path="../src/decls/globals.d.ts" />
export declare class VideoRecorder {
    chunks: Blob[];
    recorder: MediaRecorder;
    constructor(stream: MediaStream);
    start(): void;
    stop(): void;
    clear(): void;
    getBlob(): Blob;
}
