export declare function loadMediaStream(opt: {
    audio: any;
    video: any;
}): Promise<MediaStream>;
export declare function getMediaElementState(media: HTMLMediaElement): "playing" | "paused" | "ended" | "seeking";
export declare function getMediaStreamVideo(opt: {
    video: any;
    audio: any;
}): Promise<HTMLVideoElement>;
export declare function getVideoFromMediaStream(stream: MediaStream): Promise<HTMLVideoElement>;
export declare function load_video(url: string, use_bugfix?: boolean): Promise<HTMLVideoElement>;
