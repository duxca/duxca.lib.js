/// <reference path="../../../tsd/DataView/DataView.d.ts" />
declare module duxca.lib {
    class Wave {
        view: DataView;
        constructor(channel: number, sampleRate: number, int16arr: Int16Array);
        toBlob(): Blob;
        toURL(): string;
        toAudio(): HTMLAudioElement;
    }
}
