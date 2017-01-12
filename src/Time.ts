

export function formatDate(date: Date, format='YYYY-MM-DD hh:mm:ss.SSS') {
  format = format.replace(/YYYY/g,  "" + date.getFullYear());
  format = format.replace(/MM/g,  ('0' + (date.getMonth() + 1)).slice(-2));
  format = format.replace(/DD/g,  ('0' + date.getDate()).slice(-2));
  format = format.replace(/hh/g,  ('0' + date.getHours()).slice(-2));
  format = format.replace(/mm/g,  ('0' + date.getMinutes()).slice(-2));
  format = format.replace(/ss/g,  ('0' + date.getSeconds()).slice(-2));
  const o = format.match(/S/g)
  if (o != null) {
    var milliSeconds = ('00' + date.getMilliseconds()).slice(-3);
    var length = o.length;
    for (var i = 0; i < length; i++) format = format.replace(/S/, milliSeconds.substring(i, i + 1));
  }
  return format;
}

export function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve)=>{ setTimeout(resolve, ms); });
}


export class FPS {

  period: number
  lastTime: number;
  fps: number;
  counter: number;

  constructor(period: number){
    this.period = period;
    this.lastTime = performance.now();
    this.fps = 0;
    this.counter = 0;
  }

  step(){
    var currentTime = performance.now();
    this.counter += 1;
    if(currentTime - this.lastTime > this.period){
      this.fps = 1000*this.counter/(currentTime - this.lastTime);
      this.counter = 0;
      this.lastTime = currentTime;
    }
  }

  valueOf(): number{
    return Math.round(this.fps*1000)/1000;
  }
}




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


