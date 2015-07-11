declare module duxca.lib {
    class OSC {
        actx: AudioContext;
        constructor(actx: AudioContext);
        tone(freq: number, startTime: number, duration: number): AudioNode;
        createAudioBufferFromArrayBuffer(arr: Float32Array, sampleRate: number): AudioBuffer;
        createAudioNodeFromAudioBuffer(abuf: AudioBuffer): AudioBufferSourceNode;
        createBarkerCodedChirp(barkerCodeN: number, powN: number, powL?: number): Promise<Float32Array>;
        createAudioBufferFromURL(url: string): Promise<AudioBuffer>;
        resampling(sig: Float32Array, pow?: number, sampleRate?: number): Promise<Float32Array>;
        inpulseResponce(TEST_INPUT_MYSELF?: boolean): void;
    }
}
