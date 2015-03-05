var DSP = {
    LEFT: 0,
    RIGHT: 1,
    MIX: 2,
    SINE: 1,
    TRIANGLE: 2,
    SAW: 3,
    SQUARE: 4,
    LOWPASS: 0,
    HIGHPASS: 1,
    BANDPASS: 2,
    NOTCH: 3,
    BARTLETT: 1,
    BARTLETTHANN: 2,
    BLACKMAN: 3,
    COSINE: 4,
    GAUSS: 5,
    HAMMING: 6,
    HANN: 7,
    LANCZOS: 8,
    RECTANGULAR: 9,
    TRIANGULAR: 10,
    OFF: 0,
    FW: 1,
    BW: 2,
    FWBW: 3,
    TWO_PI: 2 * Math.PI
};
function setupTypedArray(name, fallback) {
    if (typeof this[name] !== 'function' && typeof this[name] !== 'object') {
        if (typeof this[fallback] === 'function' && typeof this[fallback] !== 'object') {
            this[name] = this[fallback];
        } else {
            this[name] = function (obj) {
                if (obj instanceof Array) {
                    return obj;
                } else if (typeof obj === 'number') {
                    return new Array(obj);
                }
            };
        }
    }
}
setupTypedArray('Float32Array', 'WebGLFloatArray');
setupTypedArray('Int32Array', 'WebGLIntArray');
setupTypedArray('Uint16Array', 'WebGLUnsignedShortArray');
setupTypedArray('Uint8Array', 'WebGLUnsignedByteArray');
DSP.invert = function (buffer) {
    for (var i = 0, len = buffer.length; i < len; i++) {
        buffer[i] *= -1;
    }
    return buffer;
};
DSP.interleave = function (left, right) {
    if (left.length !== right.length) {
        throw 'Can not interleave. Channel lengths differ.';
    }
    var stereoInterleaved = new Float32Array(left.length * 2);
    for (var i = 0, len = left.length; i < len; i++) {
        stereoInterleaved[2 * i] = left[i];
        stereoInterleaved[2 * i + 1] = right[i];
    }
    return stereoInterleaved;
};
DSP.deinterleave = function () {
    var left, right, mix, deinterleaveChannel = [];
    deinterleaveChannel[DSP.MIX] = function (buffer) {
        for (var i = 0, len = buffer.length / 2; i < len; i++) {
            mix[i] = (buffer[2 * i] + buffer[2 * i + 1]) / 2;
        }
        return mix;
    };
    deinterleaveChannel[DSP.LEFT] = function (buffer) {
        for (var i = 0, len = buffer.length / 2; i < len; i++) {
            left[i] = buffer[2 * i];
        }
        return left;
    };
    deinterleaveChannel[DSP.RIGHT] = function (buffer) {
        for (var i = 0, len = buffer.length / 2; i < len; i++) {
            right[i] = buffer[2 * i + 1];
        }
        return right;
    };
    return function (channel, buffer) {
        left = left || new Float32Array(buffer.length / 2);
        right = right || new Float32Array(buffer.length / 2);
        mix = mix || new Float32Array(buffer.length / 2);
        if (buffer.length / 2 !== left.length) {
            left = new Float32Array(buffer.length / 2);
            right = new Float32Array(buffer.length / 2);
            mix = new Float32Array(buffer.length / 2);
        }
        return deinterleaveChannel[channel](buffer);
    };
}();
DSP.getChannel = DSP.deinterleave;
DSP.mixSampleBuffers = function (sampleBuffer1, sampleBuffer2, negate, volumeCorrection) {
    var outputSamples = new Float32Array(sampleBuffer1);
    for (var i = 0; i < sampleBuffer1.length; i++) {
        outputSamples[i] += (negate ? -sampleBuffer2[i] : sampleBuffer2[i]) / volumeCorrection;
    }
    return outputSamples;
};
DSP.LPF = 0;
DSP.HPF = 1;
DSP.BPF_CONSTANT_SKIRT = 2;
DSP.BPF_CONSTANT_PEAK = 3;
DSP.NOTCH = 4;
DSP.APF = 5;
DSP.PEAKING_EQ = 6;
DSP.LOW_SHELF = 7;
DSP.HIGH_SHELF = 8;
DSP.Q = 1;
DSP.BW = 2;
DSP.S = 3;
DSP.RMS = function (buffer) {
    var total = 0;
    for (var i = 0, n = buffer.length; i < n; i++) {
        total += buffer[i] * buffer[i];
    }
    return Math.sqrt(total / n);
};
DSP.Peak = function (buffer) {
    var peak = 0;
    for (var i = 0, n = buffer.length; i < n; i++) {
        peak = Math.abs(buffer[i]) > peak ? Math.abs(buffer[i]) : peak;
    }
    return peak;
};
function FourierTransform(bufferSize, sampleRate) {
    this.bufferSize = bufferSize;
    this.sampleRate = sampleRate;
    this.bandwidth = 2 / bufferSize * sampleRate / 2;
    this.spectrum = new Float32Array(bufferSize / 2);
    this.real = new Float32Array(bufferSize);
    this.imag = new Float32Array(bufferSize);
    this.peakBand = 0;
    this.peak = 0;
    this.getBandFrequency = function (index) {
        return this.bandwidth * index + this.bandwidth / 2;
    };
    this.calculateSpectrum = function () {
        var spectrum = this.spectrum, real = this.real, imag = this.imag, bSi = 2 / this.bufferSize, sqrt = Math.sqrt, rval, ival, mag;
        for (var i = 0, N = bufferSize / 2; i < N; i++) {
            rval = real[i];
            ival = imag[i];
            mag = bSi * sqrt(rval * rval + ival * ival);
            if (mag > this.peak) {
                this.peakBand = i;
                this.peak = mag;
            }
            spectrum[i] = mag;
        }
    };
}
function DFT(bufferSize, sampleRate) {
    FourierTransform.call(this, bufferSize, sampleRate);
    var N = bufferSize / 2 * bufferSize;
    var TWO_PI = 2 * Math.PI;
    this.sinTable = new Float32Array(N);
    this.cosTable = new Float32Array(N);
    for (var i = 0; i < N; i++) {
        this.sinTable[i] = Math.sin(i * TWO_PI / bufferSize);
        this.cosTable[i] = Math.cos(i * TWO_PI / bufferSize);
    }
}
DFT.prototype.forward = function (buffer) {
    var real = this.real, imag = this.imag, rval, ival;
    for (var k = 0; k < this.bufferSize / 2; k++) {
        rval = 0;
        ival = 0;
        for (var n = 0; n < buffer.length; n++) {
            rval += this.cosTable[k * n] * buffer[n];
            ival += this.sinTable[k * n] * buffer[n];
        }
        real[k] = rval;
        imag[k] = ival;
    }
    return this.calculateSpectrum();
};
function FFT(bufferSize, sampleRate) {
    FourierTransform.call(this, bufferSize, sampleRate);
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
FFT.prototype.forward = function (buffer) {
    var bufferSize = this.bufferSize, cosTable = this.cosTable, sinTable = this.sinTable, reverseTable = this.reverseTable, real = this.real, imag = this.imag, spectrum = this.spectrum;
    var k = Math.floor(Math.log(bufferSize) / Math.LN2);
    if (Math.pow(2, k) !== bufferSize) {
        throw 'Invalid buffer size, must be a power of 2.';
    }
    if (bufferSize !== buffer.length) {
        throw 'Supplied buffer is not the same size as defined FFT. FFT Size: ' + bufferSize + ' Buffer Size: ' + buffer.length;
    }
    var halfSize = 1, phaseShiftStepReal, phaseShiftStepImag, currentPhaseShiftReal, currentPhaseShiftImag, off, tr, ti, tmpReal, i;
    for (i = 0; i < bufferSize; i++) {
        real[i] = buffer[reverseTable[i]];
        imag[i] = 0;
    }
    while (halfSize < bufferSize) {
        phaseShiftStepReal = cosTable[halfSize];
        phaseShiftStepImag = sinTable[halfSize];
        currentPhaseShiftReal = 1;
        currentPhaseShiftImag = 0;
        for (var fftStep = 0; fftStep < halfSize; fftStep++) {
            i = fftStep;
            while (i < bufferSize) {
                off = i + halfSize;
                tr = currentPhaseShiftReal * real[off] - currentPhaseShiftImag * imag[off];
                ti = currentPhaseShiftReal * imag[off] + currentPhaseShiftImag * real[off];
                real[off] = real[i] - tr;
                imag[off] = imag[i] - ti;
                real[i] += tr;
                imag[i] += ti;
                i += halfSize << 1;
            }
            tmpReal = currentPhaseShiftReal;
            currentPhaseShiftReal = tmpReal * phaseShiftStepReal - currentPhaseShiftImag * phaseShiftStepImag;
            currentPhaseShiftImag = tmpReal * phaseShiftStepImag + currentPhaseShiftImag * phaseShiftStepReal;
        }
        halfSize = halfSize << 1;
    }
    return this.calculateSpectrum();
};
FFT.prototype.inverse = function (real, imag) {
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
                tr = currentPhaseShiftReal * real[off] - currentPhaseShiftImag * imag[off];
                ti = currentPhaseShiftReal * imag[off] + currentPhaseShiftImag * real[off];
                real[off] = real[i] - tr;
                imag[off] = imag[i] - ti;
                real[i] += tr;
                imag[i] += ti;
                i += halfSize << 1;
            }
            tmpReal = currentPhaseShiftReal;
            currentPhaseShiftReal = tmpReal * phaseShiftStepReal - currentPhaseShiftImag * phaseShiftStepImag;
            currentPhaseShiftImag = tmpReal * phaseShiftStepImag + currentPhaseShiftImag * phaseShiftStepReal;
        }
        halfSize = halfSize << 1;
    }
    var buffer = new Float32Array(bufferSize);
    for (i = 0; i < bufferSize; i++) {
        buffer[i] = real[i] / bufferSize;
    }
    return buffer;
};
function RFFT(bufferSize, sampleRate) {
    FourierTransform.call(this, bufferSize, sampleRate);
    this.trans = new Float32Array(bufferSize);
    this.reverseTable = new Uint32Array(bufferSize);
    this.reverseBinPermute = function (dest, source) {
        var bufferSize = this.bufferSize, halfSize = bufferSize >>> 1, nm1 = bufferSize - 1, i = 1, r = 0, h;
        dest[0] = source[0];
        do {
            r += halfSize;
            dest[i] = source[r];
            dest[r] = source[i];
            i++;
            h = halfSize << 1;
            while (h = h >> 1, !((r ^= h) & h));
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
    this.generateReverseTable = function () {
        var bufferSize = this.bufferSize, halfSize = bufferSize >>> 1, nm1 = bufferSize - 1, i = 1, r = 0, h;
        this.reverseTable[0] = 0;
        do {
            r += halfSize;
            this.reverseTable[i] = r;
            this.reverseTable[r] = i;
            i++;
            h = halfSize << 1;
            while (h = h >> 1, !((r ^= h) & h));
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
    this.generateReverseTable();
}
RFFT.prototype.forward = function (buffer) {
    var n = this.bufferSize, spectrum = this.spectrum, x = this.trans, TWO_PI = 2 * Math.PI, sqrt = Math.sqrt, i = n >>> 1, bSi = 2 / n, n2, n4, n8, nn, t1, t2, t3, t4, i1, i2, i3, i4, i5, i6, i7, i8, st1, cc1, ss1, cc3, ss3, e, a, rval, ival, mag;
    this.reverseBinPermute(x, buffer);
    for (var ix = 0, id = 4; ix < n; id *= 4) {
        for (var i0 = ix; i0 < n; i0 += id) {
            st1 = x[i0] - x[i0 + 1];
            x[i0] += x[i0 + 1];
            x[i0 + 1] = st1;
        }
        ix = 2 * (id - 1);
    }
    n2 = 2;
    nn = n >>> 1;
    while (nn = nn >>> 1) {
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
                    t1 = x[i3] + x[i4];
                    x[i4] -= x[i3];
                    x[i3] = x[i1] - t1;
                    x[i1] += t1;
                    i1 += n8;
                    i2 += n8;
                    i3 += n8;
                    i4 += n8;
                    t1 = x[i3] + x[i4];
                    t2 = x[i3] - x[i4];
                    t1 = -t1 * Math.SQRT1_2;
                    t2 *= Math.SQRT1_2;
                    st1 = x[i2];
                    x[i4] = t1 + st1;
                    x[i3] = t1 - st1;
                    x[i2] = x[i1] - t2;
                    x[i1] += t2;
                }
            } else {
                for (i0 = ix; i0 < n; i0 += id) {
                    i1 = i0;
                    i2 = i1 + n4;
                    i3 = i2 + n4;
                    i4 = i3 + n4;
                    t1 = x[i3] + x[i4];
                    x[i4] -= x[i3];
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
                    t2 = x[i7] * cc1 - x[i3] * ss1;
                    t1 = x[i7] * ss1 + x[i3] * cc1;
                    t4 = x[i8] * cc3 - x[i4] * ss3;
                    t3 = x[i8] * ss3 + x[i4] * cc3;
                    st1 = t2 - t4;
                    t2 += t4;
                    t4 = st1;
                    x[i8] = t2 + x[i6];
                    x[i3] = t2 - x[i6];
                    st1 = t3 - t1;
                    t1 += t3;
                    t3 = st1;
                    x[i4] = t3 + x[i2];
                    x[i7] = t3 - x[i2];
                    x[i6] = x[i1] - t1;
                    x[i1] += t1;
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
function Sampler(file, bufferSize, sampleRate, playStart, playEnd, loopStart, loopEnd, loopMode) {
    this.file = file;
    this.bufferSize = bufferSize;
    this.sampleRate = sampleRate;
    this.playStart = playStart || 0;
    this.playEnd = playEnd || 1;
    this.loopStart = loopStart || 0;
    this.loopEnd = loopEnd || 1;
    this.loopMode = loopMode || DSP.OFF;
    this.loaded = false;
    this.samples = [];
    this.signal = new Float32Array(bufferSize);
    this.frameCount = 0;
    this.envelope = null;
    this.amplitude = 1;
    this.rootFrequency = 110;
    this.frequency = 550;
    this.step = this.frequency / this.rootFrequency;
    this.duration = 0;
    this.samplesProcessed = 0;
    this.playhead = 0;
    var audio = document.createElement('AUDIO');
    var self = this;
    this.loadSamples = function (event) {
        var buffer = DSP.getChannel(DSP.MIX, event.frameBuffer);
        for (var i = 0; i < buffer.length; i++) {
            self.samples.push(buffer[i]);
        }
    };
    this.loadComplete = function () {
        self.samples = new Float32Array(self.samples);
        self.loaded = true;
    };
    this.loadMetaData = function () {
        self.duration = audio.duration;
    };
    audio.addEventListener('MozAudioAvailable', this.loadSamples, false);
    audio.addEventListener('loadedmetadata', this.loadMetaData, false);
    audio.addEventListener('ended', this.loadComplete, false);
    audio.muted = true;
    audio.src = file;
    audio.play();
}
Sampler.prototype.applyEnvelope = function () {
    this.envelope.process(this.signal);
    return this.signal;
};
Sampler.prototype.generate = function () {
    var frameOffset = this.frameCount * this.bufferSize;
    var loopWidth = this.playEnd * this.samples.length - this.playStart * this.samples.length;
    var playStartSamples = this.playStart * this.samples.length;
    var playEndSamples = this.playEnd * this.samples.length;
    var offset;
    for (var i = 0; i < this.bufferSize; i++) {
        switch (this.loopMode) {
        case DSP.OFF:
            this.playhead = Math.round(this.samplesProcessed * this.step + playStartSamples);
            if (this.playhead < this.playEnd * this.samples.length) {
                this.signal[i] = this.samples[this.playhead] * this.amplitude;
            } else {
                this.signal[i] = 0;
            }
            break;
        case DSP.FW:
            this.playhead = Math.round(this.samplesProcessed * this.step % loopWidth + playStartSamples);
            if (this.playhead < this.playEnd * this.samples.length) {
                this.signal[i] = this.samples[this.playhead] * this.amplitude;
            }
            break;
        case DSP.BW:
            this.playhead = playEndSamples - Math.round(this.samplesProcessed * this.step % loopWidth);
            if (this.playhead < this.playEnd * this.samples.length) {
                this.signal[i] = this.samples[this.playhead] * this.amplitude;
            }
            break;
        case DSP.FWBW:
            if (Math.floor(this.samplesProcessed * this.step / loopWidth) % 2 === 0) {
                this.playhead = Math.round(this.samplesProcessed * this.step % loopWidth + playStartSamples);
            } else {
                this.playhead = playEndSamples - Math.round(this.samplesProcessed * this.step % loopWidth);
            }
            if (this.playhead < this.playEnd * this.samples.length) {
                this.signal[i] = this.samples[this.playhead] * this.amplitude;
            }
            break;
        }
        this.samplesProcessed++;
    }
    this.frameCount++;
    return this.signal;
};
Sampler.prototype.setFreq = function (frequency) {
    var totalProcessed = this.samplesProcessed * this.step;
    this.frequency = frequency;
    this.step = this.frequency / this.rootFrequency;
    this.samplesProcessed = Math.round(totalProcessed / this.step);
};
Sampler.prototype.reset = function () {
    this.samplesProcessed = 0;
    this.playhead = 0;
};
function Oscillator(type, frequency, amplitude, bufferSize, sampleRate) {
    this.frequency = frequency;
    this.amplitude = amplitude;
    this.bufferSize = bufferSize;
    this.sampleRate = sampleRate;
    this.frameCount = 0;
    this.waveTableLength = 2048;
    this.cyclesPerSample = frequency / sampleRate;
    this.signal = new Float32Array(bufferSize);
    this.envelope = null;
    switch (parseInt(type, 10)) {
    case DSP.TRIANGLE:
        this.func = Oscillator.Triangle;
        break;
    case DSP.SAW:
        this.func = Oscillator.Saw;
        break;
    case DSP.SQUARE:
        this.func = Oscillator.Square;
        break;
    default:
    case DSP.SINE:
        this.func = Oscillator.Sine;
        break;
    }
    this.generateWaveTable = function () {
        Oscillator.waveTable[this.func] = new Float32Array(2048);
        var waveTableTime = this.waveTableLength / this.sampleRate;
        var waveTableHz = 1 / waveTableTime;
        for (var i = 0; i < this.waveTableLength; i++) {
            Oscillator.waveTable[this.func][i] = this.func(i * waveTableHz / this.sampleRate);
        }
    };
    if (typeof Oscillator.waveTable === 'undefined') {
        Oscillator.waveTable = {};
    }
    if (typeof Oscillator.waveTable[this.func] === 'undefined') {
        this.generateWaveTable();
    }
    this.waveTable = Oscillator.waveTable[this.func];
}
Oscillator.prototype.setAmp = function (amplitude) {
    if (amplitude >= 0 && amplitude <= 1) {
        this.amplitude = amplitude;
    } else {
        throw 'Amplitude out of range (0..1).';
    }
};
Oscillator.prototype.setFreq = function (frequency) {
    this.frequency = frequency;
    this.cyclesPerSample = frequency / this.sampleRate;
};
Oscillator.prototype.add = function (oscillator) {
    for (var i = 0; i < this.bufferSize; i++) {
        this.signal[i] += oscillator.signal[i];
    }
    return this.signal;
};
Oscillator.prototype.addSignal = function (signal) {
    for (var i = 0; i < signal.length; i++) {
        if (i >= this.bufferSize) {
            break;
        }
        this.signal[i] += signal[i];
    }
    return this.signal;
};
Oscillator.prototype.addEnvelope = function (envelope) {
    this.envelope = envelope;
};
Oscillator.prototype.applyEnvelope = function () {
    this.envelope.process(this.signal);
};
Oscillator.prototype.valueAt = function (offset) {
    return this.waveTable[offset % this.waveTableLength];
};
Oscillator.prototype.generate = function () {
    var frameOffset = this.frameCount * this.bufferSize;
    var step = this.waveTableLength * this.frequency / this.sampleRate;
    var offset;
    for (var i = 0; i < this.bufferSize; i++) {
        offset = Math.round((frameOffset + i) * step);
        this.signal[i] = this.waveTable[offset % this.waveTableLength] * this.amplitude;
    }
    this.frameCount++;
    return this.signal;
};
Oscillator.Sine = function (step) {
    return Math.sin(DSP.TWO_PI * step);
};
Oscillator.Square = function (step) {
    return step < 0.5 ? 1 : -1;
};
Oscillator.Saw = function (step) {
    return 2 * (step - Math.round(step));
};
Oscillator.Triangle = function (step) {
    return 1 - 4 * Math.abs(Math.round(step) - step);
};
Oscillator.Pulse = function (step) {
};
function ADSR(attackLength, decayLength, sustainLevel, sustainLength, releaseLength, sampleRate) {
    this.sampleRate = sampleRate;
    this.attackLength = attackLength;
    this.decayLength = decayLength;
    this.sustainLevel = sustainLevel;
    this.sustainLength = sustainLength;
    this.releaseLength = releaseLength;
    this.sampleRate = sampleRate;
    this.attackSamples = attackLength * sampleRate;
    this.decaySamples = decayLength * sampleRate;
    this.sustainSamples = sustainLength * sampleRate;
    this.releaseSamples = releaseLength * sampleRate;
    this.update = function () {
        this.attack = this.attackSamples;
        this.decay = this.attack + this.decaySamples;
        this.sustain = this.decay + this.sustainSamples;
        this.release = this.sustain + this.releaseSamples;
    };
    this.update();
    this.samplesProcessed = 0;
}
ADSR.prototype.noteOn = function () {
    this.samplesProcessed = 0;
    this.sustainSamples = this.sustainLength * this.sampleRate;
    this.update();
};
ADSR.prototype.noteOff = function () {
    this.sustainSamples = this.samplesProcessed - this.decaySamples;
    this.update();
};
ADSR.prototype.processSample = function (sample) {
    var amplitude = 0;
    if (this.samplesProcessed <= this.attack) {
        amplitude = 0 + (1 - 0) * ((this.samplesProcessed - 0) / (this.attack - 0));
    } else if (this.samplesProcessed > this.attack && this.samplesProcessed <= this.decay) {
        amplitude = 1 + (this.sustainLevel - 1) * ((this.samplesProcessed - this.attack) / (this.decay - this.attack));
    } else if (this.samplesProcessed > this.decay && this.samplesProcessed <= this.sustain) {
        amplitude = this.sustainLevel;
    } else if (this.samplesProcessed > this.sustain && this.samplesProcessed <= this.release) {
        amplitude = this.sustainLevel + (0 - this.sustainLevel) * ((this.samplesProcessed - this.sustain) / (this.release - this.sustain));
    }
    return sample * amplitude;
};
ADSR.prototype.value = function () {
    var amplitude = 0;
    if (this.samplesProcessed <= this.attack) {
        amplitude = 0 + (1 - 0) * ((this.samplesProcessed - 0) / (this.attack - 0));
    } else if (this.samplesProcessed > this.attack && this.samplesProcessed <= this.decay) {
        amplitude = 1 + (this.sustainLevel - 1) * ((this.samplesProcessed - this.attack) / (this.decay - this.attack));
    } else if (this.samplesProcessed > this.decay && this.samplesProcessed <= this.sustain) {
        amplitude = this.sustainLevel;
    } else if (this.samplesProcessed > this.sustain && this.samplesProcessed <= this.release) {
        amplitude = this.sustainLevel + (0 - this.sustainLevel) * ((this.samplesProcessed - this.sustain) / (this.release - this.sustain));
    }
    return amplitude;
};
ADSR.prototype.process = function (buffer) {
    for (var i = 0; i < buffer.length; i++) {
        buffer[i] *= this.value();
        this.samplesProcessed++;
    }
    return buffer;
};
ADSR.prototype.isActive = function () {
    if (this.samplesProcessed > this.release || this.samplesProcessed === -1) {
        return false;
    } else {
        return true;
    }
};
ADSR.prototype.disable = function () {
    this.samplesProcessed = -1;
};
function IIRFilter(type, cutoff, resonance, sampleRate) {
    this.sampleRate = sampleRate;
    switch (type) {
    case DSP.LOWPASS:
    case DSP.LP12:
        this.func = new IIRFilter.LP12(cutoff, resonance, sampleRate);
        break;
    }
}
IIRFilter.prototype.__defineGetter__('cutoff', function () {
    return this.func.cutoff;
});
IIRFilter.prototype.__defineGetter__('resonance', function () {
    return this.func.resonance;
});
IIRFilter.prototype.set = function (cutoff, resonance) {
    this.func.calcCoeff(cutoff, resonance);
};
IIRFilter.prototype.process = function (buffer) {
    this.func.process(buffer);
};
IIRFilter.prototype.addEnvelope = function (envelope) {
    if (envelope instanceof ADSR) {
        this.func.addEnvelope(envelope);
    } else {
        throw 'Not an envelope.';
    }
};
IIRFilter.LP12 = function (cutoff, resonance, sampleRate) {
    this.sampleRate = sampleRate;
    this.vibraPos = 0;
    this.vibraSpeed = 0;
    this.envelope = false;
    this.calcCoeff = function (cutoff, resonance) {
        this.w = 2 * Math.PI * cutoff / this.sampleRate;
        this.q = 1 - this.w / (2 * (resonance + 0.5 / (1 + this.w)) + this.w - 2);
        this.r = this.q * this.q;
        this.c = this.r + 1 - 2 * Math.cos(this.w) * this.q;
        this.cutoff = cutoff;
        this.resonance = resonance;
    };
    this.calcCoeff(cutoff, resonance);
    this.process = function (buffer) {
        for (var i = 0; i < buffer.length; i++) {
            this.vibraSpeed += (buffer[i] - this.vibraPos) * this.c;
            this.vibraPos += this.vibraSpeed;
            this.vibraSpeed *= this.r;
            if (this.envelope) {
                buffer[i] = buffer[i] * (1 - this.envelope.value()) + this.vibraPos * this.envelope.value();
                this.envelope.samplesProcessed++;
            } else {
                buffer[i] = this.vibraPos;
            }
        }
    };
};
IIRFilter.LP12.prototype.addEnvelope = function (envelope) {
    this.envelope = envelope;
};
function IIRFilter2(type, cutoff, resonance, sampleRate) {
    this.type = type;
    this.cutoff = cutoff;
    this.resonance = resonance;
    this.sampleRate = sampleRate;
    this.f = Float32Array(4);
    this.f[0] = 0;
    this.f[1] = 0;
    this.f[2] = 0;
    this.f[3] = 0;
    this.calcCoeff = function (cutoff, resonance) {
        this.freq = 2 * Math.sin(Math.PI * Math.min(0.25, cutoff / (this.sampleRate * 2)));
        this.damp = Math.min(2 * (1 - Math.pow(resonance, 0.25)), Math.min(2, 2 / this.freq - this.freq * 0.5));
    };
    this.calcCoeff(cutoff, resonance);
}
IIRFilter2.prototype.process = function (buffer) {
    var input, output;
    var f = this.f;
    for (var i = 0; i < buffer.length; i++) {
        input = buffer[i];
        f[3] = input - this.damp * f[2];
        f[0] = f[0] + this.freq * f[2];
        f[1] = f[3] - f[0];
        f[2] = this.freq * f[1] + f[2];
        output = 0.5 * f[this.type];
        f[3] = input - this.damp * f[2];
        f[0] = f[0] + this.freq * f[2];
        f[1] = f[3] - f[0];
        f[2] = this.freq * f[1] + f[2];
        output += 0.5 * f[this.type];
        if (this.envelope) {
            buffer[i] = buffer[i] * (1 - this.envelope.value()) + output * this.envelope.value();
            this.envelope.samplesProcessed++;
        } else {
            buffer[i] = output;
        }
    }
};
IIRFilter2.prototype.addEnvelope = function (envelope) {
    if (envelope instanceof ADSR) {
        this.envelope = envelope;
    } else {
        throw 'This is not an envelope.';
    }
};
IIRFilter2.prototype.set = function (cutoff, resonance) {
    this.calcCoeff(cutoff, resonance);
};
function WindowFunction(type, alpha) {
    this.alpha = alpha;
    switch (type) {
    case DSP.BARTLETT:
        this.func = WindowFunction.Bartlett;
        break;
    case DSP.BARTLETTHANN:
        this.func = WindowFunction.BartlettHann;
        break;
    case DSP.BLACKMAN:
        this.func = WindowFunction.Blackman;
        this.alpha = this.alpha || 0.16;
        break;
    case DSP.COSINE:
        this.func = WindowFunction.Cosine;
        break;
    case DSP.GAUSS:
        this.func = WindowFunction.Gauss;
        this.alpha = this.alpha || 0.25;
        break;
    case DSP.HAMMING:
        this.func = WindowFunction.Hamming;
        break;
    case DSP.HANN:
        this.func = WindowFunction.Hann;
        break;
    case DSP.LANCZOS:
        this.func = WindowFunction.Lanczoz;
        break;
    case DSP.RECTANGULAR:
        this.func = WindowFunction.Rectangular;
        break;
    case DSP.TRIANGULAR:
        this.func = WindowFunction.Triangular;
        break;
    }
}
WindowFunction.prototype.process = function (buffer) {
    var length = buffer.length;
    for (var i = 0; i < length; i++) {
        buffer[i] *= this.func(length, i, this.alpha);
    }
    return buffer;
};
WindowFunction.Bartlett = function (length, index) {
    return 2 / (length - 1) * ((length - 1) / 2 - Math.abs(index - (length - 1) / 2));
};
WindowFunction.BartlettHann = function (length, index) {
    return 0.62 - 0.48 * Math.abs(index / (length - 1) - 0.5) - 0.38 * Math.cos(DSP.TWO_PI * index / (length - 1));
};
WindowFunction.Blackman = function (length, index, alpha) {
    var a0 = (1 - alpha) / 2;
    var a1 = 0.5;
    var a2 = alpha / 2;
    return a0 - a1 * Math.cos(DSP.TWO_PI * index / (length - 1)) + a2 * Math.cos(4 * Math.PI * index / (length - 1));
};
WindowFunction.Cosine = function (length, index) {
    return Math.cos(Math.PI * index / (length - 1) - Math.PI / 2);
};
WindowFunction.Gauss = function (length, index, alpha) {
    return Math.pow(Math.E, -0.5 * Math.pow((index - (length - 1) / 2) / (alpha * (length - 1) / 2), 2));
};
WindowFunction.Hamming = function (length, index) {
    return 0.54 - 0.46 * Math.cos(DSP.TWO_PI * index / (length - 1));
};
WindowFunction.Hann = function (length, index) {
    return 0.5 * (1 - Math.cos(DSP.TWO_PI * index / (length - 1)));
};
WindowFunction.Lanczos = function (length, index) {
    var x = 2 * index / (length - 1) - 1;
    return Math.sin(Math.PI * x) / (Math.PI * x);
};
WindowFunction.Rectangular = function (length, index) {
    return 1;
};
WindowFunction.Triangular = function (length, index) {
    return 2 / length * (length / 2 - Math.abs(index - (length - 1) / 2));
};
function sinh(arg) {
    return (Math.exp(arg) - Math.exp(-arg)) / 2;
}
function Biquad(type, sampleRate) {
    this.Fs = sampleRate;
    this.type = type;
    this.parameterType = DSP.Q;
    this.x_1_l = 0;
    this.x_2_l = 0;
    this.y_1_l = 0;
    this.y_2_l = 0;
    this.x_1_r = 0;
    this.x_2_r = 0;
    this.y_1_r = 0;
    this.y_2_r = 0;
    this.b0 = 1;
    this.a0 = 1;
    this.b1 = 0;
    this.a1 = 0;
    this.b2 = 0;
    this.a2 = 0;
    this.b0a0 = this.b0 / this.a0;
    this.b1a0 = this.b1 / this.a0;
    this.b2a0 = this.b2 / this.a0;
    this.a1a0 = this.a1 / this.a0;
    this.a2a0 = this.a2 / this.a0;
    this.f0 = 3000;
    this.dBgain = 12;
    this.Q = 1;
    this.BW = -3;
    this.S = 1;
    this.coefficients = function () {
        var b = [
            this.b0,
            this.b1,
            this.b2
        ];
        var a = [
            this.a0,
            this.a1,
            this.a2
        ];
        return {
            b: b,
            a: a
        };
    };
    this.setFilterType = function (type) {
        this.type = type;
        this.recalculateCoefficients();
    };
    this.setSampleRate = function (rate) {
        this.Fs = rate;
        this.recalculateCoefficients();
    };
    this.setQ = function (q) {
        this.parameterType = DSP.Q;
        this.Q = Math.max(Math.min(q, 115), 0.001);
        this.recalculateCoefficients();
    };
    this.setBW = function (bw) {
        this.parameterType = DSP.BW;
        this.BW = bw;
        this.recalculateCoefficients();
    };
    this.setS = function (s) {
        this.parameterType = DSP.S;
        this.S = Math.max(Math.min(s, 5), 0.0001);
        this.recalculateCoefficients();
    };
    this.setF0 = function (freq) {
        this.f0 = freq;
        this.recalculateCoefficients();
    };
    this.setDbGain = function (g) {
        this.dBgain = g;
        this.recalculateCoefficients();
    };
    this.recalculateCoefficients = function () {
        var A;
        if (type === DSP.PEAKING_EQ || type === DSP.LOW_SHELF || type === DSP.HIGH_SHELF) {
            A = Math.pow(10, this.dBgain / 40);
        } else {
            A = Math.sqrt(Math.pow(10, this.dBgain / 20));
        }
        var w0 = DSP.TWO_PI * this.f0 / this.Fs;
        var cosw0 = Math.cos(w0);
        var sinw0 = Math.sin(w0);
        var alpha = 0;
        switch (this.parameterType) {
        case DSP.Q:
            alpha = sinw0 / (2 * this.Q);
            break;
        case DSP.BW:
            alpha = sinw0 * sinh(Math.LN2 / 2 * this.BW * w0 / sinw0);
            break;
        case DSP.S:
            alpha = sinw0 / 2 * Math.sqrt((A + 1 / A) * (1 / this.S - 1) + 2);
            break;
        }
        var coeff;
        switch (this.type) {
        case DSP.LPF:
            this.b0 = (1 - cosw0) / 2;
            this.b1 = 1 - cosw0;
            this.b2 = (1 - cosw0) / 2;
            this.a0 = 1 + alpha;
            this.a1 = -2 * cosw0;
            this.a2 = 1 - alpha;
            break;
        case DSP.HPF:
            this.b0 = (1 + cosw0) / 2;
            this.b1 = -(1 + cosw0);
            this.b2 = (1 + cosw0) / 2;
            this.a0 = 1 + alpha;
            this.a1 = -2 * cosw0;
            this.a2 = 1 - alpha;
            break;
        case DSP.BPF_CONSTANT_SKIRT:
            this.b0 = sinw0 / 2;
            this.b1 = 0;
            this.b2 = -sinw0 / 2;
            this.a0 = 1 + alpha;
            this.a1 = -2 * cosw0;
            this.a2 = 1 - alpha;
            break;
        case DSP.BPF_CONSTANT_PEAK:
            this.b0 = alpha;
            this.b1 = 0;
            this.b2 = -alpha;
            this.a0 = 1 + alpha;
            this.a1 = -2 * cosw0;
            this.a2 = 1 - alpha;
            break;
        case DSP.NOTCH:
            this.b0 = 1;
            this.b1 = -2 * cosw0;
            this.b2 = 1;
            this.a0 = 1 + alpha;
            this.a1 = -2 * cosw0;
            this.a2 = 1 - alpha;
            break;
        case DSP.APF:
            this.b0 = 1 - alpha;
            this.b1 = -2 * cosw0;
            this.b2 = 1 + alpha;
            this.a0 = 1 + alpha;
            this.a1 = -2 * cosw0;
            this.a2 = 1 - alpha;
            break;
        case DSP.PEAKING_EQ:
            this.b0 = 1 + alpha * A;
            this.b1 = -2 * cosw0;
            this.b2 = 1 - alpha * A;
            this.a0 = 1 + alpha / A;
            this.a1 = -2 * cosw0;
            this.a2 = 1 - alpha / A;
            break;
        case DSP.LOW_SHELF:
            coeff = sinw0 * Math.sqrt((A ^ 2 + 1) * (1 / this.S - 1) + 2 * A);
            this.b0 = A * (A + 1 - (A - 1) * cosw0 + coeff);
            this.b1 = 2 * A * (A - 1 - (A + 1) * cosw0);
            this.b2 = A * (A + 1 - (A - 1) * cosw0 - coeff);
            this.a0 = A + 1 + (A - 1) * cosw0 + coeff;
            this.a1 = -2 * (A - 1 + (A + 1) * cosw0);
            this.a2 = A + 1 + (A - 1) * cosw0 - coeff;
            break;
        case DSP.HIGH_SHELF:
            coeff = sinw0 * Math.sqrt((A ^ 2 + 1) * (1 / this.S - 1) + 2 * A);
            this.b0 = A * (A + 1 + (A - 1) * cosw0 + coeff);
            this.b1 = -2 * A * (A - 1 + (A + 1) * cosw0);
            this.b2 = A * (A + 1 + (A - 1) * cosw0 - coeff);
            this.a0 = A + 1 - (A - 1) * cosw0 + coeff;
            this.a1 = 2 * (A - 1 - (A + 1) * cosw0);
            this.a2 = A + 1 - (A - 1) * cosw0 - coeff;
            break;
        }
        this.b0a0 = this.b0 / this.a0;
        this.b1a0 = this.b1 / this.a0;
        this.b2a0 = this.b2 / this.a0;
        this.a1a0 = this.a1 / this.a0;
        this.a2a0 = this.a2 / this.a0;
    };
    this.process = function (buffer) {
        var len = buffer.length;
        var output = new Float32Array(len);
        for (var i = 0; i < buffer.length; i++) {
            output[i] = this.b0a0 * buffer[i] + this.b1a0 * this.x_1_l + this.b2a0 * this.x_2_l - this.a1a0 * this.y_1_l - this.a2a0 * this.y_2_l;
            this.y_2_l = this.y_1_l;
            this.y_1_l = output[i];
            this.x_2_l = this.x_1_l;
            this.x_1_l = buffer[i];
        }
        return output;
    };
    this.processStereo = function (buffer) {
        var len = buffer.length;
        var output = new Float32Array(len);
        for (var i = 0; i < len / 2; i++) {
            output[2 * i] = this.b0a0 * buffer[2 * i] + this.b1a0 * this.x_1_l + this.b2a0 * this.x_2_l - this.a1a0 * this.y_1_l - this.a2a0 * this.y_2_l;
            this.y_2_l = this.y_1_l;
            this.y_1_l = output[2 * i];
            this.x_2_l = this.x_1_l;
            this.x_1_l = buffer[2 * i];
            output[2 * i + 1] = this.b0a0 * buffer[2 * i + 1] + this.b1a0 * this.x_1_r + this.b2a0 * this.x_2_r - this.a1a0 * this.y_1_r - this.a2a0 * this.y_2_r;
            this.y_2_r = this.y_1_r;
            this.y_1_r = output[2 * i + 1];
            this.x_2_r = this.x_1_r;
            this.x_1_r = buffer[2 * i + 1];
        }
        return output;
    };
}
DSP.mag2db = function (buffer) {
    var minDb = -120;
    var minMag = Math.pow(10, minDb / 20);
    var log = Math.log;
    var max = Math.max;
    var result = Float32Array(buffer.length);
    for (var i = 0; i < buffer.length; i++) {
        result[i] = 20 * log(max(buffer[i], minMag));
    }
    return result;
};
DSP.freqz = function (b, a, w) {
    var i, j;
    if (!w) {
        w = Float32Array(200);
        for (i = 0; i < w.length; i++) {
            w[i] = DSP.TWO_PI / w.length * i - Math.PI;
        }
    }
    var result = Float32Array(w.length);
    var sqrt = Math.sqrt;
    var cos = Math.cos;
    var sin = Math.sin;
    for (i = 0; i < w.length; i++) {
        var numerator = {
            real: 0,
            imag: 0
        };
        for (j = 0; j < b.length; j++) {
            numerator.real += b[j] * cos(-j * w[i]);
            numerator.imag += b[j] * sin(-j * w[i]);
        }
        var denominator = {
            real: 0,
            imag: 0
        };
        for (j = 0; j < a.length; j++) {
            denominator.real += a[j] * cos(-j * w[i]);
            denominator.imag += a[j] * sin(-j * w[i]);
        }
        result[i] = sqrt(numerator.real * numerator.real + numerator.imag * numerator.imag) / sqrt(denominator.real * denominator.real + denominator.imag * denominator.imag);
    }
    return result;
};
function GraphicalEq(sampleRate) {
    this.FS = sampleRate;
    this.minFreq = 40;
    this.maxFreq = 16000;
    this.bandsPerOctave = 1;
    this.filters = [];
    this.freqzs = [];
    this.calculateFreqzs = true;
    this.recalculateFilters = function () {
        var bandCount = Math.round(Math.log(this.maxFreq / this.minFreq) * this.bandsPerOctave / Math.LN2);
        this.filters = [];
        for (var i = 0; i < bandCount; i++) {
            var freq = this.minFreq * Math.pow(2, i / this.bandsPerOctave);
            var newFilter = new Biquad(DSP.PEAKING_EQ, this.FS);
            newFilter.setDbGain(0);
            newFilter.setBW(1 / this.bandsPerOctave);
            newFilter.setF0(freq);
            this.filters[i] = newFilter;
            this.recalculateFreqz(i);
        }
    };
    this.setMinimumFrequency = function (freq) {
        this.minFreq = freq;
        this.recalculateFilters();
    };
    this.setMaximumFrequency = function (freq) {
        this.maxFreq = freq;
        this.recalculateFilters();
    };
    this.setBandsPerOctave = function (bands) {
        this.bandsPerOctave = bands;
        this.recalculateFilters();
    };
    this.setBandGain = function (bandIndex, gain) {
        if (bandIndex < 0 || bandIndex > this.filters.length - 1) {
            throw 'The band index of the graphical equalizer is out of bounds.';
        }
        if (!gain) {
            throw 'A gain must be passed.';
        }
        this.filters[bandIndex].setDbGain(gain);
        this.recalculateFreqz(bandIndex);
    };
    this.recalculateFreqz = function (bandIndex) {
        if (!this.calculateFreqzs) {
            return;
        }
        if (bandIndex < 0 || bandIndex > this.filters.length - 1) {
            throw 'The band index of the graphical equalizer is out of bounds. ' + bandIndex + ' is out of [' + 0 + ', ' + this.filters.length - 1 + ']';
        }
        if (!this.w) {
            this.w = Float32Array(400);
            for (var i = 0; i < this.w.length; i++) {
                this.w[i] = Math.PI / this.w.length * i;
            }
        }
        var b = [
            this.filters[bandIndex].b0,
            this.filters[bandIndex].b1,
            this.filters[bandIndex].b2
        ];
        var a = [
            this.filters[bandIndex].a0,
            this.filters[bandIndex].a1,
            this.filters[bandIndex].a2
        ];
        this.freqzs[bandIndex] = DSP.mag2db(DSP.freqz(b, a, this.w));
    };
    this.process = function (buffer) {
        var output = buffer;
        for (var i = 0; i < this.filters.length; i++) {
            output = this.filters[i].process(output);
        }
        return output;
    };
    this.processStereo = function (buffer) {
        var output = buffer;
        for (var i = 0; i < this.filters.length; i++) {
            output = this.filters[i].processStereo(output);
        }
        return output;
    };
}
function MultiDelay(maxDelayInSamplesSize, delayInSamples, masterVolume, delayVolume) {
    this.delayBufferSamples = new Float32Array(maxDelayInSamplesSize);
    this.delayInputPointer = delayInSamples;
    this.delayOutputPointer = 0;
    this.delayInSamples = delayInSamples;
    this.masterVolume = masterVolume;
    this.delayVolume = delayVolume;
}
MultiDelay.prototype.setDelayInSamples = function (delayInSamples) {
    this.delayInSamples = delayInSamples;
    this.delayInputPointer = this.delayOutputPointer + delayInSamples;
    if (this.delayInputPointer >= this.delayBufferSamples.length - 1) {
        this.delayInputPointer = this.delayInputPointer - this.delayBufferSamples.length;
    }
};
MultiDelay.prototype.setMasterVolume = function (masterVolume) {
    this.masterVolume = masterVolume;
};
MultiDelay.prototype.setDelayVolume = function (delayVolume) {
    this.delayVolume = delayVolume;
};
MultiDelay.prototype.process = function (samples) {
    var outputSamples = new Float32Array(samples.length);
    for (var i = 0; i < samples.length; i++) {
        var delaySample = this.delayBufferSamples[this.delayOutputPointer] === null ? 0 : this.delayBufferSamples[this.delayOutputPointer];
        var sample = delaySample * this.delayVolume + samples[i];
        this.delayBufferSamples[this.delayInputPointer] = sample;
        outputSamples[i] = sample * this.masterVolume;
        this.delayInputPointer++;
        if (this.delayInputPointer >= this.delayBufferSamples.length - 1) {
            this.delayInputPointer = 0;
        }
        this.delayOutputPointer++;
        if (this.delayOutputPointer >= this.delayBufferSamples.length - 1) {
            this.delayOutputPointer = 0;
        }
    }
    return outputSamples;
};
function SingleDelay(maxDelayInSamplesSize, delayInSamples, delayVolume) {
    this.delayBufferSamples = new Float32Array(maxDelayInSamplesSize);
    this.delayInputPointer = delayInSamples;
    this.delayOutputPointer = 0;
    this.delayInSamples = delayInSamples;
    this.delayVolume = delayVolume;
}
SingleDelay.prototype.setDelayInSamples = function (delayInSamples) {
    this.delayInSamples = delayInSamples;
    this.delayInputPointer = this.delayOutputPointer + delayInSamples;
    if (this.delayInputPointer >= this.delayBufferSamples.length - 1) {
        this.delayInputPointer = this.delayInputPointer - this.delayBufferSamples.length;
    }
};
SingleDelay.prototype.setDelayVolume = function (delayVolume) {
    this.delayVolume = delayVolume;
};
SingleDelay.prototype.process = function (samples) {
    var outputSamples = new Float32Array(samples.length);
    for (var i = 0; i < samples.length; i++) {
        this.delayBufferSamples[this.delayInputPointer] = samples[i];
        var delaySample = this.delayBufferSamples[this.delayOutputPointer];
        outputSamples[i] = delaySample * this.delayVolume;
        this.delayInputPointer++;
        if (this.delayInputPointer >= this.delayBufferSamples.length - 1) {
            this.delayInputPointer = 0;
        }
        this.delayOutputPointer++;
        if (this.delayOutputPointer >= this.delayBufferSamples.length - 1) {
            this.delayOutputPointer = 0;
        }
    }
    return outputSamples;
};
function Reverb(maxDelayInSamplesSize, delayInSamples, masterVolume, mixVolume, delayVolume, dampFrequency) {
    this.delayInSamples = delayInSamples;
    this.masterVolume = masterVolume;
    this.mixVolume = mixVolume;
    this.delayVolume = delayVolume;
    this.dampFrequency = dampFrequency;
    this.NR_OF_MULTIDELAYS = 6;
    this.NR_OF_SINGLEDELAYS = 6;
    this.LOWPASSL = new IIRFilter2(DSP.LOWPASS, dampFrequency, 0, 44100);
    this.LOWPASSR = new IIRFilter2(DSP.LOWPASS, dampFrequency, 0, 44100);
    this.singleDelays = [];
    var i, delayMultiply;
    for (i = 0; i < this.NR_OF_SINGLEDELAYS; i++) {
        delayMultiply = 1 + i / 7;
        this.singleDelays[i] = new SingleDelay(maxDelayInSamplesSize, Math.round(this.delayInSamples * delayMultiply), this.delayVolume);
    }
    this.multiDelays = [];
    for (i = 0; i < this.NR_OF_MULTIDELAYS; i++) {
        delayMultiply = 1 + i / 10;
        this.multiDelays[i] = new MultiDelay(maxDelayInSamplesSize, Math.round(this.delayInSamples * delayMultiply), this.masterVolume, this.delayVolume);
    }
}
Reverb.prototype.setDelayInSamples = function (delayInSamples) {
    this.delayInSamples = delayInSamples;
    var i, delayMultiply;
    for (i = 0; i < this.NR_OF_SINGLEDELAYS; i++) {
        delayMultiply = 1 + i / 7;
        this.singleDelays[i].setDelayInSamples(Math.round(this.delayInSamples * delayMultiply));
    }
    for (i = 0; i < this.NR_OF_MULTIDELAYS; i++) {
        delayMultiply = 1 + i / 10;
        this.multiDelays[i].setDelayInSamples(Math.round(this.delayInSamples * delayMultiply));
    }
};
Reverb.prototype.setMasterVolume = function (masterVolume) {
    this.masterVolume = masterVolume;
};
Reverb.prototype.setMixVolume = function (mixVolume) {
    this.mixVolume = mixVolume;
};
Reverb.prototype.setDelayVolume = function (delayVolume) {
    this.delayVolume = delayVolume;
    var i;
    for (i = 0; i < this.NR_OF_SINGLEDELAYS; i++) {
        this.singleDelays[i].setDelayVolume(this.delayVolume);
    }
    for (i = 0; i < this.NR_OF_MULTIDELAYS; i++) {
        this.multiDelays[i].setDelayVolume(this.delayVolume);
    }
};
Reverb.prototype.setDampFrequency = function (dampFrequency) {
    this.dampFrequency = dampFrequency;
    this.LOWPASSL.set(dampFrequency, 0);
    this.LOWPASSR.set(dampFrequency, 0);
};
Reverb.prototype.process = function (interleavedSamples) {
    var outputSamples = new Float32Array(interleavedSamples.length);
    var leftRightMix = DSP.deinterleave(interleavedSamples);
    this.LOWPASSL.process(leftRightMix[DSP.LEFT]);
    this.LOWPASSR.process(leftRightMix[DSP.RIGHT]);
    var filteredSamples = DSP.interleave(leftRightMix[DSP.LEFT], leftRightMix[DSP.RIGHT]);
    var i;
    for (i = 0; i < this.NR_OF_MULTIDELAYS; i++) {
        outputSamples = DSP.mixSampleBuffers(outputSamples, this.multiDelays[i].process(filteredSamples), 2 % i === 0, this.NR_OF_MULTIDELAYS);
    }
    var singleDelaySamples = new Float32Array(outputSamples.length);
    for (i = 0; i < this.NR_OF_SINGLEDELAYS; i++) {
        singleDelaySamples = DSP.mixSampleBuffers(singleDelaySamples, this.singleDelays[i].process(outputSamples), 2 % i === 0, 1);
    }
    for (i = 0; i < singleDelaySamples.length; i++) {
        singleDelaySamples[i] *= this.mixVolume;
    }
    outputSamples = DSP.mixSampleBuffers(singleDelaySamples, interleavedSamples, 0, 1);
    for (i = 0; i < outputSamples.length; i++) {
        outputSamples[i] *= this.masterVolume;
    }
    return outputSamples;
};
;
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Signal;
        (function (Signal) {
            function indexToFreq(index, sampleRate, fftSize) {
                return index * sampleRate / fftSize;
            }
            Signal.indexToFreq = indexToFreq;
            function freqToIndex(freq, sampleRate, fftSize) {
                return freq * fftSize / sampleRate | 0;
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
                var cross_real = Array.prototype.map.call(real, function (_, i) {
                    return sig_real[i] * real[i] / real.length;
                });
                var cross_imag = Array.prototype.map.call(imag, function (_, i) {
                    return -sig_real[i] * imag[i] / imag.length;
                });
                var inv_real = fft.inverse(cross_real, cross_imag);
                return inv_real;
            }
            Signal.calcCorr = calcCorr;
        }(Signal = lib.Signal || (lib.Signal = {})));
    }(lib = duxca.lib || (duxca.lib = {})));
}(duxca || (duxca = {})));
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Wave = function () {
            function Wave(channel, sampleRate, int16ary) {
                var bitsPerSample, i, int16, j, len, offset, size, view;
                size = int16ary.length * 2;
                channel = channel;
                bitsPerSample = 16;
                offset = 44;
                this.view = new DataView(new ArrayBuffer(offset + size));
                this.writeUTFBytes(0, 'RIFF');
                this.view.setUint32(4, offset + size - 8, true);
                this.writeUTFBytes(8, 'WAVE');
                this.writeUTFBytes(12, 'fmt ');
                view.setUint32(16, 16, true);
                view.setUint16(20, 1, true);
                view.setUint16(22, channel, true);
                view.setUint32(24, sampleRate, true);
                view.setUint32(28, sampleRate * (bitsPerSample >>> 3) * channel, true);
                view.setUint16(32, (bitsPerSample >>> 3) * channel, true);
                view.setUint16(34, bitsPerSample, true);
                this.writeUTFBytes(36, 'data');
                view.setUint32(40, size, true);
                for (i = j = 0, len = int16ary.length; j < len; i = ++j) {
                    int16 = int16ary[i];
                    view.setInt16(offset + i * 2, int16, true);
                }
            }
            Wave.prototype.toBlob = function () {
                return new Blob([this.view], { type: 'audio/wav' });
            };
            Wave.prototype.toURL = function () {
                return URL.createObjectURL(this.toBlob());
            };
            Wave.prototype.toAudio = function () {
                var audio;
                audio = document.createElement('audio');
                audio.src = this.toURL();
                audio.controls = true;
                return audio;
            };
            Wave.prototype.writeUTFBytes = function (offset, str) {
                var i, j, ref;
                for (i = j = 0, ref = str.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
                    this.view.setUint8(offset + i, str.charCodeAt(i));
                }
            };
            return Wave;
        }();
        lib.Wave = Wave;
    }(lib = duxca.lib || (duxca.lib = {})));
}(duxca || (duxca = {})));
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Canvas;
        (function (Canvas) {
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
            Canvas.hue2rgb = hue2rgb;
            function hslToRgb(h, s, l) {
                var b, g, p, q, r;
                h *= 5 / 6;
                if (h < 0) {
                    h = 0;
                }
                if (5 / 6 < h) {
                    h = 5 / 6;
                }
                if (s === 0) {
                    r = g = b = l;
                } else {
                    q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                    p = 2 * l - q;
                    r = hue2rgb(p, q, h + 1 / 3);
                    g = hue2rgb(p, q, h);
                    b = hue2rgb(p, q, h - 1 / 3);
                }
                return [
                    r * 255,
                    g * 255,
                    b * 255
                ];
            }
            Canvas.hslToRgb = hslToRgb;
        }(Canvas = lib.Canvas || (lib.Canvas = {})));
    }(lib = duxca.lib || (duxca.lib = {})));
}(duxca || (duxca = {})));
QUnit.module('duxca.lib');
QUnit.test('calcCorr', function (assert) {
    var rslt = duxca.lib.Signal.calcCorr([
        1,
        0,
        0,
        0
    ], [
        1,
        1,
        1,
        1
    ]);
    return assert.ok(assert._expr(assert._capt(assert._capt(assert._capt(rslt, 'arguments/0/left/object')[0], 'arguments/0/left') == 0.25, 'arguments/0'), {
        content: 'assert.ok(rslt[0] == 0.25)',
        filepath: 'tests/sandbox/tests.js',
        line: 2817
    }));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRlc3RzLmpzIl0sIm5hbWVzIjpbIkRTUCIsIkxFRlQiLCJSSUdIVCIsIk1JWCIsIlNJTkUiLCJUUklBTkdMRSIsIlNBVyIsIlNRVUFSRSIsIkxPV1BBU1MiLCJISUdIUEFTUyIsIkJBTkRQQVNTIiwiTk9UQ0giLCJCQVJUTEVUVCIsIkJBUlRMRVRUSEFOTiIsIkJMQUNLTUFOIiwiQ09TSU5FIiwiR0FVU1MiLCJIQU1NSU5HIiwiSEFOTiIsIkxBTkNaT1MiLCJSRUNUQU5HVUxBUiIsIlRSSUFOR1VMQVIiLCJPRkYiLCJGVyIsIkJXIiwiRldCVyIsIlRXT19QSSIsIk1hdGgiLCJQSSIsInNldHVwVHlwZWRBcnJheSIsIm5hbWUiLCJmYWxsYmFjayIsIm9iaiIsIkFycmF5IiwiaW52ZXJ0IiwiYnVmZmVyIiwiaSIsImxlbiIsImxlbmd0aCIsImludGVybGVhdmUiLCJsZWZ0IiwicmlnaHQiLCJzdGVyZW9JbnRlcmxlYXZlZCIsIkZsb2F0MzJBcnJheSIsImRlaW50ZXJsZWF2ZSIsIm1peCIsImRlaW50ZXJsZWF2ZUNoYW5uZWwiLCJjaGFubmVsIiwiZ2V0Q2hhbm5lbCIsIm1peFNhbXBsZUJ1ZmZlcnMiLCJzYW1wbGVCdWZmZXIxIiwic2FtcGxlQnVmZmVyMiIsIm5lZ2F0ZSIsInZvbHVtZUNvcnJlY3Rpb24iLCJvdXRwdXRTYW1wbGVzIiwiTFBGIiwiSFBGIiwiQlBGX0NPTlNUQU5UX1NLSVJUIiwiQlBGX0NPTlNUQU5UX1BFQUsiLCJBUEYiLCJQRUFLSU5HX0VRIiwiTE9XX1NIRUxGIiwiSElHSF9TSEVMRiIsIlEiLCJTIiwiUk1TIiwidG90YWwiLCJuIiwic3FydCIsIlBlYWsiLCJwZWFrIiwiYWJzIiwiRm91cmllclRyYW5zZm9ybSIsImJ1ZmZlclNpemUiLCJzYW1wbGVSYXRlIiwiYmFuZHdpZHRoIiwic3BlY3RydW0iLCJyZWFsIiwiaW1hZyIsInBlYWtCYW5kIiwiZ2V0QmFuZEZyZXF1ZW5jeSIsImluZGV4IiwiY2FsY3VsYXRlU3BlY3RydW0iLCJiU2kiLCJydmFsIiwiaXZhbCIsIm1hZyIsIk4iLCJERlQiLCJjYWxsIiwic2luVGFibGUiLCJjb3NUYWJsZSIsInNpbiIsImNvcyIsInByb3RvdHlwZSIsImZvcndhcmQiLCJrIiwiRkZUIiwicmV2ZXJzZVRhYmxlIiwiVWludDMyQXJyYXkiLCJsaW1pdCIsImJpdCIsImZsb29yIiwibG9nIiwiTE4yIiwicG93IiwiaGFsZlNpemUiLCJwaGFzZVNoaWZ0U3RlcFJlYWwiLCJwaGFzZVNoaWZ0U3RlcEltYWciLCJjdXJyZW50UGhhc2VTaGlmdFJlYWwiLCJjdXJyZW50UGhhc2VTaGlmdEltYWciLCJvZmYiLCJ0ciIsInRpIiwidG1wUmVhbCIsImZmdFN0ZXAiLCJpbnZlcnNlIiwicmV2UmVhbCIsInJldkltYWciLCJSRkZUIiwidHJhbnMiLCJyZXZlcnNlQmluUGVybXV0ZSIsImRlc3QiLCJzb3VyY2UiLCJubTEiLCJyIiwiaCIsImdlbmVyYXRlUmV2ZXJzZVRhYmxlIiwieCIsIm4yIiwibjQiLCJuOCIsIm5uIiwidDEiLCJ0MiIsInQzIiwidDQiLCJpMSIsImkyIiwiaTMiLCJpNCIsImk1IiwiaTYiLCJpNyIsImk4Iiwic3QxIiwiY2MxIiwic3MxIiwiY2MzIiwic3MzIiwiZSIsImEiLCJpeCIsImlkIiwiaTAiLCJTUVJUMV8yIiwiaiIsIlNhbXBsZXIiLCJmaWxlIiwicGxheVN0YXJ0IiwicGxheUVuZCIsImxvb3BTdGFydCIsImxvb3BFbmQiLCJsb29wTW9kZSIsImxvYWRlZCIsInNhbXBsZXMiLCJzaWduYWwiLCJmcmFtZUNvdW50IiwiZW52ZWxvcGUiLCJhbXBsaXR1ZGUiLCJyb290RnJlcXVlbmN5IiwiZnJlcXVlbmN5Iiwic3RlcCIsImR1cmF0aW9uIiwic2FtcGxlc1Byb2Nlc3NlZCIsInBsYXloZWFkIiwiYXVkaW8iLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJzZWxmIiwibG9hZFNhbXBsZXMiLCJldmVudCIsImZyYW1lQnVmZmVyIiwicHVzaCIsImxvYWRDb21wbGV0ZSIsImxvYWRNZXRhRGF0YSIsImFkZEV2ZW50TGlzdGVuZXIiLCJtdXRlZCIsInNyYyIsInBsYXkiLCJhcHBseUVudmVsb3BlIiwicHJvY2VzcyIsImdlbmVyYXRlIiwiZnJhbWVPZmZzZXQiLCJsb29wV2lkdGgiLCJwbGF5U3RhcnRTYW1wbGVzIiwicGxheUVuZFNhbXBsZXMiLCJvZmZzZXQiLCJyb3VuZCIsInNldEZyZXEiLCJ0b3RhbFByb2Nlc3NlZCIsInJlc2V0IiwiT3NjaWxsYXRvciIsInR5cGUiLCJ3YXZlVGFibGVMZW5ndGgiLCJjeWNsZXNQZXJTYW1wbGUiLCJwYXJzZUludCIsImZ1bmMiLCJUcmlhbmdsZSIsIlNhdyIsIlNxdWFyZSIsIlNpbmUiLCJnZW5lcmF0ZVdhdmVUYWJsZSIsIndhdmVUYWJsZSIsIndhdmVUYWJsZVRpbWUiLCJ3YXZlVGFibGVIeiIsInNldEFtcCIsImFkZCIsIm9zY2lsbGF0b3IiLCJhZGRTaWduYWwiLCJhZGRFbnZlbG9wZSIsInZhbHVlQXQiLCJQdWxzZSIsIkFEU1IiLCJhdHRhY2tMZW5ndGgiLCJkZWNheUxlbmd0aCIsInN1c3RhaW5MZXZlbCIsInN1c3RhaW5MZW5ndGgiLCJyZWxlYXNlTGVuZ3RoIiwiYXR0YWNrU2FtcGxlcyIsImRlY2F5U2FtcGxlcyIsInN1c3RhaW5TYW1wbGVzIiwicmVsZWFzZVNhbXBsZXMiLCJ1cGRhdGUiLCJhdHRhY2siLCJkZWNheSIsInN1c3RhaW4iLCJyZWxlYXNlIiwibm90ZU9uIiwibm90ZU9mZiIsInByb2Nlc3NTYW1wbGUiLCJzYW1wbGUiLCJ2YWx1ZSIsImlzQWN0aXZlIiwiZGlzYWJsZSIsIklJUkZpbHRlciIsImN1dG9mZiIsInJlc29uYW5jZSIsIkxQMTIiLCJfX2RlZmluZUdldHRlcl9fIiwic2V0IiwiY2FsY0NvZWZmIiwidmlicmFQb3MiLCJ2aWJyYVNwZWVkIiwidyIsInEiLCJjIiwiSUlSRmlsdGVyMiIsImYiLCJmcmVxIiwibWluIiwiZGFtcCIsImlucHV0Iiwib3V0cHV0IiwiV2luZG93RnVuY3Rpb24iLCJhbHBoYSIsIkJhcnRsZXR0IiwiQmFydGxldHRIYW5uIiwiQmxhY2ttYW4iLCJDb3NpbmUiLCJHYXVzcyIsIkhhbW1pbmciLCJIYW5uIiwiTGFuY3pveiIsIlJlY3Rhbmd1bGFyIiwiVHJpYW5ndWxhciIsImEwIiwiYTEiLCJhMiIsIkUiLCJMYW5jem9zIiwic2luaCIsImFyZyIsImV4cCIsIkJpcXVhZCIsIkZzIiwicGFyYW1ldGVyVHlwZSIsInhfMV9sIiwieF8yX2wiLCJ5XzFfbCIsInlfMl9sIiwieF8xX3IiLCJ4XzJfciIsInlfMV9yIiwieV8yX3IiLCJiMCIsImIxIiwiYjIiLCJiMGEwIiwiYjFhMCIsImIyYTAiLCJhMWEwIiwiYTJhMCIsImYwIiwiZEJnYWluIiwiY29lZmZpY2llbnRzIiwiYiIsInNldEZpbHRlclR5cGUiLCJyZWNhbGN1bGF0ZUNvZWZmaWNpZW50cyIsInNldFNhbXBsZVJhdGUiLCJyYXRlIiwic2V0USIsIm1heCIsInNldEJXIiwiYnciLCJzZXRTIiwicyIsInNldEYwIiwic2V0RGJHYWluIiwiZyIsIkEiLCJ3MCIsImNvc3cwIiwic2ludzAiLCJjb2VmZiIsInByb2Nlc3NTdGVyZW8iLCJtYWcyZGIiLCJtaW5EYiIsIm1pbk1hZyIsInJlc3VsdCIsImZyZXF6IiwibnVtZXJhdG9yIiwiZGVub21pbmF0b3IiLCJHcmFwaGljYWxFcSIsIkZTIiwibWluRnJlcSIsIm1heEZyZXEiLCJiYW5kc1Blck9jdGF2ZSIsImZpbHRlcnMiLCJmcmVxenMiLCJjYWxjdWxhdGVGcmVxenMiLCJyZWNhbGN1bGF0ZUZpbHRlcnMiLCJiYW5kQ291bnQiLCJuZXdGaWx0ZXIiLCJyZWNhbGN1bGF0ZUZyZXF6Iiwic2V0TWluaW11bUZyZXF1ZW5jeSIsInNldE1heGltdW1GcmVxdWVuY3kiLCJzZXRCYW5kc1Blck9jdGF2ZSIsImJhbmRzIiwic2V0QmFuZEdhaW4iLCJiYW5kSW5kZXgiLCJnYWluIiwiTXVsdGlEZWxheSIsIm1heERlbGF5SW5TYW1wbGVzU2l6ZSIsImRlbGF5SW5TYW1wbGVzIiwibWFzdGVyVm9sdW1lIiwiZGVsYXlWb2x1bWUiLCJkZWxheUJ1ZmZlclNhbXBsZXMiLCJkZWxheUlucHV0UG9pbnRlciIsImRlbGF5T3V0cHV0UG9pbnRlciIsInNldERlbGF5SW5TYW1wbGVzIiwic2V0TWFzdGVyVm9sdW1lIiwic2V0RGVsYXlWb2x1bWUiLCJkZWxheVNhbXBsZSIsIlNpbmdsZURlbGF5IiwiUmV2ZXJiIiwibWl4Vm9sdW1lIiwiZGFtcEZyZXF1ZW5jeSIsIk5SX09GX01VTFRJREVMQVlTIiwiTlJfT0ZfU0lOR0xFREVMQVlTIiwiTE9XUEFTU0wiLCJMT1dQQVNTUiIsInNpbmdsZURlbGF5cyIsImRlbGF5TXVsdGlwbHkiLCJtdWx0aURlbGF5cyIsInNldE1peFZvbHVtZSIsInNldERhbXBGcmVxdWVuY3kiLCJpbnRlcmxlYXZlZFNhbXBsZXMiLCJsZWZ0UmlnaHRNaXgiLCJmaWx0ZXJlZFNhbXBsZXMiLCJzaW5nbGVEZWxheVNhbXBsZXMiLCJkdXhjYSIsImxpYiIsIlNpZ25hbCIsImluZGV4VG9GcmVxIiwiZmZ0U2l6ZSIsImZyZXFUb0luZGV4IiwidGltZVRvSW5kZXgiLCJ0aW1lIiwiaW5kZXhUb1RpbWUiLCJjdXJyZW50SW5kZXgiLCJjYWxjQ29yciIsImZmdCIsInNpZ19zcGVjdHJ1bSIsInNpZ19yZWFsIiwic2lnX2ltYWciLCJjcm9zc19yZWFsIiwibWFwIiwiXyIsImNyb3NzX2ltYWciLCJpbnZfcmVhbCIsIldhdmUiLCJpbnQxNmFyeSIsImJpdHNQZXJTYW1wbGUiLCJpbnQxNiIsInNpemUiLCJ2aWV3IiwiRGF0YVZpZXciLCJBcnJheUJ1ZmZlciIsIndyaXRlVVRGQnl0ZXMiLCJzZXRVaW50MzIiLCJzZXRVaW50MTYiLCJzZXRJbnQxNiIsInRvQmxvYiIsIkJsb2IiLCJ0b1VSTCIsIlVSTCIsImNyZWF0ZU9iamVjdFVSTCIsInRvQXVkaW8iLCJjb250cm9scyIsInN0ciIsInJlZiIsInNldFVpbnQ4IiwiY2hhckNvZGVBdCIsIkNhbnZhcyIsImh1ZTJyZ2IiLCJwIiwidCIsImhzbFRvUmdiIiwibCIsIlFVbml0IiwibW9kdWxlIiwidGVzdCIsImFzc2VydCIsInJzbHQiLCJvayIsIl9leHByIiwiX2NhcHQiLCJjb250ZW50IiwiZmlsZXBhdGgiLCJsaW5lIl0sIm1hcHBpbmdzIjoiQUFlQSxJQUFJQSxHQUFBLEdBQU07QUFBQSxJQUVSQyxJQUFBLEVBQWdCLENBRlI7QUFBQSxJQUdSQyxLQUFBLEVBQWdCLENBSFI7QUFBQSxJQUlSQyxHQUFBLEVBQWdCLENBSlI7QUFBQSxJQU9SQyxJQUFBLEVBQWdCLENBUFI7QUFBQSxJQVFSQyxRQUFBLEVBQWdCLENBUlI7QUFBQSxJQVNSQyxHQUFBLEVBQWdCLENBVFI7QUFBQSxJQVVSQyxNQUFBLEVBQWdCLENBVlI7QUFBQSxJQWFSQyxPQUFBLEVBQWdCLENBYlI7QUFBQSxJQWNSQyxRQUFBLEVBQWdCLENBZFI7QUFBQSxJQWVSQyxRQUFBLEVBQWdCLENBZlI7QUFBQSxJQWdCUkMsS0FBQSxFQUFnQixDQWhCUjtBQUFBLElBbUJSQyxRQUFBLEVBQWdCLENBbkJSO0FBQUEsSUFvQlJDLFlBQUEsRUFBZ0IsQ0FwQlI7QUFBQSxJQXFCUkMsUUFBQSxFQUFnQixDQXJCUjtBQUFBLElBc0JSQyxNQUFBLEVBQWdCLENBdEJSO0FBQUEsSUF1QlJDLEtBQUEsRUFBZ0IsQ0F2QlI7QUFBQSxJQXdCUkMsT0FBQSxFQUFnQixDQXhCUjtBQUFBLElBeUJSQyxJQUFBLEVBQWdCLENBekJSO0FBQUEsSUEwQlJDLE9BQUEsRUFBZ0IsQ0ExQlI7QUFBQSxJQTJCUkMsV0FBQSxFQUFnQixDQTNCUjtBQUFBLElBNEJSQyxVQUFBLEVBQWdCLEVBNUJSO0FBQUEsSUErQlJDLEdBQUEsRUFBZ0IsQ0EvQlI7QUFBQSxJQWdDUkMsRUFBQSxFQUFnQixDQWhDUjtBQUFBLElBaUNSQyxFQUFBLEVBQWdCLENBakNSO0FBQUEsSUFrQ1JDLElBQUEsRUFBZ0IsQ0FsQ1I7QUFBQSxJQXFDUkMsTUFBQSxFQUFnQixJQUFFQyxJQUFBLENBQUtDLEVBckNmO0FBQUEsQ0FBVjtBQXlD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QUFBLFFBQUMsQ0FBRDtBQUFBLFFBQUksQ0FBSjtBQUFBLFFBQU8sQ0FBUDtBQUFBLFFBQVUsQ0FBVjtBQUFBLEtBQXhDLENBQVgsQ0FEcUM7QUFBQSxJQUVyQyxPQUFPMEMsTUFBQSxDQUFPRSxFQUFQLENBQVVGLE1BQUEsQ0FBQUcsS0FBQSxDQUFBSCxNQUFBLENBQUFJLEtBQUEsQ0FBQUosTUFBQSxDQUFBSSxLQUFBLENBQUFKLE1BQUEsQ0FBQUksS0FBQSxDQUFBSCxJQUFBLDZCQUFLLENBQUwsMEJBQVcsSUFBWDtBQUFBLFFBQUFJLE9BQUE7QUFBQSxRQUFBQyxRQUFBO0FBQUEsUUFBQUMsSUFBQTtBQUFBLE1BQVYsQ0FBUCxDQUZxQztBQUFBLENBQXpDIiwiZmlsZSI6InRlc3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiAgRFNQLmpzIC0gYSBjb21wcmVoZW5zaXZlIGRpZ2l0YWwgc2lnbmFsIHByb2Nlc3NpbmcgIGxpYnJhcnkgZm9yIGphdmFzY3JpcHRcbiAqXG4gKiAgQ3JlYXRlZCBieSBDb3JiYW4gQnJvb2sgPGNvcmJhbmJyb29rQGdtYWlsLmNvbT4gb24gMjAxMC0wMS0wMS5cbiAqICBDb3B5cmlnaHQgMjAxMCBDb3JiYW4gQnJvb2suIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICovXG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBDT05TVEFOVFMgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLyoqXG4gKiBEU1AgaXMgYW4gb2JqZWN0IHdoaWNoIGNvbnRhaW5zIGdlbmVyYWwgcHVycG9zZSB1dGlsaXR5IGZ1bmN0aW9ucyBhbmQgY29uc3RhbnRzXG4gKi9cbnZhciBEU1AgPSB7XG4gIC8vIENoYW5uZWxzXG4gIExFRlQ6ICAgICAgICAgICAwLFxuICBSSUdIVDogICAgICAgICAgMSxcbiAgTUlYOiAgICAgICAgICAgIDIsXG5cbiAgLy8gV2F2ZWZvcm1zXG4gIFNJTkU6ICAgICAgICAgICAxLFxuICBUUklBTkdMRTogICAgICAgMixcbiAgU0FXOiAgICAgICAgICAgIDMsXG4gIFNRVUFSRTogICAgICAgICA0LFxuXG4gIC8vIEZpbHRlcnNcbiAgTE9XUEFTUzogICAgICAgIDAsXG4gIEhJR0hQQVNTOiAgICAgICAxLFxuICBCQU5EUEFTUzogICAgICAgMixcbiAgTk9UQ0g6ICAgICAgICAgIDMsXG5cbiAgLy8gV2luZG93IGZ1bmN0aW9uc1xuICBCQVJUTEVUVDogICAgICAgMSxcbiAgQkFSVExFVFRIQU5OOiAgIDIsXG4gIEJMQUNLTUFOOiAgICAgICAzLFxuICBDT1NJTkU6ICAgICAgICAgNCxcbiAgR0FVU1M6ICAgICAgICAgIDUsXG4gIEhBTU1JTkc6ICAgICAgICA2LFxuICBIQU5OOiAgICAgICAgICAgNyxcbiAgTEFOQ1pPUzogICAgICAgIDgsXG4gIFJFQ1RBTkdVTEFSOiAgICA5LFxuICBUUklBTkdVTEFSOiAgICAgMTAsXG5cbiAgLy8gTG9vcCBtb2Rlc1xuICBPRkY6ICAgICAgICAgICAgMCxcbiAgRlc6ICAgICAgICAgICAgIDEsXG4gIEJXOiAgICAgICAgICAgICAyLFxuICBGV0JXOiAgICAgICAgICAgMyxcblxuICAvLyBNYXRoXG4gIFRXT19QSTogICAgICAgICAyKk1hdGguUElcbn07XG5cbi8vIFNldHVwIGFycmF5cyBmb3IgcGxhdGZvcm1zIHdoaWNoIGRvIG5vdCBzdXBwb3J0IGJ5dGUgYXJyYXlzXG5mdW5jdGlvbiBzZXR1cFR5cGVkQXJyYXkobmFtZSwgZmFsbGJhY2spIHtcbiAgLy8gY2hlY2sgaWYgVHlwZWRBcnJheSBleGlzdHNcbiAgLy8gdHlwZW9mIG9uIE1pbmVmaWVsZCBhbmQgQ2hyb21lIHJldHVybiBmdW5jdGlvbiwgdHlwZW9mIG9uIFdlYmtpdCByZXR1cm5zIG9iamVjdC5cbiAgaWYgKHR5cGVvZiB0aGlzW25hbWVdICE9PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIHRoaXNbbmFtZV0gIT09IFwib2JqZWN0XCIpIHtcbiAgICAvLyBub3BlLi4gY2hlY2sgaWYgV2ViR0xBcnJheSBleGlzdHNcbiAgICBpZiAodHlwZW9mIHRoaXNbZmFsbGJhY2tdID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIHRoaXNbZmFsbGJhY2tdICE9PSBcIm9iamVjdFwiKSB7XG4gICAgICB0aGlzW25hbWVdID0gdGhpc1tmYWxsYmFja107XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIG5vcGUuLiBzZXQgYXMgTmF0aXZlIEpTIGFycmF5XG4gICAgICB0aGlzW25hbWVdID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIGlmIChvYmogaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgIHJldHVybiBvYmo7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG9iaiA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgIHJldHVybiBuZXcgQXJyYXkob2JqKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG4gIH1cbn1cblxuc2V0dXBUeXBlZEFycmF5KFwiRmxvYXQzMkFycmF5XCIsIFwiV2ViR0xGbG9hdEFycmF5XCIpO1xuc2V0dXBUeXBlZEFycmF5KFwiSW50MzJBcnJheVwiLCAgIFwiV2ViR0xJbnRBcnJheVwiKTtcbnNldHVwVHlwZWRBcnJheShcIlVpbnQxNkFycmF5XCIsICBcIldlYkdMVW5zaWduZWRTaG9ydEFycmF5XCIpO1xuc2V0dXBUeXBlZEFycmF5KFwiVWludDhBcnJheVwiLCAgIFwiV2ViR0xVbnNpZ25lZEJ5dGVBcnJheVwiKTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgRFNQIFVUSUxJVFkgRlVOQ1RJT05TICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8qKlxuICogSW52ZXJ0cyB0aGUgcGhhc2Ugb2YgYSBzaWduYWxcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBidWZmZXIgQSBzYW1wbGUgYnVmZmVyXG4gKlxuICogQHJldHVybnMgVGhlIGludmVydGVkIHNhbXBsZSBidWZmZXJcbiAqL1xuRFNQLmludmVydCA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICBmb3IgKHZhciBpID0gMCwgbGVuID0gYnVmZmVyLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgYnVmZmVyW2ldICo9IC0xO1xuICB9XG5cbiAgcmV0dXJuIGJ1ZmZlcjtcbn07XG5cbi8qKlxuICogQ29udmVydHMgc3BsaXQtc3RlcmVvIChkdWFsIG1vbm8pIHNhbXBsZSBidWZmZXJzIGludG8gYSBzdGVyZW8gaW50ZXJsZWF2ZWQgc2FtcGxlIGJ1ZmZlclxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGxlZnQgIEEgc2FtcGxlIGJ1ZmZlclxuICogQHBhcmFtIHtBcnJheX0gcmlnaHQgQSBzYW1wbGUgYnVmZmVyXG4gKlxuICogQHJldHVybnMgVGhlIHN0ZXJlbyBpbnRlcmxlYXZlZCBidWZmZXJcbiAqL1xuRFNQLmludGVybGVhdmUgPSBmdW5jdGlvbihsZWZ0LCByaWdodCkge1xuICBpZiAobGVmdC5sZW5ndGggIT09IHJpZ2h0Lmxlbmd0aCkge1xuICAgIHRocm93IFwiQ2FuIG5vdCBpbnRlcmxlYXZlLiBDaGFubmVsIGxlbmd0aHMgZGlmZmVyLlwiO1xuICB9XG5cbiAgdmFyIHN0ZXJlb0ludGVybGVhdmVkID0gbmV3IEZsb2F0MzJBcnJheShsZWZ0Lmxlbmd0aCAqIDIpO1xuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBsZWZ0Lmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgc3RlcmVvSW50ZXJsZWF2ZWRbMippXSAgID0gbGVmdFtpXTtcbiAgICBzdGVyZW9JbnRlcmxlYXZlZFsyKmkrMV0gPSByaWdodFtpXTtcbiAgfVxuXG4gIHJldHVybiBzdGVyZW9JbnRlcmxlYXZlZDtcbn07XG5cbi8qKlxuICogQ29udmVydHMgYSBzdGVyZW8taW50ZXJsZWF2ZWQgc2FtcGxlIGJ1ZmZlciBpbnRvIHNwbGl0LXN0ZXJlbyAoZHVhbCBtb25vKSBzYW1wbGUgYnVmZmVyc1xuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGJ1ZmZlciBBIHN0ZXJlby1pbnRlcmxlYXZlZCBzYW1wbGUgYnVmZmVyXG4gKlxuICogQHJldHVybnMgYW4gQXJyYXkgY29udGFpbmluZyBsZWZ0IGFuZCByaWdodCBjaGFubmVsc1xuICovXG5EU1AuZGVpbnRlcmxlYXZlID0gKGZ1bmN0aW9uKCkge1xuICB2YXIgbGVmdCwgcmlnaHQsIG1peCwgZGVpbnRlcmxlYXZlQ2hhbm5lbCA9IFtdO1xuXG4gIGRlaW50ZXJsZWF2ZUNoYW5uZWxbRFNQLk1JWF0gPSBmdW5jdGlvbihidWZmZXIpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYnVmZmVyLmxlbmd0aC8yOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIG1peFtpXSA9IChidWZmZXJbMippXSArIGJ1ZmZlclsyKmkrMV0pIC8gMjtcbiAgICB9XG4gICAgcmV0dXJuIG1peDtcbiAgfTtcblxuICBkZWludGVybGVhdmVDaGFubmVsW0RTUC5MRUZUXSA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBidWZmZXIubGVuZ3RoLzI7IGkgPCBsZW47IGkrKykge1xuICAgICAgbGVmdFtpXSAgPSBidWZmZXJbMippXTtcbiAgICB9XG4gICAgcmV0dXJuIGxlZnQ7XG4gIH07XG5cbiAgZGVpbnRlcmxlYXZlQ2hhbm5lbFtEU1AuUklHSFRdID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGJ1ZmZlci5sZW5ndGgvMjsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICByaWdodFtpXSAgPSBidWZmZXJbMippKzFdO1xuICAgIH1cbiAgICByZXR1cm4gcmlnaHQ7XG4gIH07XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGNoYW5uZWwsIGJ1ZmZlcikge1xuICAgIGxlZnQgID0gbGVmdCAgfHwgbmV3IEZsb2F0MzJBcnJheShidWZmZXIubGVuZ3RoLzIpO1xuICAgIHJpZ2h0ID0gcmlnaHQgfHwgbmV3IEZsb2F0MzJBcnJheShidWZmZXIubGVuZ3RoLzIpO1xuICAgIG1peCAgID0gbWl4ICAgfHwgbmV3IEZsb2F0MzJBcnJheShidWZmZXIubGVuZ3RoLzIpO1xuXG4gICAgaWYgKGJ1ZmZlci5sZW5ndGgvMiAhPT0gbGVmdC5sZW5ndGgpIHtcbiAgICAgIGxlZnQgID0gbmV3IEZsb2F0MzJBcnJheShidWZmZXIubGVuZ3RoLzIpO1xuICAgICAgcmlnaHQgPSBuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlci5sZW5ndGgvMik7XG4gICAgICBtaXggICA9IG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyLmxlbmd0aC8yKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGVpbnRlcmxlYXZlQ2hhbm5lbFtjaGFubmVsXShidWZmZXIpO1xuICB9O1xufSgpKTtcblxuLyoqXG4gKiBTZXBhcmF0ZXMgYSBjaGFubmVsIGZyb20gYSBzdGVyZW8taW50ZXJsZWF2ZWQgc2FtcGxlIGJ1ZmZlclxuICpcbiAqIEBwYXJhbSB7QXJyYXl9ICBidWZmZXIgQSBzdGVyZW8taW50ZXJsZWF2ZWQgc2FtcGxlIGJ1ZmZlclxuICogQHBhcmFtIHtOdW1iZXJ9IGNoYW5uZWwgQSBjaGFubmVsIGNvbnN0YW50IChMRUZULCBSSUdIVCwgTUlYKVxuICpcbiAqIEByZXR1cm5zIGFuIEFycmF5IGNvbnRhaW5pbmcgYSBzaWduYWwgbW9ubyBzYW1wbGUgYnVmZmVyXG4gKi9cbkRTUC5nZXRDaGFubmVsID0gRFNQLmRlaW50ZXJsZWF2ZTtcblxuLyoqXG4gKiBIZWxwZXIgbWV0aG9kIChmb3IgUmV2ZXJiKSB0byBtaXggdHdvIChpbnRlcmxlYXZlZCkgc2FtcGxlYnVmZmVycy4gSXQncyBwb3NzaWJsZVxuICogdG8gbmVnYXRlIHRoZSBzZWNvbmQgYnVmZmVyIHdoaWxlIG1peGluZyBhbmQgdG8gcGVyZm9ybSBhIHZvbHVtZSBjb3JyZWN0aW9uXG4gKiBvbiB0aGUgZmluYWwgc2lnbmFsLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHNhbXBsZUJ1ZmZlcjEgQXJyYXkgY29udGFpbmluZyBGbG9hdCB2YWx1ZXMgb3IgYSBGbG9hdDMyQXJyYXlcbiAqIEBwYXJhbSB7QXJyYXl9IHNhbXBsZUJ1ZmZlcjIgQXJyYXkgY29udGFpbmluZyBGbG9hdCB2YWx1ZXMgb3IgYSBGbG9hdDMyQXJyYXlcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gbmVnYXRlIFdoZW4gdHJ1ZSBpbnZlcnRzL2ZsaXBzIHRoZSBhdWRpbyBzaWduYWxcbiAqIEBwYXJhbSB7TnVtYmVyfSB2b2x1bWVDb3JyZWN0aW9uIFdoZW4geW91IGFkZCBtdWx0aXBsZSBzYW1wbGUgYnVmZmVycywgdXNlIHRoaXMgdG8gdGFtZSB5b3VyIHNpZ25hbCA7KVxuICpcbiAqIEByZXR1cm5zIEEgbmV3IEZsb2F0MzJBcnJheSBpbnRlcmxlYXZlZCBidWZmZXIuXG4gKi9cbkRTUC5taXhTYW1wbGVCdWZmZXJzID0gZnVuY3Rpb24oc2FtcGxlQnVmZmVyMSwgc2FtcGxlQnVmZmVyMiwgbmVnYXRlLCB2b2x1bWVDb3JyZWN0aW9uKXtcbiAgdmFyIG91dHB1dFNhbXBsZXMgPSBuZXcgRmxvYXQzMkFycmF5KHNhbXBsZUJ1ZmZlcjEpO1xuXG4gIGZvcih2YXIgaSA9IDA7IGk8c2FtcGxlQnVmZmVyMS5sZW5ndGg7IGkrKyl7XG4gICAgb3V0cHV0U2FtcGxlc1tpXSArPSAobmVnYXRlID8gLXNhbXBsZUJ1ZmZlcjJbaV0gOiBzYW1wbGVCdWZmZXIyW2ldKSAvIHZvbHVtZUNvcnJlY3Rpb247XG4gIH1cblxuICByZXR1cm4gb3V0cHV0U2FtcGxlcztcbn07XG5cbi8vIEJpcXVhZCBmaWx0ZXIgdHlwZXNcbkRTUC5MUEYgPSAwOyAgICAgICAgICAgICAgICAvLyBIKHMpID0gMSAvIChzXjIgKyBzL1EgKyAxKVxuRFNQLkhQRiA9IDE7ICAgICAgICAgICAgICAgIC8vIEgocykgPSBzXjIgLyAoc14yICsgcy9RICsgMSlcbkRTUC5CUEZfQ09OU1RBTlRfU0tJUlQgPSAyOyAvLyBIKHMpID0gcyAvIChzXjIgKyBzL1EgKyAxKSAgKGNvbnN0YW50IHNraXJ0IGdhaW4sIHBlYWsgZ2FpbiA9IFEpXG5EU1AuQlBGX0NPTlNUQU5UX1BFQUsgPSAzOyAgLy8gSChzKSA9IChzL1EpIC8gKHNeMiArIHMvUSArIDEpICAgICAgKGNvbnN0YW50IDAgZEIgcGVhayBnYWluKVxuRFNQLk5PVENIID0gNDsgICAgICAgICAgICAgIC8vIEgocykgPSAoc14yICsgMSkgLyAoc14yICsgcy9RICsgMSlcbkRTUC5BUEYgPSA1OyAgICAgICAgICAgICAgICAvLyBIKHMpID0gKHNeMiAtIHMvUSArIDEpIC8gKHNeMiArIHMvUSArIDEpXG5EU1AuUEVBS0lOR19FUSA9IDY7ICAgICAgICAgLy8gSChzKSA9IChzXjIgKyBzKihBL1EpICsgMSkgLyAoc14yICsgcy8oQSpRKSArIDEpXG5EU1AuTE9XX1NIRUxGID0gNzsgICAgICAgICAgLy8gSChzKSA9IEEgKiAoc14yICsgKHNxcnQoQSkvUSkqcyArIEEpLyhBKnNeMiArIChzcXJ0KEEpL1EpKnMgKyAxKVxuRFNQLkhJR0hfU0hFTEYgPSA4OyAgICAgICAgIC8vIEgocykgPSBBICogKEEqc14yICsgKHNxcnQoQSkvUSkqcyArIDEpLyhzXjIgKyAoc3FydChBKS9RKSpzICsgQSlcblxuLy8gQmlxdWFkIGZpbHRlciBwYXJhbWV0ZXIgdHlwZXNcbkRTUC5RID0gMTtcbkRTUC5CVyA9IDI7IC8vIFNIQVJFRCB3aXRoIEJBQ0tXQVJEUyBMT09QIE1PREVcbkRTUC5TID0gMztcblxuLy8gRmluZCBSTVMgb2Ygc2lnbmFsXG5EU1AuUk1TID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gIHZhciB0b3RhbCA9IDA7XG5cbiAgZm9yICh2YXIgaSA9IDAsIG4gPSBidWZmZXIubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgdG90YWwgKz0gYnVmZmVyW2ldICogYnVmZmVyW2ldO1xuICB9XG5cbiAgcmV0dXJuIE1hdGguc3FydCh0b3RhbCAvIG4pO1xufTtcblxuLy8gRmluZCBQZWFrIG9mIHNpZ25hbFxuRFNQLlBlYWsgPSBmdW5jdGlvbihidWZmZXIpIHtcbiAgdmFyIHBlYWsgPSAwO1xuXG4gIGZvciAodmFyIGkgPSAwLCBuID0gYnVmZmVyLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgIHBlYWsgPSAoTWF0aC5hYnMoYnVmZmVyW2ldKSA+IHBlYWspID8gTWF0aC5hYnMoYnVmZmVyW2ldKSA6IHBlYWs7XG4gIH1cblxuICByZXR1cm4gcGVhaztcbn07XG5cbi8vIEZvdXJpZXIgVHJhbnNmb3JtIE1vZHVsZSB1c2VkIGJ5IERGVCwgRkZULCBSRkZUXG5mdW5jdGlvbiBGb3VyaWVyVHJhbnNmb3JtKGJ1ZmZlclNpemUsIHNhbXBsZVJhdGUpIHtcbiAgdGhpcy5idWZmZXJTaXplID0gYnVmZmVyU2l6ZTtcbiAgdGhpcy5zYW1wbGVSYXRlID0gc2FtcGxlUmF0ZTtcbiAgdGhpcy5iYW5kd2lkdGggID0gMiAvIGJ1ZmZlclNpemUgKiBzYW1wbGVSYXRlIC8gMjtcblxuICB0aGlzLnNwZWN0cnVtICAgPSBuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlclNpemUvMik7XG4gIHRoaXMucmVhbCAgICAgICA9IG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyU2l6ZSk7XG4gIHRoaXMuaW1hZyAgICAgICA9IG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyU2l6ZSk7XG5cbiAgdGhpcy5wZWFrQmFuZCAgID0gMDtcbiAgdGhpcy5wZWFrICAgICAgID0gMDtcblxuICAvKipcbiAgICogQ2FsY3VsYXRlcyB0aGUgKm1pZGRsZSogZnJlcXVlbmN5IG9mIGFuIEZGVCBiYW5kLlxuICAgKlxuICAgKiBAcGFyYW0ge051bWJlcn0gaW5kZXggVGhlIGluZGV4IG9mIHRoZSBGRlQgYmFuZC5cbiAgICpcbiAgICogQHJldHVybnMgVGhlIG1pZGRsZSBmcmVxdWVuY3kgaW4gSHouXG4gICAqL1xuICB0aGlzLmdldEJhbmRGcmVxdWVuY3kgPSBmdW5jdGlvbihpbmRleCkge1xuICAgIHJldHVybiB0aGlzLmJhbmR3aWR0aCAqIGluZGV4ICsgdGhpcy5iYW5kd2lkdGggLyAyO1xuICB9O1xuXG4gIHRoaXMuY2FsY3VsYXRlU3BlY3RydW0gPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc3BlY3RydW0gID0gdGhpcy5zcGVjdHJ1bSxcbiAgICAgICAgcmVhbCAgICAgID0gdGhpcy5yZWFsLFxuICAgICAgICBpbWFnICAgICAgPSB0aGlzLmltYWcsXG4gICAgICAgIGJTaSAgICAgICA9IDIgLyB0aGlzLmJ1ZmZlclNpemUsXG4gICAgICAgIHNxcnQgICAgICA9IE1hdGguc3FydCxcbiAgICAgICAgcnZhbCxcbiAgICAgICAgaXZhbCxcbiAgICAgICAgbWFnO1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIE4gPSBidWZmZXJTaXplLzI7IGkgPCBOOyBpKyspIHtcbiAgICAgIHJ2YWwgPSByZWFsW2ldO1xuICAgICAgaXZhbCA9IGltYWdbaV07XG4gICAgICBtYWcgPSBiU2kgKiBzcXJ0KHJ2YWwgKiBydmFsICsgaXZhbCAqIGl2YWwpO1xuXG4gICAgICBpZiAobWFnID4gdGhpcy5wZWFrKSB7XG4gICAgICAgIHRoaXMucGVha0JhbmQgPSBpO1xuICAgICAgICB0aGlzLnBlYWsgPSBtYWc7XG4gICAgICB9XG5cbiAgICAgIHNwZWN0cnVtW2ldID0gbWFnO1xuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBERlQgaXMgYSBjbGFzcyBmb3IgY2FsY3VsYXRpbmcgdGhlIERpc2NyZXRlIEZvdXJpZXIgVHJhbnNmb3JtIG9mIGEgc2lnbmFsLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBidWZmZXJTaXplIFRoZSBzaXplIG9mIHRoZSBzYW1wbGUgYnVmZmVyIHRvIGJlIGNvbXB1dGVkXG4gKiBAcGFyYW0ge051bWJlcn0gc2FtcGxlUmF0ZSBUaGUgc2FtcGxlUmF0ZSBvZiB0aGUgYnVmZmVyIChlZy4gNDQxMDApXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIERGVChidWZmZXJTaXplLCBzYW1wbGVSYXRlKSB7XG4gIEZvdXJpZXJUcmFuc2Zvcm0uY2FsbCh0aGlzLCBidWZmZXJTaXplLCBzYW1wbGVSYXRlKTtcblxuICB2YXIgTiA9IGJ1ZmZlclNpemUvMiAqIGJ1ZmZlclNpemU7XG4gIHZhciBUV09fUEkgPSAyICogTWF0aC5QSTtcblxuICB0aGlzLnNpblRhYmxlID0gbmV3IEZsb2F0MzJBcnJheShOKTtcbiAgdGhpcy5jb3NUYWJsZSA9IG5ldyBGbG9hdDMyQXJyYXkoTik7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBOOyBpKyspIHtcbiAgICB0aGlzLnNpblRhYmxlW2ldID0gTWF0aC5zaW4oaSAqIFRXT19QSSAvIGJ1ZmZlclNpemUpO1xuICAgIHRoaXMuY29zVGFibGVbaV0gPSBNYXRoLmNvcyhpICogVFdPX1BJIC8gYnVmZmVyU2l6ZSk7XG4gIH1cbn1cblxuLyoqXG4gKiBQZXJmb3JtcyBhIGZvcndhcmQgdHJhbnNmb3JtIG9uIHRoZSBzYW1wbGUgYnVmZmVyLlxuICogQ29udmVydHMgYSB0aW1lIGRvbWFpbiBzaWduYWwgdG8gZnJlcXVlbmN5IGRvbWFpbiBzcGVjdHJhLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGJ1ZmZlciBUaGUgc2FtcGxlIGJ1ZmZlclxuICpcbiAqIEByZXR1cm5zIFRoZSBmcmVxdWVuY3kgc3BlY3RydW0gYXJyYXlcbiAqL1xuREZULnByb3RvdHlwZS5mb3J3YXJkID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gIHZhciByZWFsID0gdGhpcy5yZWFsLFxuICAgICAgaW1hZyA9IHRoaXMuaW1hZyxcbiAgICAgIHJ2YWwsXG4gICAgICBpdmFsO1xuXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgdGhpcy5idWZmZXJTaXplLzI7IGsrKykge1xuICAgIHJ2YWwgPSAwLjA7XG4gICAgaXZhbCA9IDAuMDtcblxuICAgIGZvciAodmFyIG4gPSAwOyBuIDwgYnVmZmVyLmxlbmd0aDsgbisrKSB7XG4gICAgICBydmFsICs9IHRoaXMuY29zVGFibGVbaypuXSAqIGJ1ZmZlcltuXTtcbiAgICAgIGl2YWwgKz0gdGhpcy5zaW5UYWJsZVtrKm5dICogYnVmZmVyW25dO1xuICAgIH1cblxuICAgIHJlYWxba10gPSBydmFsO1xuICAgIGltYWdba10gPSBpdmFsO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuY2FsY3VsYXRlU3BlY3RydW0oKTtcbn07XG5cblxuLyoqXG4gKiBGRlQgaXMgYSBjbGFzcyBmb3IgY2FsY3VsYXRpbmcgdGhlIERpc2NyZXRlIEZvdXJpZXIgVHJhbnNmb3JtIG9mIGEgc2lnbmFsXG4gKiB3aXRoIHRoZSBGYXN0IEZvdXJpZXIgVHJhbnNmb3JtIGFsZ29yaXRobS5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gYnVmZmVyU2l6ZSBUaGUgc2l6ZSBvZiB0aGUgc2FtcGxlIGJ1ZmZlciB0byBiZSBjb21wdXRlZC4gTXVzdCBiZSBwb3dlciBvZiAyXG4gKiBAcGFyYW0ge051bWJlcn0gc2FtcGxlUmF0ZSBUaGUgc2FtcGxlUmF0ZSBvZiB0aGUgYnVmZmVyIChlZy4gNDQxMDApXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEZGVChidWZmZXJTaXplLCBzYW1wbGVSYXRlKSB7XG4gIEZvdXJpZXJUcmFuc2Zvcm0uY2FsbCh0aGlzLCBidWZmZXJTaXplLCBzYW1wbGVSYXRlKTtcblxuICB0aGlzLnJldmVyc2VUYWJsZSA9IG5ldyBVaW50MzJBcnJheShidWZmZXJTaXplKTtcblxuICB2YXIgbGltaXQgPSAxO1xuICB2YXIgYml0ID0gYnVmZmVyU2l6ZSA+PiAxO1xuXG4gIHZhciBpO1xuXG4gIHdoaWxlIChsaW1pdCA8IGJ1ZmZlclNpemUpIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGltaXQ7IGkrKykge1xuICAgICAgdGhpcy5yZXZlcnNlVGFibGVbaSArIGxpbWl0XSA9IHRoaXMucmV2ZXJzZVRhYmxlW2ldICsgYml0O1xuICAgIH1cblxuICAgIGxpbWl0ID0gbGltaXQgPDwgMTtcbiAgICBiaXQgPSBiaXQgPj4gMTtcbiAgfVxuXG4gIHRoaXMuc2luVGFibGUgPSBuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlclNpemUpO1xuICB0aGlzLmNvc1RhYmxlID0gbmV3IEZsb2F0MzJBcnJheShidWZmZXJTaXplKTtcblxuICBmb3IgKGkgPSAwOyBpIDwgYnVmZmVyU2l6ZTsgaSsrKSB7XG4gICAgdGhpcy5zaW5UYWJsZVtpXSA9IE1hdGguc2luKC1NYXRoLlBJL2kpO1xuICAgIHRoaXMuY29zVGFibGVbaV0gPSBNYXRoLmNvcygtTWF0aC5QSS9pKTtcbiAgfVxufVxuXG4vKipcbiAqIFBlcmZvcm1zIGEgZm9yd2FyZCB0cmFuc2Zvcm0gb24gdGhlIHNhbXBsZSBidWZmZXIuXG4gKiBDb252ZXJ0cyBhIHRpbWUgZG9tYWluIHNpZ25hbCB0byBmcmVxdWVuY3kgZG9tYWluIHNwZWN0cmEuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gYnVmZmVyIFRoZSBzYW1wbGUgYnVmZmVyLiBCdWZmZXIgTGVuZ3RoIG11c3QgYmUgcG93ZXIgb2YgMlxuICpcbiAqIEByZXR1cm5zIFRoZSBmcmVxdWVuY3kgc3BlY3RydW0gYXJyYXlcbiAqL1xuRkZULnByb3RvdHlwZS5mb3J3YXJkID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gIC8vIExvY2FsbHkgc2NvcGUgdmFyaWFibGVzIGZvciBzcGVlZCB1cFxuICB2YXIgYnVmZmVyU2l6ZSAgICAgID0gdGhpcy5idWZmZXJTaXplLFxuICAgICAgY29zVGFibGUgICAgICAgID0gdGhpcy5jb3NUYWJsZSxcbiAgICAgIHNpblRhYmxlICAgICAgICA9IHRoaXMuc2luVGFibGUsXG4gICAgICByZXZlcnNlVGFibGUgICAgPSB0aGlzLnJldmVyc2VUYWJsZSxcbiAgICAgIHJlYWwgICAgICAgICAgICA9IHRoaXMucmVhbCxcbiAgICAgIGltYWcgICAgICAgICAgICA9IHRoaXMuaW1hZyxcbiAgICAgIHNwZWN0cnVtICAgICAgICA9IHRoaXMuc3BlY3RydW07XG5cbiAgdmFyIGsgPSBNYXRoLmZsb29yKE1hdGgubG9nKGJ1ZmZlclNpemUpIC8gTWF0aC5MTjIpO1xuXG4gIGlmIChNYXRoLnBvdygyLCBrKSAhPT0gYnVmZmVyU2l6ZSkgeyB0aHJvdyBcIkludmFsaWQgYnVmZmVyIHNpemUsIG11c3QgYmUgYSBwb3dlciBvZiAyLlwiOyB9XG4gIGlmIChidWZmZXJTaXplICE9PSBidWZmZXIubGVuZ3RoKSAgeyB0aHJvdyBcIlN1cHBsaWVkIGJ1ZmZlciBpcyBub3QgdGhlIHNhbWUgc2l6ZSBhcyBkZWZpbmVkIEZGVC4gRkZUIFNpemU6IFwiICsgYnVmZmVyU2l6ZSArIFwiIEJ1ZmZlciBTaXplOiBcIiArIGJ1ZmZlci5sZW5ndGg7IH1cblxuICB2YXIgaGFsZlNpemUgPSAxLFxuICAgICAgcGhhc2VTaGlmdFN0ZXBSZWFsLFxuICAgICAgcGhhc2VTaGlmdFN0ZXBJbWFnLFxuICAgICAgY3VycmVudFBoYXNlU2hpZnRSZWFsLFxuICAgICAgY3VycmVudFBoYXNlU2hpZnRJbWFnLFxuICAgICAgb2ZmLFxuICAgICAgdHIsXG4gICAgICB0aSxcbiAgICAgIHRtcFJlYWwsXG4gICAgICBpO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBidWZmZXJTaXplOyBpKyspIHtcbiAgICByZWFsW2ldID0gYnVmZmVyW3JldmVyc2VUYWJsZVtpXV07XG4gICAgaW1hZ1tpXSA9IDA7XG4gIH1cblxuICB3aGlsZSAoaGFsZlNpemUgPCBidWZmZXJTaXplKSB7XG4gICAgLy9waGFzZVNoaWZ0U3RlcFJlYWwgPSBNYXRoLmNvcygtTWF0aC5QSS9oYWxmU2l6ZSk7XG4gICAgLy9waGFzZVNoaWZ0U3RlcEltYWcgPSBNYXRoLnNpbigtTWF0aC5QSS9oYWxmU2l6ZSk7XG4gICAgcGhhc2VTaGlmdFN0ZXBSZWFsID0gY29zVGFibGVbaGFsZlNpemVdO1xuICAgIHBoYXNlU2hpZnRTdGVwSW1hZyA9IHNpblRhYmxlW2hhbGZTaXplXTtcblxuICAgIGN1cnJlbnRQaGFzZVNoaWZ0UmVhbCA9IDE7XG4gICAgY3VycmVudFBoYXNlU2hpZnRJbWFnID0gMDtcblxuICAgIGZvciAodmFyIGZmdFN0ZXAgPSAwOyBmZnRTdGVwIDwgaGFsZlNpemU7IGZmdFN0ZXArKykge1xuICAgICAgaSA9IGZmdFN0ZXA7XG5cbiAgICAgIHdoaWxlIChpIDwgYnVmZmVyU2l6ZSkge1xuICAgICAgICBvZmYgPSBpICsgaGFsZlNpemU7XG4gICAgICAgIHRyID0gKGN1cnJlbnRQaGFzZVNoaWZ0UmVhbCAqIHJlYWxbb2ZmXSkgLSAoY3VycmVudFBoYXNlU2hpZnRJbWFnICogaW1hZ1tvZmZdKTtcbiAgICAgICAgdGkgPSAoY3VycmVudFBoYXNlU2hpZnRSZWFsICogaW1hZ1tvZmZdKSArIChjdXJyZW50UGhhc2VTaGlmdEltYWcgKiByZWFsW29mZl0pO1xuXG4gICAgICAgIHJlYWxbb2ZmXSA9IHJlYWxbaV0gLSB0cjtcbiAgICAgICAgaW1hZ1tvZmZdID0gaW1hZ1tpXSAtIHRpO1xuICAgICAgICByZWFsW2ldICs9IHRyO1xuICAgICAgICBpbWFnW2ldICs9IHRpO1xuXG4gICAgICAgIGkgKz0gaGFsZlNpemUgPDwgMTtcbiAgICAgIH1cblxuICAgICAgdG1wUmVhbCA9IGN1cnJlbnRQaGFzZVNoaWZ0UmVhbDtcbiAgICAgIGN1cnJlbnRQaGFzZVNoaWZ0UmVhbCA9ICh0bXBSZWFsICogcGhhc2VTaGlmdFN0ZXBSZWFsKSAtIChjdXJyZW50UGhhc2VTaGlmdEltYWcgKiBwaGFzZVNoaWZ0U3RlcEltYWcpO1xuICAgICAgY3VycmVudFBoYXNlU2hpZnRJbWFnID0gKHRtcFJlYWwgKiBwaGFzZVNoaWZ0U3RlcEltYWcpICsgKGN1cnJlbnRQaGFzZVNoaWZ0SW1hZyAqIHBoYXNlU2hpZnRTdGVwUmVhbCk7XG4gICAgfVxuXG4gICAgaGFsZlNpemUgPSBoYWxmU2l6ZSA8PCAxO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuY2FsY3VsYXRlU3BlY3RydW0oKTtcbn07XG5cbkZGVC5wcm90b3R5cGUuaW52ZXJzZSA9IGZ1bmN0aW9uKHJlYWwsIGltYWcpIHtcbiAgLy8gTG9jYWxseSBzY29wZSB2YXJpYWJsZXMgZm9yIHNwZWVkIHVwXG4gIHZhciBidWZmZXJTaXplICAgICAgPSB0aGlzLmJ1ZmZlclNpemUsXG4gICAgICBjb3NUYWJsZSAgICAgICAgPSB0aGlzLmNvc1RhYmxlLFxuICAgICAgc2luVGFibGUgICAgICAgID0gdGhpcy5zaW5UYWJsZSxcbiAgICAgIHJldmVyc2VUYWJsZSAgICA9IHRoaXMucmV2ZXJzZVRhYmxlLFxuICAgICAgc3BlY3RydW0gICAgICAgID0gdGhpcy5zcGVjdHJ1bTtcblxuICAgICAgcmVhbCA9IHJlYWwgfHwgdGhpcy5yZWFsO1xuICAgICAgaW1hZyA9IGltYWcgfHwgdGhpcy5pbWFnO1xuXG4gIHZhciBoYWxmU2l6ZSA9IDEsXG4gICAgICBwaGFzZVNoaWZ0U3RlcFJlYWwsXG4gICAgICBwaGFzZVNoaWZ0U3RlcEltYWcsXG4gICAgICBjdXJyZW50UGhhc2VTaGlmdFJlYWwsXG4gICAgICBjdXJyZW50UGhhc2VTaGlmdEltYWcsXG4gICAgICBvZmYsXG4gICAgICB0cixcbiAgICAgIHRpLFxuICAgICAgdG1wUmVhbCxcbiAgICAgIGk7XG5cbiAgZm9yIChpID0gMDsgaSA8IGJ1ZmZlclNpemU7IGkrKykge1xuICAgIGltYWdbaV0gKj0gLTE7XG4gIH1cblxuICB2YXIgcmV2UmVhbCA9IG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyU2l6ZSk7XG4gIHZhciByZXZJbWFnID0gbmV3IEZsb2F0MzJBcnJheShidWZmZXJTaXplKTtcblxuICBmb3IgKGkgPSAwOyBpIDwgcmVhbC5sZW5ndGg7IGkrKykge1xuICAgIHJldlJlYWxbaV0gPSByZWFsW3JldmVyc2VUYWJsZVtpXV07XG4gICAgcmV2SW1hZ1tpXSA9IGltYWdbcmV2ZXJzZVRhYmxlW2ldXTtcbiAgfVxuXG4gIHJlYWwgPSByZXZSZWFsO1xuICBpbWFnID0gcmV2SW1hZztcblxuICB3aGlsZSAoaGFsZlNpemUgPCBidWZmZXJTaXplKSB7XG4gICAgcGhhc2VTaGlmdFN0ZXBSZWFsID0gY29zVGFibGVbaGFsZlNpemVdO1xuICAgIHBoYXNlU2hpZnRTdGVwSW1hZyA9IHNpblRhYmxlW2hhbGZTaXplXTtcbiAgICBjdXJyZW50UGhhc2VTaGlmdFJlYWwgPSAxO1xuICAgIGN1cnJlbnRQaGFzZVNoaWZ0SW1hZyA9IDA7XG5cbiAgICBmb3IgKHZhciBmZnRTdGVwID0gMDsgZmZ0U3RlcCA8IGhhbGZTaXplOyBmZnRTdGVwKyspIHtcbiAgICAgIGkgPSBmZnRTdGVwO1xuXG4gICAgICB3aGlsZSAoaSA8IGJ1ZmZlclNpemUpIHtcbiAgICAgICAgb2ZmID0gaSArIGhhbGZTaXplO1xuICAgICAgICB0ciA9IChjdXJyZW50UGhhc2VTaGlmdFJlYWwgKiByZWFsW29mZl0pIC0gKGN1cnJlbnRQaGFzZVNoaWZ0SW1hZyAqIGltYWdbb2ZmXSk7XG4gICAgICAgIHRpID0gKGN1cnJlbnRQaGFzZVNoaWZ0UmVhbCAqIGltYWdbb2ZmXSkgKyAoY3VycmVudFBoYXNlU2hpZnRJbWFnICogcmVhbFtvZmZdKTtcblxuICAgICAgICByZWFsW29mZl0gPSByZWFsW2ldIC0gdHI7XG4gICAgICAgIGltYWdbb2ZmXSA9IGltYWdbaV0gLSB0aTtcbiAgICAgICAgcmVhbFtpXSArPSB0cjtcbiAgICAgICAgaW1hZ1tpXSArPSB0aTtcblxuICAgICAgICBpICs9IGhhbGZTaXplIDw8IDE7XG4gICAgICB9XG5cbiAgICAgIHRtcFJlYWwgPSBjdXJyZW50UGhhc2VTaGlmdFJlYWw7XG4gICAgICBjdXJyZW50UGhhc2VTaGlmdFJlYWwgPSAodG1wUmVhbCAqIHBoYXNlU2hpZnRTdGVwUmVhbCkgLSAoY3VycmVudFBoYXNlU2hpZnRJbWFnICogcGhhc2VTaGlmdFN0ZXBJbWFnKTtcbiAgICAgIGN1cnJlbnRQaGFzZVNoaWZ0SW1hZyA9ICh0bXBSZWFsICogcGhhc2VTaGlmdFN0ZXBJbWFnKSArIChjdXJyZW50UGhhc2VTaGlmdEltYWcgKiBwaGFzZVNoaWZ0U3RlcFJlYWwpO1xuICAgIH1cblxuICAgIGhhbGZTaXplID0gaGFsZlNpemUgPDwgMTtcbiAgfVxuXG4gIHZhciBidWZmZXIgPSBuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlclNpemUpOyAvLyB0aGlzIHNob3VsZCBiZSByZXVzZWQgaW5zdGVhZFxuICBmb3IgKGkgPSAwOyBpIDwgYnVmZmVyU2l6ZTsgaSsrKSB7XG4gICAgYnVmZmVyW2ldID0gcmVhbFtpXSAvIGJ1ZmZlclNpemU7XG4gIH1cblxuICByZXR1cm4gYnVmZmVyO1xufTtcblxuLyoqXG4gKiBSRkZUIGlzIGEgY2xhc3MgZm9yIGNhbGN1bGF0aW5nIHRoZSBEaXNjcmV0ZSBGb3VyaWVyIFRyYW5zZm9ybSBvZiBhIHNpZ25hbFxuICogd2l0aCB0aGUgRmFzdCBGb3VyaWVyIFRyYW5zZm9ybSBhbGdvcml0aG0uXG4gKlxuICogVGhpcyBtZXRob2QgY3VycmVudGx5IG9ubHkgY29udGFpbnMgYSBmb3J3YXJkIHRyYW5zZm9ybSBidXQgaXMgaGlnaGx5IG9wdGltaXplZC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gYnVmZmVyU2l6ZSBUaGUgc2l6ZSBvZiB0aGUgc2FtcGxlIGJ1ZmZlciB0byBiZSBjb21wdXRlZC4gTXVzdCBiZSBwb3dlciBvZiAyXG4gKiBAcGFyYW0ge051bWJlcn0gc2FtcGxlUmF0ZSBUaGUgc2FtcGxlUmF0ZSBvZiB0aGUgYnVmZmVyIChlZy4gNDQxMDApXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cblxuLy8gbG9va3VwIHRhYmxlcyBkb24ndCByZWFsbHkgZ2FpbiB1cyBhbnkgc3BlZWQsIGJ1dCB0aGV5IGRvIGluY3JlYXNlXG4vLyBjYWNoZSBmb290cHJpbnQsIHNvIGRvbid0IHVzZSB0aGVtIGluIGhlcmVcblxuLy8gYWxzbyB3ZSBkb24ndCB1c2Ugc2VwZWFyYXRlIGFycmF5cyBmb3IgcmVhbC9pbWFnaW5hcnkgcGFydHNcblxuLy8gdGhpcyBvbmUgYSBsaXR0bGUgbW9yZSB0aGFuIHR3aWNlIGFzIGZhc3QgYXMgdGhlIG9uZSBpbiBGRlRcbi8vIGhvd2V2ZXIgSSBvbmx5IGRpZCB0aGUgZm9yd2FyZCB0cmFuc2Zvcm1cblxuLy8gdGhlIHJlc3Qgb2YgdGhpcyB3YXMgdHJhbnNsYXRlZCBmcm9tIEMsIHNlZSBodHRwOi8vd3d3Lmpqai5kZS9meHQvXG4vLyB0aGlzIGlzIHRoZSByZWFsIHNwbGl0IHJhZGl4IEZGVFxuXG5mdW5jdGlvbiBSRkZUKGJ1ZmZlclNpemUsIHNhbXBsZVJhdGUpIHtcbiAgRm91cmllclRyYW5zZm9ybS5jYWxsKHRoaXMsIGJ1ZmZlclNpemUsIHNhbXBsZVJhdGUpO1xuXG4gIHRoaXMudHJhbnMgPSBuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlclNpemUpO1xuXG4gIHRoaXMucmV2ZXJzZVRhYmxlID0gbmV3IFVpbnQzMkFycmF5KGJ1ZmZlclNpemUpO1xuXG4gIC8vIGRvbid0IHVzZSBhIGxvb2t1cCB0YWJsZSB0byBkbyB0aGUgcGVybXV0ZSwgdXNlIHRoaXMgaW5zdGVhZFxuICB0aGlzLnJldmVyc2VCaW5QZXJtdXRlID0gZnVuY3Rpb24gKGRlc3QsIHNvdXJjZSkge1xuICAgIHZhciBidWZmZXJTaXplICA9IHRoaXMuYnVmZmVyU2l6ZSxcbiAgICAgICAgaGFsZlNpemUgICAgPSBidWZmZXJTaXplID4+PiAxLFxuICAgICAgICBubTEgICAgICAgICA9IGJ1ZmZlclNpemUgLSAxLFxuICAgICAgICBpID0gMSwgciA9IDAsIGg7XG5cbiAgICBkZXN0WzBdID0gc291cmNlWzBdO1xuXG4gICAgZG8ge1xuICAgICAgciArPSBoYWxmU2l6ZTtcbiAgICAgIGRlc3RbaV0gPSBzb3VyY2Vbcl07XG4gICAgICBkZXN0W3JdID0gc291cmNlW2ldO1xuXG4gICAgICBpKys7XG5cbiAgICAgIGggPSBoYWxmU2l6ZSA8PCAxO1xuICAgICAgd2hpbGUgKGggPSBoID4+IDEsICEoKHIgXj0gaCkgJiBoKSk7XG5cbiAgICAgIGlmIChyID49IGkpIHtcbiAgICAgICAgZGVzdFtpXSAgICAgPSBzb3VyY2Vbcl07XG4gICAgICAgIGRlc3Rbcl0gICAgID0gc291cmNlW2ldO1xuXG4gICAgICAgIGRlc3Rbbm0xLWldID0gc291cmNlW25tMS1yXTtcbiAgICAgICAgZGVzdFtubTEtcl0gPSBzb3VyY2Vbbm0xLWldO1xuICAgICAgfVxuICAgICAgaSsrO1xuICAgIH0gd2hpbGUgKGkgPCBoYWxmU2l6ZSk7XG4gICAgZGVzdFtubTFdID0gc291cmNlW25tMV07XG4gIH07XG5cbiAgdGhpcy5nZW5lcmF0ZVJldmVyc2VUYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYnVmZmVyU2l6ZSAgPSB0aGlzLmJ1ZmZlclNpemUsXG4gICAgICAgIGhhbGZTaXplICAgID0gYnVmZmVyU2l6ZSA+Pj4gMSxcbiAgICAgICAgbm0xICAgICAgICAgPSBidWZmZXJTaXplIC0gMSxcbiAgICAgICAgaSA9IDEsIHIgPSAwLCBoO1xuXG4gICAgdGhpcy5yZXZlcnNlVGFibGVbMF0gPSAwO1xuXG4gICAgZG8ge1xuICAgICAgciArPSBoYWxmU2l6ZTtcblxuICAgICAgdGhpcy5yZXZlcnNlVGFibGVbaV0gPSByO1xuICAgICAgdGhpcy5yZXZlcnNlVGFibGVbcl0gPSBpO1xuXG4gICAgICBpKys7XG5cbiAgICAgIGggPSBoYWxmU2l6ZSA8PCAxO1xuICAgICAgd2hpbGUgKGggPSBoID4+IDEsICEoKHIgXj0gaCkgJiBoKSk7XG5cbiAgICAgIGlmIChyID49IGkpIHtcbiAgICAgICAgdGhpcy5yZXZlcnNlVGFibGVbaV0gPSByO1xuICAgICAgICB0aGlzLnJldmVyc2VUYWJsZVtyXSA9IGk7XG5cbiAgICAgICAgdGhpcy5yZXZlcnNlVGFibGVbbm0xLWldID0gbm0xLXI7XG4gICAgICAgIHRoaXMucmV2ZXJzZVRhYmxlW25tMS1yXSA9IG5tMS1pO1xuICAgICAgfVxuICAgICAgaSsrO1xuICAgIH0gd2hpbGUgKGkgPCBoYWxmU2l6ZSk7XG5cbiAgICB0aGlzLnJldmVyc2VUYWJsZVtubTFdID0gbm0xO1xuICB9O1xuXG4gIHRoaXMuZ2VuZXJhdGVSZXZlcnNlVGFibGUoKTtcbn1cblxuXG4vLyBPcmRlcmluZyBvZiBvdXRwdXQ6XG4vL1xuLy8gdHJhbnNbMF0gICAgID0gcmVbMF0gKD09emVybyBmcmVxdWVuY3ksIHB1cmVseSByZWFsKVxuLy8gdHJhbnNbMV0gICAgID0gcmVbMV1cbi8vICAgICAgICAgICAgIC4uLlxuLy8gdHJhbnNbbi8yLTFdID0gcmVbbi8yLTFdXG4vLyB0cmFuc1tuLzJdICAgPSByZVtuLzJdICAgICg9PW55cXVpc3QgZnJlcXVlbmN5LCBwdXJlbHkgcmVhbClcbi8vXG4vLyB0cmFuc1tuLzIrMV0gPSBpbVtuLzItMV1cbi8vIHRyYW5zW24vMisyXSA9IGltW24vMi0yXVxuLy8gICAgICAgICAgICAgLi4uXG4vLyB0cmFuc1tuLTFdICAgPSBpbVsxXVxuXG5SRkZULnByb3RvdHlwZS5mb3J3YXJkID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gIHZhciBuICAgICAgICAgPSB0aGlzLmJ1ZmZlclNpemUsXG4gICAgICBzcGVjdHJ1bSAgPSB0aGlzLnNwZWN0cnVtLFxuICAgICAgeCAgICAgICAgID0gdGhpcy50cmFucyxcbiAgICAgIFRXT19QSSAgICA9IDIqTWF0aC5QSSxcbiAgICAgIHNxcnQgICAgICA9IE1hdGguc3FydCxcbiAgICAgIGkgICAgICAgICA9IG4gPj4+IDEsXG4gICAgICBiU2kgICAgICAgPSAyIC8gbixcbiAgICAgIG4yLCBuNCwgbjgsIG5uLFxuICAgICAgdDEsIHQyLCB0MywgdDQsXG4gICAgICBpMSwgaTIsIGkzLCBpNCwgaTUsIGk2LCBpNywgaTgsXG4gICAgICBzdDEsIGNjMSwgc3MxLCBjYzMsIHNzMyxcbiAgICAgIGUsXG4gICAgICBhLFxuICAgICAgcnZhbCwgaXZhbCwgbWFnO1xuXG4gIHRoaXMucmV2ZXJzZUJpblBlcm11dGUoeCwgYnVmZmVyKTtcblxuICAvKlxuICB2YXIgcmV2ZXJzZVRhYmxlID0gdGhpcy5yZXZlcnNlVGFibGU7XG5cbiAgZm9yICh2YXIgayA9IDAsIGxlbiA9IHJldmVyc2VUYWJsZS5sZW5ndGg7IGsgPCBsZW47IGsrKykge1xuICAgIHhba10gPSBidWZmZXJbcmV2ZXJzZVRhYmxlW2tdXTtcbiAgfVxuICAqL1xuXG4gIGZvciAodmFyIGl4ID0gMCwgaWQgPSA0OyBpeCA8IG47IGlkICo9IDQpIHtcbiAgICBmb3IgKHZhciBpMCA9IGl4OyBpMCA8IG47IGkwICs9IGlkKSB7XG4gICAgICAvL3N1bWRpZmYoeFtpMF0sIHhbaTArMV0pOyAvLyB7YSwgYn0gIDwtLXwge2ErYiwgYS1ifVxuICAgICAgc3QxID0geFtpMF0gLSB4W2kwKzFdO1xuICAgICAgeFtpMF0gKz0geFtpMCsxXTtcbiAgICAgIHhbaTArMV0gPSBzdDE7XG4gICAgfVxuICAgIGl4ID0gMiooaWQtMSk7XG4gIH1cblxuICBuMiA9IDI7XG4gIG5uID0gbiA+Pj4gMTtcblxuICB3aGlsZSgobm4gPSBubiA+Pj4gMSkpIHtcbiAgICBpeCA9IDA7XG4gICAgbjIgPSBuMiA8PCAxO1xuICAgIGlkID0gbjIgPDwgMTtcbiAgICBuNCA9IG4yID4+PiAyO1xuICAgIG44ID0gbjIgPj4+IDM7XG4gICAgZG8ge1xuICAgICAgaWYobjQgIT09IDEpIHtcbiAgICAgICAgZm9yKGkwID0gaXg7IGkwIDwgbjsgaTAgKz0gaWQpIHtcbiAgICAgICAgICBpMSA9IGkwO1xuICAgICAgICAgIGkyID0gaTEgKyBuNDtcbiAgICAgICAgICBpMyA9IGkyICsgbjQ7XG4gICAgICAgICAgaTQgPSBpMyArIG40O1xuXG4gICAgICAgICAgLy9kaWZmc3VtM19yKHhbaTNdLCB4W2k0XSwgdDEpOyAvLyB7YSwgYiwgc30gPC0tfCB7YSwgYi1hLCBhK2J9XG4gICAgICAgICAgdDEgPSB4W2kzXSArIHhbaTRdO1xuICAgICAgICAgIHhbaTRdIC09IHhbaTNdO1xuICAgICAgICAgIC8vc3VtZGlmZjMoeFtpMV0sIHQxLCB4W2kzXSk7ICAgLy8ge2EsIGIsIGR9IDwtLXwge2ErYiwgYiwgYS1ifVxuICAgICAgICAgIHhbaTNdID0geFtpMV0gLSB0MTtcbiAgICAgICAgICB4W2kxXSArPSB0MTtcblxuICAgICAgICAgIGkxICs9IG44O1xuICAgICAgICAgIGkyICs9IG44O1xuICAgICAgICAgIGkzICs9IG44O1xuICAgICAgICAgIGk0ICs9IG44O1xuXG4gICAgICAgICAgLy9zdW1kaWZmKHhbaTNdLCB4W2k0XSwgdDEsIHQyKTsgLy8ge3MsIGR9ICA8LS18IHthK2IsIGEtYn1cbiAgICAgICAgICB0MSA9IHhbaTNdICsgeFtpNF07XG4gICAgICAgICAgdDIgPSB4W2kzXSAtIHhbaTRdO1xuXG4gICAgICAgICAgdDEgPSAtdDEgKiBNYXRoLlNRUlQxXzI7XG4gICAgICAgICAgdDIgKj0gTWF0aC5TUVJUMV8yO1xuXG4gICAgICAgICAgLy8gc3VtZGlmZih0MSwgeFtpMl0sIHhbaTRdLCB4W2kzXSk7IC8vIHtzLCBkfSAgPC0tfCB7YStiLCBhLWJ9XG4gICAgICAgICAgc3QxID0geFtpMl07XG4gICAgICAgICAgeFtpNF0gPSB0MSArIHN0MTtcbiAgICAgICAgICB4W2kzXSA9IHQxIC0gc3QxO1xuXG4gICAgICAgICAgLy9zdW1kaWZmMyh4W2kxXSwgdDIsIHhbaTJdKTsgLy8ge2EsIGIsIGR9IDwtLXwge2ErYiwgYiwgYS1ifVxuICAgICAgICAgIHhbaTJdID0geFtpMV0gLSB0MjtcbiAgICAgICAgICB4W2kxXSArPSB0MjtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yKGkwID0gaXg7IGkwIDwgbjsgaTAgKz0gaWQpIHtcbiAgICAgICAgICBpMSA9IGkwO1xuICAgICAgICAgIGkyID0gaTEgKyBuNDtcbiAgICAgICAgICBpMyA9IGkyICsgbjQ7XG4gICAgICAgICAgaTQgPSBpMyArIG40O1xuXG4gICAgICAgICAgLy9kaWZmc3VtM19yKHhbaTNdLCB4W2k0XSwgdDEpOyAvLyB7YSwgYiwgc30gPC0tfCB7YSwgYi1hLCBhK2J9XG4gICAgICAgICAgdDEgPSB4W2kzXSArIHhbaTRdO1xuICAgICAgICAgIHhbaTRdIC09IHhbaTNdO1xuXG4gICAgICAgICAgLy9zdW1kaWZmMyh4W2kxXSwgdDEsIHhbaTNdKTsgICAvLyB7YSwgYiwgZH0gPC0tfCB7YStiLCBiLCBhLWJ9XG4gICAgICAgICAgeFtpM10gPSB4W2kxXSAtIHQxO1xuICAgICAgICAgIHhbaTFdICs9IHQxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGl4ID0gKGlkIDw8IDEpIC0gbjI7XG4gICAgICBpZCA9IGlkIDw8IDI7XG4gICAgfSB3aGlsZSAoaXggPCBuKTtcblxuICAgIGUgPSBUV09fUEkgLyBuMjtcblxuICAgIGZvciAodmFyIGogPSAxOyBqIDwgbjg7IGorKykge1xuICAgICAgYSA9IGogKiBlO1xuICAgICAgc3MxID0gTWF0aC5zaW4oYSk7XG4gICAgICBjYzEgPSBNYXRoLmNvcyhhKTtcblxuICAgICAgLy9zczMgPSBzaW4oMyphKTsgY2MzID0gY29zKDMqYSk7XG4gICAgICBjYzMgPSA0KmNjMSooY2MxKmNjMS0wLjc1KTtcbiAgICAgIHNzMyA9IDQqc3MxKigwLjc1LXNzMSpzczEpO1xuXG4gICAgICBpeCA9IDA7IGlkID0gbjIgPDwgMTtcbiAgICAgIGRvIHtcbiAgICAgICAgZm9yIChpMCA9IGl4OyBpMCA8IG47IGkwICs9IGlkKSB7XG4gICAgICAgICAgaTEgPSBpMCArIGo7XG4gICAgICAgICAgaTIgPSBpMSArIG40O1xuICAgICAgICAgIGkzID0gaTIgKyBuNDtcbiAgICAgICAgICBpNCA9IGkzICsgbjQ7XG5cbiAgICAgICAgICBpNSA9IGkwICsgbjQgLSBqO1xuICAgICAgICAgIGk2ID0gaTUgKyBuNDtcbiAgICAgICAgICBpNyA9IGk2ICsgbjQ7XG4gICAgICAgICAgaTggPSBpNyArIG40O1xuXG4gICAgICAgICAgLy9jbXVsdChjLCBzLCB4LCB5LCAmdSwgJnYpXG4gICAgICAgICAgLy9jbXVsdChjYzEsIHNzMSwgeFtpN10sIHhbaTNdLCB0MiwgdDEpOyAvLyB7dSx2fSA8LS18IHt4KmMteSpzLCB4KnMreSpjfVxuICAgICAgICAgIHQyID0geFtpN10qY2MxIC0geFtpM10qc3MxO1xuICAgICAgICAgIHQxID0geFtpN10qc3MxICsgeFtpM10qY2MxO1xuXG4gICAgICAgICAgLy9jbXVsdChjYzMsIHNzMywgeFtpOF0sIHhbaTRdLCB0NCwgdDMpO1xuICAgICAgICAgIHQ0ID0geFtpOF0qY2MzIC0geFtpNF0qc3MzO1xuICAgICAgICAgIHQzID0geFtpOF0qc3MzICsgeFtpNF0qY2MzO1xuXG4gICAgICAgICAgLy9zdW1kaWZmKHQyLCB0NCk7ICAgLy8ge2EsIGJ9IDwtLXwge2ErYiwgYS1ifVxuICAgICAgICAgIHN0MSA9IHQyIC0gdDQ7XG4gICAgICAgICAgdDIgKz0gdDQ7XG4gICAgICAgICAgdDQgPSBzdDE7XG5cbiAgICAgICAgICAvL3N1bWRpZmYodDIsIHhbaTZdLCB4W2k4XSwgeFtpM10pOyAvLyB7cywgZH0gIDwtLXwge2ErYiwgYS1ifVxuICAgICAgICAgIC8vc3QxID0geFtpNl07IHhbaThdID0gdDIgKyBzdDE7IHhbaTNdID0gdDIgLSBzdDE7XG4gICAgICAgICAgeFtpOF0gPSB0MiArIHhbaTZdO1xuICAgICAgICAgIHhbaTNdID0gdDIgLSB4W2k2XTtcblxuICAgICAgICAgIC8vc3VtZGlmZl9yKHQxLCB0Myk7IC8vIHthLCBifSA8LS18IHthK2IsIGItYX1cbiAgICAgICAgICBzdDEgPSB0MyAtIHQxO1xuICAgICAgICAgIHQxICs9IHQzO1xuICAgICAgICAgIHQzID0gc3QxO1xuXG4gICAgICAgICAgLy9zdW1kaWZmKHQzLCB4W2kyXSwgeFtpNF0sIHhbaTddKTsgLy8ge3MsIGR9ICA8LS18IHthK2IsIGEtYn1cbiAgICAgICAgICAvL3N0MSA9IHhbaTJdOyB4W2k0XSA9IHQzICsgc3QxOyB4W2k3XSA9IHQzIC0gc3QxO1xuICAgICAgICAgIHhbaTRdID0gdDMgKyB4W2kyXTtcbiAgICAgICAgICB4W2k3XSA9IHQzIC0geFtpMl07XG5cbiAgICAgICAgICAvL3N1bWRpZmYzKHhbaTFdLCB0MSwgeFtpNl0pOyAgIC8vIHthLCBiLCBkfSA8LS18IHthK2IsIGIsIGEtYn1cbiAgICAgICAgICB4W2k2XSA9IHhbaTFdIC0gdDE7XG4gICAgICAgICAgeFtpMV0gKz0gdDE7XG5cbiAgICAgICAgICAvL2RpZmZzdW0zX3IodDQsIHhbaTVdLCB4W2kyXSk7IC8vIHthLCBiLCBzfSA8LS18IHthLCBiLWEsIGErYn1cbiAgICAgICAgICB4W2kyXSA9IHQ0ICsgeFtpNV07XG4gICAgICAgICAgeFtpNV0gLT0gdDQ7XG4gICAgICAgIH1cblxuICAgICAgICBpeCA9IChpZCA8PCAxKSAtIG4yO1xuICAgICAgICBpZCA9IGlkIDw8IDI7XG5cbiAgICAgIH0gd2hpbGUgKGl4IDwgbik7XG4gICAgfVxuICB9XG5cbiAgd2hpbGUgKC0taSkge1xuICAgIHJ2YWwgPSB4W2ldO1xuICAgIGl2YWwgPSB4W24taS0xXTtcbiAgICBtYWcgPSBiU2kgKiBzcXJ0KHJ2YWwgKiBydmFsICsgaXZhbCAqIGl2YWwpO1xuXG4gICAgaWYgKG1hZyA+IHRoaXMucGVhaykge1xuICAgICAgdGhpcy5wZWFrQmFuZCA9IGk7XG4gICAgICB0aGlzLnBlYWsgPSBtYWc7XG4gICAgfVxuXG4gICAgc3BlY3RydW1baV0gPSBtYWc7XG4gIH1cblxuICBzcGVjdHJ1bVswXSA9IGJTaSAqIHhbMF07XG5cbiAgcmV0dXJuIHNwZWN0cnVtO1xufTtcblxuZnVuY3Rpb24gU2FtcGxlcihmaWxlLCBidWZmZXJTaXplLCBzYW1wbGVSYXRlLCBwbGF5U3RhcnQsIHBsYXlFbmQsIGxvb3BTdGFydCwgbG9vcEVuZCwgbG9vcE1vZGUpIHtcbiAgdGhpcy5maWxlID0gZmlsZTtcbiAgdGhpcy5idWZmZXJTaXplID0gYnVmZmVyU2l6ZTtcbiAgdGhpcy5zYW1wbGVSYXRlID0gc2FtcGxlUmF0ZTtcbiAgdGhpcy5wbGF5U3RhcnQgID0gcGxheVN0YXJ0IHx8IDA7IC8vIDAlXG4gIHRoaXMucGxheUVuZCAgICA9IHBsYXlFbmQgICB8fCAxOyAvLyAxMDAlXG4gIHRoaXMubG9vcFN0YXJ0ICA9IGxvb3BTdGFydCB8fCAwO1xuICB0aGlzLmxvb3BFbmQgICAgPSBsb29wRW5kICAgfHwgMTtcbiAgdGhpcy5sb29wTW9kZSAgID0gbG9vcE1vZGUgIHx8IERTUC5PRkY7XG4gIHRoaXMubG9hZGVkICAgICA9IGZhbHNlO1xuICB0aGlzLnNhbXBsZXMgICAgPSBbXTtcbiAgdGhpcy5zaWduYWwgICAgID0gbmV3IEZsb2F0MzJBcnJheShidWZmZXJTaXplKTtcbiAgdGhpcy5mcmFtZUNvdW50ID0gMDtcbiAgdGhpcy5lbnZlbG9wZSAgID0gbnVsbDtcbiAgdGhpcy5hbXBsaXR1ZGUgID0gMTtcbiAgdGhpcy5yb290RnJlcXVlbmN5ID0gMTEwOyAvLyBBMiAxMTBcbiAgdGhpcy5mcmVxdWVuY3kgID0gNTUwO1xuICB0aGlzLnN0ZXAgICAgICAgPSB0aGlzLmZyZXF1ZW5jeSAvIHRoaXMucm9vdEZyZXF1ZW5jeTtcbiAgdGhpcy5kdXJhdGlvbiAgID0gMDtcbiAgdGhpcy5zYW1wbGVzUHJvY2Vzc2VkID0gMDtcbiAgdGhpcy5wbGF5aGVhZCAgID0gMDtcblxuICB2YXIgYXVkaW8gPSAvKiBuZXcgQXVkaW8oKTsqLyBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiQVVESU9cIik7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICB0aGlzLmxvYWRTYW1wbGVzID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICB2YXIgYnVmZmVyID0gRFNQLmdldENoYW5uZWwoRFNQLk1JWCwgZXZlbnQuZnJhbWVCdWZmZXIpO1xuICAgIGZvciAoIHZhciBpID0gMDsgaSA8IGJ1ZmZlci5sZW5ndGg7IGkrKykge1xuICAgICAgc2VsZi5zYW1wbGVzLnB1c2goYnVmZmVyW2ldKTtcbiAgICB9XG4gIH07XG5cbiAgdGhpcy5sb2FkQ29tcGxldGUgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBjb252ZXJ0IGZsZXhpYmxlIGpzIGFycmF5IGludG8gYSBmYXN0IHR5cGVkIGFycmF5XG4gICAgc2VsZi5zYW1wbGVzID0gbmV3IEZsb2F0MzJBcnJheShzZWxmLnNhbXBsZXMpO1xuICAgIHNlbGYubG9hZGVkID0gdHJ1ZTtcbiAgfTtcblxuICB0aGlzLmxvYWRNZXRhRGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgIHNlbGYuZHVyYXRpb24gPSBhdWRpby5kdXJhdGlvbjtcbiAgfTtcblxuICBhdWRpby5hZGRFdmVudExpc3RlbmVyKFwiTW96QXVkaW9BdmFpbGFibGVcIiwgdGhpcy5sb2FkU2FtcGxlcywgZmFsc2UpO1xuICBhdWRpby5hZGRFdmVudExpc3RlbmVyKFwibG9hZGVkbWV0YWRhdGFcIiwgdGhpcy5sb2FkTWV0YURhdGEsIGZhbHNlKTtcbiAgYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcihcImVuZGVkXCIsIHRoaXMubG9hZENvbXBsZXRlLCBmYWxzZSk7XG4gIGF1ZGlvLm11dGVkID0gdHJ1ZTtcbiAgYXVkaW8uc3JjID0gZmlsZTtcbiAgYXVkaW8ucGxheSgpO1xufVxuXG5TYW1wbGVyLnByb3RvdHlwZS5hcHBseUVudmVsb3BlID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuZW52ZWxvcGUucHJvY2Vzcyh0aGlzLnNpZ25hbCk7XG4gIHJldHVybiB0aGlzLnNpZ25hbDtcbn07XG5cblNhbXBsZXIucHJvdG90eXBlLmdlbmVyYXRlID0gZnVuY3Rpb24oKSB7XG4gIHZhciBmcmFtZU9mZnNldCA9IHRoaXMuZnJhbWVDb3VudCAqIHRoaXMuYnVmZmVyU2l6ZTtcblxuICB2YXIgbG9vcFdpZHRoID0gdGhpcy5wbGF5RW5kICogdGhpcy5zYW1wbGVzLmxlbmd0aCAtIHRoaXMucGxheVN0YXJ0ICogdGhpcy5zYW1wbGVzLmxlbmd0aDtcbiAgdmFyIHBsYXlTdGFydFNhbXBsZXMgPSB0aGlzLnBsYXlTdGFydCAqIHRoaXMuc2FtcGxlcy5sZW5ndGg7IC8vIGllIDAuNSAtPiA1MCUgb2YgdGhlIGxlbmd0aFxuICB2YXIgcGxheUVuZFNhbXBsZXMgPSB0aGlzLnBsYXlFbmQgKiB0aGlzLnNhbXBsZXMubGVuZ3RoOyAvLyBpZSAwLjUgLT4gNTAlIG9mIHRoZSBsZW5ndGhcbiAgdmFyIG9mZnNldDtcblxuICBmb3IgKCB2YXIgaSA9IDA7IGkgPCB0aGlzLmJ1ZmZlclNpemU7IGkrKyApIHtcbiAgICBzd2l0Y2ggKHRoaXMubG9vcE1vZGUpIHtcbiAgICAgIGNhc2UgRFNQLk9GRjpcbiAgICAgICAgdGhpcy5wbGF5aGVhZCA9IE1hdGgucm91bmQodGhpcy5zYW1wbGVzUHJvY2Vzc2VkICogdGhpcy5zdGVwICsgcGxheVN0YXJ0U2FtcGxlcyk7XG4gICAgICAgIGlmICh0aGlzLnBsYXloZWFkIDwgKHRoaXMucGxheUVuZCAqIHRoaXMuc2FtcGxlcy5sZW5ndGgpICkge1xuICAgICAgICAgIHRoaXMuc2lnbmFsW2ldID0gdGhpcy5zYW1wbGVzW3RoaXMucGxheWhlYWRdICogdGhpcy5hbXBsaXR1ZGU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5zaWduYWxbaV0gPSAwO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIERTUC5GVzpcbiAgICAgICAgdGhpcy5wbGF5aGVhZCA9IE1hdGgucm91bmQoKHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCAqIHRoaXMuc3RlcCkgJSBsb29wV2lkdGggKyBwbGF5U3RhcnRTYW1wbGVzKTtcbiAgICAgICAgaWYgKHRoaXMucGxheWhlYWQgPCAodGhpcy5wbGF5RW5kICogdGhpcy5zYW1wbGVzLmxlbmd0aCkgKSB7XG4gICAgICAgICAgdGhpcy5zaWduYWxbaV0gPSB0aGlzLnNhbXBsZXNbdGhpcy5wbGF5aGVhZF0gKiB0aGlzLmFtcGxpdHVkZTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBEU1AuQlc6XG4gICAgICAgIHRoaXMucGxheWhlYWQgPSBwbGF5RW5kU2FtcGxlcyAtIE1hdGgucm91bmQoKHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCAqIHRoaXMuc3RlcCkgJSBsb29wV2lkdGgpO1xuICAgICAgICBpZiAodGhpcy5wbGF5aGVhZCA8ICh0aGlzLnBsYXlFbmQgKiB0aGlzLnNhbXBsZXMubGVuZ3RoKSApIHtcbiAgICAgICAgICB0aGlzLnNpZ25hbFtpXSA9IHRoaXMuc2FtcGxlc1t0aGlzLnBsYXloZWFkXSAqIHRoaXMuYW1wbGl0dWRlO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIERTUC5GV0JXOlxuICAgICAgICBpZiAoIE1hdGguZmxvb3IodGhpcy5zYW1wbGVzUHJvY2Vzc2VkICogdGhpcy5zdGVwIC8gbG9vcFdpZHRoKSAlIDIgPT09IDAgKSB7XG4gICAgICAgICAgdGhpcy5wbGF5aGVhZCA9IE1hdGgucm91bmQoKHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCAqIHRoaXMuc3RlcCkgJSBsb29wV2lkdGggKyBwbGF5U3RhcnRTYW1wbGVzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnBsYXloZWFkID0gcGxheUVuZFNhbXBsZXMgLSBNYXRoLnJvdW5kKCh0aGlzLnNhbXBsZXNQcm9jZXNzZWQgKiB0aGlzLnN0ZXApICUgbG9vcFdpZHRoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5wbGF5aGVhZCA8ICh0aGlzLnBsYXlFbmQgKiB0aGlzLnNhbXBsZXMubGVuZ3RoKSApIHtcbiAgICAgICAgICB0aGlzLnNpZ25hbFtpXSA9IHRoaXMuc2FtcGxlc1t0aGlzLnBsYXloZWFkXSAqIHRoaXMuYW1wbGl0dWRlO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICB0aGlzLnNhbXBsZXNQcm9jZXNzZWQrKztcbiAgfVxuXG4gIHRoaXMuZnJhbWVDb3VudCsrO1xuXG4gIHJldHVybiB0aGlzLnNpZ25hbDtcbn07XG5cblNhbXBsZXIucHJvdG90eXBlLnNldEZyZXEgPSBmdW5jdGlvbihmcmVxdWVuY3kpIHtcbiAgICB2YXIgdG90YWxQcm9jZXNzZWQgPSB0aGlzLnNhbXBsZXNQcm9jZXNzZWQgKiB0aGlzLnN0ZXA7XG4gICAgdGhpcy5mcmVxdWVuY3kgPSBmcmVxdWVuY3k7XG4gICAgdGhpcy5zdGVwID0gdGhpcy5mcmVxdWVuY3kgLyB0aGlzLnJvb3RGcmVxdWVuY3k7XG4gICAgdGhpcy5zYW1wbGVzUHJvY2Vzc2VkID0gTWF0aC5yb3VuZCh0b3RhbFByb2Nlc3NlZC90aGlzLnN0ZXApO1xufTtcblxuU2FtcGxlci5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5zYW1wbGVzUHJvY2Vzc2VkID0gMDtcbiAgdGhpcy5wbGF5aGVhZCA9IDA7XG59O1xuXG4vKipcbiAqIE9zY2lsbGF0b3IgY2xhc3MgZm9yIGdlbmVyYXRpbmcgYW5kIG1vZGlmeWluZyBzaWduYWxzXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHR5cGUgICAgICAgQSB3YXZlZm9ybSBjb25zdGFudCAoZWcuIERTUC5TSU5FKVxuICogQHBhcmFtIHtOdW1iZXJ9IGZyZXF1ZW5jeSAgSW5pdGlhbCBmcmVxdWVuY3kgb2YgdGhlIHNpZ25hbFxuICogQHBhcmFtIHtOdW1iZXJ9IGFtcGxpdHVkZSAgSW5pdGlhbCBhbXBsaXR1ZGUgb2YgdGhlIHNpZ25hbFxuICogQHBhcmFtIHtOdW1iZXJ9IGJ1ZmZlclNpemUgU2l6ZSBvZiB0aGUgc2FtcGxlIGJ1ZmZlciB0byBnZW5lcmF0ZVxuICogQHBhcmFtIHtOdW1iZXJ9IHNhbXBsZVJhdGUgVGhlIHNhbXBsZSByYXRlIG9mIHRoZSBzaWduYWxcbiAqXG4gKiBAY29udHJ1Y3RvclxuICovXG5mdW5jdGlvbiBPc2NpbGxhdG9yKHR5cGUsIGZyZXF1ZW5jeSwgYW1wbGl0dWRlLCBidWZmZXJTaXplLCBzYW1wbGVSYXRlKSB7XG4gIHRoaXMuZnJlcXVlbmN5ICA9IGZyZXF1ZW5jeTtcbiAgdGhpcy5hbXBsaXR1ZGUgID0gYW1wbGl0dWRlO1xuICB0aGlzLmJ1ZmZlclNpemUgPSBidWZmZXJTaXplO1xuICB0aGlzLnNhbXBsZVJhdGUgPSBzYW1wbGVSYXRlO1xuICAvL3RoaXMucHVsc2VXaWR0aCA9IHB1bHNlV2lkdGg7XG4gIHRoaXMuZnJhbWVDb3VudCA9IDA7XG5cbiAgdGhpcy53YXZlVGFibGVMZW5ndGggPSAyMDQ4O1xuXG4gIHRoaXMuY3ljbGVzUGVyU2FtcGxlID0gZnJlcXVlbmN5IC8gc2FtcGxlUmF0ZTtcblxuICB0aGlzLnNpZ25hbCA9IG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyU2l6ZSk7XG4gIHRoaXMuZW52ZWxvcGUgPSBudWxsO1xuXG4gIHN3aXRjaChwYXJzZUludCh0eXBlLCAxMCkpIHtcbiAgICBjYXNlIERTUC5UUklBTkdMRTpcbiAgICAgIHRoaXMuZnVuYyA9IE9zY2lsbGF0b3IuVHJpYW5nbGU7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgRFNQLlNBVzpcbiAgICAgIHRoaXMuZnVuYyA9IE9zY2lsbGF0b3IuU2F3O1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIERTUC5TUVVBUkU6XG4gICAgICB0aGlzLmZ1bmMgPSBPc2NpbGxhdG9yLlNxdWFyZTtcbiAgICAgIGJyZWFrO1xuXG4gICAgZGVmYXVsdDpcbiAgICBjYXNlIERTUC5TSU5FOlxuICAgICAgdGhpcy5mdW5jID0gT3NjaWxsYXRvci5TaW5lO1xuICAgICAgYnJlYWs7XG4gIH1cblxuICB0aGlzLmdlbmVyYXRlV2F2ZVRhYmxlID0gZnVuY3Rpb24oKSB7XG4gICAgT3NjaWxsYXRvci53YXZlVGFibGVbdGhpcy5mdW5jXSA9IG5ldyBGbG9hdDMyQXJyYXkoMjA0OCk7XG4gICAgdmFyIHdhdmVUYWJsZVRpbWUgPSB0aGlzLndhdmVUYWJsZUxlbmd0aCAvIHRoaXMuc2FtcGxlUmF0ZTtcbiAgICB2YXIgd2F2ZVRhYmxlSHogPSAxIC8gd2F2ZVRhYmxlVGltZTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy53YXZlVGFibGVMZW5ndGg7IGkrKykge1xuICAgICAgT3NjaWxsYXRvci53YXZlVGFibGVbdGhpcy5mdW5jXVtpXSA9IHRoaXMuZnVuYyhpICogd2F2ZVRhYmxlSHovdGhpcy5zYW1wbGVSYXRlKTtcbiAgICB9XG4gIH07XG5cbiAgaWYgKCB0eXBlb2YgT3NjaWxsYXRvci53YXZlVGFibGUgPT09ICd1bmRlZmluZWQnICkge1xuICAgIE9zY2lsbGF0b3Iud2F2ZVRhYmxlID0ge307XG4gIH1cblxuICBpZiAoIHR5cGVvZiBPc2NpbGxhdG9yLndhdmVUYWJsZVt0aGlzLmZ1bmNdID09PSAndW5kZWZpbmVkJyApIHtcbiAgICB0aGlzLmdlbmVyYXRlV2F2ZVRhYmxlKCk7XG4gIH1cblxuICB0aGlzLndhdmVUYWJsZSA9IE9zY2lsbGF0b3Iud2F2ZVRhYmxlW3RoaXMuZnVuY107XG59XG5cbi8qKlxuICogU2V0IHRoZSBhbXBsaXR1ZGUgb2YgdGhlIHNpZ25hbFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBhbXBsaXR1ZGUgVGhlIGFtcGxpdHVkZSBvZiB0aGUgc2lnbmFsIChiZXR3ZWVuIDAgYW5kIDEpXG4gKi9cbk9zY2lsbGF0b3IucHJvdG90eXBlLnNldEFtcCA9IGZ1bmN0aW9uKGFtcGxpdHVkZSkge1xuICBpZiAoYW1wbGl0dWRlID49IDAgJiYgYW1wbGl0dWRlIDw9IDEpIHtcbiAgICB0aGlzLmFtcGxpdHVkZSA9IGFtcGxpdHVkZTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBcIkFtcGxpdHVkZSBvdXQgb2YgcmFuZ2UgKDAuLjEpLlwiO1xuICB9XG59O1xuXG4vKipcbiAqIFNldCB0aGUgZnJlcXVlbmN5IG9mIHRoZSBzaWduYWxcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gZnJlcXVlbmN5IFRoZSBmcmVxdWVuY3kgb2YgdGhlIHNpZ25hbFxuICovXG5Pc2NpbGxhdG9yLnByb3RvdHlwZS5zZXRGcmVxID0gZnVuY3Rpb24oZnJlcXVlbmN5KSB7XG4gIHRoaXMuZnJlcXVlbmN5ID0gZnJlcXVlbmN5O1xuICB0aGlzLmN5Y2xlc1BlclNhbXBsZSA9IGZyZXF1ZW5jeSAvIHRoaXMuc2FtcGxlUmF0ZTtcbn07XG5cbi8vIEFkZCBhbiBvc2NpbGxhdG9yXG5Pc2NpbGxhdG9yLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihvc2NpbGxhdG9yKSB7XG4gIGZvciAoIHZhciBpID0gMDsgaSA8IHRoaXMuYnVmZmVyU2l6ZTsgaSsrICkge1xuICAgIC8vdGhpcy5zaWduYWxbaV0gKz0gb3NjaWxsYXRvci52YWx1ZUF0KGkpO1xuICAgIHRoaXMuc2lnbmFsW2ldICs9IG9zY2lsbGF0b3Iuc2lnbmFsW2ldO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuc2lnbmFsO1xufTtcblxuLy8gQWRkIGEgc2lnbmFsIHRvIHRoZSBjdXJyZW50IGdlbmVyYXRlZCBvc2Mgc2lnbmFsXG5Pc2NpbGxhdG9yLnByb3RvdHlwZS5hZGRTaWduYWwgPSBmdW5jdGlvbihzaWduYWwpIHtcbiAgZm9yICggdmFyIGkgPSAwOyBpIDwgc2lnbmFsLmxlbmd0aDsgaSsrICkge1xuICAgIGlmICggaSA+PSB0aGlzLmJ1ZmZlclNpemUgKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgdGhpcy5zaWduYWxbaV0gKz0gc2lnbmFsW2ldO1xuXG4gICAgLypcbiAgICAvLyBDb25zdHJhaW4gYW1wbGl0dWRlXG4gICAgaWYgKCB0aGlzLnNpZ25hbFtpXSA+IDEgKSB7XG4gICAgICB0aGlzLnNpZ25hbFtpXSA9IDE7XG4gICAgfSBlbHNlIGlmICggdGhpcy5zaWduYWxbaV0gPCAtMSApIHtcbiAgICAgIHRoaXMuc2lnbmFsW2ldID0gLTE7XG4gICAgfVxuICAgICovXG4gIH1cbiAgcmV0dXJuIHRoaXMuc2lnbmFsO1xufTtcblxuLy8gQWRkIGFuIGVudmVsb3BlIHRvIHRoZSBvc2NpbGxhdG9yXG5Pc2NpbGxhdG9yLnByb3RvdHlwZS5hZGRFbnZlbG9wZSA9IGZ1bmN0aW9uKGVudmVsb3BlKSB7XG4gIHRoaXMuZW52ZWxvcGUgPSBlbnZlbG9wZTtcbn07XG5cbk9zY2lsbGF0b3IucHJvdG90eXBlLmFwcGx5RW52ZWxvcGUgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5lbnZlbG9wZS5wcm9jZXNzKHRoaXMuc2lnbmFsKTtcbn07XG5cbk9zY2lsbGF0b3IucHJvdG90eXBlLnZhbHVlQXQgPSBmdW5jdGlvbihvZmZzZXQpIHtcbiAgcmV0dXJuIHRoaXMud2F2ZVRhYmxlW29mZnNldCAlIHRoaXMud2F2ZVRhYmxlTGVuZ3RoXTtcbn07XG5cbk9zY2lsbGF0b3IucHJvdG90eXBlLmdlbmVyYXRlID0gZnVuY3Rpb24oKSB7XG4gIHZhciBmcmFtZU9mZnNldCA9IHRoaXMuZnJhbWVDb3VudCAqIHRoaXMuYnVmZmVyU2l6ZTtcbiAgdmFyIHN0ZXAgPSB0aGlzLndhdmVUYWJsZUxlbmd0aCAqIHRoaXMuZnJlcXVlbmN5IC8gdGhpcy5zYW1wbGVSYXRlO1xuICB2YXIgb2Zmc2V0O1xuXG4gIGZvciAoIHZhciBpID0gMDsgaSA8IHRoaXMuYnVmZmVyU2l6ZTsgaSsrICkge1xuICAgIC8vdmFyIHN0ZXAgPSAoZnJhbWVPZmZzZXQgKyBpKSAqIHRoaXMuY3ljbGVzUGVyU2FtcGxlICUgMTtcbiAgICAvL3RoaXMuc2lnbmFsW2ldID0gdGhpcy5mdW5jKHN0ZXApICogdGhpcy5hbXBsaXR1ZGU7XG4gICAgLy90aGlzLnNpZ25hbFtpXSA9IHRoaXMudmFsdWVBdChNYXRoLnJvdW5kKChmcmFtZU9mZnNldCArIGkpICogc3RlcCkpICogdGhpcy5hbXBsaXR1ZGU7XG4gICAgb2Zmc2V0ID0gTWF0aC5yb3VuZCgoZnJhbWVPZmZzZXQgKyBpKSAqIHN0ZXApO1xuICAgIHRoaXMuc2lnbmFsW2ldID0gdGhpcy53YXZlVGFibGVbb2Zmc2V0ICUgdGhpcy53YXZlVGFibGVMZW5ndGhdICogdGhpcy5hbXBsaXR1ZGU7XG4gIH1cblxuICB0aGlzLmZyYW1lQ291bnQrKztcblxuICByZXR1cm4gdGhpcy5zaWduYWw7XG59O1xuXG5Pc2NpbGxhdG9yLlNpbmUgPSBmdW5jdGlvbihzdGVwKSB7XG4gIHJldHVybiBNYXRoLnNpbihEU1AuVFdPX1BJICogc3RlcCk7XG59O1xuXG5Pc2NpbGxhdG9yLlNxdWFyZSA9IGZ1bmN0aW9uKHN0ZXApIHtcbiAgcmV0dXJuIHN0ZXAgPCAwLjUgPyAxIDogLTE7XG59O1xuXG5Pc2NpbGxhdG9yLlNhdyA9IGZ1bmN0aW9uKHN0ZXApIHtcbiAgcmV0dXJuIDIgKiAoc3RlcCAtIE1hdGgucm91bmQoc3RlcCkpO1xufTtcblxuT3NjaWxsYXRvci5UcmlhbmdsZSA9IGZ1bmN0aW9uKHN0ZXApIHtcbiAgcmV0dXJuIDEgLSA0ICogTWF0aC5hYnMoTWF0aC5yb3VuZChzdGVwKSAtIHN0ZXApO1xufTtcblxuT3NjaWxsYXRvci5QdWxzZSA9IGZ1bmN0aW9uKHN0ZXApIHtcbiAgLy8gc3R1YlxufTtcblxuZnVuY3Rpb24gQURTUihhdHRhY2tMZW5ndGgsIGRlY2F5TGVuZ3RoLCBzdXN0YWluTGV2ZWwsIHN1c3RhaW5MZW5ndGgsIHJlbGVhc2VMZW5ndGgsIHNhbXBsZVJhdGUpIHtcbiAgdGhpcy5zYW1wbGVSYXRlID0gc2FtcGxlUmF0ZTtcbiAgLy8gTGVuZ3RoIGluIHNlY29uZHNcbiAgdGhpcy5hdHRhY2tMZW5ndGggID0gYXR0YWNrTGVuZ3RoO1xuICB0aGlzLmRlY2F5TGVuZ3RoICAgPSBkZWNheUxlbmd0aDtcbiAgdGhpcy5zdXN0YWluTGV2ZWwgID0gc3VzdGFpbkxldmVsO1xuICB0aGlzLnN1c3RhaW5MZW5ndGggPSBzdXN0YWluTGVuZ3RoO1xuICB0aGlzLnJlbGVhc2VMZW5ndGggPSByZWxlYXNlTGVuZ3RoO1xuICB0aGlzLnNhbXBsZVJhdGUgICAgPSBzYW1wbGVSYXRlO1xuXG4gIC8vIExlbmd0aCBpbiBzYW1wbGVzXG4gIHRoaXMuYXR0YWNrU2FtcGxlcyAgPSBhdHRhY2tMZW5ndGggICogc2FtcGxlUmF0ZTtcbiAgdGhpcy5kZWNheVNhbXBsZXMgICA9IGRlY2F5TGVuZ3RoICAgKiBzYW1wbGVSYXRlO1xuICB0aGlzLnN1c3RhaW5TYW1wbGVzID0gc3VzdGFpbkxlbmd0aCAqIHNhbXBsZVJhdGU7XG4gIHRoaXMucmVsZWFzZVNhbXBsZXMgPSByZWxlYXNlTGVuZ3RoICogc2FtcGxlUmF0ZTtcblxuICAvLyBVcGRhdGVzIHRoZSBlbnZlbG9wZSBzYW1wbGUgcG9zaXRpb25zXG4gIHRoaXMudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5hdHRhY2sgICAgICAgICA9ICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNrU2FtcGxlcztcbiAgICB0aGlzLmRlY2F5ICAgICAgICAgID0gdGhpcy5hdHRhY2sgICsgdGhpcy5kZWNheVNhbXBsZXM7XG4gICAgdGhpcy5zdXN0YWluICAgICAgICA9IHRoaXMuZGVjYXkgICArIHRoaXMuc3VzdGFpblNhbXBsZXM7XG4gICAgdGhpcy5yZWxlYXNlICAgICAgICA9IHRoaXMuc3VzdGFpbiArIHRoaXMucmVsZWFzZVNhbXBsZXM7XG4gIH07XG5cbiAgdGhpcy51cGRhdGUoKTtcblxuICB0aGlzLnNhbXBsZXNQcm9jZXNzZWQgPSAwO1xufVxuXG5BRFNSLnByb3RvdHlwZS5ub3RlT24gPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5zYW1wbGVzUHJvY2Vzc2VkID0gMDtcbiAgdGhpcy5zdXN0YWluU2FtcGxlcyA9IHRoaXMuc3VzdGFpbkxlbmd0aCAqIHRoaXMuc2FtcGxlUmF0ZTtcbiAgdGhpcy51cGRhdGUoKTtcbn07XG5cbi8vIFNlbmQgYSBub3RlIG9mZiB3aGVuIHVzaW5nIGEgc3VzdGFpbiBvZiBpbmZpbml0eSB0byBsZXQgdGhlIGVudmVsb3BlIGVudGVyIHRoZSByZWxlYXNlIHBoYXNlXG5BRFNSLnByb3RvdHlwZS5ub3RlT2ZmID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuc3VzdGFpblNhbXBsZXMgPSB0aGlzLnNhbXBsZXNQcm9jZXNzZWQgLSB0aGlzLmRlY2F5U2FtcGxlcztcbiAgdGhpcy51cGRhdGUoKTtcbn07XG5cbkFEU1IucHJvdG90eXBlLnByb2Nlc3NTYW1wbGUgPSBmdW5jdGlvbihzYW1wbGUpIHtcbiAgdmFyIGFtcGxpdHVkZSA9IDA7XG5cbiAgaWYgKCB0aGlzLnNhbXBsZXNQcm9jZXNzZWQgPD0gdGhpcy5hdHRhY2sgKSB7XG4gICAgYW1wbGl0dWRlID0gMCArICgxIC0gMCkgKiAoKHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCAtIDApIC8gKHRoaXMuYXR0YWNrIC0gMCkpO1xuICB9IGVsc2UgaWYgKCB0aGlzLnNhbXBsZXNQcm9jZXNzZWQgPiB0aGlzLmF0dGFjayAmJiB0aGlzLnNhbXBsZXNQcm9jZXNzZWQgPD0gdGhpcy5kZWNheSApIHtcbiAgICBhbXBsaXR1ZGUgPSAxICsgKHRoaXMuc3VzdGFpbkxldmVsIC0gMSkgKiAoKHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCAtIHRoaXMuYXR0YWNrKSAvICh0aGlzLmRlY2F5IC0gdGhpcy5hdHRhY2spKTtcbiAgfSBlbHNlIGlmICggdGhpcy5zYW1wbGVzUHJvY2Vzc2VkID4gdGhpcy5kZWNheSAmJiB0aGlzLnNhbXBsZXNQcm9jZXNzZWQgPD0gdGhpcy5zdXN0YWluICkge1xuICAgIGFtcGxpdHVkZSA9IHRoaXMuc3VzdGFpbkxldmVsO1xuICB9IGVsc2UgaWYgKCB0aGlzLnNhbXBsZXNQcm9jZXNzZWQgPiB0aGlzLnN1c3RhaW4gJiYgdGhpcy5zYW1wbGVzUHJvY2Vzc2VkIDw9IHRoaXMucmVsZWFzZSApIHtcbiAgICBhbXBsaXR1ZGUgPSB0aGlzLnN1c3RhaW5MZXZlbCArICgwIC0gdGhpcy5zdXN0YWluTGV2ZWwpICogKCh0aGlzLnNhbXBsZXNQcm9jZXNzZWQgLSB0aGlzLnN1c3RhaW4pIC8gKHRoaXMucmVsZWFzZSAtIHRoaXMuc3VzdGFpbikpO1xuICB9XG5cbiAgcmV0dXJuIHNhbXBsZSAqIGFtcGxpdHVkZTtcbn07XG5cbkFEU1IucHJvdG90eXBlLnZhbHVlID0gZnVuY3Rpb24oKSB7XG4gIHZhciBhbXBsaXR1ZGUgPSAwO1xuXG4gIGlmICggdGhpcy5zYW1wbGVzUHJvY2Vzc2VkIDw9IHRoaXMuYXR0YWNrICkge1xuICAgIGFtcGxpdHVkZSA9IDAgKyAoMSAtIDApICogKCh0aGlzLnNhbXBsZXNQcm9jZXNzZWQgLSAwKSAvICh0aGlzLmF0dGFjayAtIDApKTtcbiAgfSBlbHNlIGlmICggdGhpcy5zYW1wbGVzUHJvY2Vzc2VkID4gdGhpcy5hdHRhY2sgJiYgdGhpcy5zYW1wbGVzUHJvY2Vzc2VkIDw9IHRoaXMuZGVjYXkgKSB7XG4gICAgYW1wbGl0dWRlID0gMSArICh0aGlzLnN1c3RhaW5MZXZlbCAtIDEpICogKCh0aGlzLnNhbXBsZXNQcm9jZXNzZWQgLSB0aGlzLmF0dGFjaykgLyAodGhpcy5kZWNheSAtIHRoaXMuYXR0YWNrKSk7XG4gIH0gZWxzZSBpZiAoIHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCA+IHRoaXMuZGVjYXkgJiYgdGhpcy5zYW1wbGVzUHJvY2Vzc2VkIDw9IHRoaXMuc3VzdGFpbiApIHtcbiAgICBhbXBsaXR1ZGUgPSB0aGlzLnN1c3RhaW5MZXZlbDtcbiAgfSBlbHNlIGlmICggdGhpcy5zYW1wbGVzUHJvY2Vzc2VkID4gdGhpcy5zdXN0YWluICYmIHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCA8PSB0aGlzLnJlbGVhc2UgKSB7XG4gICAgYW1wbGl0dWRlID0gdGhpcy5zdXN0YWluTGV2ZWwgKyAoMCAtIHRoaXMuc3VzdGFpbkxldmVsKSAqICgodGhpcy5zYW1wbGVzUHJvY2Vzc2VkIC0gdGhpcy5zdXN0YWluKSAvICh0aGlzLnJlbGVhc2UgLSB0aGlzLnN1c3RhaW4pKTtcbiAgfVxuXG4gIHJldHVybiBhbXBsaXR1ZGU7XG59O1xuXG5BRFNSLnByb3RvdHlwZS5wcm9jZXNzID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gIGZvciAoIHZhciBpID0gMDsgaSA8IGJ1ZmZlci5sZW5ndGg7IGkrKyApIHtcbiAgICBidWZmZXJbaV0gKj0gdGhpcy52YWx1ZSgpO1xuXG4gICAgdGhpcy5zYW1wbGVzUHJvY2Vzc2VkKys7XG4gIH1cblxuICByZXR1cm4gYnVmZmVyO1xufTtcblxuXG5BRFNSLnByb3RvdHlwZS5pc0FjdGl2ZSA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCA+IHRoaXMucmVsZWFzZSB8fCB0aGlzLnNhbXBsZXNQcm9jZXNzZWQgPT09IC0xICkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufTtcblxuQURTUi5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnNhbXBsZXNQcm9jZXNzZWQgPSAtMTtcbn07XG5cbmZ1bmN0aW9uIElJUkZpbHRlcih0eXBlLCBjdXRvZmYsIHJlc29uYW5jZSwgc2FtcGxlUmF0ZSkge1xuICB0aGlzLnNhbXBsZVJhdGUgPSBzYW1wbGVSYXRlO1xuXG4gIHN3aXRjaCh0eXBlKSB7XG4gICAgY2FzZSBEU1AuTE9XUEFTUzpcbiAgICBjYXNlIERTUC5MUDEyOlxuICAgICAgdGhpcy5mdW5jID0gbmV3IElJUkZpbHRlci5MUDEyKGN1dG9mZiwgcmVzb25hbmNlLCBzYW1wbGVSYXRlKTtcbiAgICAgIGJyZWFrO1xuICB9XG59XG5cbklJUkZpbHRlci5wcm90b3R5cGUuX19kZWZpbmVHZXR0ZXJfXygnY3V0b2ZmJyxcbiAgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZnVuYy5jdXRvZmY7XG4gIH1cbik7XG5cbklJUkZpbHRlci5wcm90b3R5cGUuX19kZWZpbmVHZXR0ZXJfXygncmVzb25hbmNlJyxcbiAgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZnVuYy5yZXNvbmFuY2U7XG4gIH1cbik7XG5cbklJUkZpbHRlci5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24oY3V0b2ZmLCByZXNvbmFuY2UpIHtcbiAgdGhpcy5mdW5jLmNhbGNDb2VmZihjdXRvZmYsIHJlc29uYW5jZSk7XG59O1xuXG5JSVJGaWx0ZXIucHJvdG90eXBlLnByb2Nlc3MgPSBmdW5jdGlvbihidWZmZXIpIHtcbiAgdGhpcy5mdW5jLnByb2Nlc3MoYnVmZmVyKTtcbn07XG5cbi8vIEFkZCBhbiBlbnZlbG9wZSB0byB0aGUgZmlsdGVyXG5JSVJGaWx0ZXIucHJvdG90eXBlLmFkZEVudmVsb3BlID0gZnVuY3Rpb24oZW52ZWxvcGUpIHtcbiAgaWYgKCBlbnZlbG9wZSBpbnN0YW5jZW9mIEFEU1IgKSB7XG4gICAgdGhpcy5mdW5jLmFkZEVudmVsb3BlKGVudmVsb3BlKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBcIk5vdCBhbiBlbnZlbG9wZS5cIjtcbiAgfVxufTtcblxuSUlSRmlsdGVyLkxQMTIgPSBmdW5jdGlvbihjdXRvZmYsIHJlc29uYW5jZSwgc2FtcGxlUmF0ZSkge1xuICB0aGlzLnNhbXBsZVJhdGUgPSBzYW1wbGVSYXRlO1xuICB0aGlzLnZpYnJhUG9zICAgPSAwO1xuICB0aGlzLnZpYnJhU3BlZWQgPSAwO1xuICB0aGlzLmVudmVsb3BlID0gZmFsc2U7XG5cbiAgdGhpcy5jYWxjQ29lZmYgPSBmdW5jdGlvbihjdXRvZmYsIHJlc29uYW5jZSkge1xuICAgIHRoaXMudyA9IDIuMCAqIE1hdGguUEkgKiBjdXRvZmYgLyB0aGlzLnNhbXBsZVJhdGU7XG4gICAgdGhpcy5xID0gMS4wIC0gdGhpcy53IC8gKDIuMCAqIChyZXNvbmFuY2UgKyAwLjUgLyAoMS4wICsgdGhpcy53KSkgKyB0aGlzLncgLSAyLjApO1xuICAgIHRoaXMuciA9IHRoaXMucSAqIHRoaXMucTtcbiAgICB0aGlzLmMgPSB0aGlzLnIgKyAxLjAgLSAyLjAgKiBNYXRoLmNvcyh0aGlzLncpICogdGhpcy5xO1xuXG4gICAgdGhpcy5jdXRvZmYgPSBjdXRvZmY7XG4gICAgdGhpcy5yZXNvbmFuY2UgPSByZXNvbmFuY2U7XG4gIH07XG5cbiAgdGhpcy5jYWxjQ29lZmYoY3V0b2ZmLCByZXNvbmFuY2UpO1xuXG4gIHRoaXMucHJvY2VzcyA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgIGZvciAoIHZhciBpID0gMDsgaSA8IGJ1ZmZlci5sZW5ndGg7IGkrKyApIHtcbiAgICAgIHRoaXMudmlicmFTcGVlZCArPSAoYnVmZmVyW2ldIC0gdGhpcy52aWJyYVBvcykgKiB0aGlzLmM7XG4gICAgICB0aGlzLnZpYnJhUG9zICAgKz0gdGhpcy52aWJyYVNwZWVkO1xuICAgICAgdGhpcy52aWJyYVNwZWVkICo9IHRoaXMucjtcblxuICAgICAgLypcbiAgICAgIHZhciB0ZW1wID0gdGhpcy52aWJyYVBvcztcblxuICAgICAgaWYgKCB0ZW1wID4gMS4wICkge1xuICAgICAgICB0ZW1wID0gMS4wO1xuICAgICAgfSBlbHNlIGlmICggdGVtcCA8IC0xLjAgKSB7XG4gICAgICAgIHRlbXAgPSAtMS4wO1xuICAgICAgfSBlbHNlIGlmICggdGVtcCAhPSB0ZW1wICkge1xuICAgICAgICB0ZW1wID0gMTtcbiAgICAgIH1cblxuICAgICAgYnVmZmVyW2ldID0gdGVtcDtcbiAgICAgICovXG5cbiAgICAgIGlmICh0aGlzLmVudmVsb3BlKSB7XG4gICAgICAgIGJ1ZmZlcltpXSA9IChidWZmZXJbaV0gKiAoMSAtIHRoaXMuZW52ZWxvcGUudmFsdWUoKSkpICsgKHRoaXMudmlicmFQb3MgKiB0aGlzLmVudmVsb3BlLnZhbHVlKCkpO1xuICAgICAgICB0aGlzLmVudmVsb3BlLnNhbXBsZXNQcm9jZXNzZWQrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJ1ZmZlcltpXSA9IHRoaXMudmlicmFQb3M7XG4gICAgICB9XG4gICAgfVxuICB9O1xufTtcblxuSUlSRmlsdGVyLkxQMTIucHJvdG90eXBlLmFkZEVudmVsb3BlID0gZnVuY3Rpb24oZW52ZWxvcGUpIHtcbiAgdGhpcy5lbnZlbG9wZSA9IGVudmVsb3BlO1xufTtcblxuZnVuY3Rpb24gSUlSRmlsdGVyMih0eXBlLCBjdXRvZmYsIHJlc29uYW5jZSwgc2FtcGxlUmF0ZSkge1xuICB0aGlzLnR5cGUgPSB0eXBlO1xuICB0aGlzLmN1dG9mZiA9IGN1dG9mZjtcbiAgdGhpcy5yZXNvbmFuY2UgPSByZXNvbmFuY2U7XG4gIHRoaXMuc2FtcGxlUmF0ZSA9IHNhbXBsZVJhdGU7XG5cbiAgdGhpcy5mID0gRmxvYXQzMkFycmF5KDQpO1xuICB0aGlzLmZbMF0gPSAwLjA7IC8vIGxwXG4gIHRoaXMuZlsxXSA9IDAuMDsgLy8gaHBcbiAgdGhpcy5mWzJdID0gMC4wOyAvLyBicFxuICB0aGlzLmZbM10gPSAwLjA7IC8vIGJyXG5cbiAgdGhpcy5jYWxjQ29lZmYgPSBmdW5jdGlvbihjdXRvZmYsIHJlc29uYW5jZSkge1xuICAgIHRoaXMuZnJlcSA9IDIgKiBNYXRoLnNpbihNYXRoLlBJICogTWF0aC5taW4oMC4yNSwgY3V0b2ZmLyh0aGlzLnNhbXBsZVJhdGUqMikpKTtcbiAgICB0aGlzLmRhbXAgPSBNYXRoLm1pbigyICogKDEgLSBNYXRoLnBvdyhyZXNvbmFuY2UsIDAuMjUpKSwgTWF0aC5taW4oMiwgMi90aGlzLmZyZXEgLSB0aGlzLmZyZXEgKiAwLjUpKTtcbiAgfTtcblxuICB0aGlzLmNhbGNDb2VmZihjdXRvZmYsIHJlc29uYW5jZSk7XG59XG5cbklJUkZpbHRlcjIucHJvdG90eXBlLnByb2Nlc3MgPSBmdW5jdGlvbihidWZmZXIpIHtcbiAgdmFyIGlucHV0LCBvdXRwdXQ7XG4gIHZhciBmID0gdGhpcy5mO1xuXG4gIGZvciAoIHZhciBpID0gMDsgaSA8IGJ1ZmZlci5sZW5ndGg7IGkrKyApIHtcbiAgICBpbnB1dCA9IGJ1ZmZlcltpXTtcblxuICAgIC8vIGZpcnN0IHBhc3NcbiAgICBmWzNdID0gaW5wdXQgLSB0aGlzLmRhbXAgKiBmWzJdO1xuICAgIGZbMF0gPSBmWzBdICsgdGhpcy5mcmVxICogZlsyXTtcbiAgICBmWzFdID0gZlszXSAtIGZbMF07XG4gICAgZlsyXSA9IHRoaXMuZnJlcSAqIGZbMV0gKyBmWzJdO1xuICAgIG91dHB1dCA9IDAuNSAqIGZbdGhpcy50eXBlXTtcblxuICAgIC8vIHNlY29uZCBwYXNzXG4gICAgZlszXSA9IGlucHV0IC0gdGhpcy5kYW1wICogZlsyXTtcbiAgICBmWzBdID0gZlswXSArIHRoaXMuZnJlcSAqIGZbMl07XG4gICAgZlsxXSA9IGZbM10gLSBmWzBdO1xuICAgIGZbMl0gPSB0aGlzLmZyZXEgKiBmWzFdICsgZlsyXTtcbiAgICBvdXRwdXQgKz0gMC41ICogZlt0aGlzLnR5cGVdO1xuXG4gICAgaWYgKHRoaXMuZW52ZWxvcGUpIHtcbiAgICAgIGJ1ZmZlcltpXSA9IChidWZmZXJbaV0gKiAoMSAtIHRoaXMuZW52ZWxvcGUudmFsdWUoKSkpICsgKG91dHB1dCAqIHRoaXMuZW52ZWxvcGUudmFsdWUoKSk7XG4gICAgICB0aGlzLmVudmVsb3BlLnNhbXBsZXNQcm9jZXNzZWQrKztcbiAgICB9IGVsc2Uge1xuICAgICAgYnVmZmVyW2ldID0gb3V0cHV0O1xuICAgIH1cbiAgfVxufTtcblxuSUlSRmlsdGVyMi5wcm90b3R5cGUuYWRkRW52ZWxvcGUgPSBmdW5jdGlvbihlbnZlbG9wZSkge1xuICBpZiAoIGVudmVsb3BlIGluc3RhbmNlb2YgQURTUiApIHtcbiAgICB0aGlzLmVudmVsb3BlID0gZW52ZWxvcGU7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgXCJUaGlzIGlzIG5vdCBhbiBlbnZlbG9wZS5cIjtcbiAgfVxufTtcblxuSUlSRmlsdGVyMi5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24oY3V0b2ZmLCByZXNvbmFuY2UpIHtcbiAgdGhpcy5jYWxjQ29lZmYoY3V0b2ZmLCByZXNvbmFuY2UpO1xufTtcblxuXG5cbmZ1bmN0aW9uIFdpbmRvd0Z1bmN0aW9uKHR5cGUsIGFscGhhKSB7XG4gIHRoaXMuYWxwaGEgPSBhbHBoYTtcblxuICBzd2l0Y2godHlwZSkge1xuICAgIGNhc2UgRFNQLkJBUlRMRVRUOlxuICAgICAgdGhpcy5mdW5jID0gV2luZG93RnVuY3Rpb24uQmFydGxldHQ7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgRFNQLkJBUlRMRVRUSEFOTjpcbiAgICAgIHRoaXMuZnVuYyA9IFdpbmRvd0Z1bmN0aW9uLkJhcnRsZXR0SGFubjtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBEU1AuQkxBQ0tNQU46XG4gICAgICB0aGlzLmZ1bmMgPSBXaW5kb3dGdW5jdGlvbi5CbGFja21hbjtcbiAgICAgIHRoaXMuYWxwaGEgPSB0aGlzLmFscGhhIHx8IDAuMTY7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgRFNQLkNPU0lORTpcbiAgICAgIHRoaXMuZnVuYyA9IFdpbmRvd0Z1bmN0aW9uLkNvc2luZTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBEU1AuR0FVU1M6XG4gICAgICB0aGlzLmZ1bmMgPSBXaW5kb3dGdW5jdGlvbi5HYXVzcztcbiAgICAgIHRoaXMuYWxwaGEgPSB0aGlzLmFscGhhIHx8IDAuMjU7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgRFNQLkhBTU1JTkc6XG4gICAgICB0aGlzLmZ1bmMgPSBXaW5kb3dGdW5jdGlvbi5IYW1taW5nO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIERTUC5IQU5OOlxuICAgICAgdGhpcy5mdW5jID0gV2luZG93RnVuY3Rpb24uSGFubjtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBEU1AuTEFOQ1pPUzpcbiAgICAgIHRoaXMuZnVuYyA9IFdpbmRvd0Z1bmN0aW9uLkxhbmN6b3o7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgRFNQLlJFQ1RBTkdVTEFSOlxuICAgICAgdGhpcy5mdW5jID0gV2luZG93RnVuY3Rpb24uUmVjdGFuZ3VsYXI7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgRFNQLlRSSUFOR1VMQVI6XG4gICAgICB0aGlzLmZ1bmMgPSBXaW5kb3dGdW5jdGlvbi5Ucmlhbmd1bGFyO1xuICAgICAgYnJlYWs7XG4gIH1cbn1cblxuV2luZG93RnVuY3Rpb24ucHJvdG90eXBlLnByb2Nlc3MgPSBmdW5jdGlvbihidWZmZXIpIHtcbiAgdmFyIGxlbmd0aCA9IGJ1ZmZlci5sZW5ndGg7XG4gIGZvciAoIHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrICkge1xuICAgIGJ1ZmZlcltpXSAqPSB0aGlzLmZ1bmMobGVuZ3RoLCBpLCB0aGlzLmFscGhhKTtcbiAgfVxuICByZXR1cm4gYnVmZmVyO1xufTtcblxuV2luZG93RnVuY3Rpb24uQmFydGxldHQgPSBmdW5jdGlvbihsZW5ndGgsIGluZGV4KSB7XG4gIHJldHVybiAyIC8gKGxlbmd0aCAtIDEpICogKChsZW5ndGggLSAxKSAvIDIgLSBNYXRoLmFicyhpbmRleCAtIChsZW5ndGggLSAxKSAvIDIpKTtcbn07XG5cbldpbmRvd0Z1bmN0aW9uLkJhcnRsZXR0SGFubiA9IGZ1bmN0aW9uKGxlbmd0aCwgaW5kZXgpIHtcbiAgcmV0dXJuIDAuNjIgLSAwLjQ4ICogTWF0aC5hYnMoaW5kZXggLyAobGVuZ3RoIC0gMSkgLSAwLjUpIC0gMC4zOCAqIE1hdGguY29zKERTUC5UV09fUEkgKiBpbmRleCAvIChsZW5ndGggLSAxKSk7XG59O1xuXG5XaW5kb3dGdW5jdGlvbi5CbGFja21hbiA9IGZ1bmN0aW9uKGxlbmd0aCwgaW5kZXgsIGFscGhhKSB7XG4gIHZhciBhMCA9ICgxIC0gYWxwaGEpIC8gMjtcbiAgdmFyIGExID0gMC41O1xuICB2YXIgYTIgPSBhbHBoYSAvIDI7XG5cbiAgcmV0dXJuIGEwIC0gYTEgKiBNYXRoLmNvcyhEU1AuVFdPX1BJICogaW5kZXggLyAobGVuZ3RoIC0gMSkpICsgYTIgKiBNYXRoLmNvcyg0ICogTWF0aC5QSSAqIGluZGV4IC8gKGxlbmd0aCAtIDEpKTtcbn07XG5cbldpbmRvd0Z1bmN0aW9uLkNvc2luZSA9IGZ1bmN0aW9uKGxlbmd0aCwgaW5kZXgpIHtcbiAgcmV0dXJuIE1hdGguY29zKE1hdGguUEkgKiBpbmRleCAvIChsZW5ndGggLSAxKSAtIE1hdGguUEkgLyAyKTtcbn07XG5cbldpbmRvd0Z1bmN0aW9uLkdhdXNzID0gZnVuY3Rpb24obGVuZ3RoLCBpbmRleCwgYWxwaGEpIHtcbiAgcmV0dXJuIE1hdGgucG93KE1hdGguRSwgLTAuNSAqIE1hdGgucG93KChpbmRleCAtIChsZW5ndGggLSAxKSAvIDIpIC8gKGFscGhhICogKGxlbmd0aCAtIDEpIC8gMiksIDIpKTtcbn07XG5cbldpbmRvd0Z1bmN0aW9uLkhhbW1pbmcgPSBmdW5jdGlvbihsZW5ndGgsIGluZGV4KSB7XG4gIHJldHVybiAwLjU0IC0gMC40NiAqIE1hdGguY29zKERTUC5UV09fUEkgKiBpbmRleCAvIChsZW5ndGggLSAxKSk7XG59O1xuXG5XaW5kb3dGdW5jdGlvbi5IYW5uID0gZnVuY3Rpb24obGVuZ3RoLCBpbmRleCkge1xuICByZXR1cm4gMC41ICogKDEgLSBNYXRoLmNvcyhEU1AuVFdPX1BJICogaW5kZXggLyAobGVuZ3RoIC0gMSkpKTtcbn07XG5cbldpbmRvd0Z1bmN0aW9uLkxhbmN6b3MgPSBmdW5jdGlvbihsZW5ndGgsIGluZGV4KSB7XG4gIHZhciB4ID0gMiAqIGluZGV4IC8gKGxlbmd0aCAtIDEpIC0gMTtcbiAgcmV0dXJuIE1hdGguc2luKE1hdGguUEkgKiB4KSAvIChNYXRoLlBJICogeCk7XG59O1xuXG5XaW5kb3dGdW5jdGlvbi5SZWN0YW5ndWxhciA9IGZ1bmN0aW9uKGxlbmd0aCwgaW5kZXgpIHtcbiAgcmV0dXJuIDE7XG59O1xuXG5XaW5kb3dGdW5jdGlvbi5Ucmlhbmd1bGFyID0gZnVuY3Rpb24obGVuZ3RoLCBpbmRleCkge1xuICByZXR1cm4gMiAvIGxlbmd0aCAqIChsZW5ndGggLyAyIC0gTWF0aC5hYnMoaW5kZXggLSAobGVuZ3RoIC0gMSkgLyAyKSk7XG59O1xuXG5mdW5jdGlvbiBzaW5oIChhcmcpIHtcbiAgLy8gUmV0dXJucyB0aGUgaHlwZXJib2xpYyBzaW5lIG9mIHRoZSBudW1iZXIsIGRlZmluZWQgYXMgKGV4cChudW1iZXIpIC0gZXhwKC1udW1iZXIpKS8yXG4gIC8vXG4gIC8vIHZlcnNpb246IDEwMDQuMjMxNFxuICAvLyBkaXNjdXNzIGF0OiBodHRwOi8vcGhwanMub3JnL2Z1bmN0aW9ucy9zaW5oICAgIC8vICsgICBvcmlnaW5hbCBieTogT25ubyBNYXJzbWFuXG4gIC8vICogICAgIGV4YW1wbGUgMTogc2luaCgtMC45ODM0MzMwMzQ4ODI1OTA5KTtcbiAgLy8gKiAgICAgcmV0dXJucyAxOiAtMS4xNDk3OTcxNDAyNjM2NTAyXG4gIHJldHVybiAoTWF0aC5leHAoYXJnKSAtIE1hdGguZXhwKC1hcmcpKS8yO1xufVxuXG4vKlxuICogIEJpcXVhZCBmaWx0ZXJcbiAqXG4gKiAgQ3JlYXRlZCBieSBSaWNhcmQgTWFyeGVyIDxlbWFpbEByaWNhcmRtYXJ4ZXIuY29tPiBvbiAyMDEwLTA1LTIzLlxuICogIENvcHlyaWdodCAyMDEwIFJpY2FyZCBNYXJ4ZXIuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICovXG4vLyBJbXBsZW1lbnRhdGlvbiBiYXNlZCBvbjpcbi8vIGh0dHA6Ly93d3cubXVzaWNkc3Aub3JnL2ZpbGVzL0F1ZGlvLUVRLUNvb2tib29rLnR4dFxuZnVuY3Rpb24gQmlxdWFkKHR5cGUsIHNhbXBsZVJhdGUpIHtcbiAgdGhpcy5GcyA9IHNhbXBsZVJhdGU7XG4gIHRoaXMudHlwZSA9IHR5cGU7ICAvLyB0eXBlIG9mIHRoZSBmaWx0ZXJcbiAgdGhpcy5wYXJhbWV0ZXJUeXBlID0gRFNQLlE7IC8vIHR5cGUgb2YgdGhlIHBhcmFtZXRlclxuXG4gIHRoaXMueF8xX2wgPSAwO1xuICB0aGlzLnhfMl9sID0gMDtcbiAgdGhpcy55XzFfbCA9IDA7XG4gIHRoaXMueV8yX2wgPSAwO1xuXG4gIHRoaXMueF8xX3IgPSAwO1xuICB0aGlzLnhfMl9yID0gMDtcbiAgdGhpcy55XzFfciA9IDA7XG4gIHRoaXMueV8yX3IgPSAwO1xuXG4gIHRoaXMuYjAgPSAxO1xuICB0aGlzLmEwID0gMTtcblxuICB0aGlzLmIxID0gMDtcbiAgdGhpcy5hMSA9IDA7XG5cbiAgdGhpcy5iMiA9IDA7XG4gIHRoaXMuYTIgPSAwO1xuXG4gIHRoaXMuYjBhMCA9IHRoaXMuYjAgLyB0aGlzLmEwO1xuICB0aGlzLmIxYTAgPSB0aGlzLmIxIC8gdGhpcy5hMDtcbiAgdGhpcy5iMmEwID0gdGhpcy5iMiAvIHRoaXMuYTA7XG4gIHRoaXMuYTFhMCA9IHRoaXMuYTEgLyB0aGlzLmEwO1xuICB0aGlzLmEyYTAgPSB0aGlzLmEyIC8gdGhpcy5hMDtcblxuICB0aGlzLmYwID0gMzAwMDsgICAvLyBcIndoZXJldmVyIGl0J3MgaGFwcGVuaW4nLCBtYW4uXCIgIENlbnRlciBGcmVxdWVuY3kgb3JcbiAgICAgICAgICAgICAgICAgICAgLy8gQ29ybmVyIEZyZXF1ZW5jeSwgb3Igc2hlbGYgbWlkcG9pbnQgZnJlcXVlbmN5LCBkZXBlbmRpbmdcbiAgICAgICAgICAgICAgICAgICAgLy8gb24gd2hpY2ggZmlsdGVyIHR5cGUuICBUaGUgXCJzaWduaWZpY2FudCBmcmVxdWVuY3lcIi5cblxuICB0aGlzLmRCZ2FpbiA9IDEyOyAvLyB1c2VkIG9ubHkgZm9yIHBlYWtpbmcgYW5kIHNoZWx2aW5nIGZpbHRlcnNcblxuICB0aGlzLlEgPSAxOyAgICAgICAvLyB0aGUgRUUga2luZCBvZiBkZWZpbml0aW9uLCBleGNlcHQgZm9yIHBlYWtpbmdFUSBpbiB3aGljaCBBKlEgaXNcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGNsYXNzaWMgRUUgUS4gIFRoYXQgYWRqdXN0bWVudCBpbiBkZWZpbml0aW9uIHdhcyBtYWRlIHNvIHRoYXRcbiAgICAgICAgICAgICAgICAgICAgLy8gYSBib29zdCBvZiBOIGRCIGZvbGxvd2VkIGJ5IGEgY3V0IG9mIE4gZEIgZm9yIGlkZW50aWNhbCBRIGFuZFxuICAgICAgICAgICAgICAgICAgICAvLyBmMC9GcyByZXN1bHRzIGluIGEgcHJlY2lzZWx5IGZsYXQgdW5pdHkgZ2FpbiBmaWx0ZXIgb3IgXCJ3aXJlXCIuXG5cbiAgdGhpcy5CVyA9IC0zOyAgICAgLy8gdGhlIGJhbmR3aWR0aCBpbiBvY3RhdmVzIChiZXR3ZWVuIC0zIGRCIGZyZXF1ZW5jaWVzIGZvciBCUEZcbiAgICAgICAgICAgICAgICAgICAgLy8gYW5kIG5vdGNoIG9yIGJldHdlZW4gbWlkcG9pbnQgKGRCZ2Fpbi8yKSBnYWluIGZyZXF1ZW5jaWVzIGZvclxuICAgICAgICAgICAgICAgICAgICAvLyBwZWFraW5nIEVRXG5cbiAgdGhpcy5TID0gMTsgICAgICAgLy8gYSBcInNoZWxmIHNsb3BlXCIgcGFyYW1ldGVyIChmb3Igc2hlbHZpbmcgRVEgb25seSkuICBXaGVuIFMgPSAxLFxuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgc2hlbGYgc2xvcGUgaXMgYXMgc3RlZXAgYXMgaXQgY2FuIGJlIGFuZCByZW1haW4gbW9ub3RvbmljYWxseVxuICAgICAgICAgICAgICAgICAgICAvLyBpbmNyZWFzaW5nIG9yIGRlY3JlYXNpbmcgZ2FpbiB3aXRoIGZyZXF1ZW5jeS4gIFRoZSBzaGVsZiBzbG9wZSwgaW5cbiAgICAgICAgICAgICAgICAgICAgLy8gZEIvb2N0YXZlLCByZW1haW5zIHByb3BvcnRpb25hbCB0byBTIGZvciBhbGwgb3RoZXIgdmFsdWVzIGZvciBhXG4gICAgICAgICAgICAgICAgICAgIC8vIGZpeGVkIGYwL0ZzIGFuZCBkQmdhaW4uXG5cbiAgdGhpcy5jb2VmZmljaWVudHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYiA9IFt0aGlzLmIwLCB0aGlzLmIxLCB0aGlzLmIyXTtcbiAgICB2YXIgYSA9IFt0aGlzLmEwLCB0aGlzLmExLCB0aGlzLmEyXTtcbiAgICByZXR1cm4ge2I6IGIsIGE6YX07XG4gIH07XG5cbiAgdGhpcy5zZXRGaWx0ZXJUeXBlID0gZnVuY3Rpb24odHlwZSkge1xuICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgdGhpcy5yZWNhbGN1bGF0ZUNvZWZmaWNpZW50cygpO1xuICB9O1xuXG4gIHRoaXMuc2V0U2FtcGxlUmF0ZSA9IGZ1bmN0aW9uKHJhdGUpIHtcbiAgICB0aGlzLkZzID0gcmF0ZTtcbiAgICB0aGlzLnJlY2FsY3VsYXRlQ29lZmZpY2llbnRzKCk7XG4gIH07XG5cbiAgdGhpcy5zZXRRID0gZnVuY3Rpb24ocSkge1xuICAgIHRoaXMucGFyYW1ldGVyVHlwZSA9IERTUC5RO1xuICAgIHRoaXMuUSA9IE1hdGgubWF4KE1hdGgubWluKHEsIDExNS4wKSwgMC4wMDEpO1xuICAgIHRoaXMucmVjYWxjdWxhdGVDb2VmZmljaWVudHMoKTtcbiAgfTtcblxuICB0aGlzLnNldEJXID0gZnVuY3Rpb24oYncpIHtcbiAgICB0aGlzLnBhcmFtZXRlclR5cGUgPSBEU1AuQlc7XG4gICAgdGhpcy5CVyA9IGJ3O1xuICAgIHRoaXMucmVjYWxjdWxhdGVDb2VmZmljaWVudHMoKTtcbiAgfTtcblxuICB0aGlzLnNldFMgPSBmdW5jdGlvbihzKSB7XG4gICAgdGhpcy5wYXJhbWV0ZXJUeXBlID0gRFNQLlM7XG4gICAgdGhpcy5TID0gTWF0aC5tYXgoTWF0aC5taW4ocywgNS4wKSwgMC4wMDAxKTtcbiAgICB0aGlzLnJlY2FsY3VsYXRlQ29lZmZpY2llbnRzKCk7XG4gIH07XG5cbiAgdGhpcy5zZXRGMCA9IGZ1bmN0aW9uKGZyZXEpIHtcbiAgICB0aGlzLmYwID0gZnJlcTtcbiAgICB0aGlzLnJlY2FsY3VsYXRlQ29lZmZpY2llbnRzKCk7XG4gIH07XG5cbiAgdGhpcy5zZXREYkdhaW4gPSBmdW5jdGlvbihnKSB7XG4gICAgdGhpcy5kQmdhaW4gPSBnO1xuICAgIHRoaXMucmVjYWxjdWxhdGVDb2VmZmljaWVudHMoKTtcbiAgfTtcblxuICB0aGlzLnJlY2FsY3VsYXRlQ29lZmZpY2llbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIEE7XG4gICAgaWYgKHR5cGUgPT09IERTUC5QRUFLSU5HX0VRIHx8IHR5cGUgPT09IERTUC5MT1dfU0hFTEYgfHwgdHlwZSA9PT0gRFNQLkhJR0hfU0hFTEYgKSB7XG4gICAgICBBID0gTWF0aC5wb3coMTAsICh0aGlzLmRCZ2Fpbi80MCkpOyAgLy8gZm9yIHBlYWtpbmcgYW5kIHNoZWx2aW5nIEVRIGZpbHRlcnMgb25seVxuICAgIH0gZWxzZSB7XG4gICAgICBBICA9IE1hdGguc3FydCggTWF0aC5wb3coMTAsICh0aGlzLmRCZ2Fpbi8yMCkpICk7XG4gICAgfVxuXG4gICAgdmFyIHcwID0gRFNQLlRXT19QSSAqIHRoaXMuZjAgLyB0aGlzLkZzO1xuXG4gICAgdmFyIGNvc3cwID0gTWF0aC5jb3ModzApO1xuICAgIHZhciBzaW53MCA9IE1hdGguc2luKHcwKTtcblxuICAgIHZhciBhbHBoYSA9IDA7XG5cbiAgICBzd2l0Y2ggKHRoaXMucGFyYW1ldGVyVHlwZSkge1xuICAgICAgY2FzZSBEU1AuUTpcbiAgICAgICAgYWxwaGEgPSBzaW53MC8oMip0aGlzLlEpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBEU1AuQlc6XG4gICAgICAgIGFscGhhID0gc2ludzAgKiBzaW5oKCBNYXRoLkxOMi8yICogdGhpcy5CVyAqIHcwL3NpbncwICk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIERTUC5TOlxuICAgICAgICBhbHBoYSA9IHNpbncwLzIgKiBNYXRoLnNxcnQoIChBICsgMS9BKSooMS90aGlzLlMgLSAxKSArIDIgKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICAgIEZZSTogVGhlIHJlbGF0aW9uc2hpcCBiZXR3ZWVuIGJhbmR3aWR0aCBhbmQgUSBpc1xuICAgICAgICAgICAgIDEvUSA9IDIqc2luaChsbigyKS8yKkJXKncwL3Npbih3MCkpICAgICAoZGlnaXRhbCBmaWx0ZXIgdyBCTFQpXG4gICAgICAgIG9yICAgMS9RID0gMipzaW5oKGxuKDIpLzIqQlcpICAgICAgICAgICAgIChhbmFsb2cgZmlsdGVyIHByb3RvdHlwZSlcblxuICAgICAgICBUaGUgcmVsYXRpb25zaGlwIGJldHdlZW4gc2hlbGYgc2xvcGUgYW5kIFEgaXNcbiAgICAgICAgICAgICAxL1EgPSBzcXJ0KChBICsgMS9BKSooMS9TIC0gMSkgKyAyKVxuICAgICovXG5cbiAgICB2YXIgY29lZmY7XG5cbiAgICBzd2l0Y2ggKHRoaXMudHlwZSkge1xuICAgICAgY2FzZSBEU1AuTFBGOiAgICAgICAvLyBIKHMpID0gMSAvIChzXjIgKyBzL1EgKyAxKVxuICAgICAgICB0aGlzLmIwID0gICgxIC0gY29zdzApLzI7XG4gICAgICAgIHRoaXMuYjEgPSAgIDEgLSBjb3N3MDtcbiAgICAgICAgdGhpcy5iMiA9ICAoMSAtIGNvc3cwKS8yO1xuICAgICAgICB0aGlzLmEwID0gICAxICsgYWxwaGE7XG4gICAgICAgIHRoaXMuYTEgPSAgLTIgKiBjb3N3MDtcbiAgICAgICAgdGhpcy5hMiA9ICAgMSAtIGFscGhhO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBEU1AuSFBGOiAgICAgICAvLyBIKHMpID0gc14yIC8gKHNeMiArIHMvUSArIDEpXG4gICAgICAgIHRoaXMuYjAgPSAgKDEgKyBjb3N3MCkvMjtcbiAgICAgICAgdGhpcy5iMSA9IC0oMSArIGNvc3cwKTtcbiAgICAgICAgdGhpcy5iMiA9ICAoMSArIGNvc3cwKS8yO1xuICAgICAgICB0aGlzLmEwID0gICAxICsgYWxwaGE7XG4gICAgICAgIHRoaXMuYTEgPSAgLTIgKiBjb3N3MDtcbiAgICAgICAgdGhpcy5hMiA9ICAgMSAtIGFscGhhO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBEU1AuQlBGX0NPTlNUQU5UX1NLSVJUOiAgICAgICAvLyBIKHMpID0gcyAvIChzXjIgKyBzL1EgKyAxKSAgKGNvbnN0YW50IHNraXJ0IGdhaW4sIHBlYWsgZ2FpbiA9IFEpXG4gICAgICAgIHRoaXMuYjAgPSAgIHNpbncwLzI7XG4gICAgICAgIHRoaXMuYjEgPSAgIDA7XG4gICAgICAgIHRoaXMuYjIgPSAgLXNpbncwLzI7XG4gICAgICAgIHRoaXMuYTAgPSAgIDEgKyBhbHBoYTtcbiAgICAgICAgdGhpcy5hMSA9ICAtMipjb3N3MDtcbiAgICAgICAgdGhpcy5hMiA9ICAgMSAtIGFscGhhO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBEU1AuQlBGX0NPTlNUQU5UX1BFQUs6ICAgICAgIC8vIEgocykgPSAocy9RKSAvIChzXjIgKyBzL1EgKyAxKSAgICAgIChjb25zdGFudCAwIGRCIHBlYWsgZ2FpbilcbiAgICAgICAgdGhpcy5iMCA9ICAgYWxwaGE7XG4gICAgICAgIHRoaXMuYjEgPSAgIDA7XG4gICAgICAgIHRoaXMuYjIgPSAgLWFscGhhO1xuICAgICAgICB0aGlzLmEwID0gICAxICsgYWxwaGE7XG4gICAgICAgIHRoaXMuYTEgPSAgLTIqY29zdzA7XG4gICAgICAgIHRoaXMuYTIgPSAgIDEgLSBhbHBoYTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgRFNQLk5PVENIOiAgICAgLy8gSChzKSA9IChzXjIgKyAxKSAvIChzXjIgKyBzL1EgKyAxKVxuICAgICAgICB0aGlzLmIwID0gICAxO1xuICAgICAgICB0aGlzLmIxID0gIC0yKmNvc3cwO1xuICAgICAgICB0aGlzLmIyID0gICAxO1xuICAgICAgICB0aGlzLmEwID0gICAxICsgYWxwaGE7XG4gICAgICAgIHRoaXMuYTEgPSAgLTIqY29zdzA7XG4gICAgICAgIHRoaXMuYTIgPSAgIDEgLSBhbHBoYTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgRFNQLkFQRjogICAgICAgLy8gSChzKSA9IChzXjIgLSBzL1EgKyAxKSAvIChzXjIgKyBzL1EgKyAxKVxuICAgICAgICB0aGlzLmIwID0gICAxIC0gYWxwaGE7XG4gICAgICAgIHRoaXMuYjEgPSAgLTIqY29zdzA7XG4gICAgICAgIHRoaXMuYjIgPSAgIDEgKyBhbHBoYTtcbiAgICAgICAgdGhpcy5hMCA9ICAgMSArIGFscGhhO1xuICAgICAgICB0aGlzLmExID0gIC0yKmNvc3cwO1xuICAgICAgICB0aGlzLmEyID0gICAxIC0gYWxwaGE7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIERTUC5QRUFLSU5HX0VROiAgLy8gSChzKSA9IChzXjIgKyBzKihBL1EpICsgMSkgLyAoc14yICsgcy8oQSpRKSArIDEpXG4gICAgICAgIHRoaXMuYjAgPSAgIDEgKyBhbHBoYSpBO1xuICAgICAgICB0aGlzLmIxID0gIC0yKmNvc3cwO1xuICAgICAgICB0aGlzLmIyID0gICAxIC0gYWxwaGEqQTtcbiAgICAgICAgdGhpcy5hMCA9ICAgMSArIGFscGhhL0E7XG4gICAgICAgIHRoaXMuYTEgPSAgLTIqY29zdzA7XG4gICAgICAgIHRoaXMuYTIgPSAgIDEgLSBhbHBoYS9BO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBEU1AuTE9XX1NIRUxGOiAgIC8vIEgocykgPSBBICogKHNeMiArIChzcXJ0KEEpL1EpKnMgKyBBKS8oQSpzXjIgKyAoc3FydChBKS9RKSpzICsgMSlcbiAgICAgICAgY29lZmYgPSBzaW53MCAqIE1hdGguc3FydCggKEFeMiArIDEpKigxL3RoaXMuUyAtIDEpICsgMipBICk7XG4gICAgICAgIHRoaXMuYjAgPSAgICBBKigoQSsxKSAtIChBLTEpKmNvc3cwICsgY29lZmYpO1xuICAgICAgICB0aGlzLmIxID0gIDIqQSooKEEtMSkgLSAoQSsxKSpjb3N3MCk7XG4gICAgICAgIHRoaXMuYjIgPSAgICBBKigoQSsxKSAtIChBLTEpKmNvc3cwIC0gY29lZmYpO1xuICAgICAgICB0aGlzLmEwID0gICAgICAgKEErMSkgKyAoQS0xKSpjb3N3MCArIGNvZWZmO1xuICAgICAgICB0aGlzLmExID0gICAtMiooKEEtMSkgKyAoQSsxKSpjb3N3MCk7XG4gICAgICAgIHRoaXMuYTIgPSAgICAgICAoQSsxKSArIChBLTEpKmNvc3cwIC0gY29lZmY7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIERTUC5ISUdIX1NIRUxGOiAgIC8vIEgocykgPSBBICogKEEqc14yICsgKHNxcnQoQSkvUSkqcyArIDEpLyhzXjIgKyAoc3FydChBKS9RKSpzICsgQSlcbiAgICAgICAgY29lZmYgPSBzaW53MCAqIE1hdGguc3FydCggKEFeMiArIDEpKigxL3RoaXMuUyAtIDEpICsgMipBICk7XG4gICAgICAgIHRoaXMuYjAgPSAgICBBKigoQSsxKSArIChBLTEpKmNvc3cwICsgY29lZmYpO1xuICAgICAgICB0aGlzLmIxID0gLTIqQSooKEEtMSkgKyAoQSsxKSpjb3N3MCk7XG4gICAgICAgIHRoaXMuYjIgPSAgICBBKigoQSsxKSArIChBLTEpKmNvc3cwIC0gY29lZmYpO1xuICAgICAgICB0aGlzLmEwID0gICAgICAgKEErMSkgLSAoQS0xKSpjb3N3MCArIGNvZWZmO1xuICAgICAgICB0aGlzLmExID0gICAgMiooKEEtMSkgLSAoQSsxKSpjb3N3MCk7XG4gICAgICAgIHRoaXMuYTIgPSAgICAgICAoQSsxKSAtIChBLTEpKmNvc3cwIC0gY29lZmY7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHRoaXMuYjBhMCA9IHRoaXMuYjAvdGhpcy5hMDtcbiAgICB0aGlzLmIxYTAgPSB0aGlzLmIxL3RoaXMuYTA7XG4gICAgdGhpcy5iMmEwID0gdGhpcy5iMi90aGlzLmEwO1xuICAgIHRoaXMuYTFhMCA9IHRoaXMuYTEvdGhpcy5hMDtcbiAgICB0aGlzLmEyYTAgPSB0aGlzLmEyL3RoaXMuYTA7XG4gIH07XG5cbiAgdGhpcy5wcm9jZXNzID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgICAvL3lbbl0gPSAoYjAvYTApKnhbbl0gKyAoYjEvYTApKnhbbi0xXSArIChiMi9hMCkqeFtuLTJdXG4gICAgICAvLyAgICAgICAtIChhMS9hMCkqeVtuLTFdIC0gKGEyL2EwKSp5W24tMl1cblxuICAgICAgdmFyIGxlbiA9IGJ1ZmZlci5sZW5ndGg7XG4gICAgICB2YXIgb3V0cHV0ID0gbmV3IEZsb2F0MzJBcnJheShsZW4pO1xuXG4gICAgICBmb3IgKCB2YXIgaT0wOyBpPGJ1ZmZlci5sZW5ndGg7IGkrKyApIHtcbiAgICAgICAgb3V0cHV0W2ldID0gdGhpcy5iMGEwKmJ1ZmZlcltpXSArIHRoaXMuYjFhMCp0aGlzLnhfMV9sICsgdGhpcy5iMmEwKnRoaXMueF8yX2wgLSB0aGlzLmExYTAqdGhpcy55XzFfbCAtIHRoaXMuYTJhMCp0aGlzLnlfMl9sO1xuICAgICAgICB0aGlzLnlfMl9sID0gdGhpcy55XzFfbDtcbiAgICAgICAgdGhpcy55XzFfbCA9IG91dHB1dFtpXTtcbiAgICAgICAgdGhpcy54XzJfbCA9IHRoaXMueF8xX2w7XG4gICAgICAgIHRoaXMueF8xX2wgPSBidWZmZXJbaV07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvdXRwdXQ7XG4gIH07XG5cbiAgdGhpcy5wcm9jZXNzU3RlcmVvID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgICAvL3lbbl0gPSAoYjAvYTApKnhbbl0gKyAoYjEvYTApKnhbbi0xXSArIChiMi9hMCkqeFtuLTJdXG4gICAgICAvLyAgICAgICAtIChhMS9hMCkqeVtuLTFdIC0gKGEyL2EwKSp5W24tMl1cblxuICAgICAgdmFyIGxlbiA9IGJ1ZmZlci5sZW5ndGg7XG4gICAgICB2YXIgb3V0cHV0ID0gbmV3IEZsb2F0MzJBcnJheShsZW4pO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbi8yOyBpKyspIHtcbiAgICAgICAgb3V0cHV0WzIqaV0gPSB0aGlzLmIwYTAqYnVmZmVyWzIqaV0gKyB0aGlzLmIxYTAqdGhpcy54XzFfbCArIHRoaXMuYjJhMCp0aGlzLnhfMl9sIC0gdGhpcy5hMWEwKnRoaXMueV8xX2wgLSB0aGlzLmEyYTAqdGhpcy55XzJfbDtcbiAgICAgICAgdGhpcy55XzJfbCA9IHRoaXMueV8xX2w7XG4gICAgICAgIHRoaXMueV8xX2wgPSBvdXRwdXRbMippXTtcbiAgICAgICAgdGhpcy54XzJfbCA9IHRoaXMueF8xX2w7XG4gICAgICAgIHRoaXMueF8xX2wgPSBidWZmZXJbMippXTtcblxuICAgICAgICBvdXRwdXRbMippKzFdID0gdGhpcy5iMGEwKmJ1ZmZlclsyKmkrMV0gKyB0aGlzLmIxYTAqdGhpcy54XzFfciArIHRoaXMuYjJhMCp0aGlzLnhfMl9yIC0gdGhpcy5hMWEwKnRoaXMueV8xX3IgLSB0aGlzLmEyYTAqdGhpcy55XzJfcjtcbiAgICAgICAgdGhpcy55XzJfciA9IHRoaXMueV8xX3I7XG4gICAgICAgIHRoaXMueV8xX3IgPSBvdXRwdXRbMippKzFdO1xuICAgICAgICB0aGlzLnhfMl9yID0gdGhpcy54XzFfcjtcbiAgICAgICAgdGhpcy54XzFfciA9IGJ1ZmZlclsyKmkrMV07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvdXRwdXQ7XG4gIH07XG59XG5cbi8qXG4gKiAgTWFnbml0dWRlIHRvIGRlY2liZWxzXG4gKlxuICogIENyZWF0ZWQgYnkgUmljYXJkIE1hcnhlciA8ZW1haWxAcmljYXJkbWFyeGVyLmNvbT4gb24gMjAxMC0wNS0yMy5cbiAqICBDb3B5cmlnaHQgMjAxMCBSaWNhcmQgTWFyeGVyLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqICBAYnVmZmVyIGFycmF5IG9mIG1hZ25pdHVkZXMgdG8gY29udmVydCB0byBkZWNpYmVsc1xuICpcbiAqICBAcmV0dXJucyB0aGUgYXJyYXkgaW4gZGVjaWJlbHNcbiAqXG4gKi9cbkRTUC5tYWcyZGIgPSBmdW5jdGlvbihidWZmZXIpIHtcbiAgdmFyIG1pbkRiID0gLTEyMDtcbiAgdmFyIG1pbk1hZyA9IE1hdGgucG93KDEwLjAsIG1pbkRiIC8gMjAuMCk7XG5cbiAgdmFyIGxvZyA9IE1hdGgubG9nO1xuICB2YXIgbWF4ID0gTWF0aC5tYXg7XG5cbiAgdmFyIHJlc3VsdCA9IEZsb2F0MzJBcnJheShidWZmZXIubGVuZ3RoKTtcbiAgZm9yICh2YXIgaT0wOyBpPGJ1ZmZlci5sZW5ndGg7IGkrKykge1xuICAgIHJlc3VsdFtpXSA9IDIwLjAqbG9nKG1heChidWZmZXJbaV0sIG1pbk1hZykpO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qXG4gKiAgRnJlcXVlbmN5IHJlc3BvbnNlXG4gKlxuICogIENyZWF0ZWQgYnkgUmljYXJkIE1hcnhlciA8ZW1haWxAcmljYXJkbWFyeGVyLmNvbT4gb24gMjAxMC0wNS0yMy5cbiAqICBDb3B5cmlnaHQgMjAxMCBSaWNhcmQgTWFyeGVyLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqICBDYWxjdWxhdGVzIHRoZSBmcmVxdWVuY3kgcmVzcG9uc2UgYXQgdGhlIGdpdmVuIHBvaW50cy5cbiAqXG4gKiAgQGIgYiBjb2VmZmljaWVudHMgb2YgdGhlIGZpbHRlclxuICogIEBhIGEgY29lZmZpY2llbnRzIG9mIHRoZSBmaWx0ZXJcbiAqICBAdyB3IHBvaW50cyAobm9ybWFsbHkgYmV0d2VlbiAtUEkgYW5kIFBJKSB3aGVyZSB0byBjYWxjdWxhdGUgdGhlIGZyZXF1ZW5jeSByZXNwb25zZVxuICpcbiAqICBAcmV0dXJucyB0aGUgZnJlcXVlbmN5IHJlc3BvbnNlIGluIG1hZ25pdHVkZVxuICpcbiAqL1xuRFNQLmZyZXF6ID0gZnVuY3Rpb24oYiwgYSwgdykge1xuICB2YXIgaSwgajtcblxuICBpZiAoIXcpIHtcbiAgICB3ID0gRmxvYXQzMkFycmF5KDIwMCk7XG4gICAgZm9yIChpPTA7aTx3Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB3W2ldID0gRFNQLlRXT19QSS93Lmxlbmd0aCAqIGkgLSBNYXRoLlBJO1xuICAgIH1cbiAgfVxuXG4gIHZhciByZXN1bHQgPSBGbG9hdDMyQXJyYXkody5sZW5ndGgpO1xuXG4gIHZhciBzcXJ0ID0gTWF0aC5zcXJ0O1xuICB2YXIgY29zID0gTWF0aC5jb3M7XG4gIHZhciBzaW4gPSBNYXRoLnNpbjtcblxuICBmb3IgKGk9MDsgaTx3Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIG51bWVyYXRvciA9IHtyZWFsOjAuMCwgaW1hZzowLjB9O1xuICAgIGZvciAoaj0wOyBqPGIubGVuZ3RoOyBqKyspIHtcbiAgICAgIG51bWVyYXRvci5yZWFsICs9IGJbal0gKiBjb3MoLWoqd1tpXSk7XG4gICAgICBudW1lcmF0b3IuaW1hZyArPSBiW2pdICogc2luKC1qKndbaV0pO1xuICAgIH1cblxuICAgIHZhciBkZW5vbWluYXRvciA9IHtyZWFsOjAuMCwgaW1hZzowLjB9O1xuICAgIGZvciAoaj0wOyBqPGEubGVuZ3RoOyBqKyspIHtcbiAgICAgIGRlbm9taW5hdG9yLnJlYWwgKz0gYVtqXSAqIGNvcygtaip3W2ldKTtcbiAgICAgIGRlbm9taW5hdG9yLmltYWcgKz0gYVtqXSAqIHNpbigtaip3W2ldKTtcbiAgICB9XG5cbiAgICByZXN1bHRbaV0gPSAgc3FydChudW1lcmF0b3IucmVhbCpudW1lcmF0b3IucmVhbCArIG51bWVyYXRvci5pbWFnKm51bWVyYXRvci5pbWFnKSAvIHNxcnQoZGVub21pbmF0b3IucmVhbCpkZW5vbWluYXRvci5yZWFsICsgZGVub21pbmF0b3IuaW1hZypkZW5vbWluYXRvci5pbWFnKTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKlxuICogIEdyYXBoaWNhbCBFcXVhbGl6ZXJcbiAqXG4gKiAgSW1wbGVtZW50YXRpb24gb2YgYSBncmFwaGljIGVxdWFsaXplciB3aXRoIGEgY29uZmlndXJhYmxlIGJhbmRzLXBlci1vY3RhdmVcbiAqICBhbmQgbWluaW11bSBhbmQgbWF4aW11bSBmcmVxdWVuY2llc1xuICpcbiAqICBDcmVhdGVkIGJ5IFJpY2FyZCBNYXJ4ZXIgPGVtYWlsQHJpY2FyZG1hcnhlci5jb20+IG9uIDIwMTAtMDUtMjMuXG4gKiAgQ29weXJpZ2h0IDIwMTAgUmljYXJkIE1hcnhlci4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKi9cbmZ1bmN0aW9uIEdyYXBoaWNhbEVxKHNhbXBsZVJhdGUpIHtcbiAgdGhpcy5GUyA9IHNhbXBsZVJhdGU7XG4gIHRoaXMubWluRnJlcSA9IDQwLjA7XG4gIHRoaXMubWF4RnJlcSA9IDE2MDAwLjA7XG5cbiAgdGhpcy5iYW5kc1Blck9jdGF2ZSA9IDEuMDtcblxuICB0aGlzLmZpbHRlcnMgPSBbXTtcbiAgdGhpcy5mcmVxenMgPSBbXTtcblxuICB0aGlzLmNhbGN1bGF0ZUZyZXF6cyA9IHRydWU7XG5cbiAgdGhpcy5yZWNhbGN1bGF0ZUZpbHRlcnMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYmFuZENvdW50ID0gTWF0aC5yb3VuZChNYXRoLmxvZyh0aGlzLm1heEZyZXEvdGhpcy5taW5GcmVxKSAqIHRoaXMuYmFuZHNQZXJPY3RhdmUvIE1hdGguTE4yKTtcblxuICAgIHRoaXMuZmlsdGVycyA9IFtdO1xuICAgIGZvciAodmFyIGk9MDsgaTxiYW5kQ291bnQ7IGkrKykge1xuICAgICAgdmFyIGZyZXEgPSB0aGlzLm1pbkZyZXEqKE1hdGgucG93KDIsIGkvdGhpcy5iYW5kc1Blck9jdGF2ZSkpO1xuICAgICAgdmFyIG5ld0ZpbHRlciA9IG5ldyBCaXF1YWQoRFNQLlBFQUtJTkdfRVEsIHRoaXMuRlMpO1xuICAgICAgbmV3RmlsdGVyLnNldERiR2FpbigwKTtcbiAgICAgIG5ld0ZpbHRlci5zZXRCVygxL3RoaXMuYmFuZHNQZXJPY3RhdmUpO1xuICAgICAgbmV3RmlsdGVyLnNldEYwKGZyZXEpO1xuICAgICAgdGhpcy5maWx0ZXJzW2ldID0gbmV3RmlsdGVyO1xuICAgICAgdGhpcy5yZWNhbGN1bGF0ZUZyZXF6KGkpO1xuICAgIH1cbiAgfTtcblxuICB0aGlzLnNldE1pbmltdW1GcmVxdWVuY3kgPSBmdW5jdGlvbihmcmVxKSB7XG4gICAgdGhpcy5taW5GcmVxID0gZnJlcTtcbiAgICB0aGlzLnJlY2FsY3VsYXRlRmlsdGVycygpO1xuICB9O1xuXG4gIHRoaXMuc2V0TWF4aW11bUZyZXF1ZW5jeSA9IGZ1bmN0aW9uKGZyZXEpIHtcbiAgICB0aGlzLm1heEZyZXEgPSBmcmVxO1xuICAgIHRoaXMucmVjYWxjdWxhdGVGaWx0ZXJzKCk7XG4gIH07XG5cbiAgdGhpcy5zZXRCYW5kc1Blck9jdGF2ZSA9IGZ1bmN0aW9uKGJhbmRzKSB7XG4gICAgdGhpcy5iYW5kc1Blck9jdGF2ZSA9IGJhbmRzO1xuICAgIHRoaXMucmVjYWxjdWxhdGVGaWx0ZXJzKCk7XG4gIH07XG5cbiAgdGhpcy5zZXRCYW5kR2FpbiA9IGZ1bmN0aW9uKGJhbmRJbmRleCwgZ2Fpbikge1xuICAgIGlmIChiYW5kSW5kZXggPCAwIHx8IGJhbmRJbmRleCA+ICh0aGlzLmZpbHRlcnMubGVuZ3RoLTEpKSB7XG4gICAgICB0aHJvdyBcIlRoZSBiYW5kIGluZGV4IG9mIHRoZSBncmFwaGljYWwgZXF1YWxpemVyIGlzIG91dCBvZiBib3VuZHMuXCI7XG4gICAgfVxuXG4gICAgaWYgKCFnYWluKSB7XG4gICAgICB0aHJvdyBcIkEgZ2FpbiBtdXN0IGJlIHBhc3NlZC5cIjtcbiAgICB9XG5cbiAgICB0aGlzLmZpbHRlcnNbYmFuZEluZGV4XS5zZXREYkdhaW4oZ2Fpbik7XG4gICAgdGhpcy5yZWNhbGN1bGF0ZUZyZXF6KGJhbmRJbmRleCk7XG4gIH07XG5cbiAgdGhpcy5yZWNhbGN1bGF0ZUZyZXF6ID0gZnVuY3Rpb24oYmFuZEluZGV4KSB7XG4gICAgaWYgKCF0aGlzLmNhbGN1bGF0ZUZyZXF6cykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChiYW5kSW5kZXggPCAwIHx8IGJhbmRJbmRleCA+ICh0aGlzLmZpbHRlcnMubGVuZ3RoLTEpKSB7XG4gICAgICB0aHJvdyBcIlRoZSBiYW5kIGluZGV4IG9mIHRoZSBncmFwaGljYWwgZXF1YWxpemVyIGlzIG91dCBvZiBib3VuZHMuIFwiICsgYmFuZEluZGV4ICsgXCIgaXMgb3V0IG9mIFtcIiArIDAgKyBcIiwgXCIgKyB0aGlzLmZpbHRlcnMubGVuZ3RoLTEgKyBcIl1cIjtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMudykge1xuICAgICAgdGhpcy53ID0gRmxvYXQzMkFycmF5KDQwMCk7XG4gICAgICBmb3IgKHZhciBpPTA7IGk8dGhpcy53Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICB0aGlzLndbaV0gPSBNYXRoLlBJL3RoaXMudy5sZW5ndGggKiBpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBiID0gW3RoaXMuZmlsdGVyc1tiYW5kSW5kZXhdLmIwLCB0aGlzLmZpbHRlcnNbYmFuZEluZGV4XS5iMSwgdGhpcy5maWx0ZXJzW2JhbmRJbmRleF0uYjJdO1xuICAgIHZhciBhID0gW3RoaXMuZmlsdGVyc1tiYW5kSW5kZXhdLmEwLCB0aGlzLmZpbHRlcnNbYmFuZEluZGV4XS5hMSwgdGhpcy5maWx0ZXJzW2JhbmRJbmRleF0uYTJdO1xuXG4gICAgdGhpcy5mcmVxenNbYmFuZEluZGV4XSA9IERTUC5tYWcyZGIoRFNQLmZyZXF6KGIsIGEsIHRoaXMudykpO1xuICB9O1xuXG4gIHRoaXMucHJvY2VzcyA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgIHZhciBvdXRwdXQgPSBidWZmZXI7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZmlsdGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgb3V0cHV0ID0gdGhpcy5maWx0ZXJzW2ldLnByb2Nlc3Mob3V0cHV0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3V0cHV0O1xuICB9O1xuXG4gIHRoaXMucHJvY2Vzc1N0ZXJlbyA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgIHZhciBvdXRwdXQgPSBidWZmZXI7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZmlsdGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgb3V0cHV0ID0gdGhpcy5maWx0ZXJzW2ldLnByb2Nlc3NTdGVyZW8ob3V0cHV0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3V0cHV0O1xuICB9O1xufVxuXG4vKipcbiAqIE11bHRpRGVsYXkgZWZmZWN0IGJ5IEFsbWVyIFRoaWUgKGh0dHA6Ly9jb2RlLmFsbWVyb3MuY29tKS5cbiAqIENvcHlyaWdodCAyMDEwIEFsbWVyIFRoaWUuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBFeGFtcGxlOiBodHRwOi8vY29kZS5hbG1lcm9zLmNvbS9jb2RlLWV4YW1wbGVzL2RlbGF5LWZpcmVmb3gtYXVkaW8tYXBpL1xuICpcbiAqIFRoaXMgaXMgYSBkZWxheSB0aGF0IGZlZWRzIGl0J3Mgb3duIGRlbGF5ZWQgc2lnbmFsIGJhY2sgaW50byBpdHMgY2lyY3VsYXJcbiAqIGJ1ZmZlci4gQWxzbyBrbm93biBhcyBhIENvbWJGaWx0ZXIuXG4gKlxuICogQ29tcGF0aWJsZSB3aXRoIGludGVybGVhdmVkIHN0ZXJlbyAob3IgbW9yZSBjaGFubmVsKSBidWZmZXJzIGFuZFxuICogbm9uLWludGVybGVhdmVkIG1vbm8gYnVmZmVycy5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gbWF4RGVsYXlJblNhbXBsZXNTaXplIE1heGltdW0gcG9zc2libGUgZGVsYXkgaW4gc2FtcGxlcyAoc2l6ZSBvZiBjaXJjdWxhciBidWZmZXIpXG4gKiBAcGFyYW0ge051bWJlcn0gZGVsYXlJblNhbXBsZXMgSW5pdGlhbCBkZWxheSBpbiBzYW1wbGVzXG4gKiBAcGFyYW0ge051bWJlcn0gbWFzdGVyVm9sdW1lIEluaXRpYWwgbWFzdGVyIHZvbHVtZS4gRmxvYXQgdmFsdWU6IDAuMCAoc2lsZW5jZSksIDEuMCAobm9ybWFsKSwgPjEuMCAoYW1wbGlmeSlcbiAqIEBwYXJhbSB7TnVtYmVyfSBkZWxheVZvbHVtZSBJbml0aWFsIGZlZWRiYWNrIGRlbGF5IHZvbHVtZS4gRmxvYXQgdmFsdWU6IDAuMCAoc2lsZW5jZSksIDEuMCAobm9ybWFsKSwgPjEuMCAoYW1wbGlmeSlcbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gTXVsdGlEZWxheShtYXhEZWxheUluU2FtcGxlc1NpemUsIGRlbGF5SW5TYW1wbGVzLCBtYXN0ZXJWb2x1bWUsIGRlbGF5Vm9sdW1lKSB7XG4gIHRoaXMuZGVsYXlCdWZmZXJTYW1wbGVzICAgPSBuZXcgRmxvYXQzMkFycmF5KG1heERlbGF5SW5TYW1wbGVzU2l6ZSk7IC8vIFRoZSBtYXhpbXVtIHNpemUgb2YgZGVsYXlcbiAgdGhpcy5kZWxheUlucHV0UG9pbnRlciAgICAgPSBkZWxheUluU2FtcGxlcztcbiAgdGhpcy5kZWxheU91dHB1dFBvaW50ZXIgICA9IDA7XG5cbiAgdGhpcy5kZWxheUluU2FtcGxlcyAgID0gZGVsYXlJblNhbXBsZXM7XG4gIHRoaXMubWFzdGVyVm9sdW1lICAgICA9IG1hc3RlclZvbHVtZTtcbiAgdGhpcy5kZWxheVZvbHVtZSAgICAgPSBkZWxheVZvbHVtZTtcbn1cblxuLyoqXG4gKiBDaGFuZ2UgdGhlIGRlbGF5IHRpbWUgaW4gc2FtcGxlcy5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gZGVsYXlJblNhbXBsZXMgRGVsYXkgaW4gc2FtcGxlc1xuICovXG5NdWx0aURlbGF5LnByb3RvdHlwZS5zZXREZWxheUluU2FtcGxlcyA9IGZ1bmN0aW9uIChkZWxheUluU2FtcGxlcykge1xuICB0aGlzLmRlbGF5SW5TYW1wbGVzID0gZGVsYXlJblNhbXBsZXM7XG5cbiAgdGhpcy5kZWxheUlucHV0UG9pbnRlciA9IHRoaXMuZGVsYXlPdXRwdXRQb2ludGVyICsgZGVsYXlJblNhbXBsZXM7XG5cbiAgaWYgKHRoaXMuZGVsYXlJbnB1dFBvaW50ZXIgPj0gdGhpcy5kZWxheUJ1ZmZlclNhbXBsZXMubGVuZ3RoLTEpIHtcbiAgICB0aGlzLmRlbGF5SW5wdXRQb2ludGVyID0gdGhpcy5kZWxheUlucHV0UG9pbnRlciAtIHRoaXMuZGVsYXlCdWZmZXJTYW1wbGVzLmxlbmd0aDtcbiAgfVxufTtcblxuLyoqXG4gKiBDaGFuZ2UgdGhlIG1hc3RlciB2b2x1bWUuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG1hc3RlclZvbHVtZSBGbG9hdCB2YWx1ZTogMC4wIChzaWxlbmNlKSwgMS4wIChub3JtYWwpLCA+MS4wIChhbXBsaWZ5KVxuICovXG5NdWx0aURlbGF5LnByb3RvdHlwZS5zZXRNYXN0ZXJWb2x1bWUgPSBmdW5jdGlvbihtYXN0ZXJWb2x1bWUpIHtcbiAgdGhpcy5tYXN0ZXJWb2x1bWUgPSBtYXN0ZXJWb2x1bWU7XG59O1xuXG4vKipcbiAqIENoYW5nZSB0aGUgZGVsYXkgZmVlZGJhY2sgdm9sdW1lLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBkZWxheVZvbHVtZSBGbG9hdCB2YWx1ZTogMC4wIChzaWxlbmNlKSwgMS4wIChub3JtYWwpLCA+MS4wIChhbXBsaWZ5KVxuICovXG5NdWx0aURlbGF5LnByb3RvdHlwZS5zZXREZWxheVZvbHVtZSA9IGZ1bmN0aW9uKGRlbGF5Vm9sdW1lKSB7XG4gIHRoaXMuZGVsYXlWb2x1bWUgPSBkZWxheVZvbHVtZTtcbn07XG5cbi8qKlxuICogUHJvY2VzcyBhIGdpdmVuIGludGVybGVhdmVkIG9yIG1vbm8gbm9uLWludGVybGVhdmVkIGZsb2F0IHZhbHVlIEFycmF5IGFuZCBhZGRzIHRoZSBkZWxheWVkIGF1ZGlvLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHNhbXBsZXMgQXJyYXkgY29udGFpbmluZyBGbG9hdCB2YWx1ZXMgb3IgYSBGbG9hdDMyQXJyYXlcbiAqXG4gKiBAcmV0dXJucyBBIG5ldyBGbG9hdDMyQXJyYXkgaW50ZXJsZWF2ZWQgb3IgbW9ubyBub24taW50ZXJsZWF2ZWQgYXMgd2FzIGZlZCB0byB0aGlzIGZ1bmN0aW9uLlxuICovXG5NdWx0aURlbGF5LnByb3RvdHlwZS5wcm9jZXNzID0gZnVuY3Rpb24oc2FtcGxlcykge1xuICAvLyBOQi4gTWFrZSBhIGNvcHkgdG8gcHV0IGluIHRoZSBvdXRwdXQgc2FtcGxlcyB0byByZXR1cm4uXG4gIHZhciBvdXRwdXRTYW1wbGVzID0gbmV3IEZsb2F0MzJBcnJheShzYW1wbGVzLmxlbmd0aCk7XG5cbiAgZm9yICh2YXIgaT0wOyBpPHNhbXBsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAvLyBkZWxheUJ1ZmZlclNhbXBsZXMgY291bGQgY29udGFpbiBpbml0aWFsIE5VTEwncywgcmV0dXJuIHNpbGVuY2UgaW4gdGhhdCBjYXNlXG4gICAgdmFyIGRlbGF5U2FtcGxlID0gKHRoaXMuZGVsYXlCdWZmZXJTYW1wbGVzW3RoaXMuZGVsYXlPdXRwdXRQb2ludGVyXSA9PT0gbnVsbCA/IDAuMCA6IHRoaXMuZGVsYXlCdWZmZXJTYW1wbGVzW3RoaXMuZGVsYXlPdXRwdXRQb2ludGVyXSk7XG5cbiAgICAvLyBNaXggbm9ybWFsIGF1ZGlvIGRhdGEgd2l0aCBkZWxheWVkIGF1ZGlvXG4gICAgdmFyIHNhbXBsZSA9IChkZWxheVNhbXBsZSAqIHRoaXMuZGVsYXlWb2x1bWUpICsgc2FtcGxlc1tpXTtcblxuICAgIC8vIEFkZCBhdWRpbyBkYXRhIHdpdGggdGhlIGRlbGF5IGluIHRoZSBkZWxheSBidWZmZXJcbiAgICB0aGlzLmRlbGF5QnVmZmVyU2FtcGxlc1t0aGlzLmRlbGF5SW5wdXRQb2ludGVyXSA9IHNhbXBsZTtcblxuICAgIC8vIFJldHVybiB0aGUgYXVkaW8gd2l0aCBkZWxheSBtaXhcbiAgICBvdXRwdXRTYW1wbGVzW2ldID0gc2FtcGxlICogdGhpcy5tYXN0ZXJWb2x1bWU7XG5cbiAgICAvLyBNYW5hZ2UgY2lyY3VsYWlyIGRlbGF5IGJ1ZmZlciBwb2ludGVyc1xuICAgIHRoaXMuZGVsYXlJbnB1dFBvaW50ZXIrKztcbiAgICBpZiAodGhpcy5kZWxheUlucHV0UG9pbnRlciA+PSB0aGlzLmRlbGF5QnVmZmVyU2FtcGxlcy5sZW5ndGgtMSkge1xuICAgICAgdGhpcy5kZWxheUlucHV0UG9pbnRlciA9IDA7XG4gICAgfVxuXG4gICAgdGhpcy5kZWxheU91dHB1dFBvaW50ZXIrKztcbiAgICBpZiAodGhpcy5kZWxheU91dHB1dFBvaW50ZXIgPj0gdGhpcy5kZWxheUJ1ZmZlclNhbXBsZXMubGVuZ3RoLTEpIHtcbiAgICAgIHRoaXMuZGVsYXlPdXRwdXRQb2ludGVyID0gMDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gb3V0cHV0U2FtcGxlcztcbn07XG5cbi8qKlxuICogU2luZ2xlRGVsYXkgZWZmZWN0IGJ5IEFsbWVyIFRoaWUgKGh0dHA6Ly9jb2RlLmFsbWVyb3MuY29tKS5cbiAqIENvcHlyaWdodCAyMDEwIEFsbWVyIFRoaWUuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBFeGFtcGxlOiBTZWUgdXNhZ2UgaW4gUmV2ZXJiIGNsYXNzXG4gKlxuICogVGhpcyBpcyBhIGRlbGF5IHRoYXQgZG9lcyBOT1QgZmVlZHMgaXQncyBvd24gZGVsYXllZCBzaWduYWwgYmFjayBpbnRvIGl0c1xuICogY2lyY3VsYXIgYnVmZmVyLCBuZWl0aGVyIGRvZXMgaXQgcmV0dXJuIHRoZSBvcmlnaW5hbCBzaWduYWwuIEFsc28ga25vd24gYXNcbiAqIGFuIEFsbFBhc3NGaWx0ZXIoPykuXG4gKlxuICogQ29tcGF0aWJsZSB3aXRoIGludGVybGVhdmVkIHN0ZXJlbyAob3IgbW9yZSBjaGFubmVsKSBidWZmZXJzIGFuZFxuICogbm9uLWludGVybGVhdmVkIG1vbm8gYnVmZmVycy5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gbWF4RGVsYXlJblNhbXBsZXNTaXplIE1heGltdW0gcG9zc2libGUgZGVsYXkgaW4gc2FtcGxlcyAoc2l6ZSBvZiBjaXJjdWxhciBidWZmZXIpXG4gKiBAcGFyYW0ge051bWJlcn0gZGVsYXlJblNhbXBsZXMgSW5pdGlhbCBkZWxheSBpbiBzYW1wbGVzXG4gKiBAcGFyYW0ge051bWJlcn0gZGVsYXlWb2x1bWUgSW5pdGlhbCBmZWVkYmFjayBkZWxheSB2b2x1bWUuIEZsb2F0IHZhbHVlOiAwLjAgKHNpbGVuY2UpLCAxLjAgKG5vcm1hbCksID4xLjAgKGFtcGxpZnkpXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cblxuZnVuY3Rpb24gU2luZ2xlRGVsYXkobWF4RGVsYXlJblNhbXBsZXNTaXplLCBkZWxheUluU2FtcGxlcywgZGVsYXlWb2x1bWUpIHtcbiAgdGhpcy5kZWxheUJ1ZmZlclNhbXBsZXMgPSBuZXcgRmxvYXQzMkFycmF5KG1heERlbGF5SW5TYW1wbGVzU2l6ZSk7IC8vIFRoZSBtYXhpbXVtIHNpemUgb2YgZGVsYXlcbiAgdGhpcy5kZWxheUlucHV0UG9pbnRlciAgPSBkZWxheUluU2FtcGxlcztcbiAgdGhpcy5kZWxheU91dHB1dFBvaW50ZXIgPSAwO1xuXG4gIHRoaXMuZGVsYXlJblNhbXBsZXMgICAgID0gZGVsYXlJblNhbXBsZXM7XG4gIHRoaXMuZGVsYXlWb2x1bWUgICAgICAgID0gZGVsYXlWb2x1bWU7XG59XG5cbi8qKlxuICogQ2hhbmdlIHRoZSBkZWxheSB0aW1lIGluIHNhbXBsZXMuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGRlbGF5SW5TYW1wbGVzIERlbGF5IGluIHNhbXBsZXNcbiAqL1xuU2luZ2xlRGVsYXkucHJvdG90eXBlLnNldERlbGF5SW5TYW1wbGVzID0gZnVuY3Rpb24oZGVsYXlJblNhbXBsZXMpIHtcbiAgdGhpcy5kZWxheUluU2FtcGxlcyA9IGRlbGF5SW5TYW1wbGVzO1xuICB0aGlzLmRlbGF5SW5wdXRQb2ludGVyID0gdGhpcy5kZWxheU91dHB1dFBvaW50ZXIgKyBkZWxheUluU2FtcGxlcztcblxuICBpZiAodGhpcy5kZWxheUlucHV0UG9pbnRlciA+PSB0aGlzLmRlbGF5QnVmZmVyU2FtcGxlcy5sZW5ndGgtMSkge1xuICAgIHRoaXMuZGVsYXlJbnB1dFBvaW50ZXIgPSB0aGlzLmRlbGF5SW5wdXRQb2ludGVyIC0gdGhpcy5kZWxheUJ1ZmZlclNhbXBsZXMubGVuZ3RoO1xuICB9XG59O1xuXG4vKipcbiAqIENoYW5nZSB0aGUgcmV0dXJuIHNpZ25hbCB2b2x1bWUuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGRlbGF5Vm9sdW1lIEZsb2F0IHZhbHVlOiAwLjAgKHNpbGVuY2UpLCAxLjAgKG5vcm1hbCksID4xLjAgKGFtcGxpZnkpXG4gKi9cblNpbmdsZURlbGF5LnByb3RvdHlwZS5zZXREZWxheVZvbHVtZSA9IGZ1bmN0aW9uKGRlbGF5Vm9sdW1lKSB7XG4gIHRoaXMuZGVsYXlWb2x1bWUgPSBkZWxheVZvbHVtZTtcbn07XG5cbi8qKlxuICogUHJvY2VzcyBhIGdpdmVuIGludGVybGVhdmVkIG9yIG1vbm8gbm9uLWludGVybGVhdmVkIGZsb2F0IHZhbHVlIEFycmF5IGFuZFxuICogcmV0dXJucyB0aGUgZGVsYXllZCBhdWRpby5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBzYW1wbGVzIEFycmF5IGNvbnRhaW5pbmcgRmxvYXQgdmFsdWVzIG9yIGEgRmxvYXQzMkFycmF5XG4gKlxuICogQHJldHVybnMgQSBuZXcgRmxvYXQzMkFycmF5IGludGVybGVhdmVkIG9yIG1vbm8gbm9uLWludGVybGVhdmVkIGFzIHdhcyBmZWQgdG8gdGhpcyBmdW5jdGlvbi5cbiAqL1xuU2luZ2xlRGVsYXkucHJvdG90eXBlLnByb2Nlc3MgPSBmdW5jdGlvbihzYW1wbGVzKSB7XG4gIC8vIE5CLiBNYWtlIGEgY29weSB0byBwdXQgaW4gdGhlIG91dHB1dCBzYW1wbGVzIHRvIHJldHVybi5cbiAgdmFyIG91dHB1dFNhbXBsZXMgPSBuZXcgRmxvYXQzMkFycmF5KHNhbXBsZXMubGVuZ3RoKTtcblxuICBmb3IgKHZhciBpPTA7IGk8c2FtcGxlcy5sZW5ndGg7IGkrKykge1xuXG4gICAgLy8gQWRkIGF1ZGlvIGRhdGEgd2l0aCB0aGUgZGVsYXkgaW4gdGhlIGRlbGF5IGJ1ZmZlclxuICAgIHRoaXMuZGVsYXlCdWZmZXJTYW1wbGVzW3RoaXMuZGVsYXlJbnB1dFBvaW50ZXJdID0gc2FtcGxlc1tpXTtcblxuICAgIC8vIGRlbGF5QnVmZmVyU2FtcGxlcyBjb3VsZCBjb250YWluIGluaXRpYWwgTlVMTCdzLCByZXR1cm4gc2lsZW5jZSBpbiB0aGF0IGNhc2VcbiAgICB2YXIgZGVsYXlTYW1wbGUgPSB0aGlzLmRlbGF5QnVmZmVyU2FtcGxlc1t0aGlzLmRlbGF5T3V0cHV0UG9pbnRlcl07XG5cbiAgICAvLyBSZXR1cm4gdGhlIGF1ZGlvIHdpdGggZGVsYXkgbWl4XG4gICAgb3V0cHV0U2FtcGxlc1tpXSA9IGRlbGF5U2FtcGxlICogdGhpcy5kZWxheVZvbHVtZTtcblxuICAgIC8vIE1hbmFnZSBjaXJjdWxhaXIgZGVsYXkgYnVmZmVyIHBvaW50ZXJzXG4gICAgdGhpcy5kZWxheUlucHV0UG9pbnRlcisrO1xuXG4gICAgaWYgKHRoaXMuZGVsYXlJbnB1dFBvaW50ZXIgPj0gdGhpcy5kZWxheUJ1ZmZlclNhbXBsZXMubGVuZ3RoLTEpIHtcbiAgICAgIHRoaXMuZGVsYXlJbnB1dFBvaW50ZXIgPSAwO1xuICAgIH1cblxuICAgIHRoaXMuZGVsYXlPdXRwdXRQb2ludGVyKys7XG5cbiAgICBpZiAodGhpcy5kZWxheU91dHB1dFBvaW50ZXIgPj0gdGhpcy5kZWxheUJ1ZmZlclNhbXBsZXMubGVuZ3RoLTEpIHtcbiAgICAgIHRoaXMuZGVsYXlPdXRwdXRQb2ludGVyID0gMDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gb3V0cHV0U2FtcGxlcztcbn07XG5cbi8qKlxuICogUmV2ZXJiIGVmZmVjdCBieSBBbG1lciBUaGllIChodHRwOi8vY29kZS5hbG1lcm9zLmNvbSkuXG4gKiBDb3B5cmlnaHQgMjAxMCBBbG1lciBUaGllLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogRXhhbXBsZTogaHR0cDovL2NvZGUuYWxtZXJvcy5jb20vY29kZS1leGFtcGxlcy9yZXZlcmItZmlyZWZveC1hdWRpby1hcGkvXG4gKlxuICogVGhpcyByZXZlcmIgY29uc2lzdHMgb2YgNiBTaW5nbGVEZWxheXMsIDYgTXVsdGlEZWxheXMgYW5kIGFuIElJUkZpbHRlcjJcbiAqIGZvciBlYWNoIG9mIHRoZSB0d28gc3RlcmVvIGNoYW5uZWxzLlxuICpcbiAqIENvbXBhdGlibGUgd2l0aCBpbnRlcmxlYXZlZCBzdGVyZW8gYnVmZmVycyBvbmx5IVxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBtYXhEZWxheUluU2FtcGxlc1NpemUgTWF4aW11bSBwb3NzaWJsZSBkZWxheSBpbiBzYW1wbGVzIChzaXplIG9mIGNpcmN1bGFyIGJ1ZmZlcnMpXG4gKiBAcGFyYW0ge051bWJlcn0gZGVsYXlJblNhbXBsZXMgSW5pdGlhbCBkZWxheSBpbiBzYW1wbGVzIGZvciBpbnRlcm5hbCAoU2luZ2xlL011bHRpKWRlbGF5c1xuICogQHBhcmFtIHtOdW1iZXJ9IG1hc3RlclZvbHVtZSBJbml0aWFsIG1hc3RlciB2b2x1bWUuIEZsb2F0IHZhbHVlOiAwLjAgKHNpbGVuY2UpLCAxLjAgKG5vcm1hbCksID4xLjAgKGFtcGxpZnkpXG4gKiBAcGFyYW0ge051bWJlcn0gbWl4Vm9sdW1lIEluaXRpYWwgcmV2ZXJiIHNpZ25hbCBtaXggdm9sdW1lLiBGbG9hdCB2YWx1ZTogMC4wIChzaWxlbmNlKSwgMS4wIChub3JtYWwpLCA+MS4wIChhbXBsaWZ5KVxuICogQHBhcmFtIHtOdW1iZXJ9IGRlbGF5Vm9sdW1lIEluaXRpYWwgZmVlZGJhY2sgZGVsYXkgdm9sdW1lIGZvciBpbnRlcm5hbCAoU2luZ2xlL011bHRpKWRlbGF5cy4gRmxvYXQgdmFsdWU6IDAuMCAoc2lsZW5jZSksIDEuMCAobm9ybWFsKSwgPjEuMCAoYW1wbGlmeSlcbiAqIEBwYXJhbSB7TnVtYmVyfSBkYW1wRnJlcXVlbmN5IEluaXRpYWwgbG93IHBhc3MgZmlsdGVyIGZyZXF1ZW5jeS4gMCB0byA0NDEwMCAoZGVwZW5kaW5nIG9uIHlvdXIgbWF4aW11bSBzYW1wbGluZyBmcmVxdWVuY3kpXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFJldmVyYihtYXhEZWxheUluU2FtcGxlc1NpemUsIGRlbGF5SW5TYW1wbGVzLCBtYXN0ZXJWb2x1bWUsIG1peFZvbHVtZSwgZGVsYXlWb2x1bWUsIGRhbXBGcmVxdWVuY3kpIHtcbiAgdGhpcy5kZWxheUluU2FtcGxlcyAgID0gZGVsYXlJblNhbXBsZXM7XG4gIHRoaXMubWFzdGVyVm9sdW1lICAgICA9IG1hc3RlclZvbHVtZTtcbiAgdGhpcy5taXhWb2x1bWUgICAgICAgPSBtaXhWb2x1bWU7XG4gIHRoaXMuZGVsYXlWb2x1bWUgICAgID0gZGVsYXlWb2x1bWU7XG4gIHRoaXMuZGFtcEZyZXF1ZW5jeSAgICAgPSBkYW1wRnJlcXVlbmN5O1xuXG4gIHRoaXMuTlJfT0ZfTVVMVElERUxBWVMgPSA2O1xuICB0aGlzLk5SX09GX1NJTkdMRURFTEFZUyA9IDY7XG5cbiAgdGhpcy5MT1dQQVNTTCA9IG5ldyBJSVJGaWx0ZXIyKERTUC5MT1dQQVNTLCBkYW1wRnJlcXVlbmN5LCAwLCA0NDEwMCk7XG4gIHRoaXMuTE9XUEFTU1IgPSBuZXcgSUlSRmlsdGVyMihEU1AuTE9XUEFTUywgZGFtcEZyZXF1ZW5jeSwgMCwgNDQxMDApO1xuXG4gIHRoaXMuc2luZ2xlRGVsYXlzID0gW107XG5cbiAgdmFyIGksIGRlbGF5TXVsdGlwbHk7XG5cbiAgZm9yIChpID0gMDsgaSA8IHRoaXMuTlJfT0ZfU0lOR0xFREVMQVlTOyBpKyspIHtcbiAgICBkZWxheU11bHRpcGx5ID0gMS4wICsgKGkvNy4wKTsgLy8gMS4wLCAxLjEsIDEuMi4uLlxuICAgIHRoaXMuc2luZ2xlRGVsYXlzW2ldID0gbmV3IFNpbmdsZURlbGF5KG1heERlbGF5SW5TYW1wbGVzU2l6ZSwgTWF0aC5yb3VuZCh0aGlzLmRlbGF5SW5TYW1wbGVzICogZGVsYXlNdWx0aXBseSksIHRoaXMuZGVsYXlWb2x1bWUpO1xuICB9XG5cbiAgdGhpcy5tdWx0aURlbGF5cyA9IFtdO1xuXG4gIGZvciAoaSA9IDA7IGkgPCB0aGlzLk5SX09GX01VTFRJREVMQVlTOyBpKyspIHtcbiAgICBkZWxheU11bHRpcGx5ID0gMS4wICsgKGkvMTAuMCk7IC8vIDEuMCwgMS4xLCAxLjIuLi5cbiAgICB0aGlzLm11bHRpRGVsYXlzW2ldID0gbmV3IE11bHRpRGVsYXkobWF4RGVsYXlJblNhbXBsZXNTaXplLCBNYXRoLnJvdW5kKHRoaXMuZGVsYXlJblNhbXBsZXMgKiBkZWxheU11bHRpcGx5KSwgdGhpcy5tYXN0ZXJWb2x1bWUsIHRoaXMuZGVsYXlWb2x1bWUpO1xuICB9XG59XG5cbi8qKlxuICogQ2hhbmdlIHRoZSBkZWxheSB0aW1lIGluIHNhbXBsZXMgYXMgYSBiYXNlIGZvciBhbGwgZGVsYXlzLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBkZWxheUluU2FtcGxlcyBEZWxheSBpbiBzYW1wbGVzXG4gKi9cblJldmVyYi5wcm90b3R5cGUuc2V0RGVsYXlJblNhbXBsZXMgPSBmdW5jdGlvbiAoZGVsYXlJblNhbXBsZXMpe1xuICB0aGlzLmRlbGF5SW5TYW1wbGVzID0gZGVsYXlJblNhbXBsZXM7XG5cbiAgdmFyIGksIGRlbGF5TXVsdGlwbHk7XG5cbiAgZm9yIChpID0gMDsgaSA8IHRoaXMuTlJfT0ZfU0lOR0xFREVMQVlTOyBpKyspIHtcbiAgICBkZWxheU11bHRpcGx5ID0gMS4wICsgKGkvNy4wKTsgLy8gMS4wLCAxLjEsIDEuMi4uLlxuICAgIHRoaXMuc2luZ2xlRGVsYXlzW2ldLnNldERlbGF5SW5TYW1wbGVzKCBNYXRoLnJvdW5kKHRoaXMuZGVsYXlJblNhbXBsZXMgKiBkZWxheU11bHRpcGx5KSApO1xuICB9XG5cbiAgZm9yIChpID0gMDsgaSA8IHRoaXMuTlJfT0ZfTVVMVElERUxBWVM7IGkrKykge1xuICAgIGRlbGF5TXVsdGlwbHkgPSAxLjAgKyAoaS8xMC4wKTsgLy8gMS4wLCAxLjEsIDEuMi4uLlxuICAgIHRoaXMubXVsdGlEZWxheXNbaV0uc2V0RGVsYXlJblNhbXBsZXMoIE1hdGgucm91bmQodGhpcy5kZWxheUluU2FtcGxlcyAqIGRlbGF5TXVsdGlwbHkpICk7XG4gIH1cbn07XG5cbi8qKlxuICogQ2hhbmdlIHRoZSBtYXN0ZXIgdm9sdW1lLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBtYXN0ZXJWb2x1bWUgRmxvYXQgdmFsdWU6IDAuMCAoc2lsZW5jZSksIDEuMCAobm9ybWFsKSwgPjEuMCAoYW1wbGlmeSlcbiAqL1xuUmV2ZXJiLnByb3RvdHlwZS5zZXRNYXN0ZXJWb2x1bWUgPSBmdW5jdGlvbiAobWFzdGVyVm9sdW1lKXtcbiAgdGhpcy5tYXN0ZXJWb2x1bWUgPSBtYXN0ZXJWb2x1bWU7XG59O1xuXG4vKipcbiAqIENoYW5nZSB0aGUgcmV2ZXJiIHNpZ25hbCBtaXggbGV2ZWwuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG1peFZvbHVtZSBGbG9hdCB2YWx1ZTogMC4wIChzaWxlbmNlKSwgMS4wIChub3JtYWwpLCA+MS4wIChhbXBsaWZ5KVxuICovXG5SZXZlcmIucHJvdG90eXBlLnNldE1peFZvbHVtZSA9IGZ1bmN0aW9uIChtaXhWb2x1bWUpe1xuICB0aGlzLm1peFZvbHVtZSA9IG1peFZvbHVtZTtcbn07XG5cbi8qKlxuICogQ2hhbmdlIGFsbCBkZWxheXMgZmVlZGJhY2sgdm9sdW1lLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBkZWxheVZvbHVtZSBGbG9hdCB2YWx1ZTogMC4wIChzaWxlbmNlKSwgMS4wIChub3JtYWwpLCA+MS4wIChhbXBsaWZ5KVxuICovXG5SZXZlcmIucHJvdG90eXBlLnNldERlbGF5Vm9sdW1lID0gZnVuY3Rpb24gKGRlbGF5Vm9sdW1lKXtcbiAgdGhpcy5kZWxheVZvbHVtZSA9IGRlbGF5Vm9sdW1lO1xuXG4gIHZhciBpO1xuXG4gIGZvciAoaSA9IDA7IGk8dGhpcy5OUl9PRl9TSU5HTEVERUxBWVM7IGkrKykge1xuICAgIHRoaXMuc2luZ2xlRGVsYXlzW2ldLnNldERlbGF5Vm9sdW1lKHRoaXMuZGVsYXlWb2x1bWUpO1xuICB9XG5cbiAgZm9yIChpID0gMDsgaTx0aGlzLk5SX09GX01VTFRJREVMQVlTOyBpKyspIHtcbiAgICB0aGlzLm11bHRpRGVsYXlzW2ldLnNldERlbGF5Vm9sdW1lKHRoaXMuZGVsYXlWb2x1bWUpO1xuICB9XG59O1xuXG4vKipcbiAqIENoYW5nZSB0aGUgTG93IFBhc3MgZmlsdGVyIGZyZXF1ZW5jeS5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gZGFtcEZyZXF1ZW5jeSBsb3cgcGFzcyBmaWx0ZXIgZnJlcXVlbmN5LiAwIHRvIDQ0MTAwIChkZXBlbmRpbmcgb24geW91ciBtYXhpbXVtIHNhbXBsaW5nIGZyZXF1ZW5jeSlcbiAqL1xuUmV2ZXJiLnByb3RvdHlwZS5zZXREYW1wRnJlcXVlbmN5ID0gZnVuY3Rpb24gKGRhbXBGcmVxdWVuY3kpe1xuICB0aGlzLmRhbXBGcmVxdWVuY3kgPSBkYW1wRnJlcXVlbmN5O1xuXG4gIHRoaXMuTE9XUEFTU0wuc2V0KGRhbXBGcmVxdWVuY3ksIDApO1xuICB0aGlzLkxPV1BBU1NSLnNldChkYW1wRnJlcXVlbmN5LCAwKTtcbn07XG5cbi8qKlxuICogUHJvY2VzcyBhIGdpdmVuIGludGVybGVhdmVkIGZsb2F0IHZhbHVlIEFycmF5IGFuZCBjb3BpZXMgYW5kIGFkZHMgdGhlIHJldmVyYiBzaWduYWwuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gc2FtcGxlcyBBcnJheSBjb250YWluaW5nIEZsb2F0IHZhbHVlcyBvciBhIEZsb2F0MzJBcnJheVxuICpcbiAqIEByZXR1cm5zIEEgbmV3IEZsb2F0MzJBcnJheSBpbnRlcmxlYXZlZCBidWZmZXIuXG4gKi9cblJldmVyYi5wcm90b3R5cGUucHJvY2VzcyA9IGZ1bmN0aW9uIChpbnRlcmxlYXZlZFNhbXBsZXMpe1xuICAvLyBOQi4gTWFrZSBhIGNvcHkgdG8gcHV0IGluIHRoZSBvdXRwdXQgc2FtcGxlcyB0byByZXR1cm4uXG4gIHZhciBvdXRwdXRTYW1wbGVzID0gbmV3IEZsb2F0MzJBcnJheShpbnRlcmxlYXZlZFNhbXBsZXMubGVuZ3RoKTtcblxuICAvLyBQZXJmb3JtIGxvdyBwYXNzIG9uIHRoZSBpbnB1dCBzYW1wbGVzIHRvIG1pbWljayBkYW1wXG4gIHZhciBsZWZ0UmlnaHRNaXggPSBEU1AuZGVpbnRlcmxlYXZlKGludGVybGVhdmVkU2FtcGxlcyk7XG4gIHRoaXMuTE9XUEFTU0wucHJvY2VzcyggbGVmdFJpZ2h0TWl4W0RTUC5MRUZUXSApO1xuICB0aGlzLkxPV1BBU1NSLnByb2Nlc3MoIGxlZnRSaWdodE1peFtEU1AuUklHSFRdICk7XG4gIHZhciBmaWx0ZXJlZFNhbXBsZXMgPSBEU1AuaW50ZXJsZWF2ZShsZWZ0UmlnaHRNaXhbRFNQLkxFRlRdLCBsZWZ0UmlnaHRNaXhbRFNQLlJJR0hUXSk7XG5cbiAgdmFyIGk7XG5cbiAgLy8gUHJvY2VzcyBNdWx0aURlbGF5cyBpbiBwYXJhbGxlbFxuICBmb3IgKGkgPSAwOyBpPHRoaXMuTlJfT0ZfTVVMVElERUxBWVM7IGkrKykge1xuICAgIC8vIEludmVydCB0aGUgc2lnbmFsIG9mIGV2ZXJ5IGV2ZW4gbXVsdGlEZWxheVxuICAgIG91dHB1dFNhbXBsZXMgPSBEU1AubWl4U2FtcGxlQnVmZmVycyhvdXRwdXRTYW1wbGVzLCB0aGlzLm11bHRpRGVsYXlzW2ldLnByb2Nlc3MoZmlsdGVyZWRTYW1wbGVzKSwgMiVpID09PSAwLCB0aGlzLk5SX09GX01VTFRJREVMQVlTKTtcbiAgfVxuXG4gIC8vIFByb2Nlc3MgU2luZ2xlRGVsYXlzIGluIHNlcmllc1xuICB2YXIgc2luZ2xlRGVsYXlTYW1wbGVzID0gbmV3IEZsb2F0MzJBcnJheShvdXRwdXRTYW1wbGVzLmxlbmd0aCk7XG4gIGZvciAoaSA9IDA7IGk8dGhpcy5OUl9PRl9TSU5HTEVERUxBWVM7IGkrKykge1xuICAgIC8vIEludmVydCB0aGUgc2lnbmFsIG9mIGV2ZXJ5IGV2ZW4gc2luZ2xlRGVsYXlcbiAgICBzaW5nbGVEZWxheVNhbXBsZXMgPSBEU1AubWl4U2FtcGxlQnVmZmVycyhzaW5nbGVEZWxheVNhbXBsZXMsIHRoaXMuc2luZ2xlRGVsYXlzW2ldLnByb2Nlc3Mob3V0cHV0U2FtcGxlcyksIDIlaSA9PT0gMCwgMSk7XG4gIH1cblxuICAvLyBBcHBseSB0aGUgdm9sdW1lIG9mIHRoZSByZXZlcmIgc2lnbmFsXG4gIGZvciAoaSA9IDA7IGk8c2luZ2xlRGVsYXlTYW1wbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgc2luZ2xlRGVsYXlTYW1wbGVzW2ldICo9IHRoaXMubWl4Vm9sdW1lO1xuICB9XG5cbiAgLy8gTWl4IHRoZSBvcmlnaW5hbCBzaWduYWwgd2l0aCB0aGUgcmV2ZXJiIHNpZ25hbFxuICBvdXRwdXRTYW1wbGVzID0gRFNQLm1peFNhbXBsZUJ1ZmZlcnMoc2luZ2xlRGVsYXlTYW1wbGVzLCBpbnRlcmxlYXZlZFNhbXBsZXMsIDAsIDEpO1xuXG4gIC8vIEFwcGx5IHRoZSBtYXN0ZXIgdm9sdW1lIHRvIHRoZSBjb21wbGV0ZSBzaWduYWxcbiAgZm9yIChpID0gMDsgaTxvdXRwdXRTYW1wbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgb3V0cHV0U2FtcGxlc1tpXSAqPSB0aGlzLm1hc3RlclZvbHVtZTtcbiAgfVxuXG4gIHJldHVybiBvdXRwdXRTYW1wbGVzO1xufTtcbjsvKlxuY2xhc3MgRlBTXG4gIGNvbnN0cnVjdG9yOiAoQHBlcmlvZCktPlxuICAgIEBsYXN0VGltZSA9IHBlcmZvcm1hbmNlLm5vdygpXG4gICAgQGZwcyA9IDBcbiAgICBAY291bnRlciA9IDBcbiAgICBAb25yZWZyZXNoID0gLT5cbiAgc3RlcDogLT5cbiAgICBjdXJyZW50VGltZSA9IHBlcmZvcm1hbmNlLm5vdygpXG4gICAgQGNvdW50ZXIgKz0gMVxuICAgIGlmIGN1cnJlbnRUaW1lIC0gQGxhc3RUaW1lID4gQHBlcmlvZFxuICAgICAgQGZwcyA9IDEwMDAqQGNvdW50ZXIvKGN1cnJlbnRUaW1lIC0gQGxhc3RUaW1lKVxuICAgICAgQGNvdW50ZXIgPSAwXG4gICAgICBAb25yZWZyZXNoKEBmcHMpXG4gICAgICBAbGFzdFRpbWUgPSBjdXJyZW50VGltZVxuICB2YWx1ZU9mOiAtPlxuICAgIE1hdGgucm91bmQoQGZwcyoxMDAwKS8xMDAwXG4qL1xuLypcbmNsYXNzIE1ldHJvbm9tZVxuICBjb25zdHJ1Y3RvcjogKEBhY3R4LCBAdGVtcG89MTIwKS0+XG4gICAgQGRlbGF5ID0gOC9AdGVtcG9cbiAgICBAaW50ZXJ2YWwgPSAxLyhAdGVtcG8vNjApXG4gICAgQGxhc3RUaW1lID0gQGFjdHguY3VycmVudFRpbWVcbiAgICBAbmV4dFRpbWUgPSBAaW50ZXJ2YWwgKyBAYWN0eC5jdXJyZW50VGltZVxuICAgIEBkZXN0aW5hdGlvbiA9IEBhY3R4LmRlc3RpbmF0aW9uXG4gICAgQG5leHRUaWNrID0gLT5cbiAgc3RlcDogLT5cbiAgICBpZiBAYWN0eC5jdXJyZW50VGltZSAtIEBuZXh0VGltZSA+PSAwXG4gICAgICBAbGFzdFRpbWUgPSBAbmV4dFRpbWVcbiAgICAgIEBuZXh0VGltZSArPSBAaW50ZXJ2YWxcbiAgICAgIEBuZXh0VGljayhAbmV4dFRpbWUpXG4gICAgcmV0dXJuXG4qL1xuLypcbmNsYXNzIE9TQ1xuICBjb25zdHJ1Y3RvcjogKEBhY3R4KS0+XG4gIHRvbmU6IChmcmVxLCBzdGFydFRpbWUsIGR1cmF0aW9uKS0+XG4gICAgb3NjID0gQGFjdHguY3JlYXRlT3NjaWxsYXRvcigpXG4gICAgb3NjLnN0YXJ0KHN0YXJ0VGltZSlcbiAgICBvc2Muc3RvcChzdGFydFRpbWUgKyBkdXJhdGlvbilcbiAgICBnYWluID0gQGFjdHguY3JlYXRlR2FpbigpXG4gICAgZ2Fpbi5nYWluLnZhbHVlID0gMFxuICAgIGdhaW4uZ2Fpbi5zZXRWYWx1ZUF0VGltZSgwLCBzdGFydFRpbWUpXG4gICAgZ2Fpbi5nYWluLmxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lKDEsIHN0YXJ0VGltZSArIDAuMDEpXG4gICAgZ2Fpbi5nYWluLnNldFZhbHVlQXRUaW1lKDEsIHN0YXJ0VGltZSArIGR1cmF0aW9uIC0gMC4wMSlcbiAgICBnYWluLmdhaW4ubGluZWFyUmFtcFRvVmFsdWVBdFRpbWUoMCwgc3RhcnRUaW1lICsgZHVyYXRpb24pXG4gICAgb3NjLmNvbm5lY3QoZ2FpbilcbiAgICBnYWluXG4gIGNoaXJwOiAoc3RhcnRGcmVxLCBzdG9wRnJlcSwgc3RhcnRUaW1lLCBkdXJhdGlvbiktPlxuICAgIG9zYyA9IEBhY3R4LmNyZWF0ZU9zY2lsbGF0b3IoKVxuICAgIG9zYy5mcmVxdWVuY3kudmFsdWUgPSBzdGFydEZyZXFcbiAgICBvc2MuZnJlcXVlbmN5LnNldFZhbHVlQXRUaW1lKHN0YXJ0RnJlcSwgc3RhcnRUaW1lKVxuICAgIG9zYy5mcmVxdWVuY3kuZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZShzdG9wRnJlcSwgc3RhcnRUaW1lICsgZHVyYXRpb24pXG4gICAgb3NjLnN0YXJ0KHN0YXJ0VGltZSlcbiAgICBvc2Muc3RvcChzdGFydFRpbWUgKyBkdXJhdGlvbilcbiAgICBnYWluID0gQGFjdHguY3JlYXRlR2FpbigpXG4gICAgZ2Fpbi5nYWluLnZhbHVlID0gMFxuICAgIGdhaW4uZ2Fpbi5zZXRWYWx1ZUF0VGltZSgwLCBzdGFydFRpbWUpXG4gICAgZ2Fpbi5nYWluLmxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lKDEsIChzdGFydFRpbWUgKyBkdXJhdGlvbikvMilcbiAgICBnYWluLmdhaW4ubGluZWFyUmFtcFRvVmFsdWVBdFRpbWUoMCwgc3RhcnRUaW1lICsgZHVyYXRpb24pXG4gICAgb3NjLmNvbm5lY3QoZ2FpbilcbiAgICBnYWluXG4qL1xuLypcbmNsYXNzIFJlY29yZEJ1ZmZlclxuICBjb25zdHJ1Y3RvcjogKEBidWZmZXJTaXplLCBAY2hhbm5lbCwgQG1heGltYW1SZWNvcmRTaXplPUluZmluaXR5KS0+ICMgMmNoLCDjg5Djg4Pjg5XjgqHkv53mjIHmlbBcbiAgICBAY2hzQnVmZmVycyA9IFsxLi5AY2hhbm5lbF0ubWFwIC0+IFtdXG4gICAgQGxhc3RUaW1lID0gMFxuICAgIEBjb3VudCA9IDBcbiAgY2xlYXI6IC0+XG4gICAgQGNoc0J1ZmZlcnMgPSBbMS4uQGNoYW5uZWxdLm1hcCAtPiBbXVxuICAgIEBjb3VudCA9IDBcbiAgICByZXR1cm5cbiAgYWRkOiAoYnVmZmVycywgQGxhc3RUaW1lPTApLT5cbiAgICBAY291bnQrK1xuICAgIGZvciBidWZmZXIsIGkgaW4gYnVmZmVyc1xuICAgICAgQGNoc0J1ZmZlcnNbaV0ucHVzaChidWZmZXIpXG4gICAgaWYgQGNoc0J1ZmZlcnNbMF0ubGVuZ3RoID49IEBtYXhpbWFtUmVjb3JkU2l6ZVxuICAgICAgZm9yIGNoQnVmZmVycyBpbiBAY2hzQnVmZmVyc1xuICAgICAgICBjaEJ1ZmZlcnMuc2hpZnQoKVxuICAgIHJldHVyblxuICB0b1BDTTogLT5cbiAgICB0b0ludDE2QXJyYXkoXG4gICAgICBpbnRlcmxlYXZlKFxuICAgICAgICAobWVyZ2VCdWZmZXJzKGNoQnVmZmVycykgZm9yIGNoQnVmZmVycyBpbiBAY2hzQnVmZmVycykpKVxuICBtZXJnZTogKGNoPTApLT5cbiAgICBtZXJnZUJ1ZmZlcnMoQGNoc0J1ZmZlcnNbY2hdKVxuICBnZXRDaGFubmVsRGF0YTogKG4pLT5cbiAgICBtZXJnZUJ1ZmZlcnMoQGNoc0J1ZmZlcnNbbl0pXG4gIG1lcmdlQnVmZmVycyA9IChjaEJ1ZmZlciktPlxuICAgIGJ1ZmZlclNpemUgPSBjaEJ1ZmZlclswXS5sZW5ndGhcbiAgICBmMzJhcnkgPSBuZXcgRmxvYXQzMkFycmF5KGNoQnVmZmVyLmxlbmd0aCAqIGJ1ZmZlclNpemUpXG4gICAgZm9yIHYsIGkgaW4gY2hCdWZmZXJcbiAgICAgIGYzMmFyeS5zZXQodiwgaSAqIGJ1ZmZlclNpemUpXG4gICAgZjMyYXJ5XG4gIGludGVybGVhdmUgPSAoY2hzKS0+XG4gICAgbGVuZ3RoID0gY2hzLmxlbmd0aCAqIGNoc1swXS5sZW5ndGhcbiAgICBmMzJBcnkgPSBuZXcgRmxvYXQzMkFycmF5KGxlbmd0aClcbiAgICBpbnB1dEluZGV4ID0gMFxuICAgIGluZGV4ID0gMFxuICAgIHdoaWxlIGluZGV4IDwgbGVuZ3RoXG4gICAgICBmb3IgY2gsIGkgaW4gY2hzXG4gICAgICAgIGYzMkFyeVtpbmRleCsrXSA9IGNoW2lucHV0SW5kZXhdXG4gICAgICBpbnB1dEluZGV4KytcbiAgICBmMzJBcnlcbiAgdG9JbnQxNkFycmF5ID0gKGYzMmFyeSktPlxuICAgIGludDE2YXJ5ID0gbmV3IEludDE2QXJyYXkoZjMyYXJ5Lmxlbmd0aClcbiAgICBmb3IgdiwgaSBpbiBmMzJhcnlcbiAgICAgIGludDE2YXJ5W2ldID0gdiAqIDB4N0ZGRiAqIDAuOCAjIDMyYml0IC0+IDE2Yml0XG4gICAgaW50MTZhcnlcbiovXG4vKlxuY2xhc3MgU0dTbW9vdGhcbiAgY29uc3RydWN0b3I6IChAbnRoX2RlZ3JlZV9wb2x5bm9taWFsLCBAcmFkaXVzKS0+XG4gICAgQGN1cnJlbnRXb3JrZXIgPSAwXG4gICAgQHdvcmtlcnMgPSBbMS4uMV0ubWFwIChpKS0+XG4gICAgICBuZXcgU2VydmVyV29ya2VyKHdvcmtlclNjcmlwdCwgW0BudGhfZGVncmVlX3BvbHlub21pYWwsIEByYWRpdXNdKVxuICBwcm9jZXNzOiAoZjMyYXJyKS0+XG4gICAgd29ya2VyID0gQHdvcmtlcnNbQGN1cnJlbnRXb3JrZXIrK11cbiAgICBpZiBAd29ya2Vycy5sZW5ndGggaXMgQGN1cnJlbnRXb3JrZXIgdGhlbiBAY3VycmVudFdvcmtlciA9IDBcbiAgICBuZXcgUHJvbWlzZSAocmVzb2x2ZSwgcmVqZWN0KS0+XG4gICAgICB3b3JrZXIucmVxdWVzdChcImNhbGNcIiwgZjMyYXJyLCByZXNvbHZlKVxuICB3b3JrZXJTY3JpcHQgPSAocCwgbSktPlxuICAgIGltcG9ydFNjcmlwdHMoXCJodHRwczovL2NkbmpzLmNsb3VkZmxhcmUuY29tL2FqYXgvbGlicy9tYXRoanMvMS4xLjEvbWF0aC5taW4uanNcIikgIyBtYXRoLmpzXG4gICAgc2VsZi5vbiBcImNhbGNcIiwgKGYzMmFyciwgcmVwbHkpLT5cbiAgICAgIHkgPSBmMzJhcnJcbiAgICAgICMgaHR0cDovL25la29ub21pY3MtYmxvZy50dW1ibHIuY29tL3Bvc3QvNjgzNjM1NzQ0MjMvc2F2aXR6a3ktZ29sYXlcbiAgICAgICMgaHR0cDovL3d3dy5hc2FoaS1uZXQub3IuanAvfndyOWstb29ocy9QYWdlcy9JbmZvbHYvU0dNZXRob2Qvc2d2aS5odG1sXG4gICAgICAjbSA9IDggIyDlubPmu5HljJbjga7jgZ/jgoHjga7liY3lvozjg4fjg7zjgr/ngrnmlbBcbiAgICAgICNwID0gMyAjIHDmrKHjga7lpJrpoIXlvI/jgafov5HkvLxcbiAgICAgIHBvaW50ID0gMCAjIOePvuWcqOOBruOBn+OBn+OBv+i+vOOBv+S9jee9rlxuICAgICAgZGVyaXZhdGl2ZXMgPSBbMC4ucF0ubWFwIC0+ICMgcOasoeOBruW+ruWIhuWApFxuICAgICAgICBuZXcgRmxvYXQzMkFycmF5KHkubGVuZ3RoKVxuICAgICAgd2hpbGUgeS5sZW5ndGggPiBwb2ludCsyKm0rMVxuICAgICAgICBYID0gWzAuLnBdLm1hcCAoXywgaWspLT5cbiAgICAgICAgICBbLW0uLm1dLm1hcCAoaW0pLT5cbiAgICAgICAgICAgIE1hdGgucG93KGltLCBpaylcbiAgICAgICAgWSA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHksIHBvaW50LCBwb2ludCArIDIqbSsxKVxuICAgICAgICBDID0gbWF0aC5pbnYobWF0aC5tdWx0aXBseShYLCBtYXRoLnRyYW5zcG9zZShYKSkpXG4gICAgICAgIEIgPSBtYXRoLm11bHRpcGx5KEMsIFgpXG4gICAgICAgIEEgPSBtYXRoLm11bHRpcGx5KEIsIFkpXG4gICAgICAgIGZvciBrIGluIFswLi5wXVxuICAgICAgICAgIGRlcml2YXRpdmVzW2tdW3BvaW50K20rMV0gPSBtYXRoLmZhY3RvcmlhbChrKSpBW2tdXG4gICAgICAgIHBvaW50ICs9IDFcbiAgICAgIHJlcGx5KGRlcml2YXRpdmVzLCBkZXJpdmF0aXZlcy5tYXAgKHtidWZmZXJ9KS0+IGJ1ZmZlcilcbiovXG4vKlxuY2xhc3MgU2VydmVyV29ya2VyXG4gIGNvbnN0cnVjdG9yOiAoZm4sIGFyZ3MsIGltcG9ydHM9W10pLT5cbiAgICBAdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChcbiAgICAgIG5ldyBCbG9iKFtcbiAgICAgICAgaW1wb3J0cy5tYXAoKHNyYyktPiBcImltcG9ydFNjcmlwdHMoJyN7c3JjfScpO1xcblwiKS5qb2luKFwiXCIpICsgXCJcXG5cIlxuICAgICAgICBcIigje1NlcnZlcldvcmtlci5TZXJ2ZXJ9KSgpO1xcblwiXG4gICAgICAgIFwiKCN7Zm59KSgje2FyZ3MubWFwKEpTT04uc3RyaW5naWZ5KS5qb2luKFwiLFwiKX0pO1wiXG4gICAgICBdLCB7dHlwZTpcInRleHQvamF2YXNjcmlwdFwifSkpXG4gICAgQHdvcmtlciA9IG5ldyBXb3JrZXIoQHVybClcbiAgICBAd29ya2VyLmFkZEV2ZW50TGlzdGVuZXIgXCJlcnJvclwiLCAoZXYpLT5cbiAgICAgIGNvbnNvbGUuZXJyb3IoXCIje2V2Lm1lc3NhZ2V9XFxuICBhdCAje2V2LmZpbGVuYW1lfToje2V2LmxpbmVub306I3tldi5jb2xub31cIilcbiAgICAgIHJldHVyblxuICAgIEB3b3JrZXIuYWRkRXZlbnRMaXN0ZW5lciBcIm1lc3NhZ2VcIiwgKHtkYXRhOiBbaWQsIGFyZ3NdfSk9PlxuICAgICAgY2IgPSBAY2FsbGJhY2tzW2lkXVxuICAgICAgZGVsZXRlIEBjYWxsYmFja3NbaWRdXG4gICAgICBjYihhcmdzKVxuICAgICAgcmV0dXJuXG4gICAgQHJlcXVlc3RJZCA9IDBcbiAgICBAY2FsbGJhY2tzID0ge31cbiAgcmVxdWVzdDogKGV2ZW50LCBbZGF0YSwgdHJhbnNmZXJhYmxlXS4uLiwgY2FsbGJhY2spLT5cbiAgICBpZCA9IEByZXF1ZXN0SWQrK1xuICAgIEBjYWxsYmFja3NbaWRdID0gY2FsbGJhY2tcbiAgICBAd29ya2VyLnBvc3RNZXNzYWdlKFtpZCwgZXZlbnQsIGRhdGFdLCB0cmFuc2ZlcmFibGUpXG4gICAgcmV0dXJuXG4gIHRlcm1pbmF0ZTogLT5cbiAgICBAd29ya2VyLnRlcm1pbmF0ZSgpXG4gICAgVVJMLnJldm9rZU9iamVjdFVSTChAdXJsKVxuICAgIHJldHVyblxuICBAU2VydmVyID0gLT5cbiAgICBoYW5kbGVycyA9IHt9XG4gICAgc2VsZi5hZGRFdmVudExpc3RlbmVyIFwibWVzc2FnZVwiLCAoe2RhdGE6IFtpZCwgZXZlbnQsIGRhdGFdfSktPlxuICAgICAgcmVwbHkgPSAoYXJncywgdHJhbnNmZXJhYmxlKS0+XG4gICAgICAgIHNlbGYucG9zdE1lc3NhZ2UoW2lkLCBhcmdzXSwgdHJhbnNmZXJhYmxlKVxuICAgICAgICByZXR1cm5cbiAgICAgIGhhbmRsZXJzW2V2ZW50XShkYXRhLCByZXBseSlcbiAgICAgIHJldHVyblxuICAgIHNlbGYub24gPSAoZXZlbnQsIGNhbGxiYWNrKS0+XG4gICAgICBoYW5kbGVyc1tldmVudF0gPSBjYWxsYmFja1xuICAgICAgcmV0dXJuXG4gICAgcmV0dXJuXG4qL1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGluZ3MvdHNkLmQudHNcIiAvPlxuLypcblxuc2VwYXJhdGUgPSAoYXJyLCBsZW5ndGgsIHNsaWRld2lkdGgpLT5cbiAgcmVzdWx0cyA9IFtdXG4gIHBvaW50ID0gMFxuICB3aGlsZSBhcnIubGVuZ3RoID4gcG9pbnQgKyBsZW5ndGhcbiAgICByZXN1bHRzLnB1c2ggYXJyLnN1YmFycmF5KHBvaW50LCBwb2ludCArIGxlbmd0aClcbiAgICBwb2ludCArPSBzbGlkZXdpZHRoXG4gIHJlc3VsdHNcblxuICBnZXRTb2NrZXQgPSAodXJsKS0+XG4gICAgbmV3IFByb21pc2UgKHJlc29sdmUsIHJlamVjdCktPlxuICAgICAgdHJhbnNtaXR0ZXIgPSBpbyh1cmwpXG4gICAgICB0cmFuc21pdHRlci5vbiBcImNvbm5lY3RcIiwgLT5cbiAgICAgICAgcmVzb2x2ZSh0cmFuc21pdHRlcilcbiAgICAgIHRyYW5zbWl0dGVyLm9uIFwiZXJyb3JcIiwgKGVyciktPlxuICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICBcbmdldCA9ICh1cmwpLT5cbiAgbmV3IFByb21pc2UgKHJlc29sdmUsIHJlamVjdCktPlxuICAgIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgeGhyLmFkZEV2ZW50TGlzdGVuZXIgXCJsb2FkXCIsICgpLT5cbiAgICAgIGlmIDIwMCA8PSB4aHJbXCJzdGF0dXNcIl0gJiYgeGhyW1wic3RhdHVzXCJdIDwgMzAwXG4gICAgICAgIGlmICF4aHJbXCJyZXNwb25zZVwiXVtcImVycm9yXCJdP1xuICAgICAgICB0aGVuIHJlc29sdmUoeGhyW1wicmVzcG9uc2VcIl0pXG4gICAgICAgIGVsc2UgcmVqZWN0KG5ldyBFcnJvcih4aHJbXCJyZXNwb25zZVwiXVtcImVycm9yXCJdW1wibWVzc2FnZVwiXSkpO1xuICAgICAgZWxzZSByZWplY3QobmV3IEVycm9yKHhocltcInN0YXR1c1wiXSkpO1xuICAgIHhocltcIm9wZW5cIl0oXCJHRVRcIiwgdXJsKTtcbiAgICB4aHJbXCJyZXNwb25zZVR5cGVcIl0gPSBcImFycmF5YnVmZmVyXCJcbiAgICB4aHJbXCJzZW5kXCJdKClcblxuXG4gICAgZ2V0UENNID0gKGFjdHgsIG9zYywgc3RvcFRpbWU9MSktPlxuICAgICAgbmV3IFByb21pc2UgKHJlc29sdmUsIHJlamVjdCktPlxuICAgICAgICBwcm9jZXNzb3IgPSBhY3R4LmNyZWF0ZVNjcmlwdFByb2Nlc3NvcigxNjM4NC8xNiwgMSwgMSlcbiAgICAgICAgcmVjYnVmID0gbmV3IFJlY29yZEJ1ZmZlcihwcm9jZXNzb3IuYnVmZmVyU2l6ZSwgMSlcbiAgICAgICAgc3RvcFNhbXBsZSA9IHN0b3BUaW1lICogYWN0eC5zYW1wbGVSYXRlXG4gICAgICAgICNPcGVyYSAyNy4wLjE2ODkuMzNcbiAgICAgICAgI0Nocm9tZSA0MS4wLjIyNTkuMCBjYW5hcnkgKDY0LWJpdClcbiAgICAgICAgY29uc29sZS5sb2cgcHJvY2Vzc29yLm9uYXVkaW9wcm9jZXNzID0gKGV2KS0+XG4gICAgICAgICAgcmVjYnVmLmFkZChbZXYuaW5wdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCldKVxuICAgICAgICAgIGN1cnJlbnRTYW1wbGUgPSByZWNidWYuY291bnQgKiByZWNidWYuYnVmZmVyU2l6ZVxuICAgICAgICAgIGlmIGN1cnJlbnRTYW1wbGUgLSBzdG9wU2FtcGxlIDwgMCB0aGVuIHJldHVyblxuICAgICAgICAgIHByb2Nlc3Nvci5kaXNjb25uZWN0KDApXG4gICAgICAgICAgcHJvY2Vzc29yLm9uYXVkaW9wcm9jZXNzID0gbnVsbFxuICAgICAgICAgIGRhdGEgPSByZWNidWYuZ2V0Q2hhbm5lbERhdGEoMClcbiAgICAgICAgICByZWNidWYuY2xlYXIoKVxuICAgICAgICAgIHJlc29sdmUoZGF0YSlcbiAgICAgICAgb3NjLmNvbm5lY3QocHJvY2Vzc29yKVxuICAgICAgICBwcm9jZXNzb3IuY29ubmVjdChhY3R4LmRlc3RpbmF0aW9uKVxuXG4qL1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGluZ3MvdHNkLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3RoaXJkcGFydHkvZHNwL2RzcC5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2R1eGNhLmxpYi50c1wiIC8+XG52YXIgZHV4Y2E7XG4oZnVuY3Rpb24gKGR1eGNhKSB7XG4gICAgdmFyIGxpYjtcbiAgICAoZnVuY3Rpb24gKGxpYikge1xuICAgICAgICB2YXIgU2lnbmFsO1xuICAgICAgICAoZnVuY3Rpb24gKFNpZ25hbCkge1xuICAgICAgICAgICAgZnVuY3Rpb24gaW5kZXhUb0ZyZXEoaW5kZXgsIHNhbXBsZVJhdGUsIGZmdFNpemUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGluZGV4ICogc2FtcGxlUmF0ZSkgLyBmZnRTaXplO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgU2lnbmFsLmluZGV4VG9GcmVxID0gaW5kZXhUb0ZyZXE7XG4gICAgICAgICAgICBmdW5jdGlvbiBmcmVxVG9JbmRleChmcmVxLCBzYW1wbGVSYXRlLCBmZnRTaXplKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChmcmVxICogZmZ0U2l6ZSkgLyBzYW1wbGVSYXRlIHwgMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFNpZ25hbC5mcmVxVG9JbmRleCA9IGZyZXFUb0luZGV4O1xuICAgICAgICAgICAgZnVuY3Rpb24gdGltZVRvSW5kZXgoc2FtcGxlUmF0ZSwgdGltZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzYW1wbGVSYXRlICogdGltZSB8IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBTaWduYWwudGltZVRvSW5kZXggPSB0aW1lVG9JbmRleDtcbiAgICAgICAgICAgIGZ1bmN0aW9uIGluZGV4VG9UaW1lKHNhbXBsZVJhdGUsIGN1cnJlbnRJbmRleCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjdXJyZW50SW5kZXggLyBzYW1wbGVSYXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgU2lnbmFsLmluZGV4VG9UaW1lID0gaW5kZXhUb1RpbWU7XG4gICAgICAgICAgICBmdW5jdGlvbiBjYWxjQ29ycihzaWduYWwsIGlucHV0LCBzYW1wbGVSYXRlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZmdCA9IG5ldyBGRlQoaW5wdXQubGVuZ3RoLCBzYW1wbGVSYXRlKTtcbiAgICAgICAgICAgICAgICBmZnQuZm9yd2FyZChzaWduYWwpO1xuICAgICAgICAgICAgICAgIHZhciBzaWdfc3BlY3RydW0gPSBuZXcgRmxvYXQzMkFycmF5KGZmdC5zcGVjdHJ1bSk7XG4gICAgICAgICAgICAgICAgdmFyIHNpZ19yZWFsID0gbmV3IEZsb2F0MzJBcnJheShmZnQucmVhbCk7XG4gICAgICAgICAgICAgICAgdmFyIHNpZ19pbWFnID0gbmV3IEZsb2F0MzJBcnJheShmZnQuaW1hZyk7XG4gICAgICAgICAgICAgICAgZmZ0LmZvcndhcmQoaW5wdXQpO1xuICAgICAgICAgICAgICAgIHZhciBzcGVjdHJ1bSA9IG5ldyBGbG9hdDMyQXJyYXkoZmZ0LnNwZWN0cnVtKTtcbiAgICAgICAgICAgICAgICB2YXIgcmVhbCA9IG5ldyBGbG9hdDMyQXJyYXkoZmZ0LnJlYWwpO1xuICAgICAgICAgICAgICAgIHZhciBpbWFnID0gbmV3IEZsb2F0MzJBcnJheShmZnQuaW1hZyk7XG4gICAgICAgICAgICAgICAgdmFyIGNyb3NzX3JlYWwgPSBBcnJheS5wcm90b3R5cGUubWFwLmNhbGwocmVhbCwgZnVuY3Rpb24gKF8sIGkpIHsgcmV0dXJuIHNpZ19yZWFsW2ldICogcmVhbFtpXSAvIHJlYWwubGVuZ3RoOyB9KTtcbiAgICAgICAgICAgICAgICB2YXIgY3Jvc3NfaW1hZyA9IEFycmF5LnByb3RvdHlwZS5tYXAuY2FsbChpbWFnLCBmdW5jdGlvbiAoXywgaSkgeyByZXR1cm4gLXNpZ19yZWFsW2ldICogaW1hZ1tpXSAvIGltYWcubGVuZ3RoOyB9KTtcbiAgICAgICAgICAgICAgICB2YXIgaW52X3JlYWwgPSBmZnQuaW52ZXJzZShjcm9zc19yZWFsLCBjcm9zc19pbWFnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaW52X3JlYWw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBTaWduYWwuY2FsY0NvcnIgPSBjYWxjQ29ycjtcbiAgICAgICAgfSkoU2lnbmFsID0gbGliLlNpZ25hbCB8fCAobGliLlNpZ25hbCA9IHt9KSk7XG4gICAgfSkobGliID0gZHV4Y2EubGliIHx8IChkdXhjYS5saWIgPSB7fSkpO1xufSkoZHV4Y2EgfHwgKGR1eGNhID0ge30pKTtcbnZhciBkdXhjYTtcbihmdW5jdGlvbiAoZHV4Y2EpIHtcbiAgICB2YXIgbGliO1xuICAgIChmdW5jdGlvbiAobGliKSB7XG4gICAgICAgIHZhciBXYXZlID0gKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGZ1bmN0aW9uIFdhdmUoY2hhbm5lbCwgc2FtcGxlUmF0ZSwgaW50MTZhcnkpIHtcbiAgICAgICAgICAgICAgICAvL2ludDE2YXJ5IGlzIDE2Yml0IG5DaCBQQ01cbiAgICAgICAgICAgICAgICB2YXIgYml0c1BlclNhbXBsZSwgaSwgaW50MTYsIGosIGxlbiwgb2Zmc2V0LCBzaXplLCB2aWV3O1xuICAgICAgICAgICAgICAgIHNpemUgPSBpbnQxNmFyeS5sZW5ndGggKiAyO1xuICAgICAgICAgICAgICAgIGNoYW5uZWwgPSBjaGFubmVsO1xuICAgICAgICAgICAgICAgIGJpdHNQZXJTYW1wbGUgPSAxNjtcbiAgICAgICAgICAgICAgICBvZmZzZXQgPSA0NDtcbiAgICAgICAgICAgICAgICB0aGlzLnZpZXcgPSBuZXcgRGF0YVZpZXcobmV3IEFycmF5QnVmZmVyKG9mZnNldCArIHNpemUpKTtcbiAgICAgICAgICAgICAgICB0aGlzLndyaXRlVVRGQnl0ZXMoMCwgXCJSSUZGXCIpO1xuICAgICAgICAgICAgICAgIHRoaXMudmlldy5zZXRVaW50MzIoNCwgb2Zmc2V0ICsgc2l6ZSAtIDgsIHRydWUpO1xuICAgICAgICAgICAgICAgIHRoaXMud3JpdGVVVEZCeXRlcyg4LCBcIldBVkVcIik7XG4gICAgICAgICAgICAgICAgdGhpcy53cml0ZVVURkJ5dGVzKDEyLCBcImZtdCBcIik7XG4gICAgICAgICAgICAgICAgdmlldy5zZXRVaW50MzIoMTYsIDE2LCB0cnVlKTtcbiAgICAgICAgICAgICAgICB2aWV3LnNldFVpbnQxNigyMCwgMSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgdmlldy5zZXRVaW50MTYoMjIsIGNoYW5uZWwsIHRydWUpO1xuICAgICAgICAgICAgICAgIHZpZXcuc2V0VWludDMyKDI0LCBzYW1wbGVSYXRlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB2aWV3LnNldFVpbnQzMigyOCwgc2FtcGxlUmF0ZSAqIChiaXRzUGVyU2FtcGxlID4+PiAzKSAqIGNoYW5uZWwsIHRydWUpO1xuICAgICAgICAgICAgICAgIHZpZXcuc2V0VWludDE2KDMyLCAoYml0c1BlclNhbXBsZSA+Pj4gMykgKiBjaGFubmVsLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB2aWV3LnNldFVpbnQxNigzNCwgYml0c1BlclNhbXBsZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgdGhpcy53cml0ZVVURkJ5dGVzKDM2LCAnZGF0YScpO1xuICAgICAgICAgICAgICAgIHZpZXcuc2V0VWludDMyKDQwLCBzaXplLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSBqID0gMCwgbGVuID0gaW50MTZhcnkubGVuZ3RoOyBqIDwgbGVuOyBpID0gKytqKSB7XG4gICAgICAgICAgICAgICAgICAgIGludDE2ID0gaW50MTZhcnlbaV07XG4gICAgICAgICAgICAgICAgICAgIHZpZXcuc2V0SW50MTYob2Zmc2V0ICsgaSAqIDIsIGludDE2LCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBXYXZlLnByb3RvdHlwZS50b0Jsb2IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBCbG9iKFt0aGlzLnZpZXddLCB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiYXVkaW8vd2F2XCJcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBXYXZlLnByb3RvdHlwZS50b1VSTCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gVVJMLmNyZWF0ZU9iamVjdFVSTCh0aGlzLnRvQmxvYigpKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBXYXZlLnByb3RvdHlwZS50b0F1ZGlvID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBhdWRpbztcbiAgICAgICAgICAgICAgICBhdWRpbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhdWRpb1wiKTtcbiAgICAgICAgICAgICAgICBhdWRpby5zcmMgPSB0aGlzLnRvVVJMKCk7XG4gICAgICAgICAgICAgICAgYXVkaW8uY29udHJvbHMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJldHVybiBhdWRpbztcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBXYXZlLnByb3RvdHlwZS53cml0ZVVURkJ5dGVzID0gZnVuY3Rpb24gKG9mZnNldCwgc3RyKSB7XG4gICAgICAgICAgICAgICAgdmFyIGksIGosIHJlZjtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSBqID0gMCwgcmVmID0gc3RyLmxlbmd0aDsgMCA8PSByZWYgPyBqIDwgcmVmIDogaiA+IHJlZjsgaSA9IDAgPD0gcmVmID8gKytqIDogLS1qKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmlldy5zZXRVaW50OChvZmZzZXQgKyBpLCBzdHIuY2hhckNvZGVBdChpKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBXYXZlO1xuICAgICAgICB9KSgpO1xuICAgICAgICBsaWIuV2F2ZSA9IFdhdmU7XG4gICAgfSkobGliID0gZHV4Y2EubGliIHx8IChkdXhjYS5saWIgPSB7fSkpO1xufSkoZHV4Y2EgfHwgKGR1eGNhID0ge30pKTtcbi8qXG5cblxuXG5jbGFzcyBXYXZlXG4gIGNvbnN0cnVjdG9yOiAoY2hhbm5lbCwgc2FtcGxlUmF0ZSwgaW50MTZhcnkpLT4jaW50MTZhcnkgaXMgMTZiaXQgbkNoIFBDTVxuICAgIHNpemUgPSBpbnQxNmFyeS5sZW5ndGggKiAyICMg44OH44O844K/44K144Kk44K6IChieXRlKSAjIDhiaXQqMiA9IDE2Yml0XG4gICAgY2hhbm5lbCA9IGNoYW5uZWwgIyDjg4Hjg6Pjg7Pjg43jg6vmlbAgKDE644Oi44OO44Op44OrIG9yIDI644K544OG44Os44KqKVxuICAgIGJpdHNQZXJTYW1wbGUgPSAxNiAjIOOCteODs+ODl+ODq+OBguOBn+OCiuOBruODk+ODg+ODiOaVsCAoOCBvciAxNikgIyAxNmJpdCBQQ01cbiAgICBvZmZzZXQgPSA0NCAjIOODmOODg+ODgOmDqOWIhuOBruOCteOCpOOCulxuICAgIHZpZXcgPSBuZXcgRGF0YVZpZXcobmV3IEFycmF5QnVmZmVyKG9mZnNldCArIHNpemUpKSAjIOODkOOCpOODiOmFjeWIl+OCkuS9nOaIkFxuICAgIHdyaXRlVVRGQnl0ZXModmlldywgMCwgXCJSSUZGXCIpICAgICAgICAgIyBDaHVuayBJRCAjIFJJRkYg44OY44OD44OAXG4gICAgdmlldy5zZXRVaW50MzIoNCwgb2Zmc2V0ICsgc2l6ZSAtIDgsIHRydWUpICMgQ2h1bmsgU2l6ZSAjIOODleOCoeOCpOODq+OCteOCpOOCuiAtIDhcbiAgICB3cml0ZVVURkJ5dGVzKHZpZXcsIDgsIFwiV0FWRVwiKSAgICAgICAgICMgRm9ybWF0ICMgV0FWRSDjg5jjg4Pjg4BcbiAgICB3cml0ZVVURkJ5dGVzKHZpZXcsIDEyLCBcImZtdCBcIikgICAgICAgICMgU3ViY2h1bmsgMSBJRCAjIGZtdCDjg4Hjg6Pjg7Pjgq9cbiAgICB2aWV3LnNldFVpbnQzMigxNiwgMTYsIHRydWUpICAgICAgICAgICAjIFN1YmNodW5rIDEgU2l6ZSAjIGZtdCDjg4Hjg6Pjg7Pjgq/jga7jg5DjgqTjg4jmlbBcbiAgICB2aWV3LnNldFVpbnQxNigyMCwgMSwgdHJ1ZSkgICAgICAgICAgICAjIEF1ZGlvIEZvcm1hdCAjIOODleOCqeODvOODnuODg+ODiElEXG4gICAgdmlldy5zZXRVaW50MTYoMjIsIGNoYW5uZWwsIHRydWUpICAgICAgICAgICAgIyBOdW0gQ2hhbm5lbHMgIyDjg4Hjg6Pjg7Pjg43jg6vmlbBcbiAgICB2aWV3LnNldFVpbnQzMigyNCwgc2FtcGxlUmF0ZSwgdHJ1ZSkgICAjIFNhbXBsZSBSYXRlIChIeikgIyDjgrXjg7Pjg5fjg6rjg7PjgrDjg6zjg7zjg4hcbiAgICB2aWV3LnNldFVpbnQzMigyOCwgc2FtcGxlUmF0ZSAqIChiaXRzUGVyU2FtcGxlID4+PiAzKSAqIGNoYW5uZWwsIHRydWUpICMgQnl0ZSBSYXRlICjjgrXjg7Pjg5fjg6rjg7PjgrDlkajms6LmlbAgKiDjg5bjg63jg4Pjgq/jgrXjgqTjgropICMg44OH44O844K/6YCf5bqmXG4gICAgdmlldy5zZXRVaW50MTYoMzIsIChiaXRzUGVyU2FtcGxlID4+PiAzKSAqIGNoYW5uZWwsIHRydWUpICAgICAgICAgICAgICAjIEJsb2NrIEFsaWduICjjg4Hjg6Pjg7Pjg43jg6vmlbAgKiAx44K144Oz44OX44Or44GC44Gf44KK44Gu44OT44OD44OI5pWwIC8gOCkgIyDjg5bjg63jg4Pjgq/jgrXjgqTjgrpcbiAgICB2aWV3LnNldFVpbnQxNigzNCwgYml0c1BlclNhbXBsZSwgdHJ1ZSkjIEJpdHMgUGVyIFNhbXBsZSAjIOOCteODs+ODl+ODq+OBguOBn+OCiuOBruODk+ODg+ODiOaVsFxuICAgIHdyaXRlVVRGQnl0ZXModmlldywgMzYsICdkYXRhJykgICAgICAgICMgU3ViY2h1bmsgMiBJRFxuICAgIHZpZXcuc2V0VWludDMyKDQwLCBzaXplLCB0cnVlKSAgICAgICAgICMgU3ViY2h1bmsgMiBTaXplICMg5rOi5b2i44OH44O844K/44Gu44OQ44Kk44OI5pWwXG4gICAgZm9yIGludDE2LCBpIGluIGludDE2YXJ5XG4gICAgICB2aWV3LnNldEludDE2KG9mZnNldCArIGkqMiwgaW50MTYsIHRydWUpXG4gICAgQHZhbHVlID0gdmlld1xuICB0b0Jsb2I6IC0+XG4gICAgbmV3IEJsb2IoW0B2YWx1ZV0sIHt0eXBlOiBcImF1ZGlvL3dhdlwifSlcbiAgdG9VUkw6IC0+XG4gICAgVVJMLmNyZWF0ZU9iamVjdFVSTChAdG9CbG9iKCkpXG4gIHRvQXVkaW86IC0+XG4gICAgYXVkaW8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYXVkaW9cIilcbiAgICBhdWRpby5zcmMgPSBAdG9VUkwoKVxuICAgIGF1ZGlvLmNvbnRyb2xzID0gdHJ1ZVxuICAgIGF1ZGlvXG4gIHdyaXRlVVRGQnl0ZXMgPSAodmlldywgb2Zmc2V0LCBzdHIpLT5cbiAgICBmb3IgaSBpbiBbMC4uLnN0ci5sZW5ndGhdXG4gICAgICB2aWV3LnNldFVpbnQ4KG9mZnNldCArIGksIHN0ci5jaGFyQ29kZUF0KGkpLCB0cnVlKVxuICAgIHJldHVyblxuKi9cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBpbmdzL3RzZC5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2R1eGNhLmxpYi50c1wiIC8+XG52YXIgZHV4Y2E7XG4oZnVuY3Rpb24gKGR1eGNhKSB7XG4gICAgdmFyIGxpYjtcbiAgICAoZnVuY3Rpb24gKGxpYikge1xuICAgICAgICB2YXIgQ2FudmFzO1xuICAgICAgICAoZnVuY3Rpb24gKENhbnZhcykge1xuICAgICAgICAgICAgZnVuY3Rpb24gaHVlMnJnYihwLCBxLCB0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHQgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHQgKz0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHQgPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHQgLT0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHQgPCAxIC8gNikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcCArIChxIC0gcCkgKiA2ICogdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHQgPCAxIC8gMikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHQgPCAyIC8gMykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcCArIChxIC0gcCkgKiAoMiAvIDMgLSB0KSAqIDY7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgQ2FudmFzLmh1ZTJyZ2IgPSBodWUycmdiO1xuICAgICAgICAgICAgZnVuY3Rpb24gaHNsVG9SZ2IoaCwgcywgbCkge1xuICAgICAgICAgICAgICAgIC8vIGgsIHMsIGw6IDB+MVxuICAgICAgICAgICAgICAgIHZhciBiLCBnLCBwLCBxLCByO1xuICAgICAgICAgICAgICAgIGggKj0gNSAvIDY7XG4gICAgICAgICAgICAgICAgaWYgKGggPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGggPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoNSAvIDYgPCBoKSB7XG4gICAgICAgICAgICAgICAgICAgIGggPSA1IC8gNjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgciA9IGcgPSBiID0gbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHEgPSBsIDwgMC41ID8gbCAqICgxICsgcykgOiBsICsgcyAtIGwgKiBzO1xuICAgICAgICAgICAgICAgICAgICBwID0gMiAqIGwgLSBxO1xuICAgICAgICAgICAgICAgICAgICByID0gaHVlMnJnYihwLCBxLCBoICsgMSAvIDMpO1xuICAgICAgICAgICAgICAgICAgICBnID0gaHVlMnJnYihwLCBxLCBoKTtcbiAgICAgICAgICAgICAgICAgICAgYiA9IGh1ZTJyZ2IocCwgcSwgaCAtIDEgLyAzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtyICogMjU1LCBnICogMjU1LCBiICogMjU1XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIENhbnZhcy5oc2xUb1JnYiA9IGhzbFRvUmdiO1xuICAgICAgICB9KShDYW52YXMgPSBsaWIuQ2FudmFzIHx8IChsaWIuQ2FudmFzID0ge30pKTtcbiAgICB9KShsaWIgPSBkdXhjYS5saWIgfHwgKGR1eGNhLmxpYiA9IHt9KSk7XG59KShkdXhjYSB8fCAoZHV4Y2EgPSB7fSkpO1xuLypcblxuaW5pdENhbnZhcyA9ICh3aWR0aCwgaGVpZ2h0KS0+XG4gIGNudiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIilcbiAgY252LndpZHRoID0gd2lkdGhcbiAgY252LmhlaWdodCA9IGhlaWdodFxuICBjdHggPSBjbnYuZ2V0Q29udGV4dChcIjJkXCIpXG4gIFtjbnYsIGN0eF1cblxuc3Ryb2tlQXJyYXkgPSAoY252LCBjdHgsIGFyeSwgZmxhZ1g9ZmFsc2UsIGZsYWdZPWZhbHNlKS0+XG4gIHpvb21YID0gaWYgIWZsYWdYIHRoZW4gMSBlbHNlIGNudi53aWR0aC9hcnkubGVuZ3RoXG4gIHpvb21ZID0gaWYgIWZsYWdZIHRoZW4gMSBlbHNlIGNudi5oZWlnaHQvTWF0aC5tYXguYXBwbHkobnVsbCwgYXJ5KVxuICBjdHguYmVnaW5QYXRoKClcbiAgY3R4Lm1vdmVUbygwLCBjbnYuaGVpZ2h0IC0gYXJ5WzBdKnpvb21ZKVxuICBmb3IgaSBpbiBbMS4uLmFyeS5sZW5ndGhdXG4gICAgY3R4LmxpbmVUbyh6b29tWCppLCBjbnYuaGVpZ2h0IC0gYXJ5W2ldKnpvb21ZKVxuICBjdHguc3Ryb2tlKClcbiAgcmV0dXJuXG5cbmNvbExpbmUgPSAoY252LCBjdHgsIHgpLT5cbiAgY3R4LmJlZ2luUGF0aCgpXG4gIGN0eC5tb3ZlVG8oeCwgMClcbiAgY3R4LmxpbmVUbyh4LCBjbnYuaGVpZ2h0KVxuICBjdHguc3Ryb2tlKClcblxucm93TGluZSA9IChjbnYsIGN0eCwgeSktPlxuICBjdHguYmVnaW5QYXRoKClcbiAgY3R4Lm1vdmVUbygwLCB5KVxuICBjdHgubGluZVRvKGNudi53aWR0aCwgeSlcbiAgY3R4LnN0cm9rZSgpXG5pbml0Q2FudmFzID0gKHdpZHRoLCBoZWlnaHQpLT5cbiAgY252ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKVxuICBjbnYud2lkdGggPSB3aWR0aFxuICBjbnYuaGVpZ2h0ID0gaGVpZ2h0XG4gIGN0eCA9IGNudi5nZXRDb250ZXh0KFwiMmRcIilcbiAgW2NudiwgY3R4XVxuXG5cblxuXG5nZXRNZWRpYVN0cmVhbSA9IC0+XG4gIG5ldyBQcm9taXNlIChyZXNvbHZlLCByZWplY3QpLT5cbiAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKHt2aWRlbzogZmFsc2UsIGF1ZGlvOiB0cnVlfSwgcmVzb2x2ZSwgcmVqZWN0KVxuXG5zdHJva2VBcnJheSA9IChjbnYsIGN0eCwgYXJ5LCBmbGFnWD1mYWxzZSwgZmxhZ1k9ZmFsc2UpLT5cbiAgem9vbVggPSBpZiAhZmxhZ1ggdGhlbiAxIGVsc2UgY252LndpZHRoL2FyeS5sZW5ndGhcbiAgem9vbVkgPSBpZiAhZmxhZ1kgdGhlbiAxIGVsc2UgY252LmhlaWdodC9NYXRoLm1heC5hcHBseShudWxsLCBhcnkpXG4gIGN0eC5iZWdpblBhdGgoKVxuICBjdHgubW92ZVRvKDAsIGNudi5oZWlnaHQgLSBhcnlbMF0qem9vbVkpXG4gIGZvciBpIGluIFsxLi4uYXJ5Lmxlbmd0aF1cbiAgICBjdHgubGluZVRvKHpvb21YKmksIGNudi5oZWlnaHQgLSBhcnlbaV0qem9vbVkpXG4gIGN0eC5zdHJva2UoKVxuICByZXR1cm5cblxuXG5kcmF3U3BlY3Ryb2dyYW1Ub0ltYWdlRGF0YSA9IChjbnYsIGN0eCwgc3BlY3Ryb2dyYW0sIG1heD0yNTUpLT5cbiAgaW1nZGF0YSA9IGN0eC5jcmVhdGVJbWFnZURhdGEoc3BlY3Ryb2dyYW0ubGVuZ3RoIG9yIDEsIHNwZWN0cm9ncmFtWzBdPy5sZW5ndGggb3IgMSlcbiAgZm9yIHNwZWN0cnVtLCBpIGluIHNwZWN0cm9ncmFtXG4gICAgZm9yIF8sIGogaW4gc3BlY3RydW1cbiAgICAgIFtyLCBnLCBiXSA9IGhzbFRvUmdiKHNwZWN0cnVtW2pdL21heCwgMC41LCAwLjUpXG4gICAgICBbeCwgeV0gPSBbaSwgaW1nZGF0YS5oZWlnaHQgLSAxIC0gal1cbiAgICAgIGluZGV4ID0geCArIHkqaW1nZGF0YS53aWR0aFxuICAgICAgaW1nZGF0YS5kYXRhW2luZGV4KjQrMF0gPSBifDBcbiAgICAgIGltZ2RhdGEuZGF0YVtpbmRleCo0KzFdID0gZ3wwXG4gICAgICBpbWdkYXRhLmRhdGFbaW5kZXgqNCsyXSA9IHJ8MFxuICAgICAgaW1nZGF0YS5kYXRhW2luZGV4KjQrM10gPSAyNTVcbiAgaW1nZGF0YVxuXG5cblxuXG4qL1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGluZ3MvdHNkLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3RoaXJkcGFydHkvZHNwL2RzcC5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90cy9kdXhjYS5saWIudHNcIiAvPlxuUVVuaXQubW9kdWxlKFwiZHV4Y2EubGliXCIpO1xuUVVuaXQudGVzdChcImNhbGNDb3JyXCIsIGZ1bmN0aW9uIChhc3NlcnQpIHtcbiAgICB2YXIgcnNsdCA9IGR1eGNhLmxpYi5TaWduYWwuY2FsY0NvcnIoWzEsIDAsIDAsIDBdLCBbMSwgMSwgMSwgMV0pO1xuICAgIHJldHVybiBhc3NlcnQub2socnNsdFswXSA9PSAwLjI1KTtcbn0pO1xuIl19
