/// <reference path="../../tsd/dsp/dsp.d.ts" />
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Signal;
        (function (Signal) {
            function normalize(arr, max_val) {
                if (max_val === void 0) { max_val = 1; }
                var min = duxca.lib.Statictics.findMin(arr)[0];
                var max = duxca.lib.Statictics.findMax(arr)[0];
                var _arr = new Float32Array(arr.length);
                for (var j = 0; j < arr.length; j++) {
                    _arr[j] = (arr[j] - min) / (max - min) * max_val;
                }
                return _arr;
            }
            Signal.normalize = normalize;
            function correlation(signalA, signalB, sampleRate) {
                if (signalA.length !== signalB.length)
                    throw new Error("unmatch signal length A and B as " + signalA.length + " and " + signalB.length);
                var _fft = new FFT(signalA.length, sampleRate);
                _fft.forward(signalA);
                //var a_spectrum = new Float32Array(fft.spectrum);
                var a_real = new Float32Array(_fft.real);
                var a_imag = new Float32Array(_fft.imag);
                _fft.forward(signalB);
                //var b_spectrum = new Float32Array(_fft.spectrum);
                var b_real = _fft.real; //new Float32Array(_fft.real);
                var b_imag = _fft.imag; //new Float32Array(_fft.imag);
                var cross_real = b_real; //new Float32Array(b_real.length);
                var cross_imag = b_imag; //new Float32Array(b_imag.length);
                for (var i = 0; i < cross_real.length; i++) {
                    cross_real[i] = a_real[i] * b_real[i] / cross_real.length;
                    cross_imag[i] = a_imag[i] * b_imag[i] / cross_imag.length;
                }
                var inv_real = _fft.inverse(cross_real, cross_imag);
                for (var i = 0; i < inv_real.length; i++) {
                    inv_real[i] = inv_real[i] / inv_real.length;
                }
                return inv_real;
            }
            Signal.correlation = correlation;
            function overwarpCorr(pulse, rawdata) {
                var windowsize = pulse.length;
                var resized_pulse = new Float32Array(windowsize * 2); // for overwrap adding way correlation
                resized_pulse.set(pulse, 0);
                var buffer = new Float32Array(windowsize * 2); // for overwrap adding way correlation
                var correlation = new Float32Array(rawdata.length);
                for (var i = 0; rawdata.length - (i + windowsize) >= resized_pulse.length; i += windowsize) {
                    buffer.set(rawdata.subarray(i, i + windowsize), 0);
                    var corr = duxca.lib.Signal.correlation(buffer, resized_pulse);
                    for (var j = 0; j < corr.length; j++) {
                        correlation[i + j] = corr[j];
                    }
                }
                return correlation;
            }
            Signal.overwarpCorr = overwarpCorr;
            function autocorr(arr) {
                return crosscorr(arr, arr);
            }
            Signal.autocorr = autocorr;
            function crosscorr(arrA, arrB) {
                function _autocorr(j) {
                    var sum = 0;
                    for (var i = 0; i < arrA.length - j; i++)
                        sum += arrA[i] * arrB[i + j];
                    return sum;
                }
                return arrA.map(function (v, j) { return _autocorr(j); });
            }
            Signal.crosscorr = crosscorr;
            function fft(signal, sampleRate) {
                if (sampleRate === void 0) { sampleRate = 44100; }
                var _fft = new FFT(signal.length, sampleRate);
                _fft.forward(signal);
                return [_fft.real, _fft.imag, _fft.spectrum];
            }
            Signal.fft = fft;
            function createChirpSignal(pulse_length, downchirp) {
                if (downchirp === void 0) { downchirp = false; }
                var flag = downchirp ? 1 : -1;
                var pulse_real = new Float32Array(pulse_length);
                var pulse_imag = new Float32Array(pulse_length);
                for (var i = 0; i < pulse_length / 2; i++) {
                    pulse_real[i] = Math.cos(Math.PI * i * (i / pulse_length + 1 / 2));
                    pulse_imag[i] = flag * Math.sin(Math.PI * i * (i / pulse_length + 1 / 2));
                }
                for (var i = pulse_length / 2 + 1; i < pulse_length; i++) {
                    pulse_real[i] = pulse_real[pulse_length - i];
                    pulse_imag[i] = -pulse_imag[pulse_length - i];
                }
                var _fft = new FFT(pulse_length, 44100);
                var inv_real = _fft.inverse(pulse_real, pulse_imag);
                return inv_real;
            }
            Signal.createChirpSignal = createChirpSignal;
            function createBarkerCode(n) {
                switch (n) {
                    case 1: return [1];
                    case 2: return [1, -1];
                    case 3: return [1, 1, -1];
                    case 4: return [1, 1, -1, 1];
                    case 5: return [1, 1, 1, -1, 1];
                    case 7: return [1, 1, 1, -1, -1, 1, -1];
                    case 11: return [1, 1, 1, -1, -1, -1, 1, -1, -1, 1, -1];
                    case 13: return [1, 1, 1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1];
                    default: throw new Error("cannot make barker code outer 2, 3, 4, 5, 7, 11, 13");
                }
            }
            Signal.createBarkerCode = createBarkerCode;
            function createComplementaryCode(pow2) {
                var a = [1, 1];
                var b = [1, -1];
                function compress(a, b) {
                    return [a.concat(b), a.concat(b.map(function (x) { return -x; }))];
                }
                while (pow2--) {
                    _a = compress(a, b), a = _a[0], b = _a[1];
                }
                return [a, b];
                var _a;
            }
            Signal.createComplementaryCode = createComplementaryCode;
            function createCodedChirp(code, bitWithBinaryPower) {
                if (bitWithBinaryPower === void 0) { bitWithBinaryPower = 10; }
                var bitwidth = Math.pow(2, bitWithBinaryPower);
                var up_chirp = duxca.lib.Signal.createChirpSignal(bitwidth);
                var down_chirp = new Float32Array(up_chirp);
                for (var i = 0; i < down_chirp.length; i++) {
                    down_chirp[i] *= -1;
                }
                var pulse = new Float32Array(bitwidth / 2 * code.length + bitwidth / 2);
                for (var i = 0; i < code.length; i++) {
                    var tmp = (code[i] === 1) ? up_chirp : down_chirp;
                    for (var j = 0; j < tmp.length; j++) {
                        pulse[i * bitwidth / 2 + j] += tmp[j];
                    }
                }
                return pulse;
            }
            Signal.createCodedChirp = createCodedChirp;
            function createBarkerCodedChirp(barkerCodeN, bitWithBinaryPower) {
                if (bitWithBinaryPower === void 0) { bitWithBinaryPower = 10; }
                return createCodedChirp(createBarkerCode(barkerCodeN));
            }
            Signal.createBarkerCodedChirp = createBarkerCodedChirp;
        })(Signal = lib.Signal || (lib.Signal = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
