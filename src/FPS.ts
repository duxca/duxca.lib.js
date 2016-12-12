
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

