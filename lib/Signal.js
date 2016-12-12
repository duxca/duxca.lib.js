"use strict";
var FourierTransform_1 = require("./FourierTransform");
var Statistics = require("./Statistics");
function normalize(arr, max_val) {
    if (max_val === void 0) { max_val = 1; }
    var min = Statistics.findMin(arr)[0];
    var max = Statistics.findMax(arr)[0];
    var _arr = new Float32Array(arr.length);
    for (var j = 0; j < arr.length; j++) {
        _arr[j] = (arr[j] - min) / (max - min) * max_val;
    }
    return _arr;
}
exports.normalize = normalize;
function correlation(signalA, signalB, sampleRate) {
    if (sampleRate === void 0) { sampleRate = 44100; }
    if (signalA.length !== signalB.length)
        throw new Error("unmatch signal length A and B as " + signalA.length + " and " + signalB.length);
    var _fft = new FourierTransform_1.FFT(signalA.length, sampleRate);
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
exports.correlation = correlation;
function smartCorrelation(short, long, sampleRate) {
    for (var pow = 8; short.length + long.length > Math.pow(2, pow); pow++)
        ;
    var tmpA = new Float32Array(Math.pow(2, pow));
    var tmpB = new Float32Array(Math.pow(2, pow));
    tmpA.set(short, 0);
    tmpB.set(long, 0);
    var corrsec = correlation(tmpA, tmpB, sampleRate);
    return corrsec.subarray(0, long.length > short.length ? long.length : short.length);
}
exports.smartCorrelation = smartCorrelation;
function overwarpCorr(short, long) {
    for (var pow = 8; short.length > Math.pow(2, pow); pow++)
        ; // ajasting power of two for FFT
    var resized_short = new Float32Array(Math.pow(2, pow)); // for overwrap adding way correlation
    resized_short.set(short, 0);
    var buffer = new Float32Array(Math.pow(2, pow)); // for overwrap adding way correlation
    var _correlation = new Float32Array(long.length);
    var windowsize = Math.pow(2, pow - 1);
    //console.log(long.length, windowsize, resized_short.length, buffer.length, correlation.length)
    for (var i = 0; long.length - (i + windowsize) >= resized_short.length; i += windowsize) {
        buffer.set(long.subarray(i, i + windowsize), 0);
        var corr = correlation(buffer, resized_short);
        for (var j = 0; j < corr.length; j++) {
            _correlation[i + j] = corr[j];
        }
    }
    return _correlation;
}
exports.overwarpCorr = overwarpCorr;
function autocorr(arr) {
    return crosscorr(arr, arr);
}
exports.autocorr = autocorr;
function crosscorr(arrA, arrB) {
    function _autocorr(j) {
        var sum = 0;
        for (var i = 0; i < arrA.length - j; i++)
            sum += arrA[i] * arrB[i + j];
        return sum;
    }
    return arrA.map(function (v, j) { return _autocorr(j); });
}
exports.crosscorr = crosscorr;
function fft(signal, sampleRate) {
    if (sampleRate === void 0) { sampleRate = 44100; }
    var _fft = new FourierTransform_1.FFT(signal.length, sampleRate);
    _fft.forward(signal);
    return { real: _fft.real, imag: _fft.imag, spectrum: _fft.spectrum };
}
exports.fft = fft;
function ifft(pulse_real, pulse_imag, sampleRate) {
    if (sampleRate === void 0) { sampleRate = 44100; }
    var _fft = new FourierTransform_1.FFT(pulse_real.length, sampleRate);
    var inv_real = _fft.inverse(pulse_real, pulse_imag);
    return inv_real;
}
exports.ifft = ifft;
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
    var _fft = new FourierTransform_1.FFT(pulse_length, 44100);
    var inv_real = _fft.inverse(pulse_real, pulse_imag);
    return inv_real;
}
exports.createChirpSignal = createChirpSignal;
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
        default: throw new Error("cannot make barker code excludes 2, 3, 4, 5, 7, 11, 13");
    }
}
exports.createBarkerCode = createBarkerCode;
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
exports.createComplementaryCode = createComplementaryCode;
function createCodedChirp(code, bitWithBinaryPower) {
    if (bitWithBinaryPower === void 0) { bitWithBinaryPower = 10; }
    var bitwidth = Math.pow(2, bitWithBinaryPower);
    var up_chirp = createChirpSignal(bitwidth);
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
exports.createCodedChirp = createCodedChirp;
function createBarkerCodedChirp(barkerCodeN, bitWithBinaryPower) {
    if (bitWithBinaryPower === void 0) { bitWithBinaryPower = 10; }
    return createCodedChirp(createBarkerCode(barkerCodeN), bitWithBinaryPower);
}
exports.createBarkerCodedChirp = createBarkerCodedChirp;
// Signal.createM([3, 1], 7, [0,0,1])
// = [0, 0, 1, 1, 1, 0, 1, 0, 0, 1]
// Signal.createM([4, 1], 15, [1,0,0,0])
// = [1, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0]
function createM(polynomial, shiftN, seed) {
    if (!Array.isArray(seed)) {
        seed = [];
        for (var i = 0; i < polynomial[0]; i++)
            seed[i] = Math.round(Math.random());
    }
    else if (seed.length !== polynomial[0]) {
        throw new Error("polynomial[0] !== seed.length");
    }
    var arr = seed.slice(0);
    for (var i = 0; i < shiftN; i++) {
        var tmp = arr[arr.length - polynomial[0]];
        for (var j = 1; j < polynomial.length; j++) {
            tmp = tmp ^ arr[arr.length - polynomial[j]];
        }
        arr.push(tmp);
    }
    return arr;
}
exports.createM = createM;
function mseqGen(MSEQ_POL_LEN, MSEQ_POL_COEFF) {
    //const MSEQ_POL_LEN = 4; // M系列を生成する多項式の次数
    //const MSEQ_POL_COEFF = [1, 0, 0, 1]; // M系列を生成する多項式の係数
    var L_MSEQ = Math.pow(2, MSEQ_POL_LEN) - 1; // M系列の長さ
    var tap = new Uint8Array(MSEQ_POL_LEN);
    var mseqPol = new Uint8Array(MSEQ_POL_COEFF);
    var mseq = new Int8Array(L_MSEQ);
    tap[0] = 1;
    for (var i = 0; i < mseq.length; i++) {
        mseq[i] = tap[MSEQ_POL_LEN - 1];
        var tmp = 0;
        // 重み係数とタップの内容との積和演算
        for (var j = 0; j < MSEQ_POL_LEN; j++) {
            tmp += tap[j] * mseqPol[j];
            tmp = tmp % 2;
        }
        // タップの中身の右巡回シフト
        for (var k = MSEQ_POL_LEN - 1; k > 0; k--) {
            tap[k] = tap[k - 1];
        }
        tap[0] = tmp;
    }
    for (var i = 0; i < mseq.length; i++) {
        mseq[i] = mseq[i] <= 0 ? -1 : 1;
    }
    return mseq;
}
exports.mseqGen = mseqGen;
function goldSeqGen(MSEQ_POL_LEN, MSEQ_POL_COEFF_A, MSEQ_POL_COEFF_B, shift) {
    shift = shift % MSEQ_POL_COEFF_B.length;
    var seq_a = mseqGen(MSEQ_POL_LEN, MSEQ_POL_COEFF_A);
    var seq_b = mseqGen(MSEQ_POL_LEN, MSEQ_POL_COEFF_B);
    var gold = new Int8Array(seq_a.length);
    for (var i = 0; i < gold.length; i++) {
        gold[i] = seq_a[i] ^ seq_b[(i + shift) % seq_b.length];
    }
    return gold;
}
exports.goldSeqGen = goldSeqGen;
function encode_chipcode(bits, PNSeq) {
    // bits: {-1, 1}
    // return: {-1, 1}
    var _PNSeq = new Int8Array(PNSeq);
    for (var i = 0; i < _PNSeq.length; i++) {
        _PNSeq[i] *= -1;
    }
    var zeros = new Int8Array(PNSeq.length);
    var seq = new Int8Array(PNSeq.length * bits.length);
    for (var i = 0; i < bits.length; i++) {
        var pt = i * PNSeq.length;
        var bit = bits[i];
        seq.set((bit === 0 ? zeros : bit > 0 ? PNSeq : _PNSeq), pt);
    }
    return seq;
}
exports.encode_chipcode = encode_chipcode;
function encode_chipcode_separated_zero(bits, PNSeq) {
    // bits: {-1, 1}
    // return: {-1, 0, 1}
    // inverse phase pn sequence
    var _PNSeq = new Int8Array(PNSeq);
    for (var i = 0; i < _PNSeq.length; i++) {
        _PNSeq[i] *= -1;
    }
    var seq = new Int8Array(PNSeq.length * bits.length * 2 - 1);
    for (var i = 0; i < bits.length; i++) {
        var pt = i * PNSeq.length /* zero space -> */ * 2;
        var bit = bits[i];
        seq.set((bit > 0 ? PNSeq : _PNSeq), pt);
    }
    return seq;
}
exports.encode_chipcode_separated_zero = encode_chipcode_separated_zero;
function carrierGen(freq, sampleRate, currentTime, length) {
    var result = new Float32Array(length);
    var phaseSec = 1 / freq;
    var one_phase_sample = sampleRate / freq;
    var startId = currentTime * sampleRate;
    for (var i = 0; i < result.length; i++) {
        result[i] = Math.sin(2 * Math.PI / one_phase_sample * (startId + i));
    }
    return result;
}
exports.carrierGen = carrierGen;
function BPSK(bits, carrierFreq, sampleRate, currentTime, length) {
    // bits: {-1, 1}
    var one_phase_sample = sampleRate / carrierFreq;
    if (length == null) {
        length = bits.length * one_phase_sample;
    }
    var result = carrierGen(carrierFreq, sampleRate, currentTime, length);
    var startId = currentTime * sampleRate;
    for (var i = 0; i < result.length; i++) {
        result[i] *= bits[((startId + i) / one_phase_sample | 0) % bits.length];
    }
    return result;
}
exports.BPSK = BPSK;
function fft_smart_correlation(signalA, signalB) {
    var short;
    var long;
    if (signalA.length > signalB.length) {
        short = signalB;
        long = signalA;
    }
    else {
        short = signalA;
        long = signalB;
    }
    var pow = 0;
    for (pow = 1; long.length > Math.pow(2, pow); pow++)
        ;
    var resized_long = new Float32Array(Math.pow(2, pow));
    resized_long.set(long, 0);
    var resized_short = new Float32Array(Math.pow(2, pow));
    resized_short.set(short, 0);
    var corr = fft_correlation(resized_short, resized_long);
    return corr;
}
exports.fft_smart_correlation = fft_smart_correlation;
function fft_smart_overwrap_correlation(signalA, signalB, pof) {
    if (pof === void 0) { pof = true; }
    var short;
    var long;
    if (signalA.length > signalB.length) {
        short = signalB;
        long = signalA;
    }
    else {
        short = signalA;
        long = signalB;
    }
    // ajasting power of two for FFT for overwrap adding way correlation
    var pow = 0;
    for (pow = 1; short.length > Math.pow(2, pow); pow++)
        ;
    var resized_short = new Float32Array(Math.pow(2, pow + 1));
    resized_short.set(short, 0); //resized_short.length/4);
    // short = [1,-1,1,-1,1] // length = 5
    // resized_short = [1,-1,1,-1,1,0,0,0] ++ [0,0,0,0,0,0,0,0] // length = 2^3 * 2 = 8 * 2 = 16
    var windowSize = resized_short.length / 2;
    var slideWidth = short.length;
    var _correlation = new Float32Array(long.length);
    var filter = pof ? phase_only_filter : fft_correlation;
    for (var i = 0; (long.length - (i + slideWidth)) >= 0; i += slideWidth) {
        var resized_long = new Float32Array(resized_short.length);
        resized_long.set(long.subarray(i, i + windowSize), 0); //resized_short.length/4);
        var corr = filter(resized_short, resized_long);
        for (var j = 0; j < corr.length / 2; j++) {
            _correlation[i + j] += corr[j];
        }
        for (var j = 0; j < corr.length / 2; j++) {
            _correlation[i - j] += corr[corr.length - 1 - j];
        }
    }
    return _correlation;
}
exports.fft_smart_overwrap_correlation = fft_smart_overwrap_correlation;
function fft_smart_overwrap_convolution(signalA, signalB) {
    var short;
    var long;
    if (signalA.length > signalB.length) {
        short = signalB;
        long = signalA;
    }
    else {
        short = signalA;
        long = signalB;
    }
    // ajasting power of two for FFT for overwrap adding way correlation
    var pow = 0;
    for (pow = 1; short.length > Math.pow(2, pow); pow++)
        ;
    var resized_short = new Float32Array(Math.pow(2, pow + 1));
    resized_short.set(short, 0); //resized_short.length/4);
    // short = [1,-1,1,-1,1] // length = 5
    // resized_short = [1,-1,1,-1,1,0,0,0] ++ [0,0,0,0,0,0,0,0] // length = 2^3 * 2 = 8 * 2 = 16
    var windowSize = resized_short.length / 2;
    var slideWidth = short.length;
    var _correlation = new Float32Array(long.length);
    var filter = fft_convolution;
    for (var i = 0; (long.length - (i + slideWidth)) >= 0; i += slideWidth) {
        var resized_long = new Float32Array(resized_short.length);
        resized_long.set(long.subarray(i, i + windowSize), 0); //resized_short.length/4);
        var corr = filter(resized_short, resized_long);
        for (var j = 0; j < corr.length / 2; j++) {
            _correlation[i + j] += corr[j];
        }
        for (var j = 0; j < corr.length / 2; j++) {
            _correlation[i - j] += corr[corr.length - 1 - j];
        }
    }
    return _correlation;
}
exports.fft_smart_overwrap_convolution = fft_smart_overwrap_convolution;
function fft_correlation(signalA, signalB) {
    var spectA = fft(signalA);
    var spectB = fft(signalB);
    var cross_real = new Float32Array(spectA.real.length);
    var cross_imag = new Float32Array(spectA.imag.length);
    for (var i = 0; i < spectA.real.length; i++) {
        cross_real[i] = spectA.real[i] * spectB.real[i];
        cross_imag[i] = spectA.imag[i] * -spectB.imag[i];
    }
    var inv_real = ifft(cross_real, cross_imag);
    return inv_real;
}
exports.fft_correlation = fft_correlation;
function fft_convolution(signalA, signalB) {
    var _signalA = new Float32Array(signalA.length * 2);
    _signalA.set(signalA, 0);
    var _signalB = new Float32Array(signalB.length * 2);
    _signalB.set(signalB, 0);
    var spectA = fft(_signalA);
    var spectB = fft(_signalB);
    var cross_real = new Float32Array(spectA.real.length);
    var cross_imag = new Float32Array(spectA.imag.length);
    for (var i = 0; i < spectA.real.length; i++) {
        cross_real[i] = spectA.real[i] * spectB.real[i];
        cross_imag[i] = spectA.imag[i] * spectB.imag[i];
    }
    var inv_real = ifft(cross_real, cross_imag);
    return inv_real.subarray(0, inv_real.length / 2);
}
exports.fft_convolution = fft_convolution;
function naive_correlation(xs, ys) {
    return crosscorr(xs, ys);
}
exports.naive_correlation = naive_correlation;
function naive_convolution(xs, ys) {
    // 引数が逆なのはインパルスレスポンスを畳み込んでみれば分かる
    var arr = [];
    var zs = new Float32Array(ys.length * 2);
    zs.set(ys, 0);
    zs.set(ys, ys.length);
    for (var i = 0; i < xs.length; i++) {
        var sum = 0;
        for (var j = 0; j < ys.length; j++) {
            sum += xs[j] * zs[ys.length + i - j];
        }
        arr[i] = sum;
    }
    return arr;
}
exports.naive_convolution = naive_convolution;
function phase_only_filter(xs, ys) {
    var _a = fft(xs), real = _a.real, imag = _a.imag, spectrum = _a.spectrum;
    var _ys = fft(ys);
    for (var i = 0; i < imag.length; i++) {
        var abs = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
        if (abs === 0) {
            // console.warn("Signal.phase_only_filter", "zero division detected")
            abs = 0.000001;
        }
        real[i] = real[i] / abs;
        imag[i] = -imag[i] / abs;
        real[i] *= _ys.real[i];
        imag[i] *= _ys.imag[i];
    }
    return ifft(real, imag);
}
exports.phase_only_filter = phase_only_filter;
function mean_squared_error(xs, ys) {
    var sum = 0;
    for (var i = 0; i < xs.length; i++) {
        sum += Math.pow(xs[i] - ys[i], 2);
    }
    return sum / xs.length;
}
exports.mean_squared_error = mean_squared_error;
function lowpass(input, sampleRate, freq, q) {
    // float input[]  …入力信号の格納されたバッファ。
    // float sampleRate … サンプリング周波数。
    // float freq … カットオフ周波数。
    // float q    … フィルタのQ値。
    var size = input.length;
    var output = new Float32Array(size);
    // フィルタ係数を計算する
    var omega = 2.0 * Math.PI * freq / sampleRate;
    var alpha = Math.sin(omega) / (2.0 * q);
    var a0 = 1.0 + alpha;
    var a1 = -2.0 * Math.cos(omega);
    var a2 = 1.0 - alpha;
    var b0 = (1.0 - Math.cos(omega)) / 2.0;
    var b1 = 1.0 - Math.cos(omega);
    var b2 = (1.0 - Math.cos(omega)) / 2.0;
    // フィルタ計算用のバッファ変数。
    var in1 = 0.0;
    var in2 = 0.0;
    var out1 = 0.0;
    var out2 = 0.0;
    // フィルタを適用
    for (var i = 0; i < size; i++) {
        // 入力信号にフィルタを適用し、出力信号として書き出す。
        output[i] = b0 / a0 * input[i] + b1 / a0 * in1
            + b2 / a0 * in2
            - a1 / a0 * out1
            - a2 / a0 * out2;
        in2 = in1; // 2つ前の入力信号を更新
        in1 = input[i]; // 1つ前の入力信号を更新
        out2 = out1; // 2つ前の出力信号を更新
        out1 = output[i]; // 1つ前の出力信号を更新
    }
    return output;
}
exports.lowpass = lowpass;
function first_wave_detection(xs) {
    var conv = xs.map(function (_, i) {
        var ys = new Float32Array(xs.length);
        ys.set(xs.subarray(i, xs.length), 0);
        var corr = fft_smart_overwrap_correlation(xs, ys);
        return corr[0];
    });
    var i = 1;
    while (conv[0] / 2 < conv[i])
        i++;
    while (conv[i - 1] - conv[i] > 0)
        i++;
    var _a = Statistics.findMax(conv.subarray(i, conv.length)), _ = _a[0], idx = _a[1];
    return i + idx;
}
exports.first_wave_detection = first_wave_detection;
