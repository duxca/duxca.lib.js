declare module duxca.lib {
    class OSC {
        actx: AudioContext;
        constructor(actx: AudioContext);
        tone(freq: number, startTime: number, duration: number): AudioNode;
        createAudioBufferFromArrayBuffer(arr: Float32Array, sampleRate: number): AudioBuffer;
        createAudioNodeFromAudioBuffer(abuf: AudioBuffer): AudioBufferSourceNode;
        createBarkerCodedChirp(barkerCodeN: number, powN: number): Promise<Float32Array>;
        resampling(sig: Float32Array, pow?: number, sampleRate?: number): Promise<Float32Array>;
        inpulseResponce(TEST_INPUT_MYSELF?: boolean): void;
    }
}
