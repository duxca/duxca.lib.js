
// MediaRecorder API
declare class MediaRecorder{
  constructor(stream: MediaStream, opt: any);
  ondataavailable?: (ev: MessageEvent)=> void;
  onerror?: (ev: ErrorEvent)=> void;
  start(): void;
  stop(): void;
}

