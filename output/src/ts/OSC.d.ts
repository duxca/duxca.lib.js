declare module duxca.lib {
    class OSC {
        actx: AudioContext;
        constructor(actx: AudioContext);
        tone(freq: number, startTime: number, duration: number): AudioNode;
        createAudioBufferFromArrayBuffer(arr: Float32Array, sampleRate: number): AudioBuffer;
        createAudioNodeFromAudioBuffer(abuf: AudioBuffer): AudioBufferSourceNode;
    }
}
