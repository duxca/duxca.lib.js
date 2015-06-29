var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var CanvasRender = (function () {
            function CanvasRender(width, height) {
                this.element = this.cnv = document.createElement("canvas");
                this.cnv.width = width;
                this.cnv.height = height;
                this.ctx = this.cnv.getContext("2d");
            }
            CanvasRender.prototype.drawSignal = function (signal, flagX, flagY) {
                if (flagX === void 0) { flagX = false; }
                if (flagY === void 0) { flagY = false; }
                var zoomX = !flagX ? 1 : this.cnv.width / signal.length;
                var zoomY = !flagY ? 1 : this.cnv.height / Math.max.apply(null, signal);
                this.ctx.beginPath();
                this.ctx.moveTo(0, this.cnv.height - signal[0] * zoomY);
                for (var i = 1; i < signal.length; i++) {
                    this.ctx.lineTo(zoomX * i, this.cnv.height - signal[i] * zoomY);
                }
                this.ctx.stroke();
            };
            CanvasRender.prototype.drawColLine = function (x) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.cnv.height);
                this.ctx.stroke();
            };
            CanvasRender.prototype.drawRowLine = function (y) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.cnv.width, y);
                this.ctx.stroke();
            };
            return CanvasRender;
        })();
        lib.CanvasRender = CanvasRender;
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
/// <reference path="../../tsd/dsp/dsp.d.ts" />
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Signal;
        (function (Signal) {
            function correlation(signalA, signalB, sampleRate) {
                if (signalA.length !== signalB.length)
                    throw new Error("unmatch signal length A and B");
                var fft = new FFT(signalA.length, sampleRate);
                fft.forward(signalA);
                //var a_spectrum = new Float32Array(fft.spectrum);
                var a_real = new Float32Array(fft.real);
                var a_imag = new Float32Array(fft.imag);
                fft.forward(signalB);
                //var b_spectrum = new Float32Array(fft.spectrum);
                var b_real = fft.real; //new Float32Array(fft.real);
                var b_imag = fft.imag; //new Float32Array(fft.imag);
                var cross_real = b_real; //new Float32Array(b_real.length);
                var cross_imag = b_imag; //new Float32Array(b_imag.length);
                for (var i = 0; i < cross_real.length; i++) {
                    cross_real[i] = a_real[i] * b_real[i] / cross_real.length;
                    cross_imag[i] = a_imag[i] * b_imag[i] / cross_imag.length;
                }
                var inv_real = fft.inverse(cross_real, cross_imag);
                for (var i = 0; i < inv_real.length; i++) {
                    inv_real[i] = inv_real[i] / inv_real.length;
                }
                return inv_real;
            }
            Signal.correlation = correlation;
            function createChirpSignal(pulse_length) {
                var pulse_real = new Float32Array(pulse_length);
                var pulse_imag = new Float32Array(pulse_length);
                for (var i = 0; i < pulse_length / 2; i++) {
                    pulse_real[i] = Math.cos(Math.PI * i * (i / pulse_length + 1 / 2));
                    pulse_imag[i] = -Math.sin(Math.PI * i * (i / pulse_length + 1 / 2));
                }
                for (var i = pulse_length / 2 + 1; i < pulse_length; i++) {
                    pulse_real[i] = pulse_real[pulse_length - i];
                    pulse_imag[i] = -pulse_imag[pulse_length - i];
                }
                var fft = new FFT(pulse_length, 44100);
                var inv_real = fft.inverse(pulse_real, pulse_imag);
                return inv_real;
            }
            Signal.createChirpSignal = createChirpSignal;
        })(Signal = lib.Signal || (lib.Signal = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Statictics;
        (function (Statictics) {
            function summation(arr) {
                var sum = 0;
                for (var j = 0; j < arr.length; j++) {
                    sum += arr[j];
                }
                return sum;
            }
            Statictics.summation = summation;
            function average(arr) {
                return summation(arr) / arr.length;
            }
            Statictics.average = average;
            function variance(arr) {
                var ave = average(arr);
                var sum = 0;
                for (var j = 0; j < arr.length; j++) {
                    sum += Math.pow(arr[j] - ave, 2);
                }
                return sum / (arr.length - 1);
            }
            Statictics.variance = variance;
            function stdev(arr) {
                return Math.sqrt(variance(arr));
            }
            Statictics.stdev = stdev;
            function derivative(arr) {
                var results = [0];
                for (var i = 1; 0 < arr.length; i++) {
                    results.push(arr[i] - arr[i - 1]);
                }
                return results;
            }
            Statictics.derivative = derivative;
            function median(arr) {
                return Array.prototype.slice.call(arr, 0).sort()[arr.length / 2 | 0];
            }
            Statictics.median = median;
            function KDE(arr, h) {
                // kernel density estimation
                if (h == null) {
                    h = 0.9 * stdev(arr) * Math.pow(arr.length, -1 / 5) + 0.0000000001;
                }
                function kernel(x) {
                    return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
                }
                function estimate(x) {
                    var s = 0;
                    for (var i = 0; i < arr.length; i++) {
                        s += kernel((x - arr[i]) / h);
                    }
                    return s / (h * arr.length);
                }
                var results = [];
                for (var i = 0; i < arr.length; i++) {
                    results.push(estimate(arr[i]));
                }
                return results;
            }
            Statictics.KDE = KDE;
            function mode(arr) {
                var kde = KDE(arr);
                return arr[findMax(kde)[1]];
            }
            Statictics.mode = mode;
            function gaussian(x) {
                return 1 / Math.sqrt(2 * Math.PI) * Math.exp(-Math.pow(x, 2) / 2);
            }
            Statictics.gaussian = gaussian;
            function findMax(arr) {
                var result = -Infinity;
                var index = -1;
                for (var i = 0; i < arr.length; i++) {
                    if (!(arr[i] > result)) {
                        continue;
                    }
                    result = arr[i];
                    index = i;
                }
                return [result, index];
            }
            Statictics.findMax = findMax;
            function findMin(arr) {
                var result = Infinity;
                var index = -1;
                for (var i = 0; i < arr.length; i++) {
                    if (!(arr[i] < result)) {
                        continue;
                    }
                    result = arr[i];
                    index = i;
                }
                return [result, index];
            }
            Statictics.findMin = findMin;
            function log(arr) {
                console.log("len", arr.length, "\n", "min", findMin(arr), "\n", "max", findMax(arr), "\n", "ave", average(arr), "\n", "med", median(arr), "\n", "mode", mode(arr), "\n", "var", variance(arr), "\n", "stdev", stdev(arr));
            }
            Statictics.log = log;
        })(Statictics = lib.Statictics || (lib.Statictics = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
var OSC = (function () {
    function OSC(actx) {
        this.actx = actx;
    }
    OSC.prototype.createAudioBufferFromArrayBuffer = function (arr, sampleRate) {
        var abuf = this.actx.createBuffer(1, arr.length, sampleRate);
        var buf = abuf.getChannelData(0);
        buf.set(arr);
        return abuf;
    };
    OSC.prototype.createAudioNodeFromAudioBuffer = function (abuf) {
        var asrc = this.actx.createBufferSource();
        asrc.buffer = abuf;
        return asrc;
    };
    return OSC;
})();
window.addEventListener("load", function (ev) {
    var raw_chirp = duxca.lib.Signal.createChirpSignal(Math.pow(2, 10));
    // raw cliped
    var cliped_chirp = raw_chirp.subarray(0, raw_chirp.length / 2);
    duxca.lib.Statictics.log(cliped_chirp);
    var actx = new AudioContext();
    var osc = new OSC(actx);
    var abuf = osc.createAudioBufferFromArrayBuffer(cliped_chirp, 44100);
    var anode = osc.createAudioNodeFromAudioBuffer(abuf);
    anode.connect(actx.destination);
    anode.start(0);
    /*
    // noised
    var noised_chirp = new Float32Array(cliped_chirp);
    for(var i=0; i<noised_chirp.length; i++){
      noised_chirp[i] = cliped_chirp[i] + (Math.random()-1/2)*0.5;
    }
    duxca.lib.Statictics.log(noised_chirp);
  
    // noised_corr
    console.time("noised_corr");
    var corr = duxca.lib.Signal.correlation(cliped_chirp, noised_chirp);
    console.timeEnd("noised_corr");
    duxca.lib.Statictics.log(corr);*/
    // draw
    var render_cliped = new duxca.lib.CanvasRender(cliped_chirp.length, 128);
    //var render_noised = new duxca.lib.CanvasRender(noised_chirp.length, 128);
    document.body.appendChild(render_cliped.element);
    //document.body.appendChild(render_noised.element);
    for (var i = 0; i < cliped_chirp.length; i++) {
        cliped_chirp[i] = 1000 * cliped_chirp[i] + 64;
    }
    render_cliped.drawSignal(cliped_chirp, true);
    //render_noised.drawSignal(noised_chirp, true);
    //var render_corr = new duxca.lib.CanvasRender(corr.length, 128);
    //document.body.appendChild(render_corr.element);
    //render_corr.drawSignal(corr, true, true);
});
