export declare type MediaState = "playing" | "paused" | "ended" | "seeking";
export declare function getState(media: HTMLMediaElement): MediaState;
export declare function fetchThumbnailAsBlob(video: HTMLVideoElement, currentTime: number): Promise<Blob>;
export declare function fetchThumbnailAsDataURL(video: HTMLVideoElement, currentTime: number): Promise<string>;
export declare function seekTo<M extends HTMLMediaElement>(media: M, currentTime: number): Promise<M>;
export declare function fetchMediaStream(opt: MediaStreamConstraints): Promise<MediaStream>;
