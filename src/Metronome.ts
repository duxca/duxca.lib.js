
export class Metronome{

  actx: AudioContext;
  interval: number;
  lastTime: number;
  nextTime: number;
  nextTick: ()=> void;

  constructor(actx: AudioContext, interval: number){
    this.actx = actx;
    this.interval = interval;
    this.lastTime = this.actx.currentTime
    this.nextTime = this.interval + this.actx.currentTime
    this.nextTick = ()=>{};
  }

  step(){
    if(this.actx.currentTime - this.nextTime >= 0 ){
      this.lastTime = this.nextTime;
      this.nextTime += this.interval;
      this.nextTick();
    }
  }
}


