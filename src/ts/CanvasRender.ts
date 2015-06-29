module duxca.lib {
  export class CanvasRender{
    element: HTMLElement;
    cnv: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    constructor(width: number, height: number){
      this.element = this.cnv = document.createElement("canvas");
      this.cnv.width = width;
      this.cnv.height = height;
      this.ctx = <CanvasRenderingContext2D>this.cnv.getContext("2d");
    }

    drawSignal(signal:number[]|Float32Array, flagX:boolean=false, flagY:boolean=false):void {
      var zoomX = !flagX ? 1 : this.cnv.width / signal.length;
      var zoomY = !flagY ? 1 : this.cnv.height / Math.max.apply(null, signal);
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.cnv.height - signal[0] * zoomY);
      for(var i = 1; i<signal.length; i++){
        this.ctx.lineTo(zoomX * i, this.cnv.height - signal[i] * zoomY);
      }
      this.ctx.stroke();
    }

    drawColLine(x:number):void {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.cnv.height);
      this.ctx.stroke();
    }

    drawRowLine(y:number):void {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.cnv.width, y);
      this.ctx.stroke();
    }
  }
}
