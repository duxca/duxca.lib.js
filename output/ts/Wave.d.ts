declare class Wave {
    view: DataView;
    constructor(channel: number, sampleRate: number, int16arr: Int16Array);
    toBlob(): Blob;
    toURL(): string;
    toAudio(): HTMLAudioElement;
}
declare module Wave {
    function writeUTFBytes(view: DataView, offset: number, str: string): void;
}
export = Wave;
