import CanvasRender = require("duxca.lib.canvasrender.js");

class FDTD {

  DELTA_T: number;//sec
  DELTA_X: number;//m
  DENSITY: number;//kg/m^3
  BLUK_MODULUS: number;//Pa
  BOUNDARY_IMPEDANCE: number;//Quantity of no dimension
  width: number;//mm
  height: number;//mm
  pressures: [Float32Array, Float32Array];
  velocities: [
    [Float32Array, Float32Array],
    [Float32Array, Float32Array]
  ];
  counter: number;

  constructor(width=100, height=100){
    this.DELTA_T = 0.001;
    this.DELTA_X = 0.001;
    this.DENSITY = 1;
    this.BLUK_MODULUS = 0.1;
    this.BOUNDARY_IMPEDANCE = 0.5;
    this.width = width;
    this.height = height;
    this.pressures = [new Float32Array(width*height), new Float32Array(width*height)];
    this.velocities = [
      [new Float32Array((width+1)*(height+1)), new Float32Array((width+1)*(height+1))],
      [new Float32Array((width+1)*(height+1)), new Float32Array((width+1)*(height+1))]
    ];
    this.counter = 0;
  }

  step(){
    var preP = this.pressures[this.counter%this.pressures.length];
    var curP = this.pressures[(this.counter+1)%this.pressures.length];
    var [preVx, preVy] = this.velocities[this.counter%this.pressures.length];
    var [curVx, curVy] = this.velocities[(this.counter+1)%this.pressures.length];
    //console.assert(preP.length === curP.length);
    //console.assert(preVx !== curVx);
    //console.assert(preP.length+1 !== curVx.length);

    //console.log("x boundary condition");
    for(var j=1;j<=this.height;j++){
      var ptr = 0 + j*this.width;
      curVx[ptr] = preP[ptr]/this.BOUNDARY_IMPEDANCE;
      var ptr = this.width + j*this.width;
      var ptr1 = (this.width+1) + j*this.width;
      curVx[ptr1] = preP[ptr]/this.BOUNDARY_IMPEDANCE;
    }
    //console.log("y boundary condition");
    for(var i=1;i<=this.width;i++){
      var ptr = i + 0*this.width;
      curVy[ptr] = preP[ptr]/this.BOUNDARY_IMPEDANCE;
      var ptr = i + this.height*this.width;
      var ptr1 = i + (this.height+1)*this.width;
      curVy[ptr1] = preP[ptr]/this.BOUNDARY_IMPEDANCE;
    }

    for(var j=0;j<this.height-1;j++){
      for(var i=0;i<this.width-1;i++){
        var ptr = i + j*this.width;
        var ptrx = (i+1) + j*this.width;
        var ptry = i + (j+1)*this.height;
        curVx[ptrx] = curVx[ptrx] - this.DELTA_T/(this.DELTA_X*this.DENSITY)*(preP[ptrx] - preP[ptr]);
        curVy[ptry] = curVy[ptry] - this.DELTA_T/(this.DELTA_X*this.DENSITY)*(preP[ptry] - preP[ptr]);
      }
    }
    for(var j=0;j<this.height;j++){
      for(var i=0;i<this.width;i++){
        var ptr = i + j*this.width;
        var ptrx = (i+1) + j*this.width;
        var ptry = i + (j+1)*this.height;
        curP[ptr] = preP[ptr] - (
          ((this.DELTA_T*this.BLUK_MODULUS)/this.DELTA_X)*(curVx[ptrx] - curVx[ptr]) +
          ((this.DELTA_T*this.BLUK_MODULUS)/this.DELTA_X)*(curVy[ptry] - curVy[ptr])
        );
      }
    }

    this.counter++;

    return this;
  }

  draw(render: CanvasRender){
    var cnv = render.cnv;
    var ctx = render.ctx;
    cnv.width = this.width;
    cnv.height = this.height;
    var imgdata = ctx.getImageData(0, 0, cnv.width, cnv.height);
    var curP = this.pressures[(this.counter)%this.pressures.length];
    for(var j=0;j<this.height;j++){
      for(var i=0;i<this.width;i++){
        var ptr = i + j*this.width;
        var [r,g,b] = CanvasRender.hslToRgb(1 - curP[ptr] / 1024, 0.5, 0.5);
        imgdata.data[ptr * 4 + 0] = r | 0;
        imgdata.data[ptr * 4 + 1] = g | 0;
        imgdata.data[ptr * 4 + 2] = b | 0;
        imgdata.data[ptr * 4 + 3] = 255;
      }
    }
    ctx.putImageData(imgdata, 0, 0);
    return this;
  }
}


export = FDTD;
