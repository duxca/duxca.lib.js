/// <reference path="../../tsd/dsp/dsp.d.ts" />
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Signal;
        (function (Signal) {
            function standard(arr, max_val) {
                if (max_val === void 0) { max_val = 1; }
                var min = duxca.lib.Statictics.findMin(arr)[0];
                var max = duxca.lib.Statictics.findMax(arr)[0];
                var _arr = new Float32Array(arr.length);
                for (var j = 0; j < arr.length; j++) {
                    _arr[j] = (arr[j] - min) / (max - min) * max_val;
                }
                return _arr;
            }
            Signal.standard = standard;
            function correlation(signalA, signalB, sampleRate) {
                if (signalA.length !== signalB.length)
                    throw new Error("unmatch signal length A and B as " + signalA.length + " and " + signalB.length);
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
            function fft(signal, sampleRate) {
                if (sampleRate === void 0) { sampleRate = 44100; }
                var fft = new FFT(signal.length, sampleRate);
                fft.forward(signal);
                return [fft.real, fft.imag, fft.spectrum];
            }
            Signal.fft = fft;
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
