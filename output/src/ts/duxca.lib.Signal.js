/// <!--reference path="../../typings/tsd.d.ts" />
/// <reference path="../../thirdparty/dsp/dsp.d.ts" />
/// <!--reference path="./duxca.lib.RecordBuffer.ts" />
/// <!--reference path="./duxca.lib.OSC.ts" />
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Signal;
        (function (Signal) {
            function indexToFreq(index, sampleRate, fftSize) {
                return (index * sampleRate) / fftSize;
            }
            Signal.indexToFreq = indexToFreq;
            function freqToIndex(freq, sampleRate, fftSize) {
                return (freq * fftSize) / sampleRate | 0;
            }
            Signal.freqToIndex = freqToIndex;
            function timeToIndex(sampleRate, time) {
                return sampleRate * time | 0;
            }
            Signal.timeToIndex = timeToIndex;
            function indexToTime(sampleRate, currentIndex) {
                return currentIndex / sampleRate;
            }
            Signal.indexToTime = indexToTime;
            function calcCorr(signal, input, sampleRate) {
                var fft = new FFT(input.length, sampleRate);
                fft.forward(signal);
                var sig_spectrum = new Float32Array(fft.spectrum);
                var sig_real = new Float32Array(fft.real);
                var sig_imag = new Float32Array(fft.imag);
                fft.forward(input);
                var spectrum = new Float32Array(fft.spectrum);
                var real = new Float32Array(fft.real);
                var imag = new Float32Array(fft.imag);
                var cross_real = new Float32Array(real.length);
                for (var i = 0; i < cross_real.length; i++) {
                    cross_real[i] = sig_real[i] * real[i] / real.length;
                }
                var cross_imag = new Float32Array(imag.length);
                for (var i = 0; i < cross_imag.length; i++) {
                    cross_imag[i] = sig_imag[i] * imag[i] / imag.length;
                }
                var inv_real = fft.inverse(cross_real, cross_imag);
                return inv_real;
            }
            Signal.calcCorr = calcCorr;
        })(Signal = lib.Signal || (lib.Signal = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
