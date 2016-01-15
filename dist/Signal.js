(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Signal = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
// Fourier Transform Module used by DFT, FFT, RFFT
var FourierTransform = (function () {
    function FourierTransform(bufferSize, sampleRate) {
        this.bufferSize = bufferSize;
        this.sampleRate = sampleRate;
        this.bandwidth = 2 / bufferSize * sampleRate / 2;
        this.spectrum = new Float32Array(bufferSize / 2);
        this.real = new Float32Array(bufferSize);
        this.imag = new Float32Array(bufferSize);
        this.peakBand = 0;
        this.peak = 0;
    }
    /**
     * Calculates the *middle* frequency of an FFT band.
     *
     * @param {Number} index The index of the FFT band.
     *
     * @returns The middle frequency in Hz.
     */
    FourierTransform.prototype.getBandFrequency = function (index) {
        return this.bandwidth * index + this.bandwidth / 2;
    };
    ;
    FourierTransform.prototype.calculateSpectrum = function () {
        var spectrum = this.spectrum, real = this.real, imag = this.imag, bSi = 2 / this.bufferSize, sqrt = Math.sqrt, rval, ival, mag;
        for (var i = 0, N = this.bufferSize / 2; i < N; i++) {
            rval = real[i];
            ival = imag[i];
            mag = bSi * sqrt(rval * rval + ival * ival);
            if (mag > this.peak) {
                this.peakBand = i;
                this.peak = mag;
            }
            spectrum[i] = mag;
        }
        return this.spectrum;
    };
    return FourierTransform;
})();
exports.FourierTransform = FourierTransform;
/**
 * DFT is a class for calculating the Discrete Fourier Transform of a signal.
 *
 * @param {Number} bufferSize The size of the sample buffer to be computed
 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 *
 * @constructor
 */
var DFT = (function (_super) {
    __extends(DFT, _super);
    function DFT(bufferSize, sampleRate) {
        _super.call(this, bufferSize, sampleRate);
        var N = bufferSize / 2 * bufferSize;
        var TWO_PI = 2 * Math.PI;
        this.sinTable = new Float32Array(N);
        this.cosTable = new Float32Array(N);
        for (var i = 0; i < N; i++) {
            this.sinTable[i] = Math.sin(i * TWO_PI / bufferSize);
            this.cosTable[i] = Math.cos(i * TWO_PI / bufferSize);
        }
    }
    /**
     * Performs a forward transform on the sample buffer.
     * Converts a time domain signal to frequency domain spectra.
     *
     * @param {Array} buffer The sample buffer
     *
     * @returns The frequency spectrum array
     */
    DFT.prototype.forward = function (buffer) {
        var real = this.real, imag = this.imag, rval, ival;
        for (var k = 0; k < this.bufferSize / 2; k++) {
            rval = 0.0;
            ival = 0.0;
            for (var n = 0; n < buffer.length; n++) {
                rval += this.cosTable[k * n] * buffer[n];
                ival += this.sinTable[k * n] * buffer[n];
            }
            real[k] = rval;
            imag[k] = ival;
        }
        return this.calculateSpectrum();
    };
    return DFT;
})(FourierTransform);
exports.DFT = DFT;
/**
 * FFT is a class for calculating the Discrete Fourier Transform of a signal
 * with the Fast Fourier Transform algorithm.
 *
 * @param {Number} bufferSize The size of the sample buffer to be computed. Must be power of 2
 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 *
 * @constructor
 */
var FFT = (function (_super) {
    __extends(FFT, _super);
    function FFT(bufferSize, sampleRate) {
        _super.call(this, bufferSize, sampleRate);
        this.reverseTable = new Uint32Array(bufferSize);
        var limit = 1;
        var bit = bufferSize >> 1;
        var i;
        while (limit < bufferSize) {
            for (i = 0; i < limit; i++) {
                this.reverseTable[i + limit] = this.reverseTable[i] + bit;
            }
            limit = limit << 1;
            bit = bit >> 1;
        }
        this.sinTable = new Float32Array(bufferSize);
        this.cosTable = new Float32Array(bufferSize);
        for (i = 0; i < bufferSize; i++) {
            this.sinTable[i] = Math.sin(-Math.PI / i);
            this.cosTable[i] = Math.cos(-Math.PI / i);
        }
    }
    /**
     * Performs a forward transform on the sample buffer.
     * Converts a time domain signal to frequency domain spectra.
     *
     * @param {Array} buffer The sample buffer. Buffer Length must be power of 2
     *
     * @returns The frequency spectrum array
     */
    FFT.prototype.forward = function (buffer) {
        // Locally scope variables for speed up
        var bufferSize = this.bufferSize, cosTable = this.cosTable, sinTable = this.sinTable, reverseTable = this.reverseTable, real = this.real, imag = this.imag, spectrum = this.spectrum;
        var k = Math.floor(Math.log(bufferSize) / Math.LN2);
        if (Math.pow(2, k) !== bufferSize) {
            throw "Invalid buffer size, must be a power of 2.";
        }
        if (bufferSize !== buffer.length) {
            throw "Supplied buffer is not the same size as defined FFT. FFT Size: " + bufferSize + " Buffer Size: " + buffer.length;
        }
        var halfSize = 1, phaseShiftStepReal, phaseShiftStepImag, currentPhaseShiftReal, currentPhaseShiftImag, off, tr, ti, tmpReal, i;
        for (i = 0; i < bufferSize; i++) {
            real[i] = buffer[reverseTable[i]];
            imag[i] = 0;
        }
        while (halfSize < bufferSize) {
            //phaseShiftStepReal = Math.cos(-Math.PI/halfSize);
            //phaseShiftStepImag = Math.sin(-Math.PI/halfSize);
            phaseShiftStepReal = cosTable[halfSize];
            phaseShiftStepImag = sinTable[halfSize];
            currentPhaseShiftReal = 1;
            currentPhaseShiftImag = 0;
            for (var fftStep = 0; fftStep < halfSize; fftStep++) {
                i = fftStep;
                while (i < bufferSize) {
                    off = i + halfSize;
                    tr = (currentPhaseShiftReal * real[off]) - (currentPhaseShiftImag * imag[off]);
                    ti = (currentPhaseShiftReal * imag[off]) + (currentPhaseShiftImag * real[off]);
                    real[off] = real[i] - tr;
                    imag[off] = imag[i] - ti;
                    real[i] += tr;
                    imag[i] += ti;
                    i += halfSize << 1;
                }
                tmpReal = currentPhaseShiftReal;
                currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) - (currentPhaseShiftImag * phaseShiftStepImag);
                currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) + (currentPhaseShiftImag * phaseShiftStepReal);
            }
            halfSize = halfSize << 1;
        }
        return this.calculateSpectrum();
    };
    FFT.prototype.inverse = function (real, imag) {
        // Locally scope variables for speed up
        var bufferSize = this.bufferSize, cosTable = this.cosTable, sinTable = this.sinTable, reverseTable = this.reverseTable, spectrum = this.spectrum;
        real = real || this.real;
        imag = imag || this.imag;
        var halfSize = 1, phaseShiftStepReal, phaseShiftStepImag, currentPhaseShiftReal, currentPhaseShiftImag, off, tr, ti, tmpReal, i;
        for (i = 0; i < bufferSize; i++) {
            imag[i] *= -1;
        }
        var revReal = new Float32Array(bufferSize);
        var revImag = new Float32Array(bufferSize);
        for (i = 0; i < real.length; i++) {
            revReal[i] = real[reverseTable[i]];
            revImag[i] = imag[reverseTable[i]];
        }
        real = revReal;
        imag = revImag;
        while (halfSize < bufferSize) {
            phaseShiftStepReal = cosTable[halfSize];
            phaseShiftStepImag = sinTable[halfSize];
            currentPhaseShiftReal = 1;
            currentPhaseShiftImag = 0;
            for (var fftStep = 0; fftStep < halfSize; fftStep++) {
                i = fftStep;
                while (i < bufferSize) {
                    off = i + halfSize;
                    tr = (currentPhaseShiftReal * real[off]) - (currentPhaseShiftImag * imag[off]);
                    ti = (currentPhaseShiftReal * imag[off]) + (currentPhaseShiftImag * real[off]);
                    real[off] = real[i] - tr;
                    imag[off] = imag[i] - ti;
                    real[i] += tr;
                    imag[i] += ti;
                    i += halfSize << 1;
                }
                tmpReal = currentPhaseShiftReal;
                currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) - (currentPhaseShiftImag * phaseShiftStepImag);
                currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) + (currentPhaseShiftImag * phaseShiftStepReal);
            }
            halfSize = halfSize << 1;
        }
        var buffer = new Float32Array(bufferSize); // this should be reused instead
        for (i = 0; i < bufferSize; i++) {
            buffer[i] = real[i] / bufferSize;
        }
        return buffer;
    };
    return FFT;
})(FourierTransform);
exports.FFT = FFT;
/**
 * RFFT is a class for calculating the Discrete Fourier Transform of a signal
 * with the Fast Fourier Transform algorithm.
 *
 * This method currently only contains a forward transform but is highly optimized.
 *
 * @param {Number} bufferSize The size of the sample buffer to be computed. Must be power of 2
 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 *
 * @constructor
 */
