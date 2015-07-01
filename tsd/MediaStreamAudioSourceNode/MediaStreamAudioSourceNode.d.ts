
interface MediaStream{
  stop(): void;
}

interface AudioContext {
  createMediaStreamSource(stream: MediaStream): MediaStreamAudioSourceNode;
}

interface MediaStreamAudioSourceNode extends AudioNode {
  channelCount: number;
  channelCountMode: string;
  channelInterpretation: string;
  context: AudioContext;
  mediaStream: MediaStream;
  numberOfInputs: number;
  numberOfOutputs: number;
}
