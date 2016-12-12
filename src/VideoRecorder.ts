

export class VideoRecorder {
  chunks: Blob[];
  recorder: MediaRecorder;
  constructor(stream: MediaStream){
    this.chunks = []; // この chunk のためにクラスを作った
    this.recorder = new MediaRecorder(stream, {"mimeType": 'video/webm; codecs="vp8, opus"'});
    /*
    // こんなプロパティもあるよということでひとつ
    this.recorder.mimeType // 
    this.recorder.state // "inactive, recording, or paused"
    this.recorder.stream
    this.recorder.videoBitsPerSecond
    this.recorder.audioBitsPerSecond;
    */
    this.recorder.ondataavailable = (ev)=>{
      this.chunks.push( ev.data );
    };
    this.recorder.onerror = (ev)=>{
      console.error(ev, ev.message);
    };
  }
  start(){
    this.recorder.start();
  }
  stop(){
    this.recorder.stop();
  }
  clear(){
    this.chunks = [];
  }
  getBlob(){
    return new Blob(this.chunks, { 'type' : 'video/webm' });
  }
}