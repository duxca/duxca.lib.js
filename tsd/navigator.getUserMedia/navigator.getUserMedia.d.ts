interface Navigator {
  getUserMedia(
    options: {video?:boolean, audio?: boolean},
    success: (stream: MediaStream)=> void,
    failure?: (err: ErrorEvent)=> void
  ): void;
  webkitGetUserMedia(
    options: {video?:boolean, audio?: boolean},
    success: (stream: MediaStream)=> void,
    failure?: (err: ErrorEvent)=> void
  ): void;
  mozGetUserMedia(
    options: {video?:boolean, audio?: boolean},
    success: (stream: MediaStream)=> void,
    failure?: (err: ErrorEvent)=> void
  ): void;
}

interface AudioContext {
  createMediaStreamSource(stream: MediaStream): MediaStreamAudioSourceNode;
}

interface MediaStream extends EventTarget {
  active: boolean;
  ended: boolean
  id: string;
  label: string;
  onactive?: (ev: Event)=> void;
  onaddtrack?: (ev: Event)=> void;
  onended?: (ev: Event)=> void;
  oninactive?: (ev: Event)=> void;
  onremovetrack?: (ev: Event)=> void;

  addTrack(): void;
  clone(): void;

  //getAudioTracks: getAudioTracks() { [native code] }
  //getTrackById: getTrackById() { [native code] }
  //getTracks: getTracks() { [native code] }
  //getVideoTracks: getVideoTracks() { [native code] }

  //onactive: (...)get onactive: () { [native code] }set onactive: () { [native code] }
  //onaddtrack: (...)get onaddtrack: () { [native code] }set onaddtrack: () { [native code] }
  //onended: (...)get onended: () { [native code] }set onended: () { [native code] }
  //oninactive: (...)get oninactive: () { [native code] }set oninactive: () { [native code] }
  //onremovetrack: (...)get onremovetrack: () { [native code] }set onremovetrack: () { [native code] }

  removeTrack(): void;
  stop(): void;
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
