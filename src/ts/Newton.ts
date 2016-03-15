/// <reference path="../../typings/tsd.d.ts"/>

import Point = Newton.Point;

class Newton{
  theta: number;
  points: Point[];
  _pts: Point[];

  constructor(theta:number, pts:Point[], _pts:Point[]){
    this.theta = theta;
    this.points = pts;
    this._pts = _pts;
  }

  step(): void{
    var _theta = this.theta - this.det(this.theta)/this.der(this.theta);
    this.theta = _theta;
  }

  det(theta:number): number{
    return this.points.reduce((sum, _, k)=>
        (this.points[k].x - Math.pow((this._pts[k].x*Math.cos(theta) - this._pts[k].y*Math.sin(theta)), 2)) +
        (this.points[k].y - Math.pow((this._pts[k].x*Math.sin(theta) + this._pts[k].y*Math.cos(theta)), 2))
    , 0);
  }

  der(theta:number): number{
    return -2*this.points.reduce((sum, _, k)=>
      (this.points[k].x*(-1*this._pts[k].x*Math.sin(theta) - this._pts[k].y*Math.cos(theta))) +
      (this.points[k].y*(-1*this._pts[k].x*Math.cos(theta) - this._pts[k].y*Math.sin(theta)))
    , 0);
  }
}






namespace Newton {
  export class Point{
    x: number;
    y: number;

    constructor(x: number, y:number){
      this.x = x;
      this.y = y;
    }

    plus(pt: Point): Point{
      return new Point(this.x+pt.x, this.y+pt.y);
    }

    minus(pt: Point): Point{
      return new Point(this.x-pt.x, this.y-pt.y);
    }

    times(num: number): Point{
      return new Point(num*this.x, num*this.y);
    }

    distance(pt: Point){
      return Math.sqrt(
        Math.pow(pt.x-this.x, 2) +
        Math.pow(pt.y-this.y, 2));
    }
  }

  export class SDM{
    points: Point[];
    distance: number[][];
    a: number;

    constructor(pts: Point[], ds: number[][], a=0.05){
      this.points = pts;
      this.distance = ds;
      this.a = a;
    }

    step():void{
      var _pts:Point[] = [];
      for(var i=0; i<this.points.length; i++){
        var delta = this.distance[i].reduce(((sumPt, _, j)=>{
          if(i === j){
            return sumPt;
          }else{
            return sumPt.plus(
              (this.points[i].minus(this.points[j])).times(
                (1-this.distance[i][j]/this.points[i].distance(this.points[j]))))
          }
        }), new Point(0, 0)).times(2);
        _pts[i] = this.points[i].minus(delta.times(this.a));
      }
      this.points = _pts;
    }

    det(): number{
      return this.points.reduce(((sum, _, i)=>
        sum + this.points.reduce(((sum, _, j)=>
          i === j ? sum :
          sum + Math.pow(this.points[i].distance(this.points[j])-this.distance[i][j], 2)
        ), 0)
      ), 0);
    }
  }

}

export = Newton;