// lookup tables don't really gain us any speed, but they do increase
// cache footprint, so don't use them in here
// also we don't use sepearate arrays for real/imaginary parts
// this one a little more than twice as fast as the one in FFT
// however I only did the forward transform
// the rest of this was translated from C, see http://www.jjj.de/fxt/
// this is the real split radix FFT
var RFFT = (function (_super) {
    __extends(RFFT, _super);
    function RFFT(bufferSize, sampleRate) {
        _super.call(this, bufferSize, sampleRate);
        this.trans = new Float32Array(bufferSize);
        this.reverseTable = new Uint32Array(bufferSize);
        this.generateReverseTable();
    }
    // don't use a lookup table to do the permute, use this instead
    RFFT.prototype.reverseBinPermute = function (dest, source) {
        var bufferSize = this.bufferSize, halfSize = bufferSize >>> 1, nm1 = bufferSize - 1, i = 1, r = 0, h;
        dest[0] = source[0];
        do {
            r += halfSize;
            dest[i] = source[r];
            dest[r] = source[i];
            i++;
            h = halfSize << 1;
            while (h = h >> 1, !((r ^= h) & h))
                ;
            if (r >= i) {
                dest[i] = source[r];
                dest[r] = source[i];
                dest[nm1 - i] = source[nm1 - r];
                dest[nm1 - r] = source[nm1 - i];
            }
            i++;
        } while (i < halfSize);
        dest[nm1] = source[nm1];
    };
    RFFT.prototype.generateReverseTable = function () {
        var bufferSize = this.bufferSize, halfSize = bufferSize >>> 1, nm1 = bufferSize - 1, i = 1, r = 0, h;
        this.reverseTable[0] = 0;
        do {
            r += halfSize;
            this.reverseTable[i] = r;
            this.reverseTable[r] = i;
            i++;
            h = halfSize << 1;
            while (h = h >> 1, !((r ^= h) & h))
                ;
            if (r >= i) {
                this.reverseTable[i] = r;
                this.reverseTable[r] = i;
                this.reverseTable[nm1 - i] = nm1 - r;
                this.reverseTable[nm1 - r] = nm1 - i;
            }
            i++;
        } while (i < halfSize);
        this.reverseTable[nm1] = nm1;
    };
    // Ordering of output:
    //
    // trans[0]     = re[0] (==zero frequency, purely real)
    // trans[1]     = re[1]
    //             ...
    // trans[n/2-1] = re[n/2-1]
    // trans[n/2]   = re[n/2]    (==nyquist frequency, purely real)
    //
    // trans[n/2+1] = im[n/2-1]
    // trans[n/2+2] = im[n/2-2]
    //             ...
    // trans[n-1]   = im[1]
    RFFT.prototype.forward = function (buffer) {
        var n = this.bufferSize, spectrum = this.spectrum, x = this.trans, TWO_PI = 2 * Math.PI, sqrt = Math.sqrt, i = n >>> 1, bSi = 2 / n, n2, n4, n8, nn, t1, t2, t3, t4, i1, i2, i3, i4, i5, i6, i7, i8, st1, cc1, ss1, cc3, ss3, e, a, rval, ival, mag;
        this.reverseBinPermute(x, buffer);
        /*
        var reverseTable = this.reverseTable;
    
        for (var k = 0, len = reverseTable.length; k < len; k++) {
          x[k] = buffer[reverseTable[k]];
        }
        */
        for (var ix = 0, id = 4; ix < n; id *= 4) {
            for (var i0 = ix; i0 < n; i0 += id) {
                //sumdiff(x[i0], x[i0+1]); // {a, b}  <--| {a+b, a-b}
                st1 = x[i0] - x[i0 + 1];
                x[i0] += x[i0 + 1];
                x[i0 + 1] = st1;
            }
            ix = 2 * (id - 1);
        }
        n2 = 2;
        nn = n >>> 1;
        while ((nn = nn >>> 1)) {
            ix = 0;
            n2 = n2 << 1;
            id = n2 << 1;
            n4 = n2 >>> 2;
            n8 = n2 >>> 3;
            do {
                if (n4 !== 1) {
                    for (i0 = ix; i0 < n; i0 += id) {
                        i1 = i0;
                        i2 = i1 + n4;
                        i3 = i2 + n4;
                        i4 = i3 + n4;
                        //diffsum3_r(x[i3], x[i4], t1); // {a, b, s} <--| {a, b-a, a+b}
                        t1 = x[i3] + x[i4];
                        x[i4] -= x[i3];
                        //sumdiff3(x[i1], t1, x[i3]);   // {a, b, d} <--| {a+b, b, a-b}
                        x[i3] = x[i1] - t1;
                        x[i1] += t1;
                        i1 += n8;
                        i2 += n8;
                        i3 += n8;
                        i4 += n8;
                        //sumdiff(x[i3], x[i4], t1, t2); // {s, d}  <--| {a+b, a-b}
                        t1 = x[i3] + x[i4];
                        t2 = x[i3] - x[i4];
                        t1 = -t1 * Math.SQRT1_2;
                        t2 *= Math.SQRT1_2;
                        // sumdiff(t1, x[i2], x[i4], x[i3]); // {s, d}  <--| {a+b, a-b}
                        st1 = x[i2];
                        x[i4] = t1 + st1;
                        x[i3] = t1 - st1;
                        //sumdiff3(x[i1], t2, x[i2]); // {a, b, d} <--| {a+b, b, a-b}
                        x[i2] = x[i1] - t2;
                        x[i1] += t2;
                    }
                }
                else {
                    for (i0 = ix; i0 < n; i0 += id) {
                        i1 = i0;
                        i2 = i1 + n4;
                        i3 = i2 + n4;
                        i4 = i3 + n4;
                        //diffsum3_r(x[i3], x[i4], t1); // {a, b, s} <--| {a, b-a, a+b}
                        t1 = x[i3] + x[i4];
                        x[i4] -= x[i3];
                        //sumdiff3(x[i1], t1, x[i3]);   // {a, b, d} <--| {a+b, b, a-b}
                        x[i3] = x[i1] - t1;
                        x[i1] += t1;
                    }
                }
                ix = (id << 1) - n2;
                id = id << 2;
            } while (ix < n);
            e = TWO_PI / n2;
            for (var j = 1; j < n8; j++) {
                a = j * e;
                ss1 = Math.sin(a);
                cc1 = Math.cos(a);
                //ss3 = sin(3*a); cc3 = cos(3*a);
                cc3 = 4 * cc1 * (cc1 * cc1 - 0.75);
                ss3 = 4 * ss1 * (0.75 - ss1 * ss1);
                ix = 0;
                id = n2 << 1;
                do {
                    for (i0 = ix; i0 < n; i0 += id) {
                        i1 = i0 + j;
                        i2 = i1 + n4;
                        i3 = i2 + n4;
                        i4 = i3 + n4;
                        i5 = i0 + n4 - j;
                        i6 = i5 + n4;
                        i7 = i6 + n4;
                        i8 = i7 + n4;
                        //cmult(c, s, x, y, &u, &v)
                        //cmult(cc1, ss1, x[i7], x[i3], t2, t1); // {u,v} <--| {x*c-y*s, x*s+y*c}
                        t2 = x[i7] * cc1 - x[i3] * ss1;
                        t1 = x[i7] * ss1 + x[i3] * cc1;
                        //cmult(cc3, ss3, x[i8], x[i4], t4, t3);
                        t4 = x[i8] * cc3 - x[i4] * ss3;
                        t3 = x[i8] * ss3 + x[i4] * cc3;
                        //sumdiff(t2, t4);   // {a, b} <--| {a+b, a-b}
                        st1 = t2 - t4;
                        t2 += t4;
                        t4 = st1;
                        //sumdiff(t2, x[i6], x[i8], x[i3]); // {s, d}  <--| {a+b, a-b}
                        //st1 = x[i6]; x[i8] = t2 + st1; x[i3] = t2 - st1;
                        x[i8] = t2 + x[i6];
                        x[i3] = t2 - x[i6];
                        //sumdiff_r(t1, t3); // {a, b} <--| {a+b, b-a}
                        st1 = t3 - t1;
                        t1 += t3;
                        t3 = st1;
                        //sumdiff(t3, x[i2], x[i4], x[i7]); // {s, d}  <--| {a+b, a-b}
                        //st1 = x[i2]; x[i4] = t3 + st1; x[i7] = t3 - st1;
                        x[i4] = t3 + x[i2];
                        x[i7] = t3 - x[i2];
                        //sumdiff3(x[i1], t1, x[i6]);   // {a, b, d} <--| {a+b, b, a-b}
                        x[i6] = x[i1] - t1;
                        x[i1] += t1;
                        //diffsum3_r(t4, x[i5], x[i2]); // {a, b, s} <--| {a, b-a, a+b}
                        x[i2] = t4 + x[i5];
                        x[i5] -= t4;
                    }
                    ix = (id << 1) - n2;
                    id = id << 2;
                } while (ix < n);
            }
        }
        while (--i) {
            rval = x[i];
            ival = x[n - i - 1];
            mag = bSi * sqrt(rval * rval + ival * ival);
            if (mag > this.peak) {
                this.peakBand = i;
                this.peak = mag;
            }
            spectrum[i] = mag;
        }
        spectrum[0] = bSi * x[0];
        return spectrum;
    };
    return RFFT;
})(FourierTransform);
exports.RFFT = RFFT;

},{}],2:[function(require,module,exports){
/// <reference path="../typings/tsd.d.ts"/>
var Signal = require("./Signal");
var Statictics = require("./Statictics");
var Render = (function () {
    function Render(width, height) {
        this.element = this.cnv = document.createElement("canvas");
        this.cnv.width = width;
        this.cnv.height = height;
        this.ctx = this.cnv.getContext("2d");
    }
    Render.prototype.clear = function () {
        this.cnv.width = this.cnv.width;
    };
    Render.prototype.drawSignal = function (signal, flagX, flagY) {
        if (flagX === void 0) { flagX = false; }
        if (flagY === void 0) { flagY = false; }
        if (flagY) {
            signal = Signal.normalize(signal, 1);
        }
        var zoomX = !flagX ? 1 : this.cnv.width / signal.length;
        var zoomY = !flagY ? 1 : this.cnv.height / Statictics.findMax(signal)[0];
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.cnv.height - signal[0] * zoomY);
        for (var i = 1; i < signal.length; i++) {
            this.ctx.lineTo(zoomX * i, this.cnv.height - signal[i] * zoomY);
        }
        this.ctx.stroke();
    };
    Render.prototype.drawColLine = function (x) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.cnv.height);
        this.ctx.stroke();
    };
    Render.prototype.drawRowLine = function (y) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.cnv.width, y);
        this.ctx.stroke();
    };
    Render.prototype.cross = function (x, y, size) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + size, y + size);
        this.ctx.lineTo(x - size, y - size);
        this.ctx.moveTo(x - size, y + size);
        this.ctx.lineTo(x + size, y - size);
        this.ctx.stroke();
    };
    Render.prototype.arc = function (x, y, size) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, 2 * Math.PI, false);
        this.ctx.stroke();
    };
    Render.prototype.drawSpectrogram = function (spectrogram, max) {
        if (max === void 0) { max = 255; }
        var imgdata = this.ctx.createImageData(spectrogram.length, spectrogram[0].length);
        for (var i = 0; i < spectrogram.length; i++) {
            for (var j = 0; j < spectrogram[i].length; j++) {
                var _a = CanvasRender.hslToRgb(spectrogram[i][j] / max, 0.5, 0.5), r = _a[0], g = _a[1], b = _a[2];
                var _b = [i, imgdata.height - 1 - j], x = _b[0], y = _b[1];
                var index = x + y * imgdata.width;
                imgdata.data[index * 4 + 0] = b | 0;
                imgdata.data[index * 4 + 1] = g | 0;
                imgdata.data[index * 4 + 2] = r | 0; // is this bug?
                imgdata.data[index * 4 + 3] = 255;
            }
        }
        this.ctx.putImageData(imgdata, 0, 0);
    };
    Render.prototype._drawSpectrogram = function (rawdata, sampleRate) {
        var windowsize = Math.pow(2, 8); // spectrgram height
        var slidewidth = Math.pow(2, 5); // spectrgram width rate
        console.log("sampleRate:", sampleRate, "\n", "windowsize:", windowsize, "\n", "slidewidth:", slidewidth, "\n", "windowsize(ms):", windowsize / sampleRate * 1000, "\n", "slidewidth(ms):", slidewidth / sampleRate * 1000, "\n");
        var spectrums = [];
        for (var ptr = 0; ptr + windowsize < rawdata.length; ptr += slidewidth) {
            var buffer = rawdata.subarray(ptr, ptr + windowsize);
            if (buffer.length !== windowsize)
                break;
            var spectrum = Signal.fft(buffer, sampleRate)[2];
            for (var i = 0; i < spectrum.length; i++) {
                spectrum[i] = spectrum[i] * 20000;
            }
            spectrums.push(spectrum);
        }
        console.log("ptr", 0 + "-" + (ptr - 1) + "/" + rawdata.length, "ms", 0 / sampleRate * 1000 + "-" + (ptr - 1) / sampleRate * 1000 + "/" + rawdata.length * 1000 / sampleRate, spectrums.length + "x" + spectrums[0].length);
        this.cnv.width = spectrums.length;
        this.cnv.height = spectrums[0].length;
        this.drawSpectrogram(spectrums);
    };
    return Render;
})();
var CanvasRender;
(function (CanvasRender) {
    function hue2rgb(p, q, t) {
        if (t < 0) {
            t += 1;
        }
        if (t > 1) {
            t -= 1;
        }
        if (t < 1 / 6) {
            return p + (q - p) * 6 * t;
        }
        if (t < 1 / 2) {
            return q;
        }
        if (t < 2 / 3) {
            return p + (q - p) * (2 / 3 - t) * 6;
        }
        return p;
    }
    CanvasRender.hue2rgb = hue2rgb;
    function hslToRgb(h, s, l) {
        // h, s, l: 0~1
        h *= 5 / 6;
        if (h < 0) {
            h = 0;
        }
        if (5 / 6 < h) {
            h = 5 / 6;
        }
        var r, g, b;
        if (s === 0) {
            r = g = b = l;
        }
        else {
            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return [r * 255, g * 255, b * 255];
    }
    CanvasRender.hslToRgb = hslToRgb;
})(CanvasRender || (CanvasRender = {}));
module.exports = Render;

},{"./Signal":3,"./Statictics":4}],3:[function(require,module,exports){
/// <reference path="../typings/tsd.d.ts"/>
var _Render = require("./Render");
var _Statictics = require("./Statictics");
var FourierTransform_1 = require("./FourierTransform");
exports.Render = _Render;
exports.Statictics = _Statictics;
function normalize(arr, max_val) {
    if (max_val === void 0) { max_val = 1; }
    var min = exports.Statictics.findMin(arr)[0];
    var max = exports.Statictics.findMax(arr)[0];
    var _arr = new Float32Array(arr.length);
    for (var j = 0; j < arr.length; j++) {
        _arr[j] = (arr[j] - min) / (max - min) * max_val;
    }
    return _arr;
}
exports.normalize = normalize;
function correlation(signalA, signalB, sampleRate) {
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
    return createCodedChirp(createBarkerCode(barkerCodeN));
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
    var seq = new Int8Array(PNSeq.length * bits.length);
    for (var i = 0; i < bits.length; i++) {
        var pt = i * PNSeq.length;
        var bit = bits[i];
        seq.set((bit > 0 ? PNSeq : _PNSeq), pt);
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
function fft_smart_overwrap_correlation(signalA, signalB) {
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
    //let frame = window["craetePictureFrame"]("debug")
    for (var i = 0; (long.length - (i + slideWidth)) >= 0; i += slideWidth) {
        var resized_long = new Float32Array(resized_short.length);
        resized_long.set(long.subarray(i, i + windowSize), 0); //resized_short.length/4);
        //let corr = fft_correlation(resized_short, resized_long);
        var corr = phase_only_filter(resized_short, resized_long);
        /*
          let render = new Render(resized_long.length, 127)
          render.drawSignal(resized_long, true, true);
          frame.add(render.element, "resized_long")
          render = new Render(resized_short.length, 127)
          render.drawSignal(resized_short, true, true);
          frame.add(render.element, "resized_short")
          render = new Render(corr.length, 127)
          render.drawSignal(corr, true, true);
          frame.add(render.element, "corr")
          let [max, maxId] = Statictics.findMax(corr.subarray(0, corr.length/2));
          let [min, minId] = Statictics.findMin(corr.subarray(0, corr.length/2));
          frame.add(document.createTextNode(max > min ? maxId+"|"+max : minId+"|"+min));
        */
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
    var spectA = fft(signalA);
    var spectB = fft(signalB);
    var cross_real = new Float32Array(spectA.real.length);
    var cross_imag = new Float32Array(spectA.imag.length);
    for (var i = 0; i < spectA.real.length; i++) {
        cross_real[i] = spectA.real[i] * spectB.real[i];
        cross_imag[i] = spectA.imag[i] * spectB.imag[i];
    }
    var inv_real = ifft(cross_real, cross_imag);
    return inv_real;
}
exports.fft_convolution = fft_convolution;
function naive_correlation(xs, ys) {
    return crosscorr(xs, ys);
}
exports.naive_correlation = naive_correlation;
function naive_convolution(xs, ys) {
    var arr = [];
    for (var i = 0; i < xs.length; i++) {
        var sum = 0;
        for (var j = 0; j < ys.length; j++) {
            sum += xs[i] * (ys[i - j] || 0);
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
            console.warn("Signal.phase_only_filter", "zero division detected");
            abs = 1;
        }
        real[i] = real[i] / abs;
        imag[i] = -imag[i] / abs;
        real[i] *= _ys.real[i];
        imag[i] *= _ys.imag[i];
    }
    return ifft(real, imag);
}
exports.phase_only_filter = phase_only_filter;

},{"./FourierTransform":1,"./Render":2,"./Statictics":4}],4:[function(require,module,exports){
/// <reference path="../typings/tsd.d.ts"/>
function summation(arr) {
    var sum = 0;
    for (var j = 0; j < arr.length; j++) {
        sum += arr[j];
    }
    return sum;
}
exports.summation = summation;
function average(arr) {
    return summation(arr) / arr.length;
}
exports.average = average;
function variance(arr) {
    var ave = average(arr);
    var sum = 0;
    for (var j = 0; j < arr.length; j++) {
        sum += Math.pow(arr[j] - ave, 2);
    }
    return sum / (arr.length - 1);
}
exports.variance = variance;
function stdev(arr) {
    return Math.sqrt(variance(arr));
}
exports.stdev = stdev;
function stdscore(arr, x) {
    return 10 * (x - average(arr)) / variance(arr) + 50;
}
exports.stdscore = stdscore;
function derivative(arr) {
    var results = [0];
    for (var i = 1; i < arr.length; i++) {
        results.push(arr[i] - arr[i - 1]);
    }
    return results;
}
exports.derivative = derivative;
function median(arr) {
    return Array.prototype.slice.call(arr, 0).sort()[arr.length / 2 | 0];
}
exports.median = median;
function KDE(arr, h) {
    // kernel density estimation
    if (typeof h !== "number") {
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
exports.KDE = KDE;
function mode(arr) {
    var kde = KDE(arr);
    return arr[findMax(kde)[1]];
}
exports.mode = mode;
function gaussian(x) {
    return 1 / Math.sqrt(2 * Math.PI) * Math.exp(-Math.pow(x, 2) / 2);
}
exports.gaussian = gaussian;
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
exports.findMax = findMax;
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
exports.findMin = findMin;
function LWMA(arr) {
    // liner weighted moving average
    var a = 0;
    var b = 0;
    var i = 0;
    var j = arr.length - 1;
    while (i < arr.length) {
        a += arr[i] * j;
        b += j;
        i++;
        j--;
    }
    return a / b;
}
exports.LWMA = LWMA;
function all(arr) {
    console.log("len", arr.length, "\n", "min", findMin(arr), "\n", "max", findMax(arr), "\n", "ave", average(arr), "\n", "med", median(arr), "\n", "mode", mode(arr), "\n", "var", variance(arr), "\n", "stdev", stdev(arr));
}
exports.all = all;
function k_means1D(data, k) {
    var klass = [];
    for (var i = 0; i < data.length; i++) {
        klass[i] = (Math.random() * 10000 | 0) % k;
    }
    var count = 0;
    recur: while (true) {
        if (++count > 100000)
            throw new Error("Maximum call stack size exceeded");
        var laststate = klass.slice(0);
        var sums = [];
        for (var j = 0; j < k; j++) {
            sums[j] = [];
        }
        for (var i = 0; i < data.length; i++) {
            sums[klass[i]].push(data[i]);
        }
        var aves = [];
        for (var j = 0; j < k; j++) {
            aves[j] = average(sums[j]);
        }
        for (var i = 0; i < data.length; i++) {
            for (var j = 0; j < aves.length; j++) {
                if (Math.abs(aves[klass[i]] - data[i]) > Math.abs(aves[j] - data[i])) {
                    klass[i] = j;
                }
            }
        }
        for (var i = 0; i < klass.length; i++) {
            if (klass[i] !== laststate[i]) {
                continue recur;
            }
        }
        return klass;
    }
}
exports.k_means1D = k_means1D;

},{}],5:[function(require,module,exports){
var Signal = require("./Signal");
module.exports = Signal;

},{"./Signal":3}]},{},[5])(5)
});