var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var FDTF = (function () {
            function FDTF(width, height) {
                if (width === void 0) { width = 100; }
                if (height === void 0) { height = 100; }
                this.DELTA_T = 0.001;
                this.DELTA_X = 0.001;
                this.DENSITY = 1;
                this.BLUK_MODULUS = 0.1;
                this.width = width;
                this.height = height;
                this.pressures = [new Float32Array(width * height), new Float32Array(width * height)];
                this.velocities = [
                    [new Float32Array((width + 1) * (height + 1)), new Float32Array((width + 1) * (height + 1)), new Float32Array((width + 1) * (height + 1))],
                    [new Float32Array((width + 1) * (height + 1)), new Float32Array((width + 1) * (height + 1)), new Float32Array((width + 1) * (height + 1))]
                ];
                this.counter = 0;
            }
            FDTF.prototype.step = function () {
                var preP = this.pressures[this.counter % this.pressures.length];
                var curP = this.pressures[(this.counter + 1) % this.pressures.length];
                var _a = this.velocities[this.counter % this.pressures.length], preVx = _a[0], preVy = _a[1];
                var _b = this.velocities[(this.counter + 1) % this.pressures.length], curVx = _b[0], curVy = _b[1];
                console.assert(preP.length === curP.length);
                console.assert(preVx !== curVx);
                console.assert(preP.length + 1 !== curVx.length);
                console.log("x boundary condition");
                for (var j = 1; j <= this.height; j++) {
                    var i = 0;
                    var ptr = i + j * this.width;
                    console.log("j", j, "i", i, "ptr", ptr);
                    var i = this.width;
                    var ptr = i + j * this.width;
                    console.log("j", j, "i", i, "ptr", ptr);
                }
                console.log("y boundary condition");
                for (var i = 1; i <= this.width; i++) {
                    var j = 0;
                    var ptr = i + j * this.width;
                    console.log("j", j, "i", i, "ptr", ptr);
                    var j = this.height;
                    var ptr = i + j * this.width;
                    console.log("j", j, "i", i, "ptr", ptr);
                }
                for (var j = 0; j < this.height; j++) {
                    for (var i = 0; i < this.width; i++) {
                        var ptr = i + j * this.width;
                        console.log("j", j, "i", i, "ptr", ptr);
                        var ptrx = (i + 1) + j * this.width;
                        var ptry = i + (j + 1) * this.width;
                        curVx[ptrx] = curVx[ptrx] - this.DELTA_T / (this.DELTA_X * this.DENSITY) * (preP[ptrx] - preP[ptr]);
                        curVy[ptry] = curVy[ptry] - this.DELTA_T / (this.DELTA_X * this.DENSITY) * (preP[ptrx] - preP[ptr]);
                    }
                }
                for (var j = 0; j < this.height; j++) {
                    for (var i = 0; i < this.width; i++) {
                        var ptr = i + j * this.width;
                        console.log("j", j, "i", i, "ptr", ptr);
                        var ptrx = (i + 1) + j * this.width;
                        curP[ptr] = preP[ptr] - (((this.DELTA_T * this.BLUK_MODULUS) / this.DELTA_X) * (curVx[ptrx] - curVx[ptr]) +
                            ((this.DELTA_T * this.BLUK_MODULUS) / this.DELTA_X) * (curVy[ptry] - curVy[ptr]));
                    }
                }
                this.counter++;
            };
            FDTF.prototype.draw = function (cnv, ctx) {
                cnv.width = this.width;
                cnv.height = this.height;
                var imgdata = ctx.getImageData(0, 0, cnv.width, cnv.height);
                var curP = this.pressures[(this.counter) % this.pressures.length];
                for (var j = 0; j < this.height; j++) {
                    for (var i = 0; i < this.width; i++) {
                        var ptr = i + j * this.width;
                        var _a = lib.hslToRgb(curP[ptr] / 1024, 0.5, 0.5), r = _a[0], g = _a[1], b = _a[2];
                        imgdata.data[ptr * 4 + 0] = r | 0;
                        imgdata.data[ptr * 4 + 1] = g | 0;
                        imgdata.data[ptr * 4 + 2] = b | 0;
                        imgdata.data[ptr * 4 + 3] = 255;
                    }
                }
                ctx.putImageData(imgdata, 0, 0);
            };
            return FDTF;
        })();
        lib.FDTF = FDTF;
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
