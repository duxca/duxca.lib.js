declare module duxca.lib {
    class OSC {
        actx: AudioContext;
        constructor(actx: AudioContext);
        createAudioBufferFromArrayBuffer(arr: Float32Array, sampleRate: number): AudioBuffer;
        createAudioNodeFromAudioBuffer(abuf: AudioBuffer): AudioBufferSourceNode;
    }
}
