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
        lib.calcCorr = calcCorr;
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
        lib.hue2rgb = hue2rgb;
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
        lib.hslToRgb = hslToRgb;
        function indexToFreq(index, sampleRate, fftSize) {
            return index * sampleRate / fftSize;
        }
        lib.indexToFreq = indexToFreq;
        function freqToIndex(freq, sampleRate, fftSize) {
            return freq * fftSize / sampleRate | 0;
        }
        lib.freqToIndex = freqToIndex;
        function timeToIndex(sampleRate, time) {
            return sampleRate * time | 0;
        }
        lib.timeToIndex = timeToIndex;
        function indexToTime(sampleRate, currentIndex) {
            return currentIndex / sampleRate;
        }
        lib.indexToTime = indexToTime;
        function summation(ary) {
            var j, len, sum, v;
            sum = 0;
            for (j = 0, len = ary.length; j < len; j++) {
                v = ary[j];
                sum += v;
            }
            return sum;
        }
        lib.summation = summation;
        function average(ary) {
            return summation(ary) / ary.length;
        }
        lib.average = average;
        function variance(ary) {
            var ave, j, len, sum, v;
            ave = average(ary);
            sum = 0;
            for (j = 0, len = ary.length; j < len; j++) {
                v = ary[j];
                sum += Math.pow(v - ave, 2);
            }
            return sum / (ary.length - 1);
        }
        lib.variance = variance;
        function stdev(ary) {
            return Math.sqrt(variance(ary));
        }
        lib.stdev = stdev;
        function derivative(ary) {
            var i;
            return [0].concat(function () {
                var j, ref, results;
                results = [];
                for (i = j = 1, ref = ary.length - 1; 1 <= ref ? j <= ref : j >= ref; i = 1 <= ref ? ++j : --j) {
                    results.push(ary[i] - ary[i - 1]);
                }
                return results;
            }());
        }
        lib.derivative = derivative;
        function median(ary) {
            return Array.prototype.slice.call(ary, 0).sort()[ary.length / 2 | 0];
        }
        lib.median = median;
        function KDE(ary, h) {
            var f, j, kernel, len, results, x;
            if (h == null) {
                h = 1.06 * stdev(ary) * Math.pow(ary.length, -1 / 5) + 1e-10;
            }
            kernel = function (x) {
                return Math.pow(Math.E, -Math.pow(x, 2) / 2) / Math.sqrt(2 * Math.PI);
            };
            f = function (x) {
                var i, j, len, s, v;
                s = 0;
                for (i = j = 0, len = ary.length; j < len; i = ++j) {
                    v = ary[i];
                    s += kernel((x - v) / h);
                }
                return s / (h * ary.length);
            };
            results = [];
            for (j = 0, len = ary.length; j < len; j++) {
                x = ary[j];
                results.push(f(x));
            }
            return results;
        }
        lib.KDE = KDE;
        function mode(ary) {
            return ary[findMax(KDE(ary, 0))[1]];
        }
        lib.mode = mode;
        function gaussian(x) {
            return 1 / Math.sqrt(2 * Math.PI) * Math.exp(-Math.pow(x, 2) / 2);
        }
        lib.gaussian = gaussian;
        function findMax(ary, min, max) {
            var i, index, j, ref, ref1, result;
            if (min == null) {
                min = 0;
            }
            if (max == null) {
                max = ary.length - 1;
            }
            result = -Infinity;
            index = -1;
            for (i = j = ref = min, ref1 = max; ref <= ref1 ? j <= ref1 : j >= ref1; i = ref <= ref1 ? ++j : --j) {
                if (!(ary[i] > result)) {
                    continue;
                }
                result = ary[i];
                index = i;
            }
            return [
                result,
                index
            ];
        }
        lib.findMax = findMax;
        function findMin(ary, min, max) {
            var i, index, j, ref, ref1, result;
            if (min == null) {
                min = 0;
            }
            if (max == null) {
                max = ary.length - 1;
            }
            result = Infinity;
            index = -1;
            for (i = j = ref = min, ref1 = max; ref <= ref1 ? j <= ref1 : j >= ref1; i = ref <= ref1 ? ++j : --j) {
                if (!(ary[i] < result)) {
                    continue;
                }
                result = ary[i];
                index = i;
            }
            return [
                result,
                index
            ];
        }
        lib.findMin = findMin;
    }(lib = duxca.lib || (duxca.lib = {})));
}(duxca || (duxca = {})));
QUnit.module('duxca.lib');
QUnit.test('calcCorr', function (assert) {
    var rslt = duxca.lib.calcCorr([
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
        line: 2508
    }));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRlc3RzLmpzIl0sIm5hbWVzIjpbIkRTUCIsIkxFRlQiLCJSSUdIVCIsIk1JWCIsIlNJTkUiLCJUUklBTkdMRSIsIlNBVyIsIlNRVUFSRSIsIkxPV1BBU1MiLCJISUdIUEFTUyIsIkJBTkRQQVNTIiwiTk9UQ0giLCJCQVJUTEVUVCIsIkJBUlRMRVRUSEFOTiIsIkJMQUNLTUFOIiwiQ09TSU5FIiwiR0FVU1MiLCJIQU1NSU5HIiwiSEFOTiIsIkxBTkNaT1MiLCJSRUNUQU5HVUxBUiIsIlRSSUFOR1VMQVIiLCJPRkYiLCJGVyIsIkJXIiwiRldCVyIsIlRXT19QSSIsIk1hdGgiLCJQSSIsInNldHVwVHlwZWRBcnJheSIsIm5hbWUiLCJmYWxsYmFjayIsIm9iaiIsIkFycmF5IiwiaW52ZXJ0IiwiYnVmZmVyIiwiaSIsImxlbiIsImxlbmd0aCIsImludGVybGVhdmUiLCJsZWZ0IiwicmlnaHQiLCJzdGVyZW9JbnRlcmxlYXZlZCIsIkZsb2F0MzJBcnJheSIsImRlaW50ZXJsZWF2ZSIsIm1peCIsImRlaW50ZXJsZWF2ZUNoYW5uZWwiLCJjaGFubmVsIiwiZ2V0Q2hhbm5lbCIsIm1peFNhbXBsZUJ1ZmZlcnMiLCJzYW1wbGVCdWZmZXIxIiwic2FtcGxlQnVmZmVyMiIsIm5lZ2F0ZSIsInZvbHVtZUNvcnJlY3Rpb24iLCJvdXRwdXRTYW1wbGVzIiwiTFBGIiwiSFBGIiwiQlBGX0NPTlNUQU5UX1NLSVJUIiwiQlBGX0NPTlNUQU5UX1BFQUsiLCJBUEYiLCJQRUFLSU5HX0VRIiwiTE9XX1NIRUxGIiwiSElHSF9TSEVMRiIsIlEiLCJTIiwiUk1TIiwidG90YWwiLCJuIiwic3FydCIsIlBlYWsiLCJwZWFrIiwiYWJzIiwiRm91cmllclRyYW5zZm9ybSIsImJ1ZmZlclNpemUiLCJzYW1wbGVSYXRlIiwiYmFuZHdpZHRoIiwic3BlY3RydW0iLCJyZWFsIiwiaW1hZyIsInBlYWtCYW5kIiwiZ2V0QmFuZEZyZXF1ZW5jeSIsImluZGV4IiwiY2FsY3VsYXRlU3BlY3RydW0iLCJiU2kiLCJydmFsIiwiaXZhbCIsIm1hZyIsIk4iLCJERlQiLCJjYWxsIiwic2luVGFibGUiLCJjb3NUYWJsZSIsInNpbiIsImNvcyIsInByb3RvdHlwZSIsImZvcndhcmQiLCJrIiwiRkZUIiwicmV2ZXJzZVRhYmxlIiwiVWludDMyQXJyYXkiLCJsaW1pdCIsImJpdCIsImZsb29yIiwibG9nIiwiTE4yIiwicG93IiwiaGFsZlNpemUiLCJwaGFzZVNoaWZ0U3RlcFJlYWwiLCJwaGFzZVNoaWZ0U3RlcEltYWciLCJjdXJyZW50UGhhc2VTaGlmdFJlYWwiLCJjdXJyZW50UGhhc2VTaGlmdEltYWciLCJvZmYiLCJ0ciIsInRpIiwidG1wUmVhbCIsImZmdFN0ZXAiLCJpbnZlcnNlIiwicmV2UmVhbCIsInJldkltYWciLCJSRkZUIiwidHJhbnMiLCJyZXZlcnNlQmluUGVybXV0ZSIsImRlc3QiLCJzb3VyY2UiLCJubTEiLCJyIiwiaCIsImdlbmVyYXRlUmV2ZXJzZVRhYmxlIiwieCIsIm4yIiwibjQiLCJuOCIsIm5uIiwidDEiLCJ0MiIsInQzIiwidDQiLCJpMSIsImkyIiwiaTMiLCJpNCIsImk1IiwiaTYiLCJpNyIsImk4Iiwic3QxIiwiY2MxIiwic3MxIiwiY2MzIiwic3MzIiwiZSIsImEiLCJpeCIsImlkIiwiaTAiLCJTUVJUMV8yIiwiaiIsIlNhbXBsZXIiLCJmaWxlIiwicGxheVN0YXJ0IiwicGxheUVuZCIsImxvb3BTdGFydCIsImxvb3BFbmQiLCJsb29wTW9kZSIsImxvYWRlZCIsInNhbXBsZXMiLCJzaWduYWwiLCJmcmFtZUNvdW50IiwiZW52ZWxvcGUiLCJhbXBsaXR1ZGUiLCJyb290RnJlcXVlbmN5IiwiZnJlcXVlbmN5Iiwic3RlcCIsImR1cmF0aW9uIiwic2FtcGxlc1Byb2Nlc3NlZCIsInBsYXloZWFkIiwiYXVkaW8iLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJzZWxmIiwibG9hZFNhbXBsZXMiLCJldmVudCIsImZyYW1lQnVmZmVyIiwicHVzaCIsImxvYWRDb21wbGV0ZSIsImxvYWRNZXRhRGF0YSIsImFkZEV2ZW50TGlzdGVuZXIiLCJtdXRlZCIsInNyYyIsInBsYXkiLCJhcHBseUVudmVsb3BlIiwicHJvY2VzcyIsImdlbmVyYXRlIiwiZnJhbWVPZmZzZXQiLCJsb29wV2lkdGgiLCJwbGF5U3RhcnRTYW1wbGVzIiwicGxheUVuZFNhbXBsZXMiLCJvZmZzZXQiLCJyb3VuZCIsInNldEZyZXEiLCJ0b3RhbFByb2Nlc3NlZCIsInJlc2V0IiwiT3NjaWxsYXRvciIsInR5cGUiLCJ3YXZlVGFibGVMZW5ndGgiLCJjeWNsZXNQZXJTYW1wbGUiLCJwYXJzZUludCIsImZ1bmMiLCJUcmlhbmdsZSIsIlNhdyIsIlNxdWFyZSIsIlNpbmUiLCJnZW5lcmF0ZVdhdmVUYWJsZSIsIndhdmVUYWJsZSIsIndhdmVUYWJsZVRpbWUiLCJ3YXZlVGFibGVIeiIsInNldEFtcCIsImFkZCIsIm9zY2lsbGF0b3IiLCJhZGRTaWduYWwiLCJhZGRFbnZlbG9wZSIsInZhbHVlQXQiLCJQdWxzZSIsIkFEU1IiLCJhdHRhY2tMZW5ndGgiLCJkZWNheUxlbmd0aCIsInN1c3RhaW5MZXZlbCIsInN1c3RhaW5MZW5ndGgiLCJyZWxlYXNlTGVuZ3RoIiwiYXR0YWNrU2FtcGxlcyIsImRlY2F5U2FtcGxlcyIsInN1c3RhaW5TYW1wbGVzIiwicmVsZWFzZVNhbXBsZXMiLCJ1cGRhdGUiLCJhdHRhY2siLCJkZWNheSIsInN1c3RhaW4iLCJyZWxlYXNlIiwibm90ZU9uIiwibm90ZU9mZiIsInByb2Nlc3NTYW1wbGUiLCJzYW1wbGUiLCJ2YWx1ZSIsImlzQWN0aXZlIiwiZGlzYWJsZSIsIklJUkZpbHRlciIsImN1dG9mZiIsInJlc29uYW5jZSIsIkxQMTIiLCJfX2RlZmluZUdldHRlcl9fIiwic2V0IiwiY2FsY0NvZWZmIiwidmlicmFQb3MiLCJ2aWJyYVNwZWVkIiwidyIsInEiLCJjIiwiSUlSRmlsdGVyMiIsImYiLCJmcmVxIiwibWluIiwiZGFtcCIsImlucHV0Iiwib3V0cHV0IiwiV2luZG93RnVuY3Rpb24iLCJhbHBoYSIsIkJhcnRsZXR0IiwiQmFydGxldHRIYW5uIiwiQmxhY2ttYW4iLCJDb3NpbmUiLCJHYXVzcyIsIkhhbW1pbmciLCJIYW5uIiwiTGFuY3pveiIsIlJlY3Rhbmd1bGFyIiwiVHJpYW5ndWxhciIsImEwIiwiYTEiLCJhMiIsIkUiLCJMYW5jem9zIiwic2luaCIsImFyZyIsImV4cCIsIkJpcXVhZCIsIkZzIiwicGFyYW1ldGVyVHlwZSIsInhfMV9sIiwieF8yX2wiLCJ5XzFfbCIsInlfMl9sIiwieF8xX3IiLCJ4XzJfciIsInlfMV9yIiwieV8yX3IiLCJiMCIsImIxIiwiYjIiLCJiMGEwIiwiYjFhMCIsImIyYTAiLCJhMWEwIiwiYTJhMCIsImYwIiwiZEJnYWluIiwiY29lZmZpY2llbnRzIiwiYiIsInNldEZpbHRlclR5cGUiLCJyZWNhbGN1bGF0ZUNvZWZmaWNpZW50cyIsInNldFNhbXBsZVJhdGUiLCJyYXRlIiwic2V0USIsIm1heCIsInNldEJXIiwiYnciLCJzZXRTIiwicyIsInNldEYwIiwic2V0RGJHYWluIiwiZyIsIkEiLCJ3MCIsImNvc3cwIiwic2ludzAiLCJjb2VmZiIsInByb2Nlc3NTdGVyZW8iLCJtYWcyZGIiLCJtaW5EYiIsIm1pbk1hZyIsInJlc3VsdCIsImZyZXF6IiwibnVtZXJhdG9yIiwiZGVub21pbmF0b3IiLCJHcmFwaGljYWxFcSIsIkZTIiwibWluRnJlcSIsIm1heEZyZXEiLCJiYW5kc1Blck9jdGF2ZSIsImZpbHRlcnMiLCJmcmVxenMiLCJjYWxjdWxhdGVGcmVxenMiLCJyZWNhbGN1bGF0ZUZpbHRlcnMiLCJiYW5kQ291bnQiLCJuZXdGaWx0ZXIiLCJyZWNhbGN1bGF0ZUZyZXF6Iiwic2V0TWluaW11bUZyZXF1ZW5jeSIsInNldE1heGltdW1GcmVxdWVuY3kiLCJzZXRCYW5kc1Blck9jdGF2ZSIsImJhbmRzIiwic2V0QmFuZEdhaW4iLCJiYW5kSW5kZXgiLCJnYWluIiwiTXVsdGlEZWxheSIsIm1heERlbGF5SW5TYW1wbGVzU2l6ZSIsImRlbGF5SW5TYW1wbGVzIiwibWFzdGVyVm9sdW1lIiwiZGVsYXlWb2x1bWUiLCJkZWxheUJ1ZmZlclNhbXBsZXMiLCJkZWxheUlucHV0UG9pbnRlciIsImRlbGF5T3V0cHV0UG9pbnRlciIsInNldERlbGF5SW5TYW1wbGVzIiwic2V0TWFzdGVyVm9sdW1lIiwic2V0RGVsYXlWb2x1bWUiLCJkZWxheVNhbXBsZSIsIlNpbmdsZURlbGF5IiwiUmV2ZXJiIiwibWl4Vm9sdW1lIiwiZGFtcEZyZXF1ZW5jeSIsIk5SX09GX01VTFRJREVMQVlTIiwiTlJfT0ZfU0lOR0xFREVMQVlTIiwiTE9XUEFTU0wiLCJMT1dQQVNTUiIsInNpbmdsZURlbGF5cyIsImRlbGF5TXVsdGlwbHkiLCJtdWx0aURlbGF5cyIsInNldE1peFZvbHVtZSIsInNldERhbXBGcmVxdWVuY3kiLCJpbnRlcmxlYXZlZFNhbXBsZXMiLCJsZWZ0UmlnaHRNaXgiLCJmaWx0ZXJlZFNhbXBsZXMiLCJzaW5nbGVEZWxheVNhbXBsZXMiLCJkdXhjYSIsImxpYiIsImNhbGNDb3JyIiwiZmZ0Iiwic2lnX3NwZWN0cnVtIiwic2lnX3JlYWwiLCJzaWdfaW1hZyIsImNyb3NzX3JlYWwiLCJtYXAiLCJfIiwiY3Jvc3NfaW1hZyIsImludl9yZWFsIiwiaHVlMnJnYiIsInAiLCJ0IiwiaHNsVG9SZ2IiLCJsIiwiaW5kZXhUb0ZyZXEiLCJmZnRTaXplIiwiZnJlcVRvSW5kZXgiLCJ0aW1lVG9JbmRleCIsInRpbWUiLCJpbmRleFRvVGltZSIsImN1cnJlbnRJbmRleCIsInN1bW1hdGlvbiIsImFyeSIsInN1bSIsInYiLCJhdmVyYWdlIiwidmFyaWFuY2UiLCJhdmUiLCJzdGRldiIsImRlcml2YXRpdmUiLCJjb25jYXQiLCJyZWYiLCJyZXN1bHRzIiwibWVkaWFuIiwic2xpY2UiLCJzb3J0IiwiS0RFIiwia2VybmVsIiwibW9kZSIsImZpbmRNYXgiLCJnYXVzc2lhbiIsInJlZjEiLCJJbmZpbml0eSIsImZpbmRNaW4iLCJRVW5pdCIsIm1vZHVsZSIsInRlc3QiLCJhc3NlcnQiLCJyc2x0Iiwib2siLCJfZXhwciIsIl9jYXB0IiwiY29udGVudCIsImZpbGVwYXRoIiwibGluZSJdLCJtYXBwaW5ncyI6IkFBZUEsSUFBSUEsR0FBQSxHQUFNO0FBQUEsSUFFUkMsSUFBQSxFQUFnQixDQUZSO0FBQUEsSUFHUkMsS0FBQSxFQUFnQixDQUhSO0FBQUEsSUFJUkMsR0FBQSxFQUFnQixDQUpSO0FBQUEsSUFPUkMsSUFBQSxFQUFnQixDQVBSO0FBQUEsSUFRUkMsUUFBQSxFQUFnQixDQVJSO0FBQUEsSUFTUkMsR0FBQSxFQUFnQixDQVRSO0FBQUEsSUFVUkMsTUFBQSxFQUFnQixDQVZSO0FBQUEsSUFhUkMsT0FBQSxFQUFnQixDQWJSO0FBQUEsSUFjUkMsUUFBQSxFQUFnQixDQWRSO0FBQUEsSUFlUkMsUUFBQSxFQUFnQixDQWZSO0FBQUEsSUFnQlJDLEtBQUEsRUFBZ0IsQ0FoQlI7QUFBQSxJQW1CUkMsUUFBQSxFQUFnQixDQW5CUjtBQUFBLElBb0JSQyxZQUFBLEVBQWdCLENBcEJSO0FBQUEsSUFxQlJDLFFBQUEsRUFBZ0IsQ0FyQlI7QUFBQSxJQXNCUkMsTUFBQSxFQUFnQixDQXRCUjtBQUFBLElBdUJSQyxLQUFBLEVBQWdCLENBdkJSO0FBQUEsSUF3QlJDLE9BQUEsRUFBZ0IsQ0F4QlI7QUFBQSxJQXlCUkMsSUFBQSxFQUFnQixDQXpCUjtBQUFBLElBMEJSQyxPQUFBLEVBQWdCLENBMUJSO0FBQUEsSUEyQlJDLFdBQUEsRUFBZ0IsQ0EzQlI7QUFBQSxJQTRCUkMsVUFBQSxFQUFnQixFQTVCUjtBQUFBLElBK0JSQyxHQUFBLEVBQWdCLENBL0JSO0FBQUEsSUFnQ1JDLEVBQUEsRUFBZ0IsQ0FoQ1I7QUFBQSxJQWlDUkMsRUFBQSxFQUFnQixDQWpDUjtBQUFBLElBa0NSQyxJQUFBLEVBQWdCLENBbENSO0FBQUEsSUFxQ1JDLE1BQUEsRUFBZ0IsSUFBRUMsSUFBQSxDQUFLQyxFQXJDZjtBQUFBLENBQVY7QUF5Q0EsU0FBU0MsZUFBVCxDQUF5QkMsSUFBekIsRUFBK0JDLFFBQS9CLEVBQXlDO0FBQUEsSUFHdkMsSUFBSSxPQUFPLEtBQUtELElBQUwsQ0FBUCxLQUFzQixVQUF0QixJQUFvQyxPQUFPLEtBQUtBLElBQUwsQ0FBUCxLQUFzQixRQUE5RCxFQUF3RTtBQUFBLFFBRXRFLElBQUksT0FBTyxLQUFLQyxRQUFMLENBQVAsS0FBMEIsVUFBMUIsSUFBd0MsT0FBTyxLQUFLQSxRQUFMLENBQVAsS0FBMEIsUUFBdEUsRUFBZ0Y7QUFBQSxZQUM5RSxLQUFLRCxJQUFMLElBQWEsS0FBS0MsUUFBTCxDQUFiLENBRDhFO0FBQUEsU0FBaEYsTUFFTztBQUFBLFlBRUwsS0FBS0QsSUFBTCxJQUFhLFVBQVNFLEdBQVQsRUFBYztBQUFBLGdCQUN6QixJQUFJQSxHQUFBLFlBQWVDLEtBQW5CLEVBQTBCO0FBQUEsb0JBQ3hCLE9BQU9ELEdBQVAsQ0FEd0I7QUFBQSxpQkFBMUIsTUFFTyxJQUFJLE9BQU9BLEdBQVAsS0FBZSxRQUFuQixFQUE2QjtBQUFBLG9CQUNsQyxPQUFPLElBQUlDLEtBQUosQ0FBVUQsR0FBVixDQUFQLENBRGtDO0FBQUEsaUJBSFg7QUFBQSxhQUEzQixDQUZLO0FBQUEsU0FKK0Q7QUFBQSxLQUhqQztBQUFBLENBekN6QztBQTZEQUgsZUFBQSxDQUFnQixjQUFoQixFQUFnQyxpQkFBaEMsRUE3REE7QUE4REFBLGVBQUEsQ0FBZ0IsWUFBaEIsRUFBZ0MsZUFBaEMsRUE5REE7QUErREFBLGVBQUEsQ0FBZ0IsYUFBaEIsRUFBZ0MseUJBQWhDLEVBL0RBO0FBZ0VBQSxlQUFBLENBQWdCLFlBQWhCLEVBQWdDLHdCQUFoQyxFQWhFQTtBQThFQTdCLEdBQUEsQ0FBSWtDLE1BQUosR0FBYSxVQUFTQyxNQUFULEVBQWlCO0FBQUEsSUFDNUIsS0FBSyxJQUFJQyxDQUFBLEdBQUksQ0FBUixFQUFXQyxHQUFBLEdBQU1GLE1BQUEsQ0FBT0csTUFBeEIsQ0FBTCxDQUFxQ0YsQ0FBQSxHQUFJQyxHQUF6QyxFQUE4Q0QsQ0FBQSxFQUE5QyxFQUFtRDtBQUFBLFFBQ2pERCxNQUFBLENBQU9DLENBQVAsS0FBYSxDQUFDLENBQWQsQ0FEaUQ7QUFBQSxLQUR2QjtBQUFBLElBSzVCLE9BQU9ELE1BQVAsQ0FMNEI7QUFBQSxDQUE5QixDQTlFQTtBQThGQW5DLEdBQUEsQ0FBSXVDLFVBQUosR0FBaUIsVUFBU0MsSUFBVCxFQUFlQyxLQUFmLEVBQXNCO0FBQUEsSUFDckMsSUFBSUQsSUFBQSxDQUFLRixNQUFMLEtBQWdCRyxLQUFBLENBQU1ILE1BQTFCLEVBQWtDO0FBQUEsUUFDaEMsTUFBTSw2Q0FBTixDQURnQztBQUFBLEtBREc7QUFBQSxJQUtyQyxJQUFJSSxpQkFBQSxHQUFvQixJQUFJQyxZQUFKLENBQWlCSCxJQUFBLENBQUtGLE1BQUwsR0FBYyxDQUEvQixDQUF4QixDQUxxQztBQUFBLElBT3JDLEtBQUssSUFBSUYsQ0FBQSxHQUFJLENBQVIsRUFBV0MsR0FBQSxHQUFNRyxJQUFBLENBQUtGLE1BQXRCLENBQUwsQ0FBbUNGLENBQUEsR0FBSUMsR0FBdkMsRUFBNENELENBQUEsRUFBNUMsRUFBaUQ7QUFBQSxRQUMvQ00saUJBQUEsQ0FBa0IsSUFBRU4sQ0FBcEIsSUFBMkJJLElBQUEsQ0FBS0osQ0FBTCxDQUEzQixDQUQrQztBQUFBLFFBRS9DTSxpQkFBQSxDQUFrQixJQUFFTixDQUFGLEdBQUksQ0FBdEIsSUFBMkJLLEtBQUEsQ0FBTUwsQ0FBTixDQUEzQixDQUYrQztBQUFBLEtBUFo7QUFBQSxJQVlyQyxPQUFPTSxpQkFBUCxDQVpxQztBQUFBLENBQXZDLENBOUZBO0FBb0hBMUMsR0FBQSxDQUFJNEMsWUFBSixHQUFvQixZQUFXO0FBQUEsSUFDN0IsSUFBSUosSUFBSixFQUFVQyxLQUFWLEVBQWlCSSxHQUFqQixFQUFzQkMsbUJBQUEsR0FBc0IsRUFBNUMsQ0FENkI7QUFBQSxJQUc3QkEsbUJBQUEsQ0FBb0I5QyxHQUFBLENBQUlHLEdBQXhCLElBQStCLFVBQVNnQyxNQUFULEVBQWlCO0FBQUEsUUFDOUMsS0FBSyxJQUFJQyxDQUFBLEdBQUksQ0FBUixFQUFXQyxHQUFBLEdBQU1GLE1BQUEsQ0FBT0csTUFBUCxHQUFjLENBQS9CLENBQUwsQ0FBdUNGLENBQUEsR0FBSUMsR0FBM0MsRUFBZ0RELENBQUEsRUFBaEQsRUFBcUQ7QUFBQSxZQUNuRFMsR0FBQSxDQUFJVCxDQUFKLElBQVUsQ0FBQUQsTUFBQSxDQUFPLElBQUVDLENBQVQsSUFBY0QsTUFBQSxDQUFPLElBQUVDLENBQUYsR0FBSSxDQUFYLENBQWQsQ0FBRCxHQUFnQyxDQUF6QyxDQURtRDtBQUFBLFNBRFA7QUFBQSxRQUk5QyxPQUFPUyxHQUFQLENBSjhDO0FBQUEsS0FBaEQsQ0FINkI7QUFBQSxJQVU3QkMsbUJBQUEsQ0FBb0I5QyxHQUFBLENBQUlDLElBQXhCLElBQWdDLFVBQVNrQyxNQUFULEVBQWlCO0FBQUEsUUFDL0MsS0FBSyxJQUFJQyxDQUFBLEdBQUksQ0FBUixFQUFXQyxHQUFBLEdBQU1GLE1BQUEsQ0FBT0csTUFBUCxHQUFjLENBQS9CLENBQUwsQ0FBdUNGLENBQUEsR0FBSUMsR0FBM0MsRUFBZ0RELENBQUEsRUFBaEQsRUFBcUQ7QUFBQSxZQUNuREksSUFBQSxDQUFLSixDQUFMLElBQVdELE1BQUEsQ0FBTyxJQUFFQyxDQUFULENBQVgsQ0FEbUQ7QUFBQSxTQUROO0FBQUEsUUFJL0MsT0FBT0ksSUFBUCxDQUorQztBQUFBLEtBQWpELENBVjZCO0FBQUEsSUFpQjdCTSxtQkFBQSxDQUFvQjlDLEdBQUEsQ0FBSUUsS0FBeEIsSUFBaUMsVUFBU2lDLE1BQVQsRUFBaUI7QUFBQSxRQUNoRCxLQUFLLElBQUlDLENBQUEsR0FBSSxDQUFSLEVBQVdDLEdBQUEsR0FBTUYsTUFBQSxDQUFPRyxNQUFQLEdBQWMsQ0FBL0IsQ0FBTCxDQUF1Q0YsQ0FBQSxHQUFJQyxHQUEzQyxFQUFnREQsQ0FBQSxFQUFoRCxFQUFxRDtBQUFBLFlBQ25ESyxLQUFBLENBQU1MLENBQU4sSUFBWUQsTUFBQSxDQUFPLElBQUVDLENBQUYsR0FBSSxDQUFYLENBQVosQ0FEbUQ7QUFBQSxTQURMO0FBQUEsUUFJaEQsT0FBT0ssS0FBUCxDQUpnRDtBQUFBLEtBQWxELENBakI2QjtBQUFBLElBd0I3QixPQUFPLFVBQVNNLE9BQVQsRUFBa0JaLE1BQWxCLEVBQTBCO0FBQUEsUUFDL0JLLElBQUEsR0FBUUEsSUFBQSxJQUFTLElBQUlHLFlBQUosQ0FBaUJSLE1BQUEsQ0FBT0csTUFBUCxHQUFjLENBQS9CLENBQWpCLENBRCtCO0FBQUEsUUFFL0JHLEtBQUEsR0FBUUEsS0FBQSxJQUFTLElBQUlFLFlBQUosQ0FBaUJSLE1BQUEsQ0FBT0csTUFBUCxHQUFjLENBQS9CLENBQWpCLENBRitCO0FBQUEsUUFHL0JPLEdBQUEsR0FBUUEsR0FBQSxJQUFTLElBQUlGLFlBQUosQ0FBaUJSLE1BQUEsQ0FBT0csTUFBUCxHQUFjLENBQS9CLENBQWpCLENBSCtCO0FBQUEsUUFLL0IsSUFBSUgsTUFBQSxDQUFPRyxNQUFQLEdBQWMsQ0FBZCxLQUFvQkUsSUFBQSxDQUFLRixNQUE3QixFQUFxQztBQUFBLFlBQ25DRSxJQUFBLEdBQVEsSUFBSUcsWUFBSixDQUFpQlIsTUFBQSxDQUFPRyxNQUFQLEdBQWMsQ0FBL0IsQ0FBUixDQURtQztBQUFBLFlBRW5DRyxLQUFBLEdBQVEsSUFBSUUsWUFBSixDQUFpQlIsTUFBQSxDQUFPRyxNQUFQLEdBQWMsQ0FBL0IsQ0FBUixDQUZtQztBQUFBLFlBR25DTyxHQUFBLEdBQVEsSUFBSUYsWUFBSixDQUFpQlIsTUFBQSxDQUFPRyxNQUFQLEdBQWMsQ0FBL0IsQ0FBUixDQUhtQztBQUFBLFNBTE47QUFBQSxRQVcvQixPQUFPUSxtQkFBQSxDQUFvQkMsT0FBcEIsRUFBNkJaLE1BQTdCLENBQVAsQ0FYK0I7QUFBQSxLQUFqQyxDQXhCNkI7QUFBQSxDQUFYLEVBQXBCLENBcEhBO0FBbUtBbkMsR0FBQSxDQUFJZ0QsVUFBSixHQUFpQmhELEdBQUEsQ0FBSTRDLFlBQXJCLENBbktBO0FBaUxBNUMsR0FBQSxDQUFJaUQsZ0JBQUosR0FBdUIsVUFBU0MsYUFBVCxFQUF3QkMsYUFBeEIsRUFBdUNDLE1BQXZDLEVBQStDQyxnQkFBL0MsRUFBZ0U7QUFBQSxJQUNyRixJQUFJQyxhQUFBLEdBQWdCLElBQUlYLFlBQUosQ0FBaUJPLGFBQWpCLENBQXBCLENBRHFGO0FBQUEsSUFHckYsS0FBSSxJQUFJZCxDQUFBLEdBQUksQ0FBUixDQUFKLENBQWVBLENBQUEsR0FBRWMsYUFBQSxDQUFjWixNQUEvQixFQUF1Q0YsQ0FBQSxFQUF2QyxFQUEyQztBQUFBLFFBQ3pDa0IsYUFBQSxDQUFjbEIsQ0FBZCxLQUFxQixDQUFBZ0IsTUFBQSxHQUFTLENBQUNELGFBQUEsQ0FBY2YsQ0FBZCxDQUFWLEdBQTZCZSxhQUFBLENBQWNmLENBQWQsQ0FBN0IsQ0FBRCxHQUFrRGlCLGdCQUF0RSxDQUR5QztBQUFBLEtBSDBDO0FBQUEsSUFPckYsT0FBT0MsYUFBUCxDQVBxRjtBQUFBLENBQXZGLENBakxBO0FBNExBdEQsR0FBQSxDQUFJdUQsR0FBSixHQUFVLENBQVYsQ0E1TEE7QUE2TEF2RCxHQUFBLENBQUl3RCxHQUFKLEdBQVUsQ0FBVixDQTdMQTtBQThMQXhELEdBQUEsQ0FBSXlELGtCQUFKLEdBQXlCLENBQXpCLENBOUxBO0FBK0xBekQsR0FBQSxDQUFJMEQsaUJBQUosR0FBd0IsQ0FBeEIsQ0EvTEE7QUFnTUExRCxHQUFBLENBQUlXLEtBQUosR0FBWSxDQUFaLENBaE1BO0FBaU1BWCxHQUFBLENBQUkyRCxHQUFKLEdBQVUsQ0FBVixDQWpNQTtBQWtNQTNELEdBQUEsQ0FBSTRELFVBQUosR0FBaUIsQ0FBakIsQ0FsTUE7QUFtTUE1RCxHQUFBLENBQUk2RCxTQUFKLEdBQWdCLENBQWhCLENBbk1BO0FBb01BN0QsR0FBQSxDQUFJOEQsVUFBSixHQUFpQixDQUFqQixDQXBNQTtBQXVNQTlELEdBQUEsQ0FBSStELENBQUosR0FBUSxDQUFSLENBdk1BO0FBd01BL0QsR0FBQSxDQUFJd0IsRUFBSixHQUFTLENBQVQsQ0F4TUE7QUF5TUF4QixHQUFBLENBQUlnRSxDQUFKLEdBQVEsQ0FBUixDQXpNQTtBQTRNQWhFLEdBQUEsQ0FBSWlFLEdBQUosR0FBVSxVQUFTOUIsTUFBVCxFQUFpQjtBQUFBLElBQ3pCLElBQUkrQixLQUFBLEdBQVEsQ0FBWixDQUR5QjtBQUFBLElBR3pCLEtBQUssSUFBSTlCLENBQUEsR0FBSSxDQUFSLEVBQVcrQixDQUFBLEdBQUloQyxNQUFBLENBQU9HLE1BQXRCLENBQUwsQ0FBbUNGLENBQUEsR0FBSStCLENBQXZDLEVBQTBDL0IsQ0FBQSxFQUExQyxFQUErQztBQUFBLFFBQzdDOEIsS0FBQSxJQUFTL0IsTUFBQSxDQUFPQyxDQUFQLElBQVlELE1BQUEsQ0FBT0MsQ0FBUCxDQUFyQixDQUQ2QztBQUFBLEtBSHRCO0FBQUEsSUFPekIsT0FBT1QsSUFBQSxDQUFLeUMsSUFBTCxDQUFVRixLQUFBLEdBQVFDLENBQWxCLENBQVAsQ0FQeUI7QUFBQSxDQUEzQixDQTVNQTtBQXVOQW5FLEdBQUEsQ0FBSXFFLElBQUosR0FBVyxVQUFTbEMsTUFBVCxFQUFpQjtBQUFBLElBQzFCLElBQUltQyxJQUFBLEdBQU8sQ0FBWCxDQUQwQjtBQUFBLElBRzFCLEtBQUssSUFBSWxDLENBQUEsR0FBSSxDQUFSLEVBQVcrQixDQUFBLEdBQUloQyxNQUFBLENBQU9HLE1BQXRCLENBQUwsQ0FBbUNGLENBQUEsR0FBSStCLENBQXZDLEVBQTBDL0IsQ0FBQSxFQUExQyxFQUErQztBQUFBLFFBQzdDa0MsSUFBQSxHQUFRM0MsSUFBQSxDQUFLNEMsR0FBTCxDQUFTcEMsTUFBQSxDQUFPQyxDQUFQLENBQVQsSUFBc0JrQyxJQUF2QixHQUErQjNDLElBQUEsQ0FBSzRDLEdBQUwsQ0FBU3BDLE1BQUEsQ0FBT0MsQ0FBUCxDQUFULENBQS9CLEdBQXFEa0MsSUFBNUQsQ0FENkM7QUFBQSxLQUhyQjtBQUFBLElBTzFCLE9BQU9BLElBQVAsQ0FQMEI7QUFBQSxDQUE1QixDQXZOQTtBQWtPQSxTQUFTRSxnQkFBVCxDQUEwQkMsVUFBMUIsRUFBc0NDLFVBQXRDLEVBQWtEO0FBQUEsSUFDaEQsS0FBS0QsVUFBTCxHQUFrQkEsVUFBbEIsQ0FEZ0Q7QUFBQSxJQUVoRCxLQUFLQyxVQUFMLEdBQWtCQSxVQUFsQixDQUZnRDtBQUFBLElBR2hELEtBQUtDLFNBQUwsR0FBa0IsSUFBSUYsVUFBSixHQUFpQkMsVUFBakIsR0FBOEIsQ0FBaEQsQ0FIZ0Q7QUFBQSxJQUtoRCxLQUFLRSxRQUFMLEdBQWtCLElBQUlqQyxZQUFKLENBQWlCOEIsVUFBQSxHQUFXLENBQTVCLENBQWxCLENBTGdEO0FBQUEsSUFNaEQsS0FBS0ksSUFBTCxHQUFrQixJQUFJbEMsWUFBSixDQUFpQjhCLFVBQWpCLENBQWxCLENBTmdEO0FBQUEsSUFPaEQsS0FBS0ssSUFBTCxHQUFrQixJQUFJbkMsWUFBSixDQUFpQjhCLFVBQWpCLENBQWxCLENBUGdEO0FBQUEsSUFTaEQsS0FBS00sUUFBTCxHQUFrQixDQUFsQixDQVRnRDtBQUFBLElBVWhELEtBQUtULElBQUwsR0FBa0IsQ0FBbEIsQ0FWZ0Q7QUFBQSxJQW1CaEQsS0FBS1UsZ0JBQUwsR0FBd0IsVUFBU0MsS0FBVCxFQUFnQjtBQUFBLFFBQ3RDLE9BQU8sS0FBS04sU0FBTCxHQUFpQk0sS0FBakIsR0FBeUIsS0FBS04sU0FBTCxHQUFpQixDQUFqRCxDQURzQztBQUFBLEtBQXhDLENBbkJnRDtBQUFBLElBdUJoRCxLQUFLTyxpQkFBTCxHQUF5QixZQUFXO0FBQUEsUUFDbEMsSUFBSU4sUUFBQSxHQUFZLEtBQUtBLFFBQXJCLEVBQ0lDLElBQUEsR0FBWSxLQUFLQSxJQURyQixFQUVJQyxJQUFBLEdBQVksS0FBS0EsSUFGckIsRUFHSUssR0FBQSxHQUFZLElBQUksS0FBS1YsVUFIekIsRUFJSUwsSUFBQSxHQUFZekMsSUFBQSxDQUFLeUMsSUFKckIsRUFLSWdCLElBTEosRUFNSUMsSUFOSixFQU9JQyxHQVBKLENBRGtDO0FBQUEsUUFVbEMsS0FBSyxJQUFJbEQsQ0FBQSxHQUFJLENBQVIsRUFBV21ELENBQUEsR0FBSWQsVUFBQSxHQUFXLENBQTFCLENBQUwsQ0FBa0NyQyxDQUFBLEdBQUltRCxDQUF0QyxFQUF5Q25ELENBQUEsRUFBekMsRUFBOEM7QUFBQSxZQUM1Q2dELElBQUEsR0FBT1AsSUFBQSxDQUFLekMsQ0FBTCxDQUFQLENBRDRDO0FBQUEsWUFFNUNpRCxJQUFBLEdBQU9QLElBQUEsQ0FBSzFDLENBQUwsQ0FBUCxDQUY0QztBQUFBLFlBRzVDa0QsR0FBQSxHQUFNSCxHQUFBLEdBQU1mLElBQUEsQ0FBS2dCLElBQUEsR0FBT0EsSUFBUCxHQUFjQyxJQUFBLEdBQU9BLElBQTFCLENBQVosQ0FINEM7QUFBQSxZQUs1QyxJQUFJQyxHQUFBLEdBQU0sS0FBS2hCLElBQWYsRUFBcUI7QUFBQSxnQkFDbkIsS0FBS1MsUUFBTCxHQUFnQjNDLENBQWhCLENBRG1CO0FBQUEsZ0JBRW5CLEtBQUtrQyxJQUFMLEdBQVlnQixHQUFaLENBRm1CO0FBQUEsYUFMdUI7QUFBQSxZQVU1Q1YsUUFBQSxDQUFTeEMsQ0FBVCxJQUFja0QsR0FBZCxDQVY0QztBQUFBLFNBVlo7QUFBQSxLQUFwQyxDQXZCZ0Q7QUFBQSxDQWxPbEQ7QUEwUkEsU0FBU0UsR0FBVCxDQUFhZixVQUFiLEVBQXlCQyxVQUF6QixFQUFxQztBQUFBLElBQ25DRixnQkFBQSxDQUFpQmlCLElBQWpCLENBQXNCLElBQXRCLEVBQTRCaEIsVUFBNUIsRUFBd0NDLFVBQXhDLEVBRG1DO0FBQUEsSUFHbkMsSUFBSWEsQ0FBQSxHQUFJZCxVQUFBLEdBQVcsQ0FBWCxHQUFlQSxVQUF2QixDQUhtQztBQUFBLElBSW5DLElBQUkvQyxNQUFBLEdBQVMsSUFBSUMsSUFBQSxDQUFLQyxFQUF0QixDQUptQztBQUFBLElBTW5DLEtBQUs4RCxRQUFMLEdBQWdCLElBQUkvQyxZQUFKLENBQWlCNEMsQ0FBakIsQ0FBaEIsQ0FObUM7QUFBQSxJQU9uQyxLQUFLSSxRQUFMLEdBQWdCLElBQUloRCxZQUFKLENBQWlCNEMsQ0FBakIsQ0FBaEIsQ0FQbUM7QUFBQSxJQVNuQyxLQUFLLElBQUluRCxDQUFBLEdBQUksQ0FBUixDQUFMLENBQWdCQSxDQUFBLEdBQUltRCxDQUFwQixFQUF1Qm5ELENBQUEsRUFBdkIsRUFBNEI7QUFBQSxRQUMxQixLQUFLc0QsUUFBTCxDQUFjdEQsQ0FBZCxJQUFtQlQsSUFBQSxDQUFLaUUsR0FBTCxDQUFTeEQsQ0FBQSxHQUFJVixNQUFKLEdBQWErQyxVQUF0QixDQUFuQixDQUQwQjtBQUFBLFFBRTFCLEtBQUtrQixRQUFMLENBQWN2RCxDQUFkLElBQW1CVCxJQUFBLENBQUtrRSxHQUFMLENBQVN6RCxDQUFBLEdBQUlWLE1BQUosR0FBYStDLFVBQXRCLENBQW5CLENBRjBCO0FBQUEsS0FUTztBQUFBLENBMVJyQztBQWlUQWUsR0FBQSxDQUFJTSxTQUFKLENBQWNDLE9BQWQsR0FBd0IsVUFBUzVELE1BQVQsRUFBaUI7QUFBQSxJQUN2QyxJQUFJMEMsSUFBQSxHQUFPLEtBQUtBLElBQWhCLEVBQ0lDLElBQUEsR0FBTyxLQUFLQSxJQURoQixFQUVJTSxJQUZKLEVBR0lDLElBSEosQ0FEdUM7QUFBQSxJQU12QyxLQUFLLElBQUlXLENBQUEsR0FBSSxDQUFSLENBQUwsQ0FBZ0JBLENBQUEsR0FBSSxLQUFLdkIsVUFBTCxHQUFnQixDQUFwQyxFQUF1Q3VCLENBQUEsRUFBdkMsRUFBNEM7QUFBQSxRQUMxQ1osSUFBQSxHQUFPLENBQVAsQ0FEMEM7QUFBQSxRQUUxQ0MsSUFBQSxHQUFPLENBQVAsQ0FGMEM7QUFBQSxRQUkxQyxLQUFLLElBQUlsQixDQUFBLEdBQUksQ0FBUixDQUFMLENBQWdCQSxDQUFBLEdBQUloQyxNQUFBLENBQU9HLE1BQTNCLEVBQW1DNkIsQ0FBQSxFQUFuQyxFQUF3QztBQUFBLFlBQ3RDaUIsSUFBQSxJQUFRLEtBQUtPLFFBQUwsQ0FBY0ssQ0FBQSxHQUFFN0IsQ0FBaEIsSUFBcUJoQyxNQUFBLENBQU9nQyxDQUFQLENBQTdCLENBRHNDO0FBQUEsWUFFdENrQixJQUFBLElBQVEsS0FBS0ssUUFBTCxDQUFjTSxDQUFBLEdBQUU3QixDQUFoQixJQUFxQmhDLE1BQUEsQ0FBT2dDLENBQVAsQ0FBN0IsQ0FGc0M7QUFBQSxTQUpFO0FBQUEsUUFTMUNVLElBQUEsQ0FBS21CLENBQUwsSUFBVVosSUFBVixDQVQwQztBQUFBLFFBVTFDTixJQUFBLENBQUtrQixDQUFMLElBQVVYLElBQVYsQ0FWMEM7QUFBQSxLQU5MO0FBQUEsSUFtQnZDLE9BQU8sS0FBS0gsaUJBQUwsRUFBUCxDQW5CdUM7QUFBQSxDQUF6QyxDQWpUQTtBQWlWQSxTQUFTZSxHQUFULENBQWF4QixVQUFiLEVBQXlCQyxVQUF6QixFQUFxQztBQUFBLElBQ25DRixnQkFBQSxDQUFpQmlCLElBQWpCLENBQXNCLElBQXRCLEVBQTRCaEIsVUFBNUIsRUFBd0NDLFVBQXhDLEVBRG1DO0FBQUEsSUFHbkMsS0FBS3dCLFlBQUwsR0FBb0IsSUFBSUMsV0FBSixDQUFnQjFCLFVBQWhCLENBQXBCLENBSG1DO0FBQUEsSUFLbkMsSUFBSTJCLEtBQUEsR0FBUSxDQUFaLENBTG1DO0FBQUEsSUFNbkMsSUFBSUMsR0FBQSxHQUFNNUIsVUFBQSxJQUFjLENBQXhCLENBTm1DO0FBQUEsSUFRbkMsSUFBSXJDLENBQUosQ0FSbUM7QUFBQSxJQVVuQyxPQUFPZ0UsS0FBQSxHQUFRM0IsVUFBZixFQUEyQjtBQUFBLFFBQ3pCLEtBQUtyQyxDQUFBLEdBQUksQ0FBVCxFQUFZQSxDQUFBLEdBQUlnRSxLQUFoQixFQUF1QmhFLENBQUEsRUFBdkIsRUFBNEI7QUFBQSxZQUMxQixLQUFLOEQsWUFBTCxDQUFrQjlELENBQUEsR0FBSWdFLEtBQXRCLElBQStCLEtBQUtGLFlBQUwsQ0FBa0I5RCxDQUFsQixJQUF1QmlFLEdBQXRELENBRDBCO0FBQUEsU0FESDtBQUFBLFFBS3pCRCxLQUFBLEdBQVFBLEtBQUEsSUFBUyxDQUFqQixDQUx5QjtBQUFBLFFBTXpCQyxHQUFBLEdBQU1BLEdBQUEsSUFBTyxDQUFiLENBTnlCO0FBQUEsS0FWUTtBQUFBLElBbUJuQyxLQUFLWCxRQUFMLEdBQWdCLElBQUkvQyxZQUFKLENBQWlCOEIsVUFBakIsQ0FBaEIsQ0FuQm1DO0FBQUEsSUFvQm5DLEtBQUtrQixRQUFMLEdBQWdCLElBQUloRCxZQUFKLENBQWlCOEIsVUFBakIsQ0FBaEIsQ0FwQm1DO0FBQUEsSUFzQm5DLEtBQUtyQyxDQUFBLEdBQUksQ0FBVCxFQUFZQSxDQUFBLEdBQUlxQyxVQUFoQixFQUE0QnJDLENBQUEsRUFBNUIsRUFBaUM7QUFBQSxRQUMvQixLQUFLc0QsUUFBTCxDQUFjdEQsQ0FBZCxJQUFtQlQsSUFBQSxDQUFLaUUsR0FBTCxDQUFTLENBQUNqRSxJQUFBLENBQUtDLEVBQU4sR0FBU1EsQ0FBbEIsQ0FBbkIsQ0FEK0I7QUFBQSxRQUUvQixLQUFLdUQsUUFBTCxDQUFjdkQsQ0FBZCxJQUFtQlQsSUFBQSxDQUFLa0UsR0FBTCxDQUFTLENBQUNsRSxJQUFBLENBQUtDLEVBQU4sR0FBU1EsQ0FBbEIsQ0FBbkIsQ0FGK0I7QUFBQSxLQXRCRTtBQUFBLENBalZyQztBQXFYQTZELEdBQUEsQ0FBSUgsU0FBSixDQUFjQyxPQUFkLEdBQXdCLFVBQVM1RCxNQUFULEVBQWlCO0FBQUEsSUFFdkMsSUFBSXNDLFVBQUEsR0FBa0IsS0FBS0EsVUFBM0IsRUFDSWtCLFFBQUEsR0FBa0IsS0FBS0EsUUFEM0IsRUFFSUQsUUFBQSxHQUFrQixLQUFLQSxRQUYzQixFQUdJUSxZQUFBLEdBQWtCLEtBQUtBLFlBSDNCLEVBSUlyQixJQUFBLEdBQWtCLEtBQUtBLElBSjNCLEVBS0lDLElBQUEsR0FBa0IsS0FBS0EsSUFMM0IsRUFNSUYsUUFBQSxHQUFrQixLQUFLQSxRQU4zQixDQUZ1QztBQUFBLElBVXZDLElBQUlvQixDQUFBLEdBQUlyRSxJQUFBLENBQUsyRSxLQUFMLENBQVczRSxJQUFBLENBQUs0RSxHQUFMLENBQVM5QixVQUFULElBQXVCOUMsSUFBQSxDQUFLNkUsR0FBdkMsQ0FBUixDQVZ1QztBQUFBLElBWXZDLElBQUk3RSxJQUFBLENBQUs4RSxHQUFMLENBQVMsQ0FBVCxFQUFZVCxDQUFaLE1BQW1CdkIsVUFBdkIsRUFBbUM7QUFBQSxRQUFFLE1BQU0sNENBQU4sQ0FBRjtBQUFBLEtBWkk7QUFBQSxJQWF2QyxJQUFJQSxVQUFBLEtBQWV0QyxNQUFBLENBQU9HLE1BQTFCLEVBQW1DO0FBQUEsUUFBRSxNQUFNLG9FQUFvRW1DLFVBQXBFLEdBQWlGLGdCQUFqRixHQUFvR3RDLE1BQUEsQ0FBT0csTUFBakgsQ0FBRjtBQUFBLEtBYkk7QUFBQSxJQWV2QyxJQUFJb0UsUUFBQSxHQUFXLENBQWYsRUFDSUMsa0JBREosRUFFSUMsa0JBRkosRUFHSUMscUJBSEosRUFJSUMscUJBSkosRUFLSUMsR0FMSixFQU1JQyxFQU5KLEVBT0lDLEVBUEosRUFRSUMsT0FSSixFQVNJOUUsQ0FUSixDQWZ1QztBQUFBLElBMEJ2QyxLQUFLQSxDQUFBLEdBQUksQ0FBVCxFQUFZQSxDQUFBLEdBQUlxQyxVQUFoQixFQUE0QnJDLENBQUEsRUFBNUIsRUFBaUM7QUFBQSxRQUMvQnlDLElBQUEsQ0FBS3pDLENBQUwsSUFBVUQsTUFBQSxDQUFPK0QsWUFBQSxDQUFhOUQsQ0FBYixDQUFQLENBQVYsQ0FEK0I7QUFBQSxRQUUvQjBDLElBQUEsQ0FBSzFDLENBQUwsSUFBVSxDQUFWLENBRitCO0FBQUEsS0ExQk07QUFBQSxJQStCdkMsT0FBT3NFLFFBQUEsR0FBV2pDLFVBQWxCLEVBQThCO0FBQUEsUUFHNUJrQyxrQkFBQSxHQUFxQmhCLFFBQUEsQ0FBU2UsUUFBVCxDQUFyQixDQUg0QjtBQUFBLFFBSTVCRSxrQkFBQSxHQUFxQmxCLFFBQUEsQ0FBU2dCLFFBQVQsQ0FBckIsQ0FKNEI7QUFBQSxRQU01QkcscUJBQUEsR0FBd0IsQ0FBeEIsQ0FONEI7QUFBQSxRQU81QkMscUJBQUEsR0FBd0IsQ0FBeEIsQ0FQNEI7QUFBQSxRQVM1QixLQUFLLElBQUlLLE9BQUEsR0FBVSxDQUFkLENBQUwsQ0FBc0JBLE9BQUEsR0FBVVQsUUFBaEMsRUFBMENTLE9BQUEsRUFBMUMsRUFBcUQ7QUFBQSxZQUNuRC9FLENBQUEsR0FBSStFLE9BQUosQ0FEbUQ7QUFBQSxZQUduRCxPQUFPL0UsQ0FBQSxHQUFJcUMsVUFBWCxFQUF1QjtBQUFBLGdCQUNyQnNDLEdBQUEsR0FBTTNFLENBQUEsR0FBSXNFLFFBQVYsQ0FEcUI7QUFBQSxnQkFFckJNLEVBQUEsR0FBTUgscUJBQUEsR0FBd0JoQyxJQUFBLENBQUtrQyxHQUFMLENBQXpCLEdBQXVDRCxxQkFBQSxHQUF3QmhDLElBQUEsQ0FBS2lDLEdBQUwsQ0FBcEUsQ0FGcUI7QUFBQSxnQkFHckJFLEVBQUEsR0FBTUoscUJBQUEsR0FBd0IvQixJQUFBLENBQUtpQyxHQUFMLENBQXpCLEdBQXVDRCxxQkFBQSxHQUF3QmpDLElBQUEsQ0FBS2tDLEdBQUwsQ0FBcEUsQ0FIcUI7QUFBQSxnQkFLckJsQyxJQUFBLENBQUtrQyxHQUFMLElBQVlsQyxJQUFBLENBQUt6QyxDQUFMLElBQVU0RSxFQUF0QixDQUxxQjtBQUFBLGdCQU1yQmxDLElBQUEsQ0FBS2lDLEdBQUwsSUFBWWpDLElBQUEsQ0FBSzFDLENBQUwsSUFBVTZFLEVBQXRCLENBTnFCO0FBQUEsZ0JBT3JCcEMsSUFBQSxDQUFLekMsQ0FBTCxLQUFXNEUsRUFBWCxDQVBxQjtBQUFBLGdCQVFyQmxDLElBQUEsQ0FBSzFDLENBQUwsS0FBVzZFLEVBQVgsQ0FScUI7QUFBQSxnQkFVckI3RSxDQUFBLElBQUtzRSxRQUFBLElBQVksQ0FBakIsQ0FWcUI7QUFBQSxhQUg0QjtBQUFBLFlBZ0JuRFEsT0FBQSxHQUFVTCxxQkFBVixDQWhCbUQ7QUFBQSxZQWlCbkRBLHFCQUFBLEdBQXlCSyxPQUFBLEdBQVVQLGtCQUFYLEdBQWtDRyxxQkFBQSxHQUF3QkYsa0JBQWxGLENBakJtRDtBQUFBLFlBa0JuREUscUJBQUEsR0FBeUJJLE9BQUEsR0FBVU4sa0JBQVgsR0FBa0NFLHFCQUFBLEdBQXdCSCxrQkFBbEYsQ0FsQm1EO0FBQUEsU0FUekI7QUFBQSxRQThCNUJELFFBQUEsR0FBV0EsUUFBQSxJQUFZLENBQXZCLENBOUI0QjtBQUFBLEtBL0JTO0FBQUEsSUFnRXZDLE9BQU8sS0FBS3hCLGlCQUFMLEVBQVAsQ0FoRXVDO0FBQUEsQ0FBekMsQ0FyWEE7QUF3YkFlLEdBQUEsQ0FBSUgsU0FBSixDQUFjc0IsT0FBZCxHQUF3QixVQUFTdkMsSUFBVCxFQUFlQyxJQUFmLEVBQXFCO0FBQUEsSUFFM0MsSUFBSUwsVUFBQSxHQUFrQixLQUFLQSxVQUEzQixFQUNJa0IsUUFBQSxHQUFrQixLQUFLQSxRQUQzQixFQUVJRCxRQUFBLEdBQWtCLEtBQUtBLFFBRjNCLEVBR0lRLFlBQUEsR0FBa0IsS0FBS0EsWUFIM0IsRUFJSXRCLFFBQUEsR0FBa0IsS0FBS0EsUUFKM0IsQ0FGMkM7QUFBQSxJQVF2Q0MsSUFBQSxHQUFPQSxJQUFBLElBQVEsS0FBS0EsSUFBcEIsQ0FSdUM7QUFBQSxJQVN2Q0MsSUFBQSxHQUFPQSxJQUFBLElBQVEsS0FBS0EsSUFBcEIsQ0FUdUM7QUFBQSxJQVczQyxJQUFJNEIsUUFBQSxHQUFXLENBQWYsRUFDSUMsa0JBREosRUFFSUMsa0JBRkosRUFHSUMscUJBSEosRUFJSUMscUJBSkosRUFLSUMsR0FMSixFQU1JQyxFQU5KLEVBT0lDLEVBUEosRUFRSUMsT0FSSixFQVNJOUUsQ0FUSixDQVgyQztBQUFBLElBc0IzQyxLQUFLQSxDQUFBLEdBQUksQ0FBVCxFQUFZQSxDQUFBLEdBQUlxQyxVQUFoQixFQUE0QnJDLENBQUEsRUFBNUIsRUFBaUM7QUFBQSxRQUMvQjBDLElBQUEsQ0FBSzFDLENBQUwsS0FBVyxDQUFDLENBQVosQ0FEK0I7QUFBQSxLQXRCVTtBQUFBLElBMEIzQyxJQUFJaUYsT0FBQSxHQUFVLElBQUkxRSxZQUFKLENBQWlCOEIsVUFBakIsQ0FBZCxDQTFCMkM7QUFBQSxJQTJCM0MsSUFBSTZDLE9BQUEsR0FBVSxJQUFJM0UsWUFBSixDQUFpQjhCLFVBQWpCLENBQWQsQ0EzQjJDO0FBQUEsSUE2QjNDLEtBQUtyQyxDQUFBLEdBQUksQ0FBVCxFQUFZQSxDQUFBLEdBQUl5QyxJQUFBLENBQUt2QyxNQUFyQixFQUE2QkYsQ0FBQSxFQUE3QixFQUFrQztBQUFBLFFBQ2hDaUYsT0FBQSxDQUFRakYsQ0FBUixJQUFheUMsSUFBQSxDQUFLcUIsWUFBQSxDQUFhOUQsQ0FBYixDQUFMLENBQWIsQ0FEZ0M7QUFBQSxRQUVoQ2tGLE9BQUEsQ0FBUWxGLENBQVIsSUFBYTBDLElBQUEsQ0FBS29CLFlBQUEsQ0FBYTlELENBQWIsQ0FBTCxDQUFiLENBRmdDO0FBQUEsS0E3QlM7QUFBQSxJQWtDM0N5QyxJQUFBLEdBQU93QyxPQUFQLENBbEMyQztBQUFBLElBbUMzQ3ZDLElBQUEsR0FBT3dDLE9BQVAsQ0FuQzJDO0FBQUEsSUFxQzNDLE9BQU9aLFFBQUEsR0FBV2pDLFVBQWxCLEVBQThCO0FBQUEsUUFDNUJrQyxrQkFBQSxHQUFxQmhCLFFBQUEsQ0FBU2UsUUFBVCxDQUFyQixDQUQ0QjtBQUFBLFFBRTVCRSxrQkFBQSxHQUFxQmxCLFFBQUEsQ0FBU2dCLFFBQVQsQ0FBckIsQ0FGNEI7QUFBQSxRQUc1QkcscUJBQUEsR0FBd0IsQ0FBeEIsQ0FINEI7QUFBQSxRQUk1QkMscUJBQUEsR0FBd0IsQ0FBeEIsQ0FKNEI7QUFBQSxRQU01QixLQUFLLElBQUlLLE9BQUEsR0FBVSxDQUFkLENBQUwsQ0FBc0JBLE9BQUEsR0FBVVQsUUFBaEMsRUFBMENTLE9BQUEsRUFBMUMsRUFBcUQ7QUFBQSxZQUNuRC9FLENBQUEsR0FBSStFLE9BQUosQ0FEbUQ7QUFBQSxZQUduRCxPQUFPL0UsQ0FBQSxHQUFJcUMsVUFBWCxFQUF1QjtBQUFBLGdCQUNyQnNDLEdBQUEsR0FBTTNFLENBQUEsR0FBSXNFLFFBQVYsQ0FEcUI7QUFBQSxnQkFFckJNLEVBQUEsR0FBTUgscUJBQUEsR0FBd0JoQyxJQUFBLENBQUtrQyxHQUFMLENBQXpCLEdBQXVDRCxxQkFBQSxHQUF3QmhDLElBQUEsQ0FBS2lDLEdBQUwsQ0FBcEUsQ0FGcUI7QUFBQSxnQkFHckJFLEVBQUEsR0FBTUoscUJBQUEsR0FBd0IvQixJQUFBLENBQUtpQyxHQUFMLENBQXpCLEdBQXVDRCxxQkFBQSxHQUF3QmpDLElBQUEsQ0FBS2tDLEdBQUwsQ0FBcEUsQ0FIcUI7QUFBQSxnQkFLckJsQyxJQUFBLENBQUtrQyxHQUFMLElBQVlsQyxJQUFBLENBQUt6QyxDQUFMLElBQVU0RSxFQUF0QixDQUxxQjtBQUFBLGdCQU1yQmxDLElBQUEsQ0FBS2lDLEdBQUwsSUFBWWpDLElBQUEsQ0FBSzFDLENBQUwsSUFBVTZFLEVBQXRCLENBTnFCO0FBQUEsZ0JBT3JCcEMsSUFBQSxDQUFLekMsQ0FBTCxLQUFXNEUsRUFBWCxDQVBxQjtBQUFBLGdCQVFyQmxDLElBQUEsQ0FBSzFDLENBQUwsS0FBVzZFLEVBQVgsQ0FScUI7QUFBQSxnQkFVckI3RSxDQUFBLElBQUtzRSxRQUFBLElBQVksQ0FBakIsQ0FWcUI7QUFBQSxhQUg0QjtBQUFBLFlBZ0JuRFEsT0FBQSxHQUFVTCxxQkFBVixDQWhCbUQ7QUFBQSxZQWlCbkRBLHFCQUFBLEdBQXlCSyxPQUFBLEdBQVVQLGtCQUFYLEdBQWtDRyxxQkFBQSxHQUF3QkYsa0JBQWxGLENBakJtRDtBQUFBLFlBa0JuREUscUJBQUEsR0FBeUJJLE9BQUEsR0FBVU4sa0JBQVgsR0FBa0NFLHFCQUFBLEdBQXdCSCxrQkFBbEYsQ0FsQm1EO0FBQUEsU0FOekI7QUFBQSxRQTJCNUJELFFBQUEsR0FBV0EsUUFBQSxJQUFZLENBQXZCLENBM0I0QjtBQUFBLEtBckNhO0FBQUEsSUFtRTNDLElBQUl2RSxNQUFBLEdBQVMsSUFBSVEsWUFBSixDQUFpQjhCLFVBQWpCLENBQWIsQ0FuRTJDO0FBQUEsSUFvRTNDLEtBQUtyQyxDQUFBLEdBQUksQ0FBVCxFQUFZQSxDQUFBLEdBQUlxQyxVQUFoQixFQUE0QnJDLENBQUEsRUFBNUIsRUFBaUM7QUFBQSxRQUMvQkQsTUFBQSxDQUFPQyxDQUFQLElBQVl5QyxJQUFBLENBQUt6QyxDQUFMLElBQVVxQyxVQUF0QixDQUQrQjtBQUFBLEtBcEVVO0FBQUEsSUF3RTNDLE9BQU90QyxNQUFQLENBeEUyQztBQUFBLENBQTdDLENBeGJBO0FBMGhCQSxTQUFTb0YsSUFBVCxDQUFjOUMsVUFBZCxFQUEwQkMsVUFBMUIsRUFBc0M7QUFBQSxJQUNwQ0YsZ0JBQUEsQ0FBaUJpQixJQUFqQixDQUFzQixJQUF0QixFQUE0QmhCLFVBQTVCLEVBQXdDQyxVQUF4QyxFQURvQztBQUFBLElBR3BDLEtBQUs4QyxLQUFMLEdBQWEsSUFBSTdFLFlBQUosQ0FBaUI4QixVQUFqQixDQUFiLENBSG9DO0FBQUEsSUFLcEMsS0FBS3lCLFlBQUwsR0FBb0IsSUFBSUMsV0FBSixDQUFnQjFCLFVBQWhCLENBQXBCLENBTG9DO0FBQUEsSUFRcEMsS0FBS2dELGlCQUFMLEdBQXlCLFVBQVVDLElBQVYsRUFBZ0JDLE1BQWhCLEVBQXdCO0FBQUEsUUFDL0MsSUFBSWxELFVBQUEsR0FBYyxLQUFLQSxVQUF2QixFQUNJaUMsUUFBQSxHQUFjakMsVUFBQSxLQUFlLENBRGpDLEVBRUltRCxHQUFBLEdBQWNuRCxVQUFBLEdBQWEsQ0FGL0IsRUFHSXJDLENBQUEsR0FBSSxDQUhSLEVBR1d5RixDQUFBLEdBQUksQ0FIZixFQUdrQkMsQ0FIbEIsQ0FEK0M7QUFBQSxRQU0vQ0osSUFBQSxDQUFLLENBQUwsSUFBVUMsTUFBQSxDQUFPLENBQVAsQ0FBVixDQU4rQztBQUFBLFFBUS9DLEdBQUc7QUFBQSxZQUNERSxDQUFBLElBQUtuQixRQUFMLENBREM7QUFBQSxZQUVEZ0IsSUFBQSxDQUFLdEYsQ0FBTCxJQUFVdUYsTUFBQSxDQUFPRSxDQUFQLENBQVYsQ0FGQztBQUFBLFlBR0RILElBQUEsQ0FBS0csQ0FBTCxJQUFVRixNQUFBLENBQU92RixDQUFQLENBQVYsQ0FIQztBQUFBLFlBS0RBLENBQUEsR0FMQztBQUFBLFlBT0QwRixDQUFBLEdBQUlwQixRQUFBLElBQVksQ0FBaEIsQ0FQQztBQUFBLFlBUUQsT0FBT29CLENBQUEsR0FBSUEsQ0FBQSxJQUFLLENBQVQsRUFBWSxDQUFFLENBQUMsQ0FBQUQsQ0FBQSxJQUFLQyxDQUFMLENBQUQsR0FBV0EsQ0FBWCxDQUFyQixFQVJDO0FBQUEsWUFVRCxJQUFJRCxDQUFBLElBQUt6RixDQUFULEVBQVk7QUFBQSxnQkFDVnNGLElBQUEsQ0FBS3RGLENBQUwsSUFBY3VGLE1BQUEsQ0FBT0UsQ0FBUCxDQUFkLENBRFU7QUFBQSxnQkFFVkgsSUFBQSxDQUFLRyxDQUFMLElBQWNGLE1BQUEsQ0FBT3ZGLENBQVAsQ0FBZCxDQUZVO0FBQUEsZ0JBSVZzRixJQUFBLENBQUtFLEdBQUEsR0FBSXhGLENBQVQsSUFBY3VGLE1BQUEsQ0FBT0MsR0FBQSxHQUFJQyxDQUFYLENBQWQsQ0FKVTtBQUFBLGdCQUtWSCxJQUFBLENBQUtFLEdBQUEsR0FBSUMsQ0FBVCxJQUFjRixNQUFBLENBQU9DLEdBQUEsR0FBSXhGLENBQVgsQ0FBZCxDQUxVO0FBQUEsYUFWWDtBQUFBLFlBaUJEQSxDQUFBLEdBakJDO0FBQUEsU0FBSCxRQWtCU0EsQ0FBQSxHQUFJc0UsUUFsQmIsRUFSK0M7QUFBQSxRQTJCL0NnQixJQUFBLENBQUtFLEdBQUwsSUFBWUQsTUFBQSxDQUFPQyxHQUFQLENBQVosQ0EzQitDO0FBQUEsS0FBakQsQ0FSb0M7QUFBQSxJQXNDcEMsS0FBS0csb0JBQUwsR0FBNEIsWUFBWTtBQUFBLFFBQ3RDLElBQUl0RCxVQUFBLEdBQWMsS0FBS0EsVUFBdkIsRUFDSWlDLFFBQUEsR0FBY2pDLFVBQUEsS0FBZSxDQURqQyxFQUVJbUQsR0FBQSxHQUFjbkQsVUFBQSxHQUFhLENBRi9CLEVBR0lyQyxDQUFBLEdBQUksQ0FIUixFQUdXeUYsQ0FBQSxHQUFJLENBSGYsRUFHa0JDLENBSGxCLENBRHNDO0FBQUEsUUFNdEMsS0FBSzVCLFlBQUwsQ0FBa0IsQ0FBbEIsSUFBdUIsQ0FBdkIsQ0FOc0M7QUFBQSxRQVF0QyxHQUFHO0FBQUEsWUFDRDJCLENBQUEsSUFBS25CLFFBQUwsQ0FEQztBQUFBLFlBR0QsS0FBS1IsWUFBTCxDQUFrQjlELENBQWxCLElBQXVCeUYsQ0FBdkIsQ0FIQztBQUFBLFlBSUQsS0FBSzNCLFlBQUwsQ0FBa0IyQixDQUFsQixJQUF1QnpGLENBQXZCLENBSkM7QUFBQSxZQU1EQSxDQUFBLEdBTkM7QUFBQSxZQVFEMEYsQ0FBQSxHQUFJcEIsUUFBQSxJQUFZLENBQWhCLENBUkM7QUFBQSxZQVNELE9BQU9vQixDQUFBLEdBQUlBLENBQUEsSUFBSyxDQUFULEVBQVksQ0FBRSxDQUFDLENBQUFELENBQUEsSUFBS0MsQ0FBTCxDQUFELEdBQVdBLENBQVgsQ0FBckIsRUFUQztBQUFBLFlBV0QsSUFBSUQsQ0FBQSxJQUFLekYsQ0FBVCxFQUFZO0FBQUEsZ0JBQ1YsS0FBSzhELFlBQUwsQ0FBa0I5RCxDQUFsQixJQUF1QnlGLENBQXZCLENBRFU7QUFBQSxnQkFFVixLQUFLM0IsWUFBTCxDQUFrQjJCLENBQWxCLElBQXVCekYsQ0FBdkIsQ0FGVTtBQUFBLGdCQUlWLEtBQUs4RCxZQUFMLENBQWtCMEIsR0FBQSxHQUFJeEYsQ0FBdEIsSUFBMkJ3RixHQUFBLEdBQUlDLENBQS9CLENBSlU7QUFBQSxnQkFLVixLQUFLM0IsWUFBTCxDQUFrQjBCLEdBQUEsR0FBSUMsQ0FBdEIsSUFBMkJELEdBQUEsR0FBSXhGLENBQS9CLENBTFU7QUFBQSxhQVhYO0FBQUEsWUFrQkRBLENBQUEsR0FsQkM7QUFBQSxTQUFILFFBbUJTQSxDQUFBLEdBQUlzRSxRQW5CYixFQVJzQztBQUFBLFFBNkJ0QyxLQUFLUixZQUFMLENBQWtCMEIsR0FBbEIsSUFBeUJBLEdBQXpCLENBN0JzQztBQUFBLEtBQXhDLENBdENvQztBQUFBLElBc0VwQyxLQUFLRyxvQkFBTCxHQXRFb0M7QUFBQSxDQTFoQnRDO0FBaW5CQVIsSUFBQSxDQUFLekIsU0FBTCxDQUFlQyxPQUFmLEdBQXlCLFVBQVM1RCxNQUFULEVBQWlCO0FBQUEsSUFDeEMsSUFBSWdDLENBQUEsR0FBWSxLQUFLTSxVQUFyQixFQUNJRyxRQUFBLEdBQVksS0FBS0EsUUFEckIsRUFFSW9ELENBQUEsR0FBWSxLQUFLUixLQUZyQixFQUdJOUYsTUFBQSxHQUFZLElBQUVDLElBQUEsQ0FBS0MsRUFIdkIsRUFJSXdDLElBQUEsR0FBWXpDLElBQUEsQ0FBS3lDLElBSnJCLEVBS0loQyxDQUFBLEdBQVkrQixDQUFBLEtBQU0sQ0FMdEIsRUFNSWdCLEdBQUEsR0FBWSxJQUFJaEIsQ0FOcEIsRUFPSThELEVBUEosRUFPUUMsRUFQUixFQU9ZQyxFQVBaLEVBT2dCQyxFQVBoQixFQVFJQyxFQVJKLEVBUVFDLEVBUlIsRUFRWUMsRUFSWixFQVFnQkMsRUFSaEIsRUFTSUMsRUFUSixFQVNRQyxFQVRSLEVBU1lDLEVBVFosRUFTZ0JDLEVBVGhCLEVBU29CQyxFQVRwQixFQVN3QkMsRUFUeEIsRUFTNEJDLEVBVDVCLEVBU2dDQyxFQVRoQyxFQVVJQyxHQVZKLEVBVVNDLEdBVlQsRUFVY0MsR0FWZCxFQVVtQkMsR0FWbkIsRUFVd0JDLEdBVnhCLEVBV0lDLENBWEosRUFZSUMsQ0FaSixFQWFJbkUsSUFiSixFQWFVQyxJQWJWLEVBYWdCQyxHQWJoQixDQUR3QztBQUFBLElBZ0J4QyxLQUFLbUMsaUJBQUwsQ0FBdUJPLENBQXZCLEVBQTBCN0YsTUFBMUIsRUFoQndDO0FBQUEsSUEwQnhDLEtBQUssSUFBSXFILEVBQUEsR0FBSyxDQUFULEVBQVlDLEVBQUEsR0FBSyxDQUFqQixDQUFMLENBQXlCRCxFQUFBLEdBQUtyRixDQUE5QixFQUFpQ3NGLEVBQUEsSUFBTSxDQUF2QyxFQUEwQztBQUFBLFFBQ3hDLEtBQUssSUFBSUMsRUFBQSxHQUFLRixFQUFULENBQUwsQ0FBa0JFLEVBQUEsR0FBS3ZGLENBQXZCLEVBQTBCdUYsRUFBQSxJQUFNRCxFQUFoQyxFQUFvQztBQUFBLFlBRWxDUixHQUFBLEdBQU1qQixDQUFBLENBQUUwQixFQUFGLElBQVExQixDQUFBLENBQUUwQixFQUFBLEdBQUcsQ0FBTCxDQUFkLENBRmtDO0FBQUEsWUFHbEMxQixDQUFBLENBQUUwQixFQUFGLEtBQVMxQixDQUFBLENBQUUwQixFQUFBLEdBQUcsQ0FBTCxDQUFULENBSGtDO0FBQUEsWUFJbEMxQixDQUFBLENBQUUwQixFQUFBLEdBQUcsQ0FBTCxJQUFVVCxHQUFWLENBSmtDO0FBQUEsU0FESTtBQUFBLFFBT3hDTyxFQUFBLEdBQUssSUFBRyxDQUFBQyxFQUFBLEdBQUcsQ0FBSCxDQUFSLENBUHdDO0FBQUEsS0ExQkY7QUFBQSxJQW9DeEN4QixFQUFBLEdBQUssQ0FBTCxDQXBDd0M7QUFBQSxJQXFDeENHLEVBQUEsR0FBS2pFLENBQUEsS0FBTSxDQUFYLENBckN3QztBQUFBLElBdUN4QyxPQUFPaUUsRUFBQSxHQUFLQSxFQUFBLEtBQU8sQ0FBbkIsRUFBdUI7QUFBQSxRQUNyQm9CLEVBQUEsR0FBSyxDQUFMLENBRHFCO0FBQUEsUUFFckJ2QixFQUFBLEdBQUtBLEVBQUEsSUFBTSxDQUFYLENBRnFCO0FBQUEsUUFHckJ3QixFQUFBLEdBQUt4QixFQUFBLElBQU0sQ0FBWCxDQUhxQjtBQUFBLFFBSXJCQyxFQUFBLEdBQUtELEVBQUEsS0FBTyxDQUFaLENBSnFCO0FBQUEsUUFLckJFLEVBQUEsR0FBS0YsRUFBQSxLQUFPLENBQVosQ0FMcUI7QUFBQSxRQU1yQixHQUFHO0FBQUEsWUFDRCxJQUFHQyxFQUFBLEtBQU8sQ0FBVixFQUFhO0FBQUEsZ0JBQ1gsS0FBSXdCLEVBQUEsR0FBS0YsRUFBVCxFQUFhRSxFQUFBLEdBQUt2RixDQUFsQixFQUFxQnVGLEVBQUEsSUFBTUQsRUFBM0IsRUFBK0I7QUFBQSxvQkFDN0JoQixFQUFBLEdBQUtpQixFQUFMLENBRDZCO0FBQUEsb0JBRTdCaEIsRUFBQSxHQUFLRCxFQUFBLEdBQUtQLEVBQVYsQ0FGNkI7QUFBQSxvQkFHN0JTLEVBQUEsR0FBS0QsRUFBQSxHQUFLUixFQUFWLENBSDZCO0FBQUEsb0JBSTdCVSxFQUFBLEdBQUtELEVBQUEsR0FBS1QsRUFBVixDQUo2QjtBQUFBLG9CQU83QkcsRUFBQSxHQUFLTCxDQUFBLENBQUVXLEVBQUYsSUFBUVgsQ0FBQSxDQUFFWSxFQUFGLENBQWIsQ0FQNkI7QUFBQSxvQkFRN0JaLENBQUEsQ0FBRVksRUFBRixLQUFTWixDQUFBLENBQUVXLEVBQUYsQ0FBVCxDQVI2QjtBQUFBLG9CQVU3QlgsQ0FBQSxDQUFFVyxFQUFGLElBQVFYLENBQUEsQ0FBRVMsRUFBRixJQUFRSixFQUFoQixDQVY2QjtBQUFBLG9CQVc3QkwsQ0FBQSxDQUFFUyxFQUFGLEtBQVNKLEVBQVQsQ0FYNkI7QUFBQSxvQkFhN0JJLEVBQUEsSUFBTU4sRUFBTixDQWI2QjtBQUFBLG9CQWM3Qk8sRUFBQSxJQUFNUCxFQUFOLENBZDZCO0FBQUEsb0JBZTdCUSxFQUFBLElBQU1SLEVBQU4sQ0FmNkI7QUFBQSxvQkFnQjdCUyxFQUFBLElBQU1ULEVBQU4sQ0FoQjZCO0FBQUEsb0JBbUI3QkUsRUFBQSxHQUFLTCxDQUFBLENBQUVXLEVBQUYsSUFBUVgsQ0FBQSxDQUFFWSxFQUFGLENBQWIsQ0FuQjZCO0FBQUEsb0JBb0I3Qk4sRUFBQSxHQUFLTixDQUFBLENBQUVXLEVBQUYsSUFBUVgsQ0FBQSxDQUFFWSxFQUFGLENBQWIsQ0FwQjZCO0FBQUEsb0JBc0I3QlAsRUFBQSxHQUFLLENBQUNBLEVBQUQsR0FBTTFHLElBQUEsQ0FBS2dJLE9BQWhCLENBdEI2QjtBQUFBLG9CQXVCN0JyQixFQUFBLElBQU0zRyxJQUFBLENBQUtnSSxPQUFYLENBdkI2QjtBQUFBLG9CQTBCN0JWLEdBQUEsR0FBTWpCLENBQUEsQ0FBRVUsRUFBRixDQUFOLENBMUI2QjtBQUFBLG9CQTJCN0JWLENBQUEsQ0FBRVksRUFBRixJQUFRUCxFQUFBLEdBQUtZLEdBQWIsQ0EzQjZCO0FBQUEsb0JBNEI3QmpCLENBQUEsQ0FBRVcsRUFBRixJQUFRTixFQUFBLEdBQUtZLEdBQWIsQ0E1QjZCO0FBQUEsb0JBK0I3QmpCLENBQUEsQ0FBRVUsRUFBRixJQUFRVixDQUFBLENBQUVTLEVBQUYsSUFBUUgsRUFBaEIsQ0EvQjZCO0FBQUEsb0JBZ0M3Qk4sQ0FBQSxDQUFFUyxFQUFGLEtBQVNILEVBQVQsQ0FoQzZCO0FBQUEsaUJBRHBCO0FBQUEsYUFBYixNQW1DTztBQUFBLGdCQUNMLEtBQUlvQixFQUFBLEdBQUtGLEVBQVQsRUFBYUUsRUFBQSxHQUFLdkYsQ0FBbEIsRUFBcUJ1RixFQUFBLElBQU1ELEVBQTNCLEVBQStCO0FBQUEsb0JBQzdCaEIsRUFBQSxHQUFLaUIsRUFBTCxDQUQ2QjtBQUFBLG9CQUU3QmhCLEVBQUEsR0FBS0QsRUFBQSxHQUFLUCxFQUFWLENBRjZCO0FBQUEsb0JBRzdCUyxFQUFBLEdBQUtELEVBQUEsR0FBS1IsRUFBVixDQUg2QjtBQUFBLG9CQUk3QlUsRUFBQSxHQUFLRCxFQUFBLEdBQUtULEVBQVYsQ0FKNkI7QUFBQSxvQkFPN0JHLEVBQUEsR0FBS0wsQ0FBQSxDQUFFVyxFQUFGLElBQVFYLENBQUEsQ0FBRVksRUFBRixDQUFiLENBUDZCO0FBQUEsb0JBUTdCWixDQUFBLENBQUVZLEVBQUYsS0FBU1osQ0FBQSxDQUFFVyxFQUFGLENBQVQsQ0FSNkI7QUFBQSxvQkFXN0JYLENBQUEsQ0FBRVcsRUFBRixJQUFRWCxDQUFBLENBQUVTLEVBQUYsSUFBUUosRUFBaEIsQ0FYNkI7QUFBQSxvQkFZN0JMLENBQUEsQ0FBRVMsRUFBRixLQUFTSixFQUFULENBWjZCO0FBQUEsaUJBRDFCO0FBQUEsYUFwQ047QUFBQSxZQXFERG1CLEVBQUEsR0FBTSxDQUFBQyxFQUFBLElBQU0sQ0FBTixDQUFELEdBQVl4QixFQUFqQixDQXJEQztBQUFBLFlBc0REd0IsRUFBQSxHQUFLQSxFQUFBLElBQU0sQ0FBWCxDQXREQztBQUFBLFNBQUgsUUF1RFNELEVBQUEsR0FBS3JGLENBdkRkLEVBTnFCO0FBQUEsUUErRHJCbUYsQ0FBQSxHQUFJNUgsTUFBQSxHQUFTdUcsRUFBYixDQS9EcUI7QUFBQSxRQWlFckIsS0FBSyxJQUFJMkIsQ0FBQSxHQUFJLENBQVIsQ0FBTCxDQUFnQkEsQ0FBQSxHQUFJekIsRUFBcEIsRUFBd0J5QixDQUFBLEVBQXhCLEVBQTZCO0FBQUEsWUFDM0JMLENBQUEsR0FBSUssQ0FBQSxHQUFJTixDQUFSLENBRDJCO0FBQUEsWUFFM0JILEdBQUEsR0FBTXhILElBQUEsQ0FBS2lFLEdBQUwsQ0FBUzJELENBQVQsQ0FBTixDQUYyQjtBQUFBLFlBRzNCTCxHQUFBLEdBQU12SCxJQUFBLENBQUtrRSxHQUFMLENBQVMwRCxDQUFULENBQU4sQ0FIMkI7QUFBQSxZQU0zQkgsR0FBQSxHQUFNLElBQUVGLEdBQUYsR0FBTyxDQUFBQSxHQUFBLEdBQUlBLEdBQUosR0FBUSxJQUFSLENBQWIsQ0FOMkI7QUFBQSxZQU8zQkcsR0FBQSxHQUFNLElBQUVGLEdBQUYsR0FBTyxRQUFLQSxHQUFBLEdBQUlBLEdBQVQsQ0FBYixDQVAyQjtBQUFBLFlBUzNCSyxFQUFBLEdBQUssQ0FBTCxDQVQyQjtBQUFBLFlBU25CQyxFQUFBLEdBQUt4QixFQUFBLElBQU0sQ0FBWCxDQVRtQjtBQUFBLFlBVTNCLEdBQUc7QUFBQSxnQkFDRCxLQUFLeUIsRUFBQSxHQUFLRixFQUFWLEVBQWNFLEVBQUEsR0FBS3ZGLENBQW5CLEVBQXNCdUYsRUFBQSxJQUFNRCxFQUE1QixFQUFnQztBQUFBLG9CQUM5QmhCLEVBQUEsR0FBS2lCLEVBQUEsR0FBS0UsQ0FBVixDQUQ4QjtBQUFBLG9CQUU5QmxCLEVBQUEsR0FBS0QsRUFBQSxHQUFLUCxFQUFWLENBRjhCO0FBQUEsb0JBRzlCUyxFQUFBLEdBQUtELEVBQUEsR0FBS1IsRUFBVixDQUg4QjtBQUFBLG9CQUk5QlUsRUFBQSxHQUFLRCxFQUFBLEdBQUtULEVBQVYsQ0FKOEI7QUFBQSxvQkFNOUJXLEVBQUEsR0FBS2EsRUFBQSxHQUFLeEIsRUFBTCxHQUFVMEIsQ0FBZixDQU44QjtBQUFBLG9CQU85QmQsRUFBQSxHQUFLRCxFQUFBLEdBQUtYLEVBQVYsQ0FQOEI7QUFBQSxvQkFROUJhLEVBQUEsR0FBS0QsRUFBQSxHQUFLWixFQUFWLENBUjhCO0FBQUEsb0JBUzlCYyxFQUFBLEdBQUtELEVBQUEsR0FBS2IsRUFBVixDQVQ4QjtBQUFBLG9CQWE5QkksRUFBQSxHQUFLTixDQUFBLENBQUVlLEVBQUYsSUFBTUcsR0FBTixHQUFZbEIsQ0FBQSxDQUFFVyxFQUFGLElBQU1RLEdBQXZCLENBYjhCO0FBQUEsb0JBYzlCZCxFQUFBLEdBQUtMLENBQUEsQ0FBRWUsRUFBRixJQUFNSSxHQUFOLEdBQVluQixDQUFBLENBQUVXLEVBQUYsSUFBTU8sR0FBdkIsQ0FkOEI7QUFBQSxvQkFpQjlCVixFQUFBLEdBQUtSLENBQUEsQ0FBRWdCLEVBQUYsSUFBTUksR0FBTixHQUFZcEIsQ0FBQSxDQUFFWSxFQUFGLElBQU1TLEdBQXZCLENBakI4QjtBQUFBLG9CQWtCOUJkLEVBQUEsR0FBS1AsQ0FBQSxDQUFFZ0IsRUFBRixJQUFNSyxHQUFOLEdBQVlyQixDQUFBLENBQUVZLEVBQUYsSUFBTVEsR0FBdkIsQ0FsQjhCO0FBQUEsb0JBcUI5QkgsR0FBQSxHQUFNWCxFQUFBLEdBQUtFLEVBQVgsQ0FyQjhCO0FBQUEsb0JBc0I5QkYsRUFBQSxJQUFNRSxFQUFOLENBdEI4QjtBQUFBLG9CQXVCOUJBLEVBQUEsR0FBS1MsR0FBTCxDQXZCOEI7QUFBQSxvQkEyQjlCakIsQ0FBQSxDQUFFZ0IsRUFBRixJQUFRVixFQUFBLEdBQUtOLENBQUEsQ0FBRWMsRUFBRixDQUFiLENBM0I4QjtBQUFBLG9CQTRCOUJkLENBQUEsQ0FBRVcsRUFBRixJQUFRTCxFQUFBLEdBQUtOLENBQUEsQ0FBRWMsRUFBRixDQUFiLENBNUI4QjtBQUFBLG9CQStCOUJHLEdBQUEsR0FBTVYsRUFBQSxHQUFLRixFQUFYLENBL0I4QjtBQUFBLG9CQWdDOUJBLEVBQUEsSUFBTUUsRUFBTixDQWhDOEI7QUFBQSxvQkFpQzlCQSxFQUFBLEdBQUtVLEdBQUwsQ0FqQzhCO0FBQUEsb0JBcUM5QmpCLENBQUEsQ0FBRVksRUFBRixJQUFRTCxFQUFBLEdBQUtQLENBQUEsQ0FBRVUsRUFBRixDQUFiLENBckM4QjtBQUFBLG9CQXNDOUJWLENBQUEsQ0FBRWUsRUFBRixJQUFRUixFQUFBLEdBQUtQLENBQUEsQ0FBRVUsRUFBRixDQUFiLENBdEM4QjtBQUFBLG9CQXlDOUJWLENBQUEsQ0FBRWMsRUFBRixJQUFRZCxDQUFBLENBQUVTLEVBQUYsSUFBUUosRUFBaEIsQ0F6QzhCO0FBQUEsb0JBMEM5QkwsQ0FBQSxDQUFFUyxFQUFGLEtBQVNKLEVBQVQsQ0ExQzhCO0FBQUEsb0JBNkM5QkwsQ0FBQSxDQUFFVSxFQUFGLElBQVFGLEVBQUEsR0FBS1IsQ0FBQSxDQUFFYSxFQUFGLENBQWIsQ0E3QzhCO0FBQUEsb0JBOEM5QmIsQ0FBQSxDQUFFYSxFQUFGLEtBQVNMLEVBQVQsQ0E5QzhCO0FBQUEsaUJBRC9CO0FBQUEsZ0JBa0REZ0IsRUFBQSxHQUFNLENBQUFDLEVBQUEsSUFBTSxDQUFOLENBQUQsR0FBWXhCLEVBQWpCLENBbERDO0FBQUEsZ0JBbUREd0IsRUFBQSxHQUFLQSxFQUFBLElBQU0sQ0FBWCxDQW5EQztBQUFBLGFBQUgsUUFxRFNELEVBQUEsR0FBS3JGLENBckRkLEVBVjJCO0FBQUEsU0FqRVI7QUFBQSxLQXZDaUI7QUFBQSxJQTJLeEMsT0FBTyxFQUFFL0IsQ0FBVCxFQUFZO0FBQUEsUUFDVmdELElBQUEsR0FBTzRDLENBQUEsQ0FBRTVGLENBQUYsQ0FBUCxDQURVO0FBQUEsUUFFVmlELElBQUEsR0FBTzJDLENBQUEsQ0FBRTdELENBQUEsR0FBRS9CLENBQUYsR0FBSSxDQUFOLENBQVAsQ0FGVTtBQUFBLFFBR1ZrRCxHQUFBLEdBQU1ILEdBQUEsR0FBTWYsSUFBQSxDQUFLZ0IsSUFBQSxHQUFPQSxJQUFQLEdBQWNDLElBQUEsR0FBT0EsSUFBMUIsQ0FBWixDQUhVO0FBQUEsUUFLVixJQUFJQyxHQUFBLEdBQU0sS0FBS2hCLElBQWYsRUFBcUI7QUFBQSxZQUNuQixLQUFLUyxRQUFMLEdBQWdCM0MsQ0FBaEIsQ0FEbUI7QUFBQSxZQUVuQixLQUFLa0MsSUFBTCxHQUFZZ0IsR0FBWixDQUZtQjtBQUFBLFNBTFg7QUFBQSxRQVVWVixRQUFBLENBQVN4QyxDQUFULElBQWNrRCxHQUFkLENBVlU7QUFBQSxLQTNLNEI7QUFBQSxJQXdMeENWLFFBQUEsQ0FBUyxDQUFULElBQWNPLEdBQUEsR0FBTTZDLENBQUEsQ0FBRSxDQUFGLENBQXBCLENBeEx3QztBQUFBLElBMEx4QyxPQUFPcEQsUUFBUCxDQTFMd0M7QUFBQSxDQUExQyxDQWpuQkE7QUE4eUJBLFNBQVNpRixPQUFULENBQWlCQyxJQUFqQixFQUF1QnJGLFVBQXZCLEVBQW1DQyxVQUFuQyxFQUErQ3FGLFNBQS9DLEVBQTBEQyxPQUExRCxFQUFtRUMsU0FBbkUsRUFBOEVDLE9BQTlFLEVBQXVGQyxRQUF2RixFQUFpRztBQUFBLElBQy9GLEtBQUtMLElBQUwsR0FBWUEsSUFBWixDQUQrRjtBQUFBLElBRS9GLEtBQUtyRixVQUFMLEdBQWtCQSxVQUFsQixDQUYrRjtBQUFBLElBRy9GLEtBQUtDLFVBQUwsR0FBa0JBLFVBQWxCLENBSCtGO0FBQUEsSUFJL0YsS0FBS3FGLFNBQUwsR0FBa0JBLFNBQUEsSUFBYSxDQUEvQixDQUorRjtBQUFBLElBSy9GLEtBQUtDLE9BQUwsR0FBa0JBLE9BQUEsSUFBYSxDQUEvQixDQUwrRjtBQUFBLElBTS9GLEtBQUtDLFNBQUwsR0FBa0JBLFNBQUEsSUFBYSxDQUEvQixDQU4rRjtBQUFBLElBTy9GLEtBQUtDLE9BQUwsR0FBa0JBLE9BQUEsSUFBYSxDQUEvQixDQVArRjtBQUFBLElBUS9GLEtBQUtDLFFBQUwsR0FBa0JBLFFBQUEsSUFBYW5LLEdBQUEsQ0FBSXNCLEdBQW5DLENBUitGO0FBQUEsSUFTL0YsS0FBSzhJLE1BQUwsR0FBa0IsS0FBbEIsQ0FUK0Y7QUFBQSxJQVUvRixLQUFLQyxPQUFMLEdBQWtCLEVBQWxCLENBVitGO0FBQUEsSUFXL0YsS0FBS0MsTUFBTCxHQUFrQixJQUFJM0gsWUFBSixDQUFpQjhCLFVBQWpCLENBQWxCLENBWCtGO0FBQUEsSUFZL0YsS0FBSzhGLFVBQUwsR0FBa0IsQ0FBbEIsQ0FaK0Y7QUFBQSxJQWEvRixLQUFLQyxRQUFMLEdBQWtCLElBQWxCLENBYitGO0FBQUEsSUFjL0YsS0FBS0MsU0FBTCxHQUFrQixDQUFsQixDQWQrRjtBQUFBLElBZS9GLEtBQUtDLGFBQUwsR0FBcUIsR0FBckIsQ0FmK0Y7QUFBQSxJQWdCL0YsS0FBS0MsU0FBTCxHQUFrQixHQUFsQixDQWhCK0Y7QUFBQSxJQWlCL0YsS0FBS0MsSUFBTCxHQUFrQixLQUFLRCxTQUFMLEdBQWlCLEtBQUtELGFBQXhDLENBakIrRjtBQUFBLElBa0IvRixLQUFLRyxRQUFMLEdBQWtCLENBQWxCLENBbEIrRjtBQUFBLElBbUIvRixLQUFLQyxnQkFBTCxHQUF3QixDQUF4QixDQW5CK0Y7QUFBQSxJQW9CL0YsS0FBS0MsUUFBTCxHQUFrQixDQUFsQixDQXBCK0Y7QUFBQSxJQXNCL0YsSUFBSUMsS0FBQSxHQUEwQkMsUUFBQSxDQUFTQyxhQUFULENBQXVCLE9BQXZCLENBQTlCLENBdEIrRjtBQUFBLElBdUIvRixJQUFJQyxJQUFBLEdBQU8sSUFBWCxDQXZCK0Y7QUFBQSxJQXlCL0YsS0FBS0MsV0FBTCxHQUFtQixVQUFTQyxLQUFULEVBQWdCO0FBQUEsUUFDakMsSUFBSWxKLE1BQUEsR0FBU25DLEdBQUEsQ0FBSWdELFVBQUosQ0FBZWhELEdBQUEsQ0FBSUcsR0FBbkIsRUFBd0JrTCxLQUFBLENBQU1DLFdBQTlCLENBQWIsQ0FEaUM7QUFBQSxRQUVqQyxLQUFNLElBQUlsSixDQUFBLEdBQUksQ0FBUixDQUFOLENBQWlCQSxDQUFBLEdBQUlELE1BQUEsQ0FBT0csTUFBNUIsRUFBb0NGLENBQUEsRUFBcEMsRUFBeUM7QUFBQSxZQUN2QytJLElBQUEsQ0FBS2QsT0FBTCxDQUFha0IsSUFBYixDQUFrQnBKLE1BQUEsQ0FBT0MsQ0FBUCxDQUFsQixFQUR1QztBQUFBLFNBRlI7QUFBQSxLQUFuQyxDQXpCK0Y7QUFBQSxJQWdDL0YsS0FBS29KLFlBQUwsR0FBb0IsWUFBVztBQUFBLFFBRTdCTCxJQUFBLENBQUtkLE9BQUwsR0FBZSxJQUFJMUgsWUFBSixDQUFpQndJLElBQUEsQ0FBS2QsT0FBdEIsQ0FBZixDQUY2QjtBQUFBLFFBRzdCYyxJQUFBLENBQUtmLE1BQUwsR0FBYyxJQUFkLENBSDZCO0FBQUEsS0FBL0IsQ0FoQytGO0FBQUEsSUFzQy9GLEtBQUtxQixZQUFMLEdBQW9CLFlBQVc7QUFBQSxRQUM3Qk4sSUFBQSxDQUFLTixRQUFMLEdBQWdCRyxLQUFBLENBQU1ILFFBQXRCLENBRDZCO0FBQUEsS0FBL0IsQ0F0QytGO0FBQUEsSUEwQy9GRyxLQUFBLENBQU1VLGdCQUFOLENBQXVCLG1CQUF2QixFQUE0QyxLQUFLTixXQUFqRCxFQUE4RCxLQUE5RCxFQTFDK0Y7QUFBQSxJQTJDL0ZKLEtBQUEsQ0FBTVUsZ0JBQU4sQ0FBdUIsZ0JBQXZCLEVBQXlDLEtBQUtELFlBQTlDLEVBQTRELEtBQTVELEVBM0MrRjtBQUFBLElBNEMvRlQsS0FBQSxDQUFNVSxnQkFBTixDQUF1QixPQUF2QixFQUFnQyxLQUFLRixZQUFyQyxFQUFtRCxLQUFuRCxFQTVDK0Y7QUFBQSxJQTZDL0ZSLEtBQUEsQ0FBTVcsS0FBTixHQUFjLElBQWQsQ0E3QytGO0FBQUEsSUE4Qy9GWCxLQUFBLENBQU1ZLEdBQU4sR0FBWTlCLElBQVosQ0E5QytGO0FBQUEsSUErQy9Ga0IsS0FBQSxDQUFNYSxJQUFOLEdBL0MrRjtBQUFBLENBOXlCakc7QUFnMkJBaEMsT0FBQSxDQUFRL0QsU0FBUixDQUFrQmdHLGFBQWxCLEdBQWtDLFlBQVc7QUFBQSxJQUMzQyxLQUFLdEIsUUFBTCxDQUFjdUIsT0FBZCxDQUFzQixLQUFLekIsTUFBM0IsRUFEMkM7QUFBQSxJQUUzQyxPQUFPLEtBQUtBLE1BQVosQ0FGMkM7QUFBQSxDQUE3QyxDQWgyQkE7QUFxMkJBVCxPQUFBLENBQVEvRCxTQUFSLENBQWtCa0csUUFBbEIsR0FBNkIsWUFBVztBQUFBLElBQ3RDLElBQUlDLFdBQUEsR0FBYyxLQUFLMUIsVUFBTCxHQUFrQixLQUFLOUYsVUFBekMsQ0FEc0M7QUFBQSxJQUd0QyxJQUFJeUgsU0FBQSxHQUFZLEtBQUtsQyxPQUFMLEdBQWUsS0FBS0ssT0FBTCxDQUFhL0gsTUFBNUIsR0FBcUMsS0FBS3lILFNBQUwsR0FBaUIsS0FBS00sT0FBTCxDQUFhL0gsTUFBbkYsQ0FIc0M7QUFBQSxJQUl0QyxJQUFJNkosZ0JBQUEsR0FBbUIsS0FBS3BDLFNBQUwsR0FBaUIsS0FBS00sT0FBTCxDQUFhL0gsTUFBckQsQ0FKc0M7QUFBQSxJQUt0QyxJQUFJOEosY0FBQSxHQUFpQixLQUFLcEMsT0FBTCxHQUFlLEtBQUtLLE9BQUwsQ0FBYS9ILE1BQWpELENBTHNDO0FBQUEsSUFNdEMsSUFBSStKLE1BQUosQ0FOc0M7QUFBQSxJQVF0QyxLQUFNLElBQUlqSyxDQUFBLEdBQUksQ0FBUixDQUFOLENBQWlCQSxDQUFBLEdBQUksS0FBS3FDLFVBQTFCLEVBQXNDckMsQ0FBQSxFQUF0QyxFQUE0QztBQUFBLFFBQzFDLFFBQVEsS0FBSytILFFBQWI7QUFBQSxRQUNFLEtBQUtuSyxHQUFBLENBQUlzQixHQUFUO0FBQUEsWUFDRSxLQUFLeUosUUFBTCxHQUFnQnBKLElBQUEsQ0FBSzJLLEtBQUwsQ0FBVyxLQUFLeEIsZ0JBQUwsR0FBd0IsS0FBS0YsSUFBN0IsR0FBb0N1QixnQkFBL0MsQ0FBaEIsQ0FERjtBQUFBLFlBRUUsSUFBSSxLQUFLcEIsUUFBTCxHQUFpQixLQUFLZixPQUFMLEdBQWUsS0FBS0ssT0FBTCxDQUFhL0gsTUFBakQsRUFBMkQ7QUFBQSxnQkFDekQsS0FBS2dJLE1BQUwsQ0FBWWxJLENBQVosSUFBaUIsS0FBS2lJLE9BQUwsQ0FBYSxLQUFLVSxRQUFsQixJQUE4QixLQUFLTixTQUFwRCxDQUR5RDtBQUFBLGFBQTNELE1BRU87QUFBQSxnQkFDTCxLQUFLSCxNQUFMLENBQVlsSSxDQUFaLElBQWlCLENBQWpCLENBREs7QUFBQSxhQUpUO0FBQUEsWUFPRSxNQVJKO0FBQUEsUUFVRSxLQUFLcEMsR0FBQSxDQUFJdUIsRUFBVDtBQUFBLFlBQ0UsS0FBS3dKLFFBQUwsR0FBZ0JwSixJQUFBLENBQUsySyxLQUFMLENBQVksS0FBS3hCLGdCQUFMLEdBQXdCLEtBQUtGLElBQTlCLEdBQXNDc0IsU0FBdEMsR0FBa0RDLGdCQUE3RCxDQUFoQixDQURGO0FBQUEsWUFFRSxJQUFJLEtBQUtwQixRQUFMLEdBQWlCLEtBQUtmLE9BQUwsR0FBZSxLQUFLSyxPQUFMLENBQWEvSCxNQUFqRCxFQUEyRDtBQUFBLGdCQUN6RCxLQUFLZ0ksTUFBTCxDQUFZbEksQ0FBWixJQUFpQixLQUFLaUksT0FBTCxDQUFhLEtBQUtVLFFBQWxCLElBQThCLEtBQUtOLFNBQXBELENBRHlEO0FBQUEsYUFGN0Q7QUFBQSxZQUtFLE1BZko7QUFBQSxRQWlCRSxLQUFLekssR0FBQSxDQUFJd0IsRUFBVDtBQUFBLFlBQ0UsS0FBS3VKLFFBQUwsR0FBZ0JxQixjQUFBLEdBQWlCekssSUFBQSxDQUFLMkssS0FBTCxDQUFZLEtBQUt4QixnQkFBTCxHQUF3QixLQUFLRixJQUE5QixHQUFzQ3NCLFNBQWpELENBQWpDLENBREY7QUFBQSxZQUVFLElBQUksS0FBS25CLFFBQUwsR0FBaUIsS0FBS2YsT0FBTCxHQUFlLEtBQUtLLE9BQUwsQ0FBYS9ILE1BQWpELEVBQTJEO0FBQUEsZ0JBQ3pELEtBQUtnSSxNQUFMLENBQVlsSSxDQUFaLElBQWlCLEtBQUtpSSxPQUFMLENBQWEsS0FBS1UsUUFBbEIsSUFBOEIsS0FBS04sU0FBcEQsQ0FEeUQ7QUFBQSxhQUY3RDtBQUFBLFlBS0UsTUF0Qko7QUFBQSxRQXdCRSxLQUFLekssR0FBQSxDQUFJeUIsSUFBVDtBQUFBLFlBQ0UsSUFBS0UsSUFBQSxDQUFLMkUsS0FBTCxDQUFXLEtBQUt3RSxnQkFBTCxHQUF3QixLQUFLRixJQUE3QixHQUFvQ3NCLFNBQS9DLElBQTRELENBQTVELEtBQWtFLENBQXZFLEVBQTJFO0FBQUEsZ0JBQ3pFLEtBQUtuQixRQUFMLEdBQWdCcEosSUFBQSxDQUFLMkssS0FBTCxDQUFZLEtBQUt4QixnQkFBTCxHQUF3QixLQUFLRixJQUE5QixHQUFzQ3NCLFNBQXRDLEdBQWtEQyxnQkFBN0QsQ0FBaEIsQ0FEeUU7QUFBQSxhQUEzRSxNQUVPO0FBQUEsZ0JBQ0wsS0FBS3BCLFFBQUwsR0FBZ0JxQixjQUFBLEdBQWlCekssSUFBQSxDQUFLMkssS0FBTCxDQUFZLEtBQUt4QixnQkFBTCxHQUF3QixLQUFLRixJQUE5QixHQUFzQ3NCLFNBQWpELENBQWpDLENBREs7QUFBQSxhQUhUO0FBQUEsWUFNRSxJQUFJLEtBQUtuQixRQUFMLEdBQWlCLEtBQUtmLE9BQUwsR0FBZSxLQUFLSyxPQUFMLENBQWEvSCxNQUFqRCxFQUEyRDtBQUFBLGdCQUN6RCxLQUFLZ0ksTUFBTCxDQUFZbEksQ0FBWixJQUFpQixLQUFLaUksT0FBTCxDQUFhLEtBQUtVLFFBQWxCLElBQThCLEtBQUtOLFNBQXBELENBRHlEO0FBQUEsYUFON0Q7QUFBQSxZQVNFLE1BakNKO0FBQUEsU0FEMEM7QUFBQSxRQW9DMUMsS0FBS0ssZ0JBQUwsR0FwQzBDO0FBQUEsS0FSTjtBQUFBLElBK0N0QyxLQUFLUCxVQUFMLEdBL0NzQztBQUFBLElBaUR0QyxPQUFPLEtBQUtELE1BQVosQ0FqRHNDO0FBQUEsQ0FBeEMsQ0FyMkJBO0FBeTVCQVQsT0FBQSxDQUFRL0QsU0FBUixDQUFrQnlHLE9BQWxCLEdBQTRCLFVBQVM1QixTQUFULEVBQW9CO0FBQUEsSUFDNUMsSUFBSTZCLGNBQUEsR0FBaUIsS0FBSzFCLGdCQUFMLEdBQXdCLEtBQUtGLElBQWxELENBRDRDO0FBQUEsSUFFNUMsS0FBS0QsU0FBTCxHQUFpQkEsU0FBakIsQ0FGNEM7QUFBQSxJQUc1QyxLQUFLQyxJQUFMLEdBQVksS0FBS0QsU0FBTCxHQUFpQixLQUFLRCxhQUFsQyxDQUg0QztBQUFBLElBSTVDLEtBQUtJLGdCQUFMLEdBQXdCbkosSUFBQSxDQUFLMkssS0FBTCxDQUFXRSxjQUFBLEdBQWUsS0FBSzVCLElBQS9CLENBQXhCLENBSjRDO0FBQUEsQ0FBaEQsQ0F6NUJBO0FBZzZCQWYsT0FBQSxDQUFRL0QsU0FBUixDQUFrQjJHLEtBQWxCLEdBQTBCLFlBQVc7QUFBQSxJQUNuQyxLQUFLM0IsZ0JBQUwsR0FBd0IsQ0FBeEIsQ0FEbUM7QUFBQSxJQUVuQyxLQUFLQyxRQUFMLEdBQWdCLENBQWhCLENBRm1DO0FBQUEsQ0FBckMsQ0FoNkJBO0FBZzdCQSxTQUFTMkIsVUFBVCxDQUFvQkMsSUFBcEIsRUFBMEJoQyxTQUExQixFQUFxQ0YsU0FBckMsRUFBZ0RoRyxVQUFoRCxFQUE0REMsVUFBNUQsRUFBd0U7QUFBQSxJQUN0RSxLQUFLaUcsU0FBTCxHQUFrQkEsU0FBbEIsQ0FEc0U7QUFBQSxJQUV0RSxLQUFLRixTQUFMLEdBQWtCQSxTQUFsQixDQUZzRTtBQUFBLElBR3RFLEtBQUtoRyxVQUFMLEdBQWtCQSxVQUFsQixDQUhzRTtBQUFBLElBSXRFLEtBQUtDLFVBQUwsR0FBa0JBLFVBQWxCLENBSnNFO0FBQUEsSUFNdEUsS0FBSzZGLFVBQUwsR0FBa0IsQ0FBbEIsQ0FOc0U7QUFBQSxJQVF0RSxLQUFLcUMsZUFBTCxHQUF1QixJQUF2QixDQVJzRTtBQUFBLElBVXRFLEtBQUtDLGVBQUwsR0FBdUJsQyxTQUFBLEdBQVlqRyxVQUFuQyxDQVZzRTtBQUFBLElBWXRFLEtBQUs0RixNQUFMLEdBQWMsSUFBSTNILFlBQUosQ0FBaUI4QixVQUFqQixDQUFkLENBWnNFO0FBQUEsSUFhdEUsS0FBSytGLFFBQUwsR0FBZ0IsSUFBaEIsQ0Fic0U7QUFBQSxJQWV0RSxRQUFPc0MsUUFBQSxDQUFTSCxJQUFULEVBQWUsRUFBZixDQUFQO0FBQUEsSUFDRSxLQUFLM00sR0FBQSxDQUFJSyxRQUFUO0FBQUEsUUFDRSxLQUFLME0sSUFBTCxHQUFZTCxVQUFBLENBQVdNLFFBQXZCLENBREY7QUFBQSxRQUVFLE1BSEo7QUFBQSxJQUtFLEtBQUtoTixHQUFBLENBQUlNLEdBQVQ7QUFBQSxRQUNFLEtBQUt5TSxJQUFMLEdBQVlMLFVBQUEsQ0FBV08sR0FBdkIsQ0FERjtBQUFBLFFBRUUsTUFQSjtBQUFBLElBU0UsS0FBS2pOLEdBQUEsQ0FBSU8sTUFBVDtBQUFBLFFBQ0UsS0FBS3dNLElBQUwsR0FBWUwsVUFBQSxDQUFXUSxNQUF2QixDQURGO0FBQUEsUUFFRSxNQVhKO0FBQUEsSUFhRSxRQWJGO0FBQUEsSUFjRSxLQUFLbE4sR0FBQSxDQUFJSSxJQUFUO0FBQUEsUUFDRSxLQUFLMk0sSUFBTCxHQUFZTCxVQUFBLENBQVdTLElBQXZCLENBREY7QUFBQSxRQUVFLE1BaEJKO0FBQUEsS0Fmc0U7QUFBQSxJQWtDdEUsS0FBS0MsaUJBQUwsR0FBeUIsWUFBVztBQUFBLFFBQ2xDVixVQUFBLENBQVdXLFNBQVgsQ0FBcUIsS0FBS04sSUFBMUIsSUFBa0MsSUFBSXBLLFlBQUosQ0FBaUIsSUFBakIsQ0FBbEMsQ0FEa0M7QUFBQSxRQUVsQyxJQUFJMkssYUFBQSxHQUFnQixLQUFLVixlQUFMLEdBQXVCLEtBQUtsSSxVQUFoRCxDQUZrQztBQUFBLFFBR2xDLElBQUk2SSxXQUFBLEdBQWMsSUFBSUQsYUFBdEIsQ0FIa0M7QUFBQSxRQUtsQyxLQUFLLElBQUlsTCxDQUFBLEdBQUksQ0FBUixDQUFMLENBQWdCQSxDQUFBLEdBQUksS0FBS3dLLGVBQXpCLEVBQTBDeEssQ0FBQSxFQUExQyxFQUErQztBQUFBLFlBQzdDc0ssVUFBQSxDQUFXVyxTQUFYLENBQXFCLEtBQUtOLElBQTFCLEVBQWdDM0ssQ0FBaEMsSUFBcUMsS0FBSzJLLElBQUwsQ0FBVTNLLENBQUEsR0FBSW1MLFdBQUosR0FBZ0IsS0FBSzdJLFVBQS9CLENBQXJDLENBRDZDO0FBQUEsU0FMYjtBQUFBLEtBQXBDLENBbENzRTtBQUFBLElBNEN0RSxJQUFLLE9BQU9nSSxVQUFBLENBQVdXLFNBQWxCLEtBQWdDLFdBQXJDLEVBQW1EO0FBQUEsUUFDakRYLFVBQUEsQ0FBV1csU0FBWCxHQUF1QixFQUF2QixDQURpRDtBQUFBLEtBNUNtQjtBQUFBLElBZ0R0RSxJQUFLLE9BQU9YLFVBQUEsQ0FBV1csU0FBWCxDQUFxQixLQUFLTixJQUExQixDQUFQLEtBQTJDLFdBQWhELEVBQThEO0FBQUEsUUFDNUQsS0FBS0ssaUJBQUwsR0FENEQ7QUFBQSxLQWhEUTtBQUFBLElBb0R0RSxLQUFLQyxTQUFMLEdBQWlCWCxVQUFBLENBQVdXLFNBQVgsQ0FBcUIsS0FBS04sSUFBMUIsQ0FBakIsQ0FwRHNFO0FBQUEsQ0FoN0J4RTtBQTQrQkFMLFVBQUEsQ0FBVzVHLFNBQVgsQ0FBcUIwSCxNQUFyQixHQUE4QixVQUFTL0MsU0FBVCxFQUFvQjtBQUFBLElBQ2hELElBQUlBLFNBQUEsSUFBYSxDQUFiLElBQWtCQSxTQUFBLElBQWEsQ0FBbkMsRUFBc0M7QUFBQSxRQUNwQyxLQUFLQSxTQUFMLEdBQWlCQSxTQUFqQixDQURvQztBQUFBLEtBQXRDLE1BRU87QUFBQSxRQUNMLE1BQU0sZ0NBQU4sQ0FESztBQUFBLEtBSHlDO0FBQUEsQ0FBbEQsQ0E1K0JBO0FBeS9CQWlDLFVBQUEsQ0FBVzVHLFNBQVgsQ0FBcUJ5RyxPQUFyQixHQUErQixVQUFTNUIsU0FBVCxFQUFvQjtBQUFBLElBQ2pELEtBQUtBLFNBQUwsR0FBaUJBLFNBQWpCLENBRGlEO0FBQUEsSUFFakQsS0FBS2tDLGVBQUwsR0FBdUJsQyxTQUFBLEdBQVksS0FBS2pHLFVBQXhDLENBRmlEO0FBQUEsQ0FBbkQsQ0F6L0JBO0FBKy9CQWdJLFVBQUEsQ0FBVzVHLFNBQVgsQ0FBcUIySCxHQUFyQixHQUEyQixVQUFTQyxVQUFULEVBQXFCO0FBQUEsSUFDOUMsS0FBTSxJQUFJdEwsQ0FBQSxHQUFJLENBQVIsQ0FBTixDQUFpQkEsQ0FBQSxHQUFJLEtBQUtxQyxVQUExQixFQUFzQ3JDLENBQUEsRUFBdEMsRUFBNEM7QUFBQSxRQUUxQyxLQUFLa0ksTUFBTCxDQUFZbEksQ0FBWixLQUFrQnNMLFVBQUEsQ0FBV3BELE1BQVgsQ0FBa0JsSSxDQUFsQixDQUFsQixDQUYwQztBQUFBLEtBREU7QUFBQSxJQU05QyxPQUFPLEtBQUtrSSxNQUFaLENBTjhDO0FBQUEsQ0FBaEQsQ0EvL0JBO0FBeWdDQW9DLFVBQUEsQ0FBVzVHLFNBQVgsQ0FBcUI2SCxTQUFyQixHQUFpQyxVQUFTckQsTUFBVCxFQUFpQjtBQUFBLElBQ2hELEtBQU0sSUFBSWxJLENBQUEsR0FBSSxDQUFSLENBQU4sQ0FBaUJBLENBQUEsR0FBSWtJLE1BQUEsQ0FBT2hJLE1BQTVCLEVBQW9DRixDQUFBLEVBQXBDLEVBQTBDO0FBQUEsUUFDeEMsSUFBS0EsQ0FBQSxJQUFLLEtBQUtxQyxVQUFmLEVBQTRCO0FBQUEsWUFDMUIsTUFEMEI7QUFBQSxTQURZO0FBQUEsUUFJeEMsS0FBSzZGLE1BQUwsQ0FBWWxJLENBQVosS0FBa0JrSSxNQUFBLENBQU9sSSxDQUFQLENBQWxCLENBSndDO0FBQUEsS0FETTtBQUFBLElBZ0JoRCxPQUFPLEtBQUtrSSxNQUFaLENBaEJnRDtBQUFBLENBQWxELENBemdDQTtBQTZoQ0FvQyxVQUFBLENBQVc1RyxTQUFYLENBQXFCOEgsV0FBckIsR0FBbUMsVUFBU3BELFFBQVQsRUFBbUI7QUFBQSxJQUNwRCxLQUFLQSxRQUFMLEdBQWdCQSxRQUFoQixDQURvRDtBQUFBLENBQXRELENBN2hDQTtBQWlpQ0FrQyxVQUFBLENBQVc1RyxTQUFYLENBQXFCZ0csYUFBckIsR0FBcUMsWUFBVztBQUFBLElBQzlDLEtBQUt0QixRQUFMLENBQWN1QixPQUFkLENBQXNCLEtBQUt6QixNQUEzQixFQUQ4QztBQUFBLENBQWhELENBamlDQTtBQXFpQ0FvQyxVQUFBLENBQVc1RyxTQUFYLENBQXFCK0gsT0FBckIsR0FBK0IsVUFBU3hCLE1BQVQsRUFBaUI7QUFBQSxJQUM5QyxPQUFPLEtBQUtnQixTQUFMLENBQWVoQixNQUFBLEdBQVMsS0FBS08sZUFBN0IsQ0FBUCxDQUQ4QztBQUFBLENBQWhELENBcmlDQTtBQXlpQ0FGLFVBQUEsQ0FBVzVHLFNBQVgsQ0FBcUJrRyxRQUFyQixHQUFnQyxZQUFXO0FBQUEsSUFDekMsSUFBSUMsV0FBQSxHQUFjLEtBQUsxQixVQUFMLEdBQWtCLEtBQUs5RixVQUF6QyxDQUR5QztBQUFBLElBRXpDLElBQUltRyxJQUFBLEdBQU8sS0FBS2dDLGVBQUwsR0FBdUIsS0FBS2pDLFNBQTVCLEdBQXdDLEtBQUtqRyxVQUF4RCxDQUZ5QztBQUFBLElBR3pDLElBQUkySCxNQUFKLENBSHlDO0FBQUEsSUFLekMsS0FBTSxJQUFJakssQ0FBQSxHQUFJLENBQVIsQ0FBTixDQUFpQkEsQ0FBQSxHQUFJLEtBQUtxQyxVQUExQixFQUFzQ3JDLENBQUEsRUFBdEMsRUFBNEM7QUFBQSxRQUkxQ2lLLE1BQUEsR0FBUzFLLElBQUEsQ0FBSzJLLEtBQUwsQ0FBWSxDQUFBTCxXQUFBLEdBQWM3SixDQUFkLENBQUQsR0FBb0J3SSxJQUEvQixDQUFULENBSjBDO0FBQUEsUUFLMUMsS0FBS04sTUFBTCxDQUFZbEksQ0FBWixJQUFpQixLQUFLaUwsU0FBTCxDQUFlaEIsTUFBQSxHQUFTLEtBQUtPLGVBQTdCLElBQWdELEtBQUtuQyxTQUF0RSxDQUwwQztBQUFBLEtBTEg7QUFBQSxJQWF6QyxLQUFLRixVQUFMLEdBYnlDO0FBQUEsSUFlekMsT0FBTyxLQUFLRCxNQUFaLENBZnlDO0FBQUEsQ0FBM0MsQ0F6aUNBO0FBMmpDQW9DLFVBQUEsQ0FBV1MsSUFBWCxHQUFrQixVQUFTdkMsSUFBVCxFQUFlO0FBQUEsSUFDL0IsT0FBT2pKLElBQUEsQ0FBS2lFLEdBQUwsQ0FBUzVGLEdBQUEsQ0FBSTBCLE1BQUosR0FBYWtKLElBQXRCLENBQVAsQ0FEK0I7QUFBQSxDQUFqQyxDQTNqQ0E7QUErakNBOEIsVUFBQSxDQUFXUSxNQUFYLEdBQW9CLFVBQVN0QyxJQUFULEVBQWU7QUFBQSxJQUNqQyxPQUFPQSxJQUFBLEdBQU8sR0FBUCxHQUFhLENBQWIsR0FBaUIsQ0FBQyxDQUF6QixDQURpQztBQUFBLENBQW5DLENBL2pDQTtBQW1rQ0E4QixVQUFBLENBQVdPLEdBQVgsR0FBaUIsVUFBU3JDLElBQVQsRUFBZTtBQUFBLElBQzlCLE9BQU8sSUFBSyxDQUFBQSxJQUFBLEdBQU9qSixJQUFBLENBQUsySyxLQUFMLENBQVcxQixJQUFYLENBQVAsQ0FBWixDQUQ4QjtBQUFBLENBQWhDLENBbmtDQTtBQXVrQ0E4QixVQUFBLENBQVdNLFFBQVgsR0FBc0IsVUFBU3BDLElBQVQsRUFBZTtBQUFBLElBQ25DLE9BQU8sSUFBSSxJQUFJakosSUFBQSxDQUFLNEMsR0FBTCxDQUFTNUMsSUFBQSxDQUFLMkssS0FBTCxDQUFXMUIsSUFBWCxJQUFtQkEsSUFBNUIsQ0FBZixDQURtQztBQUFBLENBQXJDLENBdmtDQTtBQTJrQ0E4QixVQUFBLENBQVdvQixLQUFYLEdBQW1CLFVBQVNsRCxJQUFULEVBQWU7QUFBQSxDQUFsQyxDQTNrQ0E7QUEra0NBLFNBQVNtRCxJQUFULENBQWNDLFlBQWQsRUFBNEJDLFdBQTVCLEVBQXlDQyxZQUF6QyxFQUF1REMsYUFBdkQsRUFBc0VDLGFBQXRFLEVBQXFGMUosVUFBckYsRUFBaUc7QUFBQSxJQUMvRixLQUFLQSxVQUFMLEdBQWtCQSxVQUFsQixDQUQrRjtBQUFBLElBRy9GLEtBQUtzSixZQUFMLEdBQXFCQSxZQUFyQixDQUgrRjtBQUFBLElBSS9GLEtBQUtDLFdBQUwsR0FBcUJBLFdBQXJCLENBSitGO0FBQUEsSUFLL0YsS0FBS0MsWUFBTCxHQUFxQkEsWUFBckIsQ0FMK0Y7QUFBQSxJQU0vRixLQUFLQyxhQUFMLEdBQXFCQSxhQUFyQixDQU4rRjtBQUFBLElBTy9GLEtBQUtDLGFBQUwsR0FBcUJBLGFBQXJCLENBUCtGO0FBQUEsSUFRL0YsS0FBSzFKLFVBQUwsR0FBcUJBLFVBQXJCLENBUitGO0FBQUEsSUFXL0YsS0FBSzJKLGFBQUwsR0FBc0JMLFlBQUEsR0FBZ0J0SixVQUF0QyxDQVgrRjtBQUFBLElBWS9GLEtBQUs0SixZQUFMLEdBQXNCTCxXQUFBLEdBQWdCdkosVUFBdEMsQ0FaK0Y7QUFBQSxJQWEvRixLQUFLNkosY0FBTCxHQUFzQkosYUFBQSxHQUFnQnpKLFVBQXRDLENBYitGO0FBQUEsSUFjL0YsS0FBSzhKLGNBQUwsR0FBc0JKLGFBQUEsR0FBZ0IxSixVQUF0QyxDQWQrRjtBQUFBLElBaUIvRixLQUFLK0osTUFBTCxHQUFjLFlBQVc7QUFBQSxRQUN2QixLQUFLQyxNQUFMLEdBQXFDLEtBQUtMLGFBQTFDLENBRHVCO0FBQUEsUUFFdkIsS0FBS00sS0FBTCxHQUFzQixLQUFLRCxNQUFMLEdBQWUsS0FBS0osWUFBMUMsQ0FGdUI7QUFBQSxRQUd2QixLQUFLTSxPQUFMLEdBQXNCLEtBQUtELEtBQUwsR0FBZSxLQUFLSixjQUExQyxDQUh1QjtBQUFBLFFBSXZCLEtBQUtNLE9BQUwsR0FBc0IsS0FBS0QsT0FBTCxHQUFlLEtBQUtKLGNBQTFDLENBSnVCO0FBQUEsS0FBekIsQ0FqQitGO0FBQUEsSUF3Qi9GLEtBQUtDLE1BQUwsR0F4QitGO0FBQUEsSUEwQi9GLEtBQUszRCxnQkFBTCxHQUF3QixDQUF4QixDQTFCK0Y7QUFBQSxDQS9rQ2pHO0FBNG1DQWlELElBQUEsQ0FBS2pJLFNBQUwsQ0FBZWdKLE1BQWYsR0FBd0IsWUFBVztBQUFBLElBQ2pDLEtBQUtoRSxnQkFBTCxHQUF3QixDQUF4QixDQURpQztBQUFBLElBRWpDLEtBQUt5RCxjQUFMLEdBQXNCLEtBQUtKLGFBQUwsR0FBcUIsS0FBS3pKLFVBQWhELENBRmlDO0FBQUEsSUFHakMsS0FBSytKLE1BQUwsR0FIaUM7QUFBQSxDQUFuQyxDQTVtQ0E7QUFtbkNBVixJQUFBLENBQUtqSSxTQUFMLENBQWVpSixPQUFmLEdBQXlCLFlBQVc7QUFBQSxJQUNsQyxLQUFLUixjQUFMLEdBQXNCLEtBQUt6RCxnQkFBTCxHQUF3QixLQUFLd0QsWUFBbkQsQ0FEa0M7QUFBQSxJQUVsQyxLQUFLRyxNQUFMLEdBRmtDO0FBQUEsQ0FBcEMsQ0FubkNBO0FBd25DQVYsSUFBQSxDQUFLakksU0FBTCxDQUFla0osYUFBZixHQUErQixVQUFTQyxNQUFULEVBQWlCO0FBQUEsSUFDOUMsSUFBSXhFLFNBQUEsR0FBWSxDQUFoQixDQUQ4QztBQUFBLElBRzlDLElBQUssS0FBS0ssZ0JBQUwsSUFBeUIsS0FBSzRELE1BQW5DLEVBQTRDO0FBQUEsUUFDMUNqRSxTQUFBLEdBQVksSUFBSyxLQUFJLENBQUosQ0FBRCxHQUFXLENBQUMsTUFBS0ssZ0JBQUwsR0FBd0IsQ0FBeEIsQ0FBRCxHQUErQixNQUFLNEQsTUFBTCxHQUFjLENBQWQsQ0FBL0IsQ0FBM0IsQ0FEMEM7QUFBQSxLQUE1QyxNQUVPLElBQUssS0FBSzVELGdCQUFMLEdBQXdCLEtBQUs0RCxNQUE3QixJQUF1QyxLQUFLNUQsZ0JBQUwsSUFBeUIsS0FBSzZELEtBQTFFLEVBQWtGO0FBQUEsUUFDdkZsRSxTQUFBLEdBQVksSUFBSyxNQUFLeUQsWUFBTCxHQUFvQixDQUFwQixDQUFELEdBQTJCLENBQUMsTUFBS3BELGdCQUFMLEdBQXdCLEtBQUs0RCxNQUE3QixDQUFELEdBQXlDLE1BQUtDLEtBQUwsR0FBYSxLQUFLRCxNQUFsQixDQUF6QyxDQUEzQyxDQUR1RjtBQUFBLEtBQWxGLE1BRUEsSUFBSyxLQUFLNUQsZ0JBQUwsR0FBd0IsS0FBSzZELEtBQTdCLElBQXNDLEtBQUs3RCxnQkFBTCxJQUF5QixLQUFLOEQsT0FBekUsRUFBbUY7QUFBQSxRQUN4Rm5FLFNBQUEsR0FBWSxLQUFLeUQsWUFBakIsQ0FEd0Y7QUFBQSxLQUFuRixNQUVBLElBQUssS0FBS3BELGdCQUFMLEdBQXdCLEtBQUs4RCxPQUE3QixJQUF3QyxLQUFLOUQsZ0JBQUwsSUFBeUIsS0FBSytELE9BQTNFLEVBQXFGO0FBQUEsUUFDMUZwRSxTQUFBLEdBQVksS0FBS3lELFlBQUwsR0FBcUIsS0FBSSxLQUFLQSxZQUFULENBQUQsR0FBMkIsQ0FBQyxNQUFLcEQsZ0JBQUwsR0FBd0IsS0FBSzhELE9BQTdCLENBQUQsR0FBMEMsTUFBS0MsT0FBTCxHQUFlLEtBQUtELE9BQXBCLENBQTFDLENBQTNELENBRDBGO0FBQUEsS0FUOUM7QUFBQSxJQWE5QyxPQUFPSyxNQUFBLEdBQVN4RSxTQUFoQixDQWI4QztBQUFBLENBQWhELENBeG5DQTtBQXdvQ0FzRCxJQUFBLENBQUtqSSxTQUFMLENBQWVvSixLQUFmLEdBQXVCLFlBQVc7QUFBQSxJQUNoQyxJQUFJekUsU0FBQSxHQUFZLENBQWhCLENBRGdDO0FBQUEsSUFHaEMsSUFBSyxLQUFLSyxnQkFBTCxJQUF5QixLQUFLNEQsTUFBbkMsRUFBNEM7QUFBQSxRQUMxQ2pFLFNBQUEsR0FBWSxJQUFLLEtBQUksQ0FBSixDQUFELEdBQVcsQ0FBQyxNQUFLSyxnQkFBTCxHQUF3QixDQUF4QixDQUFELEdBQStCLE1BQUs0RCxNQUFMLEdBQWMsQ0FBZCxDQUEvQixDQUEzQixDQUQwQztBQUFBLEtBQTVDLE1BRU8sSUFBSyxLQUFLNUQsZ0JBQUwsR0FBd0IsS0FBSzRELE1BQTdCLElBQXVDLEtBQUs1RCxnQkFBTCxJQUF5QixLQUFLNkQsS0FBMUUsRUFBa0Y7QUFBQSxRQUN2RmxFLFNBQUEsR0FBWSxJQUFLLE1BQUt5RCxZQUFMLEdBQW9CLENBQXBCLENBQUQsR0FBMkIsQ0FBQyxNQUFLcEQsZ0JBQUwsR0FBd0IsS0FBSzRELE1BQTdCLENBQUQsR0FBeUMsTUFBS0MsS0FBTCxHQUFhLEtBQUtELE1BQWxCLENBQXpDLENBQTNDLENBRHVGO0FBQUEsS0FBbEYsTUFFQSxJQUFLLEtBQUs1RCxnQkFBTCxHQUF3QixLQUFLNkQsS0FBN0IsSUFBc0MsS0FBSzdELGdCQUFMLElBQXlCLEtBQUs4RCxPQUF6RSxFQUFtRjtBQUFBLFFBQ3hGbkUsU0FBQSxHQUFZLEtBQUt5RCxZQUFqQixDQUR3RjtBQUFBLEtBQW5GLE1BRUEsSUFBSyxLQUFLcEQsZ0JBQUwsR0FBd0IsS0FBSzhELE9BQTdCLElBQXdDLEtBQUs5RCxnQkFBTCxJQUF5QixLQUFLK0QsT0FBM0UsRUFBcUY7QUFBQSxRQUMxRnBFLFNBQUEsR0FBWSxLQUFLeUQsWUFBTCxHQUFxQixLQUFJLEtBQUtBLFlBQVQsQ0FBRCxHQUEyQixDQUFDLE1BQUtwRCxnQkFBTCxHQUF3QixLQUFLOEQsT0FBN0IsQ0FBRCxHQUEwQyxNQUFLQyxPQUFMLEdBQWUsS0FBS0QsT0FBcEIsQ0FBMUMsQ0FBM0QsQ0FEMEY7QUFBQSxLQVQ1RDtBQUFBLElBYWhDLE9BQU9uRSxTQUFQLENBYmdDO0FBQUEsQ0FBbEMsQ0F4b0NBO0FBd3BDQXNELElBQUEsQ0FBS2pJLFNBQUwsQ0FBZWlHLE9BQWYsR0FBeUIsVUFBUzVKLE1BQVQsRUFBaUI7QUFBQSxJQUN4QyxLQUFNLElBQUlDLENBQUEsR0FBSSxDQUFSLENBQU4sQ0FBaUJBLENBQUEsR0FBSUQsTUFBQSxDQUFPRyxNQUE1QixFQUFvQ0YsQ0FBQSxFQUFwQyxFQUEwQztBQUFBLFFBQ3hDRCxNQUFBLENBQU9DLENBQVAsS0FBYSxLQUFLOE0sS0FBTCxFQUFiLENBRHdDO0FBQUEsUUFHeEMsS0FBS3BFLGdCQUFMLEdBSHdDO0FBQUEsS0FERjtBQUFBLElBT3hDLE9BQU8zSSxNQUFQLENBUHdDO0FBQUEsQ0FBMUMsQ0F4cENBO0FBbXFDQTRMLElBQUEsQ0FBS2pJLFNBQUwsQ0FBZXFKLFFBQWYsR0FBMEIsWUFBVztBQUFBLElBQ25DLElBQUssS0FBS3JFLGdCQUFMLEdBQXdCLEtBQUsrRCxPQUE3QixJQUF3QyxLQUFLL0QsZ0JBQUwsS0FBMEIsQ0FBQyxDQUF4RSxFQUE0RTtBQUFBLFFBQzFFLE9BQU8sS0FBUCxDQUQwRTtBQUFBLEtBQTVFLE1BRU87QUFBQSxRQUNMLE9BQU8sSUFBUCxDQURLO0FBQUEsS0FINEI7QUFBQSxDQUFyQyxDQW5xQ0E7QUEycUNBaUQsSUFBQSxDQUFLakksU0FBTCxDQUFlc0osT0FBZixHQUF5QixZQUFXO0FBQUEsSUFDbEMsS0FBS3RFLGdCQUFMLEdBQXdCLENBQUMsQ0FBekIsQ0FEa0M7QUFBQSxDQUFwQyxDQTNxQ0E7QUErcUNBLFNBQVN1RSxTQUFULENBQW1CMUMsSUFBbkIsRUFBeUIyQyxNQUF6QixFQUFpQ0MsU0FBakMsRUFBNEM3SyxVQUE1QyxFQUF3RDtBQUFBLElBQ3RELEtBQUtBLFVBQUwsR0FBa0JBLFVBQWxCLENBRHNEO0FBQUEsSUFHdEQsUUFBT2lJLElBQVA7QUFBQSxJQUNFLEtBQUszTSxHQUFBLENBQUlRLE9BQVQsQ0FERjtBQUFBLElBRUUsS0FBS1IsR0FBQSxDQUFJd1AsSUFBVDtBQUFBLFFBQ0UsS0FBS3pDLElBQUwsR0FBWSxJQUFJc0MsU0FBQSxDQUFVRyxJQUFkLENBQW1CRixNQUFuQixFQUEyQkMsU0FBM0IsRUFBc0M3SyxVQUF0QyxDQUFaLENBREY7QUFBQSxRQUVFLE1BSko7QUFBQSxLQUhzRDtBQUFBLENBL3FDeEQ7QUEwckNBMkssU0FBQSxDQUFVdkosU0FBVixDQUFvQjJKLGdCQUFwQixDQUFxQyxRQUFyQyxFQUNFLFlBQVc7QUFBQSxJQUNULE9BQU8sS0FBSzFDLElBQUwsQ0FBVXVDLE1BQWpCLENBRFM7QUFBQSxDQURiLEVBMXJDQTtBQWdzQ0FELFNBQUEsQ0FBVXZKLFNBQVYsQ0FBb0IySixnQkFBcEIsQ0FBcUMsV0FBckMsRUFDRSxZQUFXO0FBQUEsSUFDVCxPQUFPLEtBQUsxQyxJQUFMLENBQVV3QyxTQUFqQixDQURTO0FBQUEsQ0FEYixFQWhzQ0E7QUFzc0NBRixTQUFBLENBQVV2SixTQUFWLENBQW9CNEosR0FBcEIsR0FBMEIsVUFBU0osTUFBVCxFQUFpQkMsU0FBakIsRUFBNEI7QUFBQSxJQUNwRCxLQUFLeEMsSUFBTCxDQUFVNEMsU0FBVixDQUFvQkwsTUFBcEIsRUFBNEJDLFNBQTVCLEVBRG9EO0FBQUEsQ0FBdEQsQ0F0c0NBO0FBMHNDQUYsU0FBQSxDQUFVdkosU0FBVixDQUFvQmlHLE9BQXBCLEdBQThCLFVBQVM1SixNQUFULEVBQWlCO0FBQUEsSUFDN0MsS0FBSzRLLElBQUwsQ0FBVWhCLE9BQVYsQ0FBa0I1SixNQUFsQixFQUQ2QztBQUFBLENBQS9DLENBMXNDQTtBQStzQ0FrTixTQUFBLENBQVV2SixTQUFWLENBQW9COEgsV0FBcEIsR0FBa0MsVUFBU3BELFFBQVQsRUFBbUI7QUFBQSxJQUNuRCxJQUFLQSxRQUFBLFlBQW9CdUQsSUFBekIsRUFBZ0M7QUFBQSxRQUM5QixLQUFLaEIsSUFBTCxDQUFVYSxXQUFWLENBQXNCcEQsUUFBdEIsRUFEOEI7QUFBQSxLQUFoQyxNQUVPO0FBQUEsUUFDTCxNQUFNLGtCQUFOLENBREs7QUFBQSxLQUg0QztBQUFBLENBQXJELENBL3NDQTtBQXV0Q0E2RSxTQUFBLENBQVVHLElBQVYsR0FBaUIsVUFBU0YsTUFBVCxFQUFpQkMsU0FBakIsRUFBNEI3SyxVQUE1QixFQUF3QztBQUFBLElBQ3ZELEtBQUtBLFVBQUwsR0FBa0JBLFVBQWxCLENBRHVEO0FBQUEsSUFFdkQsS0FBS2tMLFFBQUwsR0FBa0IsQ0FBbEIsQ0FGdUQ7QUFBQSxJQUd2RCxLQUFLQyxVQUFMLEdBQWtCLENBQWxCLENBSHVEO0FBQUEsSUFJdkQsS0FBS3JGLFFBQUwsR0FBZ0IsS0FBaEIsQ0FKdUQ7QUFBQSxJQU12RCxLQUFLbUYsU0FBTCxHQUFpQixVQUFTTCxNQUFULEVBQWlCQyxTQUFqQixFQUE0QjtBQUFBLFFBQzNDLEtBQUtPLENBQUwsR0FBUyxJQUFNbk8sSUFBQSxDQUFLQyxFQUFYLEdBQWdCME4sTUFBaEIsR0FBeUIsS0FBSzVLLFVBQXZDLENBRDJDO0FBQUEsUUFFM0MsS0FBS3FMLENBQUwsR0FBUyxJQUFNLEtBQUtELENBQUwsR0FBVSxLQUFPLENBQUFQLFNBQUEsR0FBWSxNQUFPLEtBQU0sS0FBS08sQ0FBWCxDQUFuQixDQUFQLEdBQTJDLEtBQUtBLENBQWhELEdBQW9ELENBQXBELENBQXpCLENBRjJDO0FBQUEsUUFHM0MsS0FBS2pJLENBQUwsR0FBUyxLQUFLa0ksQ0FBTCxHQUFTLEtBQUtBLENBQXZCLENBSDJDO0FBQUEsUUFJM0MsS0FBS0MsQ0FBTCxHQUFTLEtBQUtuSSxDQUFMLEdBQVMsQ0FBVCxHQUFlLElBQU1sRyxJQUFBLENBQUtrRSxHQUFMLENBQVMsS0FBS2lLLENBQWQsQ0FBTixHQUF5QixLQUFLQyxDQUF0RCxDQUoyQztBQUFBLFFBTTNDLEtBQUtULE1BQUwsR0FBY0EsTUFBZCxDQU4yQztBQUFBLFFBTzNDLEtBQUtDLFNBQUwsR0FBaUJBLFNBQWpCLENBUDJDO0FBQUEsS0FBN0MsQ0FOdUQ7QUFBQSxJQWdCdkQsS0FBS0ksU0FBTCxDQUFlTCxNQUFmLEVBQXVCQyxTQUF2QixFQWhCdUQ7QUFBQSxJQWtCdkQsS0FBS3hELE9BQUwsR0FBZSxVQUFTNUosTUFBVCxFQUFpQjtBQUFBLFFBQzlCLEtBQU0sSUFBSUMsQ0FBQSxHQUFJLENBQVIsQ0FBTixDQUFpQkEsQ0FBQSxHQUFJRCxNQUFBLENBQU9HLE1BQTVCLEVBQW9DRixDQUFBLEVBQXBDLEVBQTBDO0FBQUEsWUFDeEMsS0FBS3lOLFVBQUwsSUFBb0IsQ0FBQTFOLE1BQUEsQ0FBT0MsQ0FBUCxJQUFZLEtBQUt3TixRQUFqQixDQUFELEdBQThCLEtBQUtJLENBQXRELENBRHdDO0FBQUEsWUFFeEMsS0FBS0osUUFBTCxJQUFtQixLQUFLQyxVQUF4QixDQUZ3QztBQUFBLFlBR3hDLEtBQUtBLFVBQUwsSUFBbUIsS0FBS2hJLENBQXhCLENBSHdDO0FBQUEsWUFtQnhDLElBQUksS0FBSzJDLFFBQVQsRUFBbUI7QUFBQSxnQkFDakJySSxNQUFBLENBQU9DLENBQVAsSUFBYUQsTUFBQSxDQUFPQyxDQUFQLElBQWEsS0FBSSxLQUFLb0ksUUFBTCxDQUFjMEUsS0FBZCxFQUFKLENBQWQsR0FBNkMsS0FBS1UsUUFBTCxHQUFnQixLQUFLcEYsUUFBTCxDQUFjMEUsS0FBZCxFQUF6RSxDQURpQjtBQUFBLGdCQUVqQixLQUFLMUUsUUFBTCxDQUFjTSxnQkFBZCxHQUZpQjtBQUFBLGFBQW5CLE1BR087QUFBQSxnQkFDTDNJLE1BQUEsQ0FBT0MsQ0FBUCxJQUFZLEtBQUt3TixRQUFqQixDQURLO0FBQUEsYUF0QmlDO0FBQUEsU0FEWjtBQUFBLEtBQWhDLENBbEJ1RDtBQUFBLENBQXpELENBdnRDQTtBQXV3Q0FQLFNBQUEsQ0FBVUcsSUFBVixDQUFlMUosU0FBZixDQUF5QjhILFdBQXpCLEdBQXVDLFVBQVNwRCxRQUFULEVBQW1CO0FBQUEsSUFDeEQsS0FBS0EsUUFBTCxHQUFnQkEsUUFBaEIsQ0FEd0Q7QUFBQSxDQUExRCxDQXZ3Q0E7QUEyd0NBLFNBQVN5RixVQUFULENBQW9CdEQsSUFBcEIsRUFBMEIyQyxNQUExQixFQUFrQ0MsU0FBbEMsRUFBNkM3SyxVQUE3QyxFQUF5RDtBQUFBLElBQ3ZELEtBQUtpSSxJQUFMLEdBQVlBLElBQVosQ0FEdUQ7QUFBQSxJQUV2RCxLQUFLMkMsTUFBTCxHQUFjQSxNQUFkLENBRnVEO0FBQUEsSUFHdkQsS0FBS0MsU0FBTCxHQUFpQkEsU0FBakIsQ0FIdUQ7QUFBQSxJQUl2RCxLQUFLN0ssVUFBTCxHQUFrQkEsVUFBbEIsQ0FKdUQ7QUFBQSxJQU12RCxLQUFLd0wsQ0FBTCxHQUFTdk4sWUFBQSxDQUFhLENBQWIsQ0FBVCxDQU51RDtBQUFBLElBT3ZELEtBQUt1TixDQUFMLENBQU8sQ0FBUCxJQUFZLENBQVosQ0FQdUQ7QUFBQSxJQVF2RCxLQUFLQSxDQUFMLENBQU8sQ0FBUCxJQUFZLENBQVosQ0FSdUQ7QUFBQSxJQVN2RCxLQUFLQSxDQUFMLENBQU8sQ0FBUCxJQUFZLENBQVosQ0FUdUQ7QUFBQSxJQVV2RCxLQUFLQSxDQUFMLENBQU8sQ0FBUCxJQUFZLENBQVosQ0FWdUQ7QUFBQSxJQVl2RCxLQUFLUCxTQUFMLEdBQWlCLFVBQVNMLE1BQVQsRUFBaUJDLFNBQWpCLEVBQTRCO0FBQUEsUUFDM0MsS0FBS1ksSUFBTCxHQUFZLElBQUl4TyxJQUFBLENBQUtpRSxHQUFMLENBQVNqRSxJQUFBLENBQUtDLEVBQUwsR0FBVUQsSUFBQSxDQUFLeU8sR0FBTCxDQUFTLElBQVQsRUFBZWQsTUFBQSxHQUFRLE1BQUs1SyxVQUFMLEdBQWdCLENBQWhCLENBQXZCLENBQW5CLENBQWhCLENBRDJDO0FBQUEsUUFFM0MsS0FBSzJMLElBQUwsR0FBWTFPLElBQUEsQ0FBS3lPLEdBQUwsQ0FBUyxJQUFLLEtBQUl6TyxJQUFBLENBQUs4RSxHQUFMLENBQVM4SSxTQUFULEVBQW9CLElBQXBCLENBQUosQ0FBZCxFQUE4QzVOLElBQUEsQ0FBS3lPLEdBQUwsQ0FBUyxDQUFULEVBQVksSUFBRSxLQUFLRCxJQUFQLEdBQWMsS0FBS0EsSUFBTCxHQUFZLEdBQXRDLENBQTlDLENBQVosQ0FGMkM7QUFBQSxLQUE3QyxDQVp1RDtBQUFBLElBaUJ2RCxLQUFLUixTQUFMLENBQWVMLE1BQWYsRUFBdUJDLFNBQXZCLEVBakJ1RDtBQUFBLENBM3dDekQ7QUEreENBVSxVQUFBLENBQVduSyxTQUFYLENBQXFCaUcsT0FBckIsR0FBK0IsVUFBUzVKLE1BQVQsRUFBaUI7QUFBQSxJQUM5QyxJQUFJbU8sS0FBSixFQUFXQyxNQUFYLENBRDhDO0FBQUEsSUFFOUMsSUFBSUwsQ0FBQSxHQUFJLEtBQUtBLENBQWIsQ0FGOEM7QUFBQSxJQUk5QyxLQUFNLElBQUk5TixDQUFBLEdBQUksQ0FBUixDQUFOLENBQWlCQSxDQUFBLEdBQUlELE1BQUEsQ0FBT0csTUFBNUIsRUFBb0NGLENBQUEsRUFBcEMsRUFBMEM7QUFBQSxRQUN4Q2tPLEtBQUEsR0FBUW5PLE1BQUEsQ0FBT0MsQ0FBUCxDQUFSLENBRHdDO0FBQUEsUUFJeEM4TixDQUFBLENBQUUsQ0FBRixJQUFPSSxLQUFBLEdBQVEsS0FBS0QsSUFBTCxHQUFZSCxDQUFBLENBQUUsQ0FBRixDQUEzQixDQUp3QztBQUFBLFFBS3hDQSxDQUFBLENBQUUsQ0FBRixJQUFPQSxDQUFBLENBQUUsQ0FBRixJQUFPLEtBQUtDLElBQUwsR0FBWUQsQ0FBQSxDQUFFLENBQUYsQ0FBMUIsQ0FMd0M7QUFBQSxRQU14Q0EsQ0FBQSxDQUFFLENBQUYsSUFBT0EsQ0FBQSxDQUFFLENBQUYsSUFBT0EsQ0FBQSxDQUFFLENBQUYsQ0FBZCxDQU53QztBQUFBLFFBT3hDQSxDQUFBLENBQUUsQ0FBRixJQUFPLEtBQUtDLElBQUwsR0FBWUQsQ0FBQSxDQUFFLENBQUYsQ0FBWixHQUFtQkEsQ0FBQSxDQUFFLENBQUYsQ0FBMUIsQ0FQd0M7QUFBQSxRQVF4Q0ssTUFBQSxHQUFTLE1BQU1MLENBQUEsQ0FBRSxLQUFLdkQsSUFBUCxDQUFmLENBUndDO0FBQUEsUUFXeEN1RCxDQUFBLENBQUUsQ0FBRixJQUFPSSxLQUFBLEdBQVEsS0FBS0QsSUFBTCxHQUFZSCxDQUFBLENBQUUsQ0FBRixDQUEzQixDQVh3QztBQUFBLFFBWXhDQSxDQUFBLENBQUUsQ0FBRixJQUFPQSxDQUFBLENBQUUsQ0FBRixJQUFPLEtBQUtDLElBQUwsR0FBWUQsQ0FBQSxDQUFFLENBQUYsQ0FBMUIsQ0Fad0M7QUFBQSxRQWF4Q0EsQ0FBQSxDQUFFLENBQUYsSUFBT0EsQ0FBQSxDQUFFLENBQUYsSUFBT0EsQ0FBQSxDQUFFLENBQUYsQ0FBZCxDQWJ3QztBQUFBLFFBY3hDQSxDQUFBLENBQUUsQ0FBRixJQUFPLEtBQUtDLElBQUwsR0FBWUQsQ0FBQSxDQUFFLENBQUYsQ0FBWixHQUFtQkEsQ0FBQSxDQUFFLENBQUYsQ0FBMUIsQ0Fkd0M7QUFBQSxRQWV4Q0ssTUFBQSxJQUFVLE1BQU1MLENBQUEsQ0FBRSxLQUFLdkQsSUFBUCxDQUFoQixDQWZ3QztBQUFBLFFBaUJ4QyxJQUFJLEtBQUtuQyxRQUFULEVBQW1CO0FBQUEsWUFDakJySSxNQUFBLENBQU9DLENBQVAsSUFBYUQsTUFBQSxDQUFPQyxDQUFQLElBQWEsS0FBSSxLQUFLb0ksUUFBTCxDQUFjMEUsS0FBZCxFQUFKLENBQWQsR0FBNkNxQixNQUFBLEdBQVMsS0FBSy9GLFFBQUwsQ0FBYzBFLEtBQWQsRUFBbEUsQ0FEaUI7QUFBQSxZQUVqQixLQUFLMUUsUUFBTCxDQUFjTSxnQkFBZCxHQUZpQjtBQUFBLFNBQW5CLE1BR087QUFBQSxZQUNMM0ksTUFBQSxDQUFPQyxDQUFQLElBQVltTyxNQUFaLENBREs7QUFBQSxTQXBCaUM7QUFBQSxLQUpJO0FBQUEsQ0FBaEQsQ0EveENBO0FBNnpDQU4sVUFBQSxDQUFXbkssU0FBWCxDQUFxQjhILFdBQXJCLEdBQW1DLFVBQVNwRCxRQUFULEVBQW1CO0FBQUEsSUFDcEQsSUFBS0EsUUFBQSxZQUFvQnVELElBQXpCLEVBQWdDO0FBQUEsUUFDOUIsS0FBS3ZELFFBQUwsR0FBZ0JBLFFBQWhCLENBRDhCO0FBQUEsS0FBaEMsTUFFTztBQUFBLFFBQ0wsTUFBTSwwQkFBTixDQURLO0FBQUEsS0FINkM7QUFBQSxDQUF0RCxDQTd6Q0E7QUFxMENBeUYsVUFBQSxDQUFXbkssU0FBWCxDQUFxQjRKLEdBQXJCLEdBQTJCLFVBQVNKLE1BQVQsRUFBaUJDLFNBQWpCLEVBQTRCO0FBQUEsSUFDckQsS0FBS0ksU0FBTCxDQUFlTCxNQUFmLEVBQXVCQyxTQUF2QixFQURxRDtBQUFBLENBQXZELENBcjBDQTtBQTIwQ0EsU0FBU2lCLGNBQVQsQ0FBd0I3RCxJQUF4QixFQUE4QjhELEtBQTlCLEVBQXFDO0FBQUEsSUFDbkMsS0FBS0EsS0FBTCxHQUFhQSxLQUFiLENBRG1DO0FBQUEsSUFHbkMsUUFBTzlELElBQVA7QUFBQSxJQUNFLEtBQUszTSxHQUFBLENBQUlZLFFBQVQ7QUFBQSxRQUNFLEtBQUttTSxJQUFMLEdBQVl5RCxjQUFBLENBQWVFLFFBQTNCLENBREY7QUFBQSxRQUVFLE1BSEo7QUFBQSxJQUtFLEtBQUsxUSxHQUFBLENBQUlhLFlBQVQ7QUFBQSxRQUNFLEtBQUtrTSxJQUFMLEdBQVl5RCxjQUFBLENBQWVHLFlBQTNCLENBREY7QUFBQSxRQUVFLE1BUEo7QUFBQSxJQVNFLEtBQUszUSxHQUFBLENBQUljLFFBQVQ7QUFBQSxRQUNFLEtBQUtpTSxJQUFMLEdBQVl5RCxjQUFBLENBQWVJLFFBQTNCLENBREY7QUFBQSxRQUVFLEtBQUtILEtBQUwsR0FBYSxLQUFLQSxLQUFMLElBQWMsSUFBM0IsQ0FGRjtBQUFBLFFBR0UsTUFaSjtBQUFBLElBY0UsS0FBS3pRLEdBQUEsQ0FBSWUsTUFBVDtBQUFBLFFBQ0UsS0FBS2dNLElBQUwsR0FBWXlELGNBQUEsQ0FBZUssTUFBM0IsQ0FERjtBQUFBLFFBRUUsTUFoQko7QUFBQSxJQWtCRSxLQUFLN1EsR0FBQSxDQUFJZ0IsS0FBVDtBQUFBLFFBQ0UsS0FBSytMLElBQUwsR0FBWXlELGNBQUEsQ0FBZU0sS0FBM0IsQ0FERjtBQUFBLFFBRUUsS0FBS0wsS0FBTCxHQUFhLEtBQUtBLEtBQUwsSUFBYyxJQUEzQixDQUZGO0FBQUEsUUFHRSxNQXJCSjtBQUFBLElBdUJFLEtBQUt6USxHQUFBLENBQUlpQixPQUFUO0FBQUEsUUFDRSxLQUFLOEwsSUFBTCxHQUFZeUQsY0FBQSxDQUFlTyxPQUEzQixDQURGO0FBQUEsUUFFRSxNQXpCSjtBQUFBLElBMkJFLEtBQUsvUSxHQUFBLENBQUlrQixJQUFUO0FBQUEsUUFDRSxLQUFLNkwsSUFBTCxHQUFZeUQsY0FBQSxDQUFlUSxJQUEzQixDQURGO0FBQUEsUUFFRSxNQTdCSjtBQUFBLElBK0JFLEtBQUtoUixHQUFBLENBQUltQixPQUFUO0FBQUEsUUFDRSxLQUFLNEwsSUFBTCxHQUFZeUQsY0FBQSxDQUFlUyxPQUEzQixDQURGO0FBQUEsUUFFRSxNQWpDSjtBQUFBLElBbUNFLEtBQUtqUixHQUFBLENBQUlvQixXQUFUO0FBQUEsUUFDRSxLQUFLMkwsSUFBTCxHQUFZeUQsY0FBQSxDQUFlVSxXQUEzQixDQURGO0FBQUEsUUFFRSxNQXJDSjtBQUFBLElBdUNFLEtBQUtsUixHQUFBLENBQUlxQixVQUFUO0FBQUEsUUFDRSxLQUFLMEwsSUFBTCxHQUFZeUQsY0FBQSxDQUFlVyxVQUEzQixDQURGO0FBQUEsUUFFRSxNQXpDSjtBQUFBLEtBSG1DO0FBQUEsQ0EzMENyQztBQTIzQ0FYLGNBQUEsQ0FBZTFLLFNBQWYsQ0FBeUJpRyxPQUF6QixHQUFtQyxVQUFTNUosTUFBVCxFQUFpQjtBQUFBLElBQ2xELElBQUlHLE1BQUEsR0FBU0gsTUFBQSxDQUFPRyxNQUFwQixDQURrRDtBQUFBLElBRWxELEtBQU0sSUFBSUYsQ0FBQSxHQUFJLENBQVIsQ0FBTixDQUFpQkEsQ0FBQSxHQUFJRSxNQUFyQixFQUE2QkYsQ0FBQSxFQUE3QixFQUFtQztBQUFBLFFBQ2pDRCxNQUFBLENBQU9DLENBQVAsS0FBYSxLQUFLMkssSUFBTCxDQUFVekssTUFBVixFQUFrQkYsQ0FBbEIsRUFBcUIsS0FBS3FPLEtBQTFCLENBQWIsQ0FEaUM7QUFBQSxLQUZlO0FBQUEsSUFLbEQsT0FBT3RPLE1BQVAsQ0FMa0Q7QUFBQSxDQUFwRCxDQTMzQ0E7QUFtNENBcU8sY0FBQSxDQUFlRSxRQUFmLEdBQTBCLFVBQVNwTyxNQUFULEVBQWlCMkMsS0FBakIsRUFBd0I7QUFBQSxJQUNoRCxPQUFPLElBQUssQ0FBQTNDLE1BQUEsR0FBUyxDQUFULENBQUwsR0FBb0IsQ0FBQyxDQUFBQSxNQUFBLEdBQVMsQ0FBVCxDQUFELEdBQWUsQ0FBZixHQUFtQlgsSUFBQSxDQUFLNEMsR0FBTCxDQUFTVSxLQUFBLEdBQVMsQ0FBQTNDLE1BQUEsR0FBUyxDQUFULENBQUQsR0FBZSxDQUFoQyxDQUFuQixDQUEzQixDQURnRDtBQUFBLENBQWxELENBbjRDQTtBQXU0Q0FrTyxjQUFBLENBQWVHLFlBQWYsR0FBOEIsVUFBU3JPLE1BQVQsRUFBaUIyQyxLQUFqQixFQUF3QjtBQUFBLElBQ3BELE9BQU8sT0FBTyxPQUFPdEQsSUFBQSxDQUFLNEMsR0FBTCxDQUFTVSxLQUFBLEdBQVMsQ0FBQTNDLE1BQUEsR0FBUyxDQUFULENBQVQsR0FBdUIsR0FBaEMsQ0FBZCxHQUFxRCxPQUFPWCxJQUFBLENBQUtrRSxHQUFMLENBQVM3RixHQUFBLENBQUkwQixNQUFKLEdBQWF1RCxLQUFiLEdBQXNCLENBQUEzQyxNQUFBLEdBQVMsQ0FBVCxDQUEvQixDQUFuRSxDQURvRDtBQUFBLENBQXRELENBdjRDQTtBQTI0Q0FrTyxjQUFBLENBQWVJLFFBQWYsR0FBMEIsVUFBU3RPLE1BQVQsRUFBaUIyQyxLQUFqQixFQUF3QndMLEtBQXhCLEVBQStCO0FBQUEsSUFDdkQsSUFBSVcsRUFBQSxHQUFNLEtBQUlYLEtBQUosQ0FBRCxHQUFjLENBQXZCLENBRHVEO0FBQUEsSUFFdkQsSUFBSVksRUFBQSxHQUFLLEdBQVQsQ0FGdUQ7QUFBQSxJQUd2RCxJQUFJQyxFQUFBLEdBQUtiLEtBQUEsR0FBUSxDQUFqQixDQUh1RDtBQUFBLElBS3ZELE9BQU9XLEVBQUEsR0FBS0MsRUFBQSxHQUFLMVAsSUFBQSxDQUFLa0UsR0FBTCxDQUFTN0YsR0FBQSxDQUFJMEIsTUFBSixHQUFhdUQsS0FBYixHQUFzQixDQUFBM0MsTUFBQSxHQUFTLENBQVQsQ0FBL0IsQ0FBVixHQUF3RGdQLEVBQUEsR0FBSzNQLElBQUEsQ0FBS2tFLEdBQUwsQ0FBUyxJQUFJbEUsSUFBQSxDQUFLQyxFQUFULEdBQWNxRCxLQUFkLEdBQXVCLENBQUEzQyxNQUFBLEdBQVMsQ0FBVCxDQUFoQyxDQUFwRSxDQUx1RDtBQUFBLENBQXpELENBMzRDQTtBQW01Q0FrTyxjQUFBLENBQWVLLE1BQWYsR0FBd0IsVUFBU3ZPLE1BQVQsRUFBaUIyQyxLQUFqQixFQUF3QjtBQUFBLElBQzlDLE9BQU90RCxJQUFBLENBQUtrRSxHQUFMLENBQVNsRSxJQUFBLENBQUtDLEVBQUwsR0FBVXFELEtBQVYsR0FBbUIsQ0FBQTNDLE1BQUEsR0FBUyxDQUFULENBQW5CLEdBQWlDWCxJQUFBLENBQUtDLEVBQUwsR0FBVSxDQUFwRCxDQUFQLENBRDhDO0FBQUEsQ0FBaEQsQ0FuNUNBO0FBdTVDQTRPLGNBQUEsQ0FBZU0sS0FBZixHQUF1QixVQUFTeE8sTUFBVCxFQUFpQjJDLEtBQWpCLEVBQXdCd0wsS0FBeEIsRUFBK0I7QUFBQSxJQUNwRCxPQUFPOU8sSUFBQSxDQUFLOEUsR0FBTCxDQUFTOUUsSUFBQSxDQUFLNFAsQ0FBZCxFQUFpQixDQUFDLEdBQUQsR0FBTzVQLElBQUEsQ0FBSzhFLEdBQUwsQ0FBVSxDQUFBeEIsS0FBQSxHQUFTLENBQUEzQyxNQUFBLEdBQVMsQ0FBVCxDQUFELEdBQWUsQ0FBdkIsQ0FBRCxHQUE4QixDQUFBbU8sS0FBQSxHQUFTLENBQUFuTyxNQUFBLEdBQVMsQ0FBVCxDQUFULEdBQXVCLENBQXZCLENBQXZDLEVBQWtFLENBQWxFLENBQXhCLENBQVAsQ0FEb0Q7QUFBQSxDQUF0RCxDQXY1Q0E7QUEyNUNBa08sY0FBQSxDQUFlTyxPQUFmLEdBQXlCLFVBQVN6TyxNQUFULEVBQWlCMkMsS0FBakIsRUFBd0I7QUFBQSxJQUMvQyxPQUFPLE9BQU8sT0FBT3RELElBQUEsQ0FBS2tFLEdBQUwsQ0FBUzdGLEdBQUEsQ0FBSTBCLE1BQUosR0FBYXVELEtBQWIsR0FBc0IsQ0FBQTNDLE1BQUEsR0FBUyxDQUFULENBQS9CLENBQXJCLENBRCtDO0FBQUEsQ0FBakQsQ0EzNUNBO0FBKzVDQWtPLGNBQUEsQ0FBZVEsSUFBZixHQUFzQixVQUFTMU8sTUFBVCxFQUFpQjJDLEtBQWpCLEVBQXdCO0FBQUEsSUFDNUMsT0FBTyxNQUFPLEtBQUl0RCxJQUFBLENBQUtrRSxHQUFMLENBQVM3RixHQUFBLENBQUkwQixNQUFKLEdBQWF1RCxLQUFiLEdBQXNCLENBQUEzQyxNQUFBLEdBQVMsQ0FBVCxDQUEvQixDQUFKLENBQWQsQ0FENEM7QUFBQSxDQUE5QyxDQS81Q0E7QUFtNkNBa08sY0FBQSxDQUFlZ0IsT0FBZixHQUF5QixVQUFTbFAsTUFBVCxFQUFpQjJDLEtBQWpCLEVBQXdCO0FBQUEsSUFDL0MsSUFBSStDLENBQUEsR0FBSSxJQUFJL0MsS0FBSixHQUFhLENBQUEzQyxNQUFBLEdBQVMsQ0FBVCxDQUFiLEdBQTJCLENBQW5DLENBRCtDO0FBQUEsSUFFL0MsT0FBT1gsSUFBQSxDQUFLaUUsR0FBTCxDQUFTakUsSUFBQSxDQUFLQyxFQUFMLEdBQVVvRyxDQUFuQixJQUF5QixDQUFBckcsSUFBQSxDQUFLQyxFQUFMLEdBQVVvRyxDQUFWLENBQWhDLENBRitDO0FBQUEsQ0FBakQsQ0FuNkNBO0FBdzZDQXdJLGNBQUEsQ0FBZVUsV0FBZixHQUE2QixVQUFTNU8sTUFBVCxFQUFpQjJDLEtBQWpCLEVBQXdCO0FBQUEsSUFDbkQsT0FBTyxDQUFQLENBRG1EO0FBQUEsQ0FBckQsQ0F4NkNBO0FBNDZDQXVMLGNBQUEsQ0FBZVcsVUFBZixHQUE0QixVQUFTN08sTUFBVCxFQUFpQjJDLEtBQWpCLEVBQXdCO0FBQUEsSUFDbEQsT0FBTyxJQUFJM0MsTUFBSixHQUFjLENBQUFBLE1BQUEsR0FBUyxDQUFULEdBQWFYLElBQUEsQ0FBSzRDLEdBQUwsQ0FBU1UsS0FBQSxHQUFTLENBQUEzQyxNQUFBLEdBQVMsQ0FBVCxDQUFELEdBQWUsQ0FBaEMsQ0FBYixDQUFyQixDQURrRDtBQUFBLENBQXBELENBNTZDQTtBQWc3Q0EsU0FBU21QLElBQVQsQ0FBZUMsR0FBZixFQUFvQjtBQUFBLElBT2xCLE9BQVEsQ0FBQS9QLElBQUEsQ0FBS2dRLEdBQUwsQ0FBU0QsR0FBVCxJQUFnQi9QLElBQUEsQ0FBS2dRLEdBQUwsQ0FBUyxDQUFDRCxHQUFWLENBQWhCLENBQUQsR0FBaUMsQ0FBeEMsQ0FQa0I7QUFBQSxDQWg3Q3BCO0FBbThDQSxTQUFTRSxNQUFULENBQWdCakYsSUFBaEIsRUFBc0JqSSxVQUF0QixFQUFrQztBQUFBLElBQ2hDLEtBQUttTixFQUFMLEdBQVVuTixVQUFWLENBRGdDO0FBQUEsSUFFaEMsS0FBS2lJLElBQUwsR0FBWUEsSUFBWixDQUZnQztBQUFBLElBR2hDLEtBQUttRixhQUFMLEdBQXFCOVIsR0FBQSxDQUFJK0QsQ0FBekIsQ0FIZ0M7QUFBQSxJQUtoQyxLQUFLZ08sS0FBTCxHQUFhLENBQWIsQ0FMZ0M7QUFBQSxJQU1oQyxLQUFLQyxLQUFMLEdBQWEsQ0FBYixDQU5nQztBQUFBLElBT2hDLEtBQUtDLEtBQUwsR0FBYSxDQUFiLENBUGdDO0FBQUEsSUFRaEMsS0FBS0MsS0FBTCxHQUFhLENBQWIsQ0FSZ0M7QUFBQSxJQVVoQyxLQUFLQyxLQUFMLEdBQWEsQ0FBYixDQVZnQztBQUFBLElBV2hDLEtBQUtDLEtBQUwsR0FBYSxDQUFiLENBWGdDO0FBQUEsSUFZaEMsS0FBS0MsS0FBTCxHQUFhLENBQWIsQ0FaZ0M7QUFBQSxJQWFoQyxLQUFLQyxLQUFMLEdBQWEsQ0FBYixDQWJnQztBQUFBLElBZWhDLEtBQUtDLEVBQUwsR0FBVSxDQUFWLENBZmdDO0FBQUEsSUFnQmhDLEtBQUtuQixFQUFMLEdBQVUsQ0FBVixDQWhCZ0M7QUFBQSxJQWtCaEMsS0FBS29CLEVBQUwsR0FBVSxDQUFWLENBbEJnQztBQUFBLElBbUJoQyxLQUFLbkIsRUFBTCxHQUFVLENBQVYsQ0FuQmdDO0FBQUEsSUFxQmhDLEtBQUtvQixFQUFMLEdBQVUsQ0FBVixDQXJCZ0M7QUFBQSxJQXNCaEMsS0FBS25CLEVBQUwsR0FBVSxDQUFWLENBdEJnQztBQUFBLElBd0JoQyxLQUFLb0IsSUFBTCxHQUFZLEtBQUtILEVBQUwsR0FBVSxLQUFLbkIsRUFBM0IsQ0F4QmdDO0FBQUEsSUF5QmhDLEtBQUt1QixJQUFMLEdBQVksS0FBS0gsRUFBTCxHQUFVLEtBQUtwQixFQUEzQixDQXpCZ0M7QUFBQSxJQTBCaEMsS0FBS3dCLElBQUwsR0FBWSxLQUFLSCxFQUFMLEdBQVUsS0FBS3JCLEVBQTNCLENBMUJnQztBQUFBLElBMkJoQyxLQUFLeUIsSUFBTCxHQUFZLEtBQUt4QixFQUFMLEdBQVUsS0FBS0QsRUFBM0IsQ0EzQmdDO0FBQUEsSUE0QmhDLEtBQUswQixJQUFMLEdBQVksS0FBS3hCLEVBQUwsR0FBVSxLQUFLRixFQUEzQixDQTVCZ0M7QUFBQSxJQThCaEMsS0FBSzJCLEVBQUwsR0FBVSxJQUFWLENBOUJnQztBQUFBLElBa0NoQyxLQUFLQyxNQUFMLEdBQWMsRUFBZCxDQWxDZ0M7QUFBQSxJQW9DaEMsS0FBS2pQLENBQUwsR0FBUyxDQUFULENBcENnQztBQUFBLElBeUNoQyxLQUFLdkMsRUFBTCxHQUFVLENBQUMsQ0FBWCxDQXpDZ0M7QUFBQSxJQTZDaEMsS0FBS3dDLENBQUwsR0FBUyxDQUFULENBN0NnQztBQUFBLElBbURoQyxLQUFLaVAsWUFBTCxHQUFvQixZQUFXO0FBQUEsUUFDN0IsSUFBSUMsQ0FBQSxHQUFJO0FBQUEsWUFBQyxLQUFLWCxFQUFOO0FBQUEsWUFBVSxLQUFLQyxFQUFmO0FBQUEsWUFBbUIsS0FBS0MsRUFBeEI7QUFBQSxTQUFSLENBRDZCO0FBQUEsUUFFN0IsSUFBSWxKLENBQUEsR0FBSTtBQUFBLFlBQUMsS0FBSzZILEVBQU47QUFBQSxZQUFVLEtBQUtDLEVBQWY7QUFBQSxZQUFtQixLQUFLQyxFQUF4QjtBQUFBLFNBQVIsQ0FGNkI7QUFBQSxRQUc3QixPQUFPO0FBQUEsWUFBQzRCLENBQUEsRUFBR0EsQ0FBSjtBQUFBLFlBQU8zSixDQUFBLEVBQUVBLENBQVQ7QUFBQSxTQUFQLENBSDZCO0FBQUEsS0FBL0IsQ0FuRGdDO0FBQUEsSUF5RGhDLEtBQUs0SixhQUFMLEdBQXFCLFVBQVN4RyxJQUFULEVBQWU7QUFBQSxRQUNsQyxLQUFLQSxJQUFMLEdBQVlBLElBQVosQ0FEa0M7QUFBQSxRQUVsQyxLQUFLeUcsdUJBQUwsR0FGa0M7QUFBQSxLQUFwQyxDQXpEZ0M7QUFBQSxJQThEaEMsS0FBS0MsYUFBTCxHQUFxQixVQUFTQyxJQUFULEVBQWU7QUFBQSxRQUNsQyxLQUFLekIsRUFBTCxHQUFVeUIsSUFBVixDQURrQztBQUFBLFFBRWxDLEtBQUtGLHVCQUFMLEdBRmtDO0FBQUEsS0FBcEMsQ0E5RGdDO0FBQUEsSUFtRWhDLEtBQUtHLElBQUwsR0FBWSxVQUFTeEQsQ0FBVCxFQUFZO0FBQUEsUUFDdEIsS0FBSytCLGFBQUwsR0FBcUI5UixHQUFBLENBQUkrRCxDQUF6QixDQURzQjtBQUFBLFFBRXRCLEtBQUtBLENBQUwsR0FBU3BDLElBQUEsQ0FBSzZSLEdBQUwsQ0FBUzdSLElBQUEsQ0FBS3lPLEdBQUwsQ0FBU0wsQ0FBVCxFQUFZLEdBQVosQ0FBVCxFQUE2QixLQUE3QixDQUFULENBRnNCO0FBQUEsUUFHdEIsS0FBS3FELHVCQUFMLEdBSHNCO0FBQUEsS0FBeEIsQ0FuRWdDO0FBQUEsSUF5RWhDLEtBQUtLLEtBQUwsR0FBYSxVQUFTQyxFQUFULEVBQWE7QUFBQSxRQUN4QixLQUFLNUIsYUFBTCxHQUFxQjlSLEdBQUEsQ0FBSXdCLEVBQXpCLENBRHdCO0FBQUEsUUFFeEIsS0FBS0EsRUFBTCxHQUFVa1MsRUFBVixDQUZ3QjtBQUFBLFFBR3hCLEtBQUtOLHVCQUFMLEdBSHdCO0FBQUEsS0FBMUIsQ0F6RWdDO0FBQUEsSUErRWhDLEtBQUtPLElBQUwsR0FBWSxVQUFTQyxDQUFULEVBQVk7QUFBQSxRQUN0QixLQUFLOUIsYUFBTCxHQUFxQjlSLEdBQUEsQ0FBSWdFLENBQXpCLENBRHNCO0FBQUEsUUFFdEIsS0FBS0EsQ0FBTCxHQUFTckMsSUFBQSxDQUFLNlIsR0FBTCxDQUFTN1IsSUFBQSxDQUFLeU8sR0FBTCxDQUFTd0QsQ0FBVCxFQUFZLENBQVosQ0FBVCxFQUEyQixNQUEzQixDQUFULENBRnNCO0FBQUEsUUFHdEIsS0FBS1IsdUJBQUwsR0FIc0I7QUFBQSxLQUF4QixDQS9FZ0M7QUFBQSxJQXFGaEMsS0FBS1MsS0FBTCxHQUFhLFVBQVMxRCxJQUFULEVBQWU7QUFBQSxRQUMxQixLQUFLNEMsRUFBTCxHQUFVNUMsSUFBVixDQUQwQjtBQUFBLFFBRTFCLEtBQUtpRCx1QkFBTCxHQUYwQjtBQUFBLEtBQTVCLENBckZnQztBQUFBLElBMEZoQyxLQUFLVSxTQUFMLEdBQWlCLFVBQVNDLENBQVQsRUFBWTtBQUFBLFFBQzNCLEtBQUtmLE1BQUwsR0FBY2UsQ0FBZCxDQUQyQjtBQUFBLFFBRTNCLEtBQUtYLHVCQUFMLEdBRjJCO0FBQUEsS0FBN0IsQ0ExRmdDO0FBQUEsSUErRmhDLEtBQUtBLHVCQUFMLEdBQStCLFlBQVc7QUFBQSxRQUN4QyxJQUFJWSxDQUFKLENBRHdDO0FBQUEsUUFFeEMsSUFBSXJILElBQUEsS0FBUzNNLEdBQUEsQ0FBSTRELFVBQWIsSUFBMkIrSSxJQUFBLEtBQVMzTSxHQUFBLENBQUk2RCxTQUF4QyxJQUFxRDhJLElBQUEsS0FBUzNNLEdBQUEsQ0FBSThELFVBQXRFLEVBQW1GO0FBQUEsWUFDakZrUSxDQUFBLEdBQUlyUyxJQUFBLENBQUs4RSxHQUFMLENBQVMsRUFBVCxFQUFjLEtBQUt1TSxNQUFMLEdBQVksRUFBMUIsQ0FBSixDQURpRjtBQUFBLFNBQW5GLE1BRU87QUFBQSxZQUNMZ0IsQ0FBQSxHQUFLclMsSUFBQSxDQUFLeUMsSUFBTCxDQUFXekMsSUFBQSxDQUFLOEUsR0FBTCxDQUFTLEVBQVQsRUFBYyxLQUFLdU0sTUFBTCxHQUFZLEVBQTFCLENBQVgsQ0FBTCxDQURLO0FBQUEsU0FKaUM7QUFBQSxRQVF4QyxJQUFJaUIsRUFBQSxHQUFLalUsR0FBQSxDQUFJMEIsTUFBSixHQUFhLEtBQUtxUixFQUFsQixHQUF1QixLQUFLbEIsRUFBckMsQ0FSd0M7QUFBQSxRQVV4QyxJQUFJcUMsS0FBQSxHQUFRdlMsSUFBQSxDQUFLa0UsR0FBTCxDQUFTb08sRUFBVCxDQUFaLENBVndDO0FBQUEsUUFXeEMsSUFBSUUsS0FBQSxHQUFReFMsSUFBQSxDQUFLaUUsR0FBTCxDQUFTcU8sRUFBVCxDQUFaLENBWHdDO0FBQUEsUUFheEMsSUFBSXhELEtBQUEsR0FBUSxDQUFaLENBYndDO0FBQUEsUUFleEMsUUFBUSxLQUFLcUIsYUFBYjtBQUFBLFFBQ0UsS0FBSzlSLEdBQUEsQ0FBSStELENBQVQ7QUFBQSxZQUNFME0sS0FBQSxHQUFRMEQsS0FBQSxHQUFPLEtBQUUsS0FBS3BRLENBQVAsQ0FBZixDQURGO0FBQUEsWUFFRSxNQUhKO0FBQUEsUUFLRSxLQUFLL0QsR0FBQSxDQUFJd0IsRUFBVDtBQUFBLFlBQ0VpUCxLQUFBLEdBQVEwRCxLQUFBLEdBQVExQyxJQUFBLENBQU05UCxJQUFBLENBQUs2RSxHQUFMLEdBQVMsQ0FBVCxHQUFhLEtBQUtoRixFQUFsQixHQUF1QnlTLEVBQXZCLEdBQTBCRSxLQUFoQyxDQUFoQixDQURGO0FBQUEsWUFFRSxNQVBKO0FBQUEsUUFTRSxLQUFLblUsR0FBQSxDQUFJZ0UsQ0FBVDtBQUFBLFlBQ0V5TSxLQUFBLEdBQVEwRCxLQUFBLEdBQU0sQ0FBTixHQUFVeFMsSUFBQSxDQUFLeUMsSUFBTCxDQUFZLENBQUE0UCxDQUFBLEdBQUksSUFBRUEsQ0FBTixDQUFELEdBQVcsS0FBRSxLQUFLaFEsQ0FBUCxHQUFXLENBQVgsQ0FBWCxHQUEyQixDQUF0QyxDQUFsQixDQURGO0FBQUEsWUFFRSxNQVhKO0FBQUEsU0Fmd0M7QUFBQSxRQXNDeEMsSUFBSW9RLEtBQUosQ0F0Q3dDO0FBQUEsUUF3Q3hDLFFBQVEsS0FBS3pILElBQWI7QUFBQSxRQUNFLEtBQUszTSxHQUFBLENBQUl1RCxHQUFUO0FBQUEsWUFDRSxLQUFLZ1AsRUFBTCxHQUFZLEtBQUkyQixLQUFKLENBQUQsR0FBWSxDQUF2QixDQURGO0FBQUEsWUFFRSxLQUFLMUIsRUFBTCxHQUFZLElBQUkwQixLQUFoQixDQUZGO0FBQUEsWUFHRSxLQUFLekIsRUFBTCxHQUFZLEtBQUl5QixLQUFKLENBQUQsR0FBWSxDQUF2QixDQUhGO0FBQUEsWUFJRSxLQUFLOUMsRUFBTCxHQUFZLElBQUlYLEtBQWhCLENBSkY7QUFBQSxZQUtFLEtBQUtZLEVBQUwsR0FBVyxDQUFDLENBQUQsR0FBSzZDLEtBQWhCLENBTEY7QUFBQSxZQU1FLEtBQUs1QyxFQUFMLEdBQVksSUFBSWIsS0FBaEIsQ0FORjtBQUFBLFlBT0UsTUFSSjtBQUFBLFFBVUUsS0FBS3pRLEdBQUEsQ0FBSXdELEdBQVQ7QUFBQSxZQUNFLEtBQUsrTyxFQUFMLEdBQVksS0FBSTJCLEtBQUosQ0FBRCxHQUFZLENBQXZCLENBREY7QUFBQSxZQUVFLEtBQUsxQixFQUFMLEdBQVUsQ0FBRSxLQUFJMEIsS0FBSixDQUFaLENBRkY7QUFBQSxZQUdFLEtBQUt6QixFQUFMLEdBQVksS0FBSXlCLEtBQUosQ0FBRCxHQUFZLENBQXZCLENBSEY7QUFBQSxZQUlFLEtBQUs5QyxFQUFMLEdBQVksSUFBSVgsS0FBaEIsQ0FKRjtBQUFBLFlBS0UsS0FBS1ksRUFBTCxHQUFXLENBQUMsQ0FBRCxHQUFLNkMsS0FBaEIsQ0FMRjtBQUFBLFlBTUUsS0FBSzVDLEVBQUwsR0FBWSxJQUFJYixLQUFoQixDQU5GO0FBQUEsWUFPRSxNQWpCSjtBQUFBLFFBbUJFLEtBQUt6USxHQUFBLENBQUl5RCxrQkFBVDtBQUFBLFlBQ0UsS0FBSzhPLEVBQUwsR0FBWTRCLEtBQUEsR0FBTSxDQUFsQixDQURGO0FBQUEsWUFFRSxLQUFLM0IsRUFBTCxHQUFZLENBQVosQ0FGRjtBQUFBLFlBR0UsS0FBS0MsRUFBTCxHQUFXLENBQUMwQixLQUFELEdBQU8sQ0FBbEIsQ0FIRjtBQUFBLFlBSUUsS0FBSy9DLEVBQUwsR0FBWSxJQUFJWCxLQUFoQixDQUpGO0FBQUEsWUFLRSxLQUFLWSxFQUFMLEdBQVcsQ0FBQyxDQUFELEdBQUc2QyxLQUFkLENBTEY7QUFBQSxZQU1FLEtBQUs1QyxFQUFMLEdBQVksSUFBSWIsS0FBaEIsQ0FORjtBQUFBLFlBT0UsTUExQko7QUFBQSxRQTRCRSxLQUFLelEsR0FBQSxDQUFJMEQsaUJBQVQ7QUFBQSxZQUNFLEtBQUs2TyxFQUFMLEdBQVk5QixLQUFaLENBREY7QUFBQSxZQUVFLEtBQUsrQixFQUFMLEdBQVksQ0FBWixDQUZGO0FBQUEsWUFHRSxLQUFLQyxFQUFMLEdBQVcsQ0FBQ2hDLEtBQVosQ0FIRjtBQUFBLFlBSUUsS0FBS1csRUFBTCxHQUFZLElBQUlYLEtBQWhCLENBSkY7QUFBQSxZQUtFLEtBQUtZLEVBQUwsR0FBVyxDQUFDLENBQUQsR0FBRzZDLEtBQWQsQ0FMRjtBQUFBLFlBTUUsS0FBSzVDLEVBQUwsR0FBWSxJQUFJYixLQUFoQixDQU5GO0FBQUEsWUFPRSxNQW5DSjtBQUFBLFFBcUNFLEtBQUt6USxHQUFBLENBQUlXLEtBQVQ7QUFBQSxZQUNFLEtBQUs0UixFQUFMLEdBQVksQ0FBWixDQURGO0FBQUEsWUFFRSxLQUFLQyxFQUFMLEdBQVcsQ0FBQyxDQUFELEdBQUcwQixLQUFkLENBRkY7QUFBQSxZQUdFLEtBQUt6QixFQUFMLEdBQVksQ0FBWixDQUhGO0FBQUEsWUFJRSxLQUFLckIsRUFBTCxHQUFZLElBQUlYLEtBQWhCLENBSkY7QUFBQSxZQUtFLEtBQUtZLEVBQUwsR0FBVyxDQUFDLENBQUQsR0FBRzZDLEtBQWQsQ0FMRjtBQUFBLFlBTUUsS0FBSzVDLEVBQUwsR0FBWSxJQUFJYixLQUFoQixDQU5GO0FBQUEsWUFPRSxNQTVDSjtBQUFBLFFBOENFLEtBQUt6USxHQUFBLENBQUkyRCxHQUFUO0FBQUEsWUFDRSxLQUFLNE8sRUFBTCxHQUFZLElBQUk5QixLQUFoQixDQURGO0FBQUEsWUFFRSxLQUFLK0IsRUFBTCxHQUFXLENBQUMsQ0FBRCxHQUFHMEIsS0FBZCxDQUZGO0FBQUEsWUFHRSxLQUFLekIsRUFBTCxHQUFZLElBQUloQyxLQUFoQixDQUhGO0FBQUEsWUFJRSxLQUFLVyxFQUFMLEdBQVksSUFBSVgsS0FBaEIsQ0FKRjtBQUFBLFlBS0UsS0FBS1ksRUFBTCxHQUFXLENBQUMsQ0FBRCxHQUFHNkMsS0FBZCxDQUxGO0FBQUEsWUFNRSxLQUFLNUMsRUFBTCxHQUFZLElBQUliLEtBQWhCLENBTkY7QUFBQSxZQU9FLE1BckRKO0FBQUEsUUF1REUsS0FBS3pRLEdBQUEsQ0FBSTRELFVBQVQ7QUFBQSxZQUNFLEtBQUsyTyxFQUFMLEdBQVksSUFBSTlCLEtBQUEsR0FBTXVELENBQXRCLENBREY7QUFBQSxZQUVFLEtBQUt4QixFQUFMLEdBQVcsQ0FBQyxDQUFELEdBQUcwQixLQUFkLENBRkY7QUFBQSxZQUdFLEtBQUt6QixFQUFMLEdBQVksSUFBSWhDLEtBQUEsR0FBTXVELENBQXRCLENBSEY7QUFBQSxZQUlFLEtBQUs1QyxFQUFMLEdBQVksSUFBSVgsS0FBQSxHQUFNdUQsQ0FBdEIsQ0FKRjtBQUFBLFlBS0UsS0FBSzNDLEVBQUwsR0FBVyxDQUFDLENBQUQsR0FBRzZDLEtBQWQsQ0FMRjtBQUFBLFlBTUUsS0FBSzVDLEVBQUwsR0FBWSxJQUFJYixLQUFBLEdBQU11RCxDQUF0QixDQU5GO0FBQUEsWUFPRSxNQTlESjtBQUFBLFFBZ0VFLEtBQUtoVSxHQUFBLENBQUk2RCxTQUFUO0FBQUEsWUFDRXVRLEtBQUEsR0FBUUQsS0FBQSxHQUFReFMsSUFBQSxDQUFLeUMsSUFBTCxDQUFZLENBQUE0UCxDQUFBLEdBQUUsSUFBSSxDQUFOLENBQUQsR0FBVyxLQUFFLEtBQUtoUSxDQUFQLEdBQVcsQ0FBWCxDQUFYLEdBQTJCLElBQUVnUSxDQUF4QyxDQUFoQixDQURGO0FBQUEsWUFFRSxLQUFLekIsRUFBTCxHQUFheUIsQ0FBQSxHQUFHLENBQUNBLENBQUEsR0FBRSxDQUFILEdBQVMsQ0FBQUEsQ0FBQSxHQUFFLENBQUYsQ0FBRCxHQUFNRSxLQUFkLEdBQXNCRSxLQUF0QixDQUFoQixDQUZGO0FBQUEsWUFHRSxLQUFLNUIsRUFBTCxHQUFXLElBQUV3QixDQUFGLEdBQUssQ0FBQ0EsQ0FBQSxHQUFFLENBQUgsR0FBUyxDQUFBQSxDQUFBLEdBQUUsQ0FBRixDQUFELEdBQU1FLEtBQWQsQ0FBaEIsQ0FIRjtBQUFBLFlBSUUsS0FBS3pCLEVBQUwsR0FBYXVCLENBQUEsR0FBRyxDQUFDQSxDQUFBLEdBQUUsQ0FBSCxHQUFTLENBQUFBLENBQUEsR0FBRSxDQUFGLENBQUQsR0FBTUUsS0FBZCxHQUFzQkUsS0FBdEIsQ0FBaEIsQ0FKRjtBQUFBLFlBS0UsS0FBS2hELEVBQUwsR0FBaUI0QyxDQUFBLEdBQUUsQ0FBSCxHQUFTLENBQUFBLENBQUEsR0FBRSxDQUFGLENBQUQsR0FBTUUsS0FBZCxHQUFzQkUsS0FBdEMsQ0FMRjtBQUFBLFlBTUUsS0FBSy9DLEVBQUwsR0FBWSxDQUFDLENBQUQsR0FBSSxDQUFDMkMsQ0FBQSxHQUFFLENBQUgsR0FBUyxDQUFBQSxDQUFBLEdBQUUsQ0FBRixDQUFELEdBQU1FLEtBQWQsQ0FBaEIsQ0FORjtBQUFBLFlBT0UsS0FBSzVDLEVBQUwsR0FBaUIwQyxDQUFBLEdBQUUsQ0FBSCxHQUFTLENBQUFBLENBQUEsR0FBRSxDQUFGLENBQUQsR0FBTUUsS0FBZCxHQUFzQkUsS0FBdEMsQ0FQRjtBQUFBLFlBUUUsTUF4RUo7QUFBQSxRQTBFRSxLQUFLcFUsR0FBQSxDQUFJOEQsVUFBVDtBQUFBLFlBQ0VzUSxLQUFBLEdBQVFELEtBQUEsR0FBUXhTLElBQUEsQ0FBS3lDLElBQUwsQ0FBWSxDQUFBNFAsQ0FBQSxHQUFFLElBQUksQ0FBTixDQUFELEdBQVcsS0FBRSxLQUFLaFEsQ0FBUCxHQUFXLENBQVgsQ0FBWCxHQUEyQixJQUFFZ1EsQ0FBeEMsQ0FBaEIsQ0FERjtBQUFBLFlBRUUsS0FBS3pCLEVBQUwsR0FBYXlCLENBQUEsR0FBRyxDQUFDQSxDQUFBLEdBQUUsQ0FBSCxHQUFTLENBQUFBLENBQUEsR0FBRSxDQUFGLENBQUQsR0FBTUUsS0FBZCxHQUFzQkUsS0FBdEIsQ0FBaEIsQ0FGRjtBQUFBLFlBR0UsS0FBSzVCLEVBQUwsR0FBVSxDQUFDLENBQUQsR0FBR3dCLENBQUgsR0FBTSxDQUFDQSxDQUFBLEdBQUUsQ0FBSCxHQUFTLENBQUFBLENBQUEsR0FBRSxDQUFGLENBQUQsR0FBTUUsS0FBZCxDQUFoQixDQUhGO0FBQUEsWUFJRSxLQUFLekIsRUFBTCxHQUFhdUIsQ0FBQSxHQUFHLENBQUNBLENBQUEsR0FBRSxDQUFILEdBQVMsQ0FBQUEsQ0FBQSxHQUFFLENBQUYsQ0FBRCxHQUFNRSxLQUFkLEdBQXNCRSxLQUF0QixDQUFoQixDQUpGO0FBQUEsWUFLRSxLQUFLaEQsRUFBTCxHQUFpQjRDLENBQUEsR0FBRSxDQUFILEdBQVMsQ0FBQUEsQ0FBQSxHQUFFLENBQUYsQ0FBRCxHQUFNRSxLQUFkLEdBQXNCRSxLQUF0QyxDQUxGO0FBQUEsWUFNRSxLQUFLL0MsRUFBTCxHQUFhLElBQUcsQ0FBQzJDLENBQUEsR0FBRSxDQUFILEdBQVMsQ0FBQUEsQ0FBQSxHQUFFLENBQUYsQ0FBRCxHQUFNRSxLQUFkLENBQWhCLENBTkY7QUFBQSxZQU9FLEtBQUs1QyxFQUFMLEdBQWlCMEMsQ0FBQSxHQUFFLENBQUgsR0FBUyxDQUFBQSxDQUFBLEdBQUUsQ0FBRixDQUFELEdBQU1FLEtBQWQsR0FBc0JFLEtBQXRDLENBUEY7QUFBQSxZQVFFLE1BbEZKO0FBQUEsU0F4Q3dDO0FBQUEsUUE2SHhDLEtBQUsxQixJQUFMLEdBQVksS0FBS0gsRUFBTCxHQUFRLEtBQUtuQixFQUF6QixDQTdId0M7QUFBQSxRQThIeEMsS0FBS3VCLElBQUwsR0FBWSxLQUFLSCxFQUFMLEdBQVEsS0FBS3BCLEVBQXpCLENBOUh3QztBQUFBLFFBK0h4QyxLQUFLd0IsSUFBTCxHQUFZLEtBQUtILEVBQUwsR0FBUSxLQUFLckIsRUFBekIsQ0EvSHdDO0FBQUEsUUFnSXhDLEtBQUt5QixJQUFMLEdBQVksS0FBS3hCLEVBQUwsR0FBUSxLQUFLRCxFQUF6QixDQWhJd0M7QUFBQSxRQWlJeEMsS0FBSzBCLElBQUwsR0FBWSxLQUFLeEIsRUFBTCxHQUFRLEtBQUtGLEVBQXpCLENBakl3QztBQUFBLEtBQTFDLENBL0ZnQztBQUFBLElBbU9oQyxLQUFLckYsT0FBTCxHQUFlLFVBQVM1SixNQUFULEVBQWlCO0FBQUEsUUFJNUIsSUFBSUUsR0FBQSxHQUFNRixNQUFBLENBQU9HLE1BQWpCLENBSjRCO0FBQUEsUUFLNUIsSUFBSWlPLE1BQUEsR0FBUyxJQUFJNU4sWUFBSixDQUFpQk4sR0FBakIsQ0FBYixDQUw0QjtBQUFBLFFBTzVCLEtBQU0sSUFBSUQsQ0FBQSxHQUFFLENBQU4sQ0FBTixDQUFlQSxDQUFBLEdBQUVELE1BQUEsQ0FBT0csTUFBeEIsRUFBZ0NGLENBQUEsRUFBaEMsRUFBc0M7QUFBQSxZQUNwQ21PLE1BQUEsQ0FBT25PLENBQVAsSUFBWSxLQUFLc1EsSUFBTCxHQUFVdlEsTUFBQSxDQUFPQyxDQUFQLENBQVYsR0FBc0IsS0FBS3VRLElBQUwsR0FBVSxLQUFLWixLQUFyQyxHQUE2QyxLQUFLYSxJQUFMLEdBQVUsS0FBS1osS0FBNUQsR0FBb0UsS0FBS2EsSUFBTCxHQUFVLEtBQUtaLEtBQW5GLEdBQTJGLEtBQUthLElBQUwsR0FBVSxLQUFLWixLQUF0SCxDQURvQztBQUFBLFlBRXBDLEtBQUtBLEtBQUwsR0FBYSxLQUFLRCxLQUFsQixDQUZvQztBQUFBLFlBR3BDLEtBQUtBLEtBQUwsR0FBYTFCLE1BQUEsQ0FBT25PLENBQVAsQ0FBYixDQUhvQztBQUFBLFlBSXBDLEtBQUs0UCxLQUFMLEdBQWEsS0FBS0QsS0FBbEIsQ0FKb0M7QUFBQSxZQUtwQyxLQUFLQSxLQUFMLEdBQWE1UCxNQUFBLENBQU9DLENBQVAsQ0FBYixDQUxvQztBQUFBLFNBUFY7QUFBQSxRQWU1QixPQUFPbU8sTUFBUCxDQWY0QjtBQUFBLEtBQWhDLENBbk9nQztBQUFBLElBcVBoQyxLQUFLOEQsYUFBTCxHQUFxQixVQUFTbFMsTUFBVCxFQUFpQjtBQUFBLFFBSWxDLElBQUlFLEdBQUEsR0FBTUYsTUFBQSxDQUFPRyxNQUFqQixDQUprQztBQUFBLFFBS2xDLElBQUlpTyxNQUFBLEdBQVMsSUFBSTVOLFlBQUosQ0FBaUJOLEdBQWpCLENBQWIsQ0FMa0M7QUFBQSxRQU9sQyxLQUFLLElBQUlELENBQUEsR0FBSSxDQUFSLENBQUwsQ0FBZ0JBLENBQUEsR0FBSUMsR0FBQSxHQUFJLENBQXhCLEVBQTJCRCxDQUFBLEVBQTNCLEVBQWdDO0FBQUEsWUFDOUJtTyxNQUFBLENBQU8sSUFBRW5PLENBQVQsSUFBYyxLQUFLc1EsSUFBTCxHQUFVdlEsTUFBQSxDQUFPLElBQUVDLENBQVQsQ0FBVixHQUF3QixLQUFLdVEsSUFBTCxHQUFVLEtBQUtaLEtBQXZDLEdBQStDLEtBQUthLElBQUwsR0FBVSxLQUFLWixLQUE5RCxHQUFzRSxLQUFLYSxJQUFMLEdBQVUsS0FBS1osS0FBckYsR0FBNkYsS0FBS2EsSUFBTCxHQUFVLEtBQUtaLEtBQTFILENBRDhCO0FBQUEsWUFFOUIsS0FBS0EsS0FBTCxHQUFhLEtBQUtELEtBQWxCLENBRjhCO0FBQUEsWUFHOUIsS0FBS0EsS0FBTCxHQUFhMUIsTUFBQSxDQUFPLElBQUVuTyxDQUFULENBQWIsQ0FIOEI7QUFBQSxZQUk5QixLQUFLNFAsS0FBTCxHQUFhLEtBQUtELEtBQWxCLENBSjhCO0FBQUEsWUFLOUIsS0FBS0EsS0FBTCxHQUFhNVAsTUFBQSxDQUFPLElBQUVDLENBQVQsQ0FBYixDQUw4QjtBQUFBLFlBTzlCbU8sTUFBQSxDQUFPLElBQUVuTyxDQUFGLEdBQUksQ0FBWCxJQUFnQixLQUFLc1EsSUFBTCxHQUFVdlEsTUFBQSxDQUFPLElBQUVDLENBQUYsR0FBSSxDQUFYLENBQVYsR0FBMEIsS0FBS3VRLElBQUwsR0FBVSxLQUFLUixLQUF6QyxHQUFpRCxLQUFLUyxJQUFMLEdBQVUsS0FBS1IsS0FBaEUsR0FBd0UsS0FBS1MsSUFBTCxHQUFVLEtBQUtSLEtBQXZGLEdBQStGLEtBQUtTLElBQUwsR0FBVSxLQUFLUixLQUE5SCxDQVA4QjtBQUFBLFlBUTlCLEtBQUtBLEtBQUwsR0FBYSxLQUFLRCxLQUFsQixDQVI4QjtBQUFBLFlBUzlCLEtBQUtBLEtBQUwsR0FBYTlCLE1BQUEsQ0FBTyxJQUFFbk8sQ0FBRixHQUFJLENBQVgsQ0FBYixDQVQ4QjtBQUFBLFlBVTlCLEtBQUtnUSxLQUFMLEdBQWEsS0FBS0QsS0FBbEIsQ0FWOEI7QUFBQSxZQVc5QixLQUFLQSxLQUFMLEdBQWFoUSxNQUFBLENBQU8sSUFBRUMsQ0FBRixHQUFJLENBQVgsQ0FBYixDQVg4QjtBQUFBLFNBUEU7QUFBQSxRQXFCbEMsT0FBT21PLE1BQVAsQ0FyQmtDO0FBQUEsS0FBdEMsQ0FyUGdDO0FBQUEsQ0FuOENsQztBQTR0REF2USxHQUFBLENBQUlzVSxNQUFKLEdBQWEsVUFBU25TLE1BQVQsRUFBaUI7QUFBQSxJQUM1QixJQUFJb1MsS0FBQSxHQUFRLENBQUMsR0FBYixDQUQ0QjtBQUFBLElBRTVCLElBQUlDLE1BQUEsR0FBUzdTLElBQUEsQ0FBSzhFLEdBQUwsQ0FBUyxFQUFULEVBQWU4TixLQUFBLEdBQVEsRUFBdkIsQ0FBYixDQUY0QjtBQUFBLElBSTVCLElBQUloTyxHQUFBLEdBQU01RSxJQUFBLENBQUs0RSxHQUFmLENBSjRCO0FBQUEsSUFLNUIsSUFBSWlOLEdBQUEsR0FBTTdSLElBQUEsQ0FBSzZSLEdBQWYsQ0FMNEI7QUFBQSxJQU81QixJQUFJaUIsTUFBQSxHQUFTOVIsWUFBQSxDQUFhUixNQUFBLENBQU9HLE1BQXBCLENBQWIsQ0FQNEI7QUFBQSxJQVE1QixLQUFLLElBQUlGLENBQUEsR0FBRSxDQUFOLENBQUwsQ0FBY0EsQ0FBQSxHQUFFRCxNQUFBLENBQU9HLE1BQXZCLEVBQStCRixDQUFBLEVBQS9CLEVBQW9DO0FBQUEsUUFDbENxUyxNQUFBLENBQU9yUyxDQUFQLElBQVksS0FBS21FLEdBQUEsQ0FBSWlOLEdBQUEsQ0FBSXJSLE1BQUEsQ0FBT0MsQ0FBUCxDQUFKLEVBQWVvUyxNQUFmLENBQUosQ0FBakIsQ0FEa0M7QUFBQSxLQVJSO0FBQUEsSUFZNUIsT0FBT0MsTUFBUCxDQVo0QjtBQUFBLENBQTlCLENBNXREQTtBQTB2REF6VSxHQUFBLENBQUkwVSxLQUFKLEdBQVksVUFBU3hCLENBQVQsRUFBWTNKLENBQVosRUFBZXVHLENBQWYsRUFBa0I7QUFBQSxJQUM1QixJQUFJMU4sQ0FBSixFQUFPd0gsQ0FBUCxDQUQ0QjtBQUFBLElBRzVCLElBQUksQ0FBQ2tHLENBQUwsRUFBUTtBQUFBLFFBQ05BLENBQUEsR0FBSW5OLFlBQUEsQ0FBYSxHQUFiLENBQUosQ0FETTtBQUFBLFFBRU4sS0FBS1AsQ0FBQSxHQUFFLENBQVAsRUFBU0EsQ0FBQSxHQUFFME4sQ0FBQSxDQUFFeE4sTUFBYixFQUFxQkYsQ0FBQSxFQUFyQixFQUEwQjtBQUFBLFlBQ3hCME4sQ0FBQSxDQUFFMU4sQ0FBRixJQUFPcEMsR0FBQSxDQUFJMEIsTUFBSixHQUFXb08sQ0FBQSxDQUFFeE4sTUFBYixHQUFzQkYsQ0FBdEIsR0FBMEJULElBQUEsQ0FBS0MsRUFBdEMsQ0FEd0I7QUFBQSxTQUZwQjtBQUFBLEtBSG9CO0FBQUEsSUFVNUIsSUFBSTZTLE1BQUEsR0FBUzlSLFlBQUEsQ0FBYW1OLENBQUEsQ0FBRXhOLE1BQWYsQ0FBYixDQVY0QjtBQUFBLElBWTVCLElBQUk4QixJQUFBLEdBQU96QyxJQUFBLENBQUt5QyxJQUFoQixDQVo0QjtBQUFBLElBYTVCLElBQUl5QixHQUFBLEdBQU1sRSxJQUFBLENBQUtrRSxHQUFmLENBYjRCO0FBQUEsSUFjNUIsSUFBSUQsR0FBQSxHQUFNakUsSUFBQSxDQUFLaUUsR0FBZixDQWQ0QjtBQUFBLElBZ0I1QixLQUFLeEQsQ0FBQSxHQUFFLENBQVAsRUFBVUEsQ0FBQSxHQUFFME4sQ0FBQSxDQUFFeE4sTUFBZCxFQUFzQkYsQ0FBQSxFQUF0QixFQUEyQjtBQUFBLFFBQ3pCLElBQUl1UyxTQUFBLEdBQVk7QUFBQSxZQUFDOVAsSUFBQSxFQUFLLENBQU47QUFBQSxZQUFXQyxJQUFBLEVBQUssQ0FBaEI7QUFBQSxTQUFoQixDQUR5QjtBQUFBLFFBRXpCLEtBQUs4RSxDQUFBLEdBQUUsQ0FBUCxFQUFVQSxDQUFBLEdBQUVzSixDQUFBLENBQUU1USxNQUFkLEVBQXNCc0gsQ0FBQSxFQUF0QixFQUEyQjtBQUFBLFlBQ3pCK0ssU0FBQSxDQUFVOVAsSUFBVixJQUFrQnFPLENBQUEsQ0FBRXRKLENBQUYsSUFBTy9ELEdBQUEsQ0FBSSxDQUFDK0QsQ0FBRCxHQUFHa0csQ0FBQSxDQUFFMU4sQ0FBRixDQUFQLENBQXpCLENBRHlCO0FBQUEsWUFFekJ1UyxTQUFBLENBQVU3UCxJQUFWLElBQWtCb08sQ0FBQSxDQUFFdEosQ0FBRixJQUFPaEUsR0FBQSxDQUFJLENBQUNnRSxDQUFELEdBQUdrRyxDQUFBLENBQUUxTixDQUFGLENBQVAsQ0FBekIsQ0FGeUI7QUFBQSxTQUZGO0FBQUEsUUFPekIsSUFBSXdTLFdBQUEsR0FBYztBQUFBLFlBQUMvUCxJQUFBLEVBQUssQ0FBTjtBQUFBLFlBQVdDLElBQUEsRUFBSyxDQUFoQjtBQUFBLFNBQWxCLENBUHlCO0FBQUEsUUFRekIsS0FBSzhFLENBQUEsR0FBRSxDQUFQLEVBQVVBLENBQUEsR0FBRUwsQ0FBQSxDQUFFakgsTUFBZCxFQUFzQnNILENBQUEsRUFBdEIsRUFBMkI7QUFBQSxZQUN6QmdMLFdBQUEsQ0FBWS9QLElBQVosSUFBb0IwRSxDQUFBLENBQUVLLENBQUYsSUFBTy9ELEdBQUEsQ0FBSSxDQUFDK0QsQ0FBRCxHQUFHa0csQ0FBQSxDQUFFMU4sQ0FBRixDQUFQLENBQTNCLENBRHlCO0FBQUEsWUFFekJ3UyxXQUFBLENBQVk5UCxJQUFaLElBQW9CeUUsQ0FBQSxDQUFFSyxDQUFGLElBQU9oRSxHQUFBLENBQUksQ0FBQ2dFLENBQUQsR0FBR2tHLENBQUEsQ0FBRTFOLENBQUYsQ0FBUCxDQUEzQixDQUZ5QjtBQUFBLFNBUkY7QUFBQSxRQWF6QnFTLE1BQUEsQ0FBT3JTLENBQVAsSUFBYWdDLElBQUEsQ0FBS3VRLFNBQUEsQ0FBVTlQLElBQVYsR0FBZThQLFNBQUEsQ0FBVTlQLElBQXpCLEdBQWdDOFAsU0FBQSxDQUFVN1AsSUFBVixHQUFlNlAsU0FBQSxDQUFVN1AsSUFBOUQsSUFBc0VWLElBQUEsQ0FBS3dRLFdBQUEsQ0FBWS9QLElBQVosR0FBaUIrUCxXQUFBLENBQVkvUCxJQUE3QixHQUFvQytQLFdBQUEsQ0FBWTlQLElBQVosR0FBaUI4UCxXQUFBLENBQVk5UCxJQUF0RSxDQUFuRixDQWJ5QjtBQUFBLEtBaEJDO0FBQUEsSUFnQzVCLE9BQU8yUCxNQUFQLENBaEM0QjtBQUFBLENBQTlCLENBMXZEQTtBQXV5REEsU0FBU0ksV0FBVCxDQUFxQm5RLFVBQXJCLEVBQWlDO0FBQUEsSUFDL0IsS0FBS29RLEVBQUwsR0FBVXBRLFVBQVYsQ0FEK0I7QUFBQSxJQUUvQixLQUFLcVEsT0FBTCxHQUFlLEVBQWYsQ0FGK0I7QUFBQSxJQUcvQixLQUFLQyxPQUFMLEdBQWUsS0FBZixDQUgrQjtBQUFBLElBSy9CLEtBQUtDLGNBQUwsR0FBc0IsQ0FBdEIsQ0FMK0I7QUFBQSxJQU8vQixLQUFLQyxPQUFMLEdBQWUsRUFBZixDQVArQjtBQUFBLElBUS9CLEtBQUtDLE1BQUwsR0FBYyxFQUFkLENBUitCO0FBQUEsSUFVL0IsS0FBS0MsZUFBTCxHQUF1QixJQUF2QixDQVYrQjtBQUFBLElBWS9CLEtBQUtDLGtCQUFMLEdBQTBCLFlBQVc7QUFBQSxRQUNuQyxJQUFJQyxTQUFBLEdBQVkzVCxJQUFBLENBQUsySyxLQUFMLENBQVczSyxJQUFBLENBQUs0RSxHQUFMLENBQVMsS0FBS3lPLE9BQUwsR0FBYSxLQUFLRCxPQUEzQixJQUFzQyxLQUFLRSxjQUEzQyxHQUEyRHRULElBQUEsQ0FBSzZFLEdBQTNFLENBQWhCLENBRG1DO0FBQUEsUUFHbkMsS0FBSzBPLE9BQUwsR0FBZSxFQUFmLENBSG1DO0FBQUEsUUFJbkMsS0FBSyxJQUFJOVMsQ0FBQSxHQUFFLENBQU4sQ0FBTCxDQUFjQSxDQUFBLEdBQUVrVCxTQUFoQixFQUEyQmxULENBQUEsRUFBM0IsRUFBZ0M7QUFBQSxZQUM5QixJQUFJK04sSUFBQSxHQUFPLEtBQUs0RSxPQUFMLEdBQWNwVCxJQUFBLENBQUs4RSxHQUFMLENBQVMsQ0FBVCxFQUFZckUsQ0FBQSxHQUFFLEtBQUs2UyxjQUFuQixDQUF6QixDQUQ4QjtBQUFBLFlBRTlCLElBQUlNLFNBQUEsR0FBWSxJQUFJM0QsTUFBSixDQUFXNVIsR0FBQSxDQUFJNEQsVUFBZixFQUEyQixLQUFLa1IsRUFBaEMsQ0FBaEIsQ0FGOEI7QUFBQSxZQUc5QlMsU0FBQSxDQUFVekIsU0FBVixDQUFvQixDQUFwQixFQUg4QjtBQUFBLFlBSTlCeUIsU0FBQSxDQUFVOUIsS0FBVixDQUFnQixJQUFFLEtBQUt3QixjQUF2QixFQUo4QjtBQUFBLFlBSzlCTSxTQUFBLENBQVUxQixLQUFWLENBQWdCMUQsSUFBaEIsRUFMOEI7QUFBQSxZQU05QixLQUFLK0UsT0FBTCxDQUFhOVMsQ0FBYixJQUFrQm1ULFNBQWxCLENBTjhCO0FBQUEsWUFPOUIsS0FBS0MsZ0JBQUwsQ0FBc0JwVCxDQUF0QixFQVA4QjtBQUFBLFNBSkc7QUFBQSxLQUFyQyxDQVorQjtBQUFBLElBMkIvQixLQUFLcVQsbUJBQUwsR0FBMkIsVUFBU3RGLElBQVQsRUFBZTtBQUFBLFFBQ3hDLEtBQUs0RSxPQUFMLEdBQWU1RSxJQUFmLENBRHdDO0FBQUEsUUFFeEMsS0FBS2tGLGtCQUFMLEdBRndDO0FBQUEsS0FBMUMsQ0EzQitCO0FBQUEsSUFnQy9CLEtBQUtLLG1CQUFMLEdBQTJCLFVBQVN2RixJQUFULEVBQWU7QUFBQSxRQUN4QyxLQUFLNkUsT0FBTCxHQUFlN0UsSUFBZixDQUR3QztBQUFBLFFBRXhDLEtBQUtrRixrQkFBTCxHQUZ3QztBQUFBLEtBQTFDLENBaEMrQjtBQUFBLElBcUMvQixLQUFLTSxpQkFBTCxHQUF5QixVQUFTQyxLQUFULEVBQWdCO0FBQUEsUUFDdkMsS0FBS1gsY0FBTCxHQUFzQlcsS0FBdEIsQ0FEdUM7QUFBQSxRQUV2QyxLQUFLUCxrQkFBTCxHQUZ1QztBQUFBLEtBQXpDLENBckMrQjtBQUFBLElBMEMvQixLQUFLUSxXQUFMLEdBQW1CLFVBQVNDLFNBQVQsRUFBb0JDLElBQXBCLEVBQTBCO0FBQUEsUUFDM0MsSUFBSUQsU0FBQSxHQUFZLENBQVosSUFBaUJBLFNBQUEsR0FBYSxLQUFLWixPQUFMLENBQWE1UyxNQUFiLEdBQW9CLENBQXRELEVBQTBEO0FBQUEsWUFDeEQsTUFBTSw2REFBTixDQUR3RDtBQUFBLFNBRGY7QUFBQSxRQUszQyxJQUFJLENBQUN5VCxJQUFMLEVBQVc7QUFBQSxZQUNULE1BQU0sd0JBQU4sQ0FEUztBQUFBLFNBTGdDO0FBQUEsUUFTM0MsS0FBS2IsT0FBTCxDQUFhWSxTQUFiLEVBQXdCaEMsU0FBeEIsQ0FBa0NpQyxJQUFsQyxFQVQyQztBQUFBLFFBVTNDLEtBQUtQLGdCQUFMLENBQXNCTSxTQUF0QixFQVYyQztBQUFBLEtBQTdDLENBMUMrQjtBQUFBLElBdUQvQixLQUFLTixnQkFBTCxHQUF3QixVQUFTTSxTQUFULEVBQW9CO0FBQUEsUUFDMUMsSUFBSSxDQUFDLEtBQUtWLGVBQVYsRUFBMkI7QUFBQSxZQUN6QixPQUR5QjtBQUFBLFNBRGU7QUFBQSxRQUsxQyxJQUFJVSxTQUFBLEdBQVksQ0FBWixJQUFpQkEsU0FBQSxHQUFhLEtBQUtaLE9BQUwsQ0FBYTVTLE1BQWIsR0FBb0IsQ0FBdEQsRUFBMEQ7QUFBQSxZQUN4RCxNQUFNLGlFQUFpRXdULFNBQWpFLEdBQTZFLGNBQTdFLEdBQThGLENBQTlGLEdBQWtHLElBQWxHLEdBQXlHLEtBQUtaLE9BQUwsQ0FBYTVTLE1BQXRILEdBQTZILENBQTdILEdBQWlJLEdBQXZJLENBRHdEO0FBQUEsU0FMaEI7QUFBQSxRQVMxQyxJQUFJLENBQUMsS0FBS3dOLENBQVYsRUFBYTtBQUFBLFlBQ1gsS0FBS0EsQ0FBTCxHQUFTbk4sWUFBQSxDQUFhLEdBQWIsQ0FBVCxDQURXO0FBQUEsWUFFWCxLQUFLLElBQUlQLENBQUEsR0FBRSxDQUFOLENBQUwsQ0FBY0EsQ0FBQSxHQUFFLEtBQUswTixDQUFMLENBQU94TixNQUF2QixFQUErQkYsQ0FBQSxFQUEvQixFQUFvQztBQUFBLGdCQUNqQyxLQUFLME4sQ0FBTCxDQUFPMU4sQ0FBUCxJQUFZVCxJQUFBLENBQUtDLEVBQUwsR0FBUSxLQUFLa08sQ0FBTCxDQUFPeE4sTUFBZixHQUF3QkYsQ0FBcEMsQ0FEaUM7QUFBQSxhQUZ6QjtBQUFBLFNBVDZCO0FBQUEsUUFnQjFDLElBQUk4USxDQUFBLEdBQUk7QUFBQSxZQUFDLEtBQUtnQyxPQUFMLENBQWFZLFNBQWIsRUFBd0J2RCxFQUF6QjtBQUFBLFlBQTZCLEtBQUsyQyxPQUFMLENBQWFZLFNBQWIsRUFBd0J0RCxFQUFyRDtBQUFBLFlBQXlELEtBQUswQyxPQUFMLENBQWFZLFNBQWIsRUFBd0JyRCxFQUFqRjtBQUFBLFNBQVIsQ0FoQjBDO0FBQUEsUUFpQjFDLElBQUlsSixDQUFBLEdBQUk7QUFBQSxZQUFDLEtBQUsyTCxPQUFMLENBQWFZLFNBQWIsRUFBd0IxRSxFQUF6QjtBQUFBLFlBQTZCLEtBQUs4RCxPQUFMLENBQWFZLFNBQWIsRUFBd0J6RSxFQUFyRDtBQUFBLFlBQXlELEtBQUs2RCxPQUFMLENBQWFZLFNBQWIsRUFBd0J4RSxFQUFqRjtBQUFBLFNBQVIsQ0FqQjBDO0FBQUEsUUFtQjFDLEtBQUs2RCxNQUFMLENBQVlXLFNBQVosSUFBeUI5VixHQUFBLENBQUlzVSxNQUFKLENBQVd0VSxHQUFBLENBQUkwVSxLQUFKLENBQVV4QixDQUFWLEVBQWEzSixDQUFiLEVBQWdCLEtBQUt1RyxDQUFyQixDQUFYLENBQXpCLENBbkIwQztBQUFBLEtBQTVDLENBdkQrQjtBQUFBLElBNkUvQixLQUFLL0QsT0FBTCxHQUFlLFVBQVM1SixNQUFULEVBQWlCO0FBQUEsUUFDOUIsSUFBSW9PLE1BQUEsR0FBU3BPLE1BQWIsQ0FEOEI7QUFBQSxRQUc5QixLQUFLLElBQUlDLENBQUEsR0FBSSxDQUFSLENBQUwsQ0FBZ0JBLENBQUEsR0FBSSxLQUFLOFMsT0FBTCxDQUFhNVMsTUFBakMsRUFBeUNGLENBQUEsRUFBekMsRUFBOEM7QUFBQSxZQUM1Q21PLE1BQUEsR0FBUyxLQUFLMkUsT0FBTCxDQUFhOVMsQ0FBYixFQUFnQjJKLE9BQWhCLENBQXdCd0UsTUFBeEIsQ0FBVCxDQUQ0QztBQUFBLFNBSGhCO0FBQUEsUUFPOUIsT0FBT0EsTUFBUCxDQVA4QjtBQUFBLEtBQWhDLENBN0UrQjtBQUFBLElBdUYvQixLQUFLOEQsYUFBTCxHQUFxQixVQUFTbFMsTUFBVCxFQUFpQjtBQUFBLFFBQ3BDLElBQUlvTyxNQUFBLEdBQVNwTyxNQUFiLENBRG9DO0FBQUEsUUFHcEMsS0FBSyxJQUFJQyxDQUFBLEdBQUksQ0FBUixDQUFMLENBQWdCQSxDQUFBLEdBQUksS0FBSzhTLE9BQUwsQ0FBYTVTLE1BQWpDLEVBQXlDRixDQUFBLEVBQXpDLEVBQThDO0FBQUEsWUFDNUNtTyxNQUFBLEdBQVMsS0FBSzJFLE9BQUwsQ0FBYTlTLENBQWIsRUFBZ0JpUyxhQUFoQixDQUE4QjlELE1BQTlCLENBQVQsQ0FENEM7QUFBQSxTQUhWO0FBQUEsUUFPcEMsT0FBT0EsTUFBUCxDQVBvQztBQUFBLEtBQXRDLENBdkYrQjtBQUFBLENBdnlEakM7QUEyNURBLFNBQVN5RixVQUFULENBQW9CQyxxQkFBcEIsRUFBMkNDLGNBQTNDLEVBQTJEQyxZQUEzRCxFQUF5RUMsV0FBekUsRUFBc0Y7QUFBQSxJQUNwRixLQUFLQyxrQkFBTCxHQUE0QixJQUFJMVQsWUFBSixDQUFpQnNULHFCQUFqQixDQUE1QixDQURvRjtBQUFBLElBRXBGLEtBQUtLLGlCQUFMLEdBQTZCSixjQUE3QixDQUZvRjtBQUFBLElBR3BGLEtBQUtLLGtCQUFMLEdBQTRCLENBQTVCLENBSG9GO0FBQUEsSUFLcEYsS0FBS0wsY0FBTCxHQUF3QkEsY0FBeEIsQ0FMb0Y7QUFBQSxJQU1wRixLQUFLQyxZQUFMLEdBQXdCQSxZQUF4QixDQU5vRjtBQUFBLElBT3BGLEtBQUtDLFdBQUwsR0FBdUJBLFdBQXZCLENBUG9GO0FBQUEsQ0EzNUR0RjtBQTA2REFKLFVBQUEsQ0FBV2xRLFNBQVgsQ0FBcUIwUSxpQkFBckIsR0FBeUMsVUFBVU4sY0FBVixFQUEwQjtBQUFBLElBQ2pFLEtBQUtBLGNBQUwsR0FBc0JBLGNBQXRCLENBRGlFO0FBQUEsSUFHakUsS0FBS0ksaUJBQUwsR0FBeUIsS0FBS0Msa0JBQUwsR0FBMEJMLGNBQW5ELENBSGlFO0FBQUEsSUFLakUsSUFBSSxLQUFLSSxpQkFBTCxJQUEwQixLQUFLRCxrQkFBTCxDQUF3Qi9ULE1BQXhCLEdBQStCLENBQTdELEVBQWdFO0FBQUEsUUFDOUQsS0FBS2dVLGlCQUFMLEdBQXlCLEtBQUtBLGlCQUFMLEdBQXlCLEtBQUtELGtCQUFMLENBQXdCL1QsTUFBMUUsQ0FEOEQ7QUFBQSxLQUxDO0FBQUEsQ0FBbkUsQ0ExNkRBO0FBeTdEQTBULFVBQUEsQ0FBV2xRLFNBQVgsQ0FBcUIyUSxlQUFyQixHQUF1QyxVQUFTTixZQUFULEVBQXVCO0FBQUEsSUFDNUQsS0FBS0EsWUFBTCxHQUFvQkEsWUFBcEIsQ0FENEQ7QUFBQSxDQUE5RCxDQXo3REE7QUFrOERBSCxVQUFBLENBQVdsUSxTQUFYLENBQXFCNFEsY0FBckIsR0FBc0MsVUFBU04sV0FBVCxFQUFzQjtBQUFBLElBQzFELEtBQUtBLFdBQUwsR0FBbUJBLFdBQW5CLENBRDBEO0FBQUEsQ0FBNUQsQ0FsOERBO0FBNjhEQUosVUFBQSxDQUFXbFEsU0FBWCxDQUFxQmlHLE9BQXJCLEdBQStCLFVBQVMxQixPQUFULEVBQWtCO0FBQUEsSUFFL0MsSUFBSS9HLGFBQUEsR0FBZ0IsSUFBSVgsWUFBSixDQUFpQjBILE9BQUEsQ0FBUS9ILE1BQXpCLENBQXBCLENBRitDO0FBQUEsSUFJL0MsS0FBSyxJQUFJRixDQUFBLEdBQUUsQ0FBTixDQUFMLENBQWNBLENBQUEsR0FBRWlJLE9BQUEsQ0FBUS9ILE1BQXhCLEVBQWdDRixDQUFBLEVBQWhDLEVBQXFDO0FBQUEsUUFFbkMsSUFBSXVVLFdBQUEsR0FBZSxLQUFLTixrQkFBTCxDQUF3QixLQUFLRSxrQkFBN0IsTUFBcUQsSUFBckQsR0FBNEQsQ0FBNUQsR0FBa0UsS0FBS0Ysa0JBQUwsQ0FBd0IsS0FBS0Usa0JBQTdCLENBQXJGLENBRm1DO0FBQUEsUUFLbkMsSUFBSXRILE1BQUEsR0FBVTBILFdBQUEsR0FBYyxLQUFLUCxXQUFwQixHQUFtQy9MLE9BQUEsQ0FBUWpJLENBQVIsQ0FBaEQsQ0FMbUM7QUFBQSxRQVFuQyxLQUFLaVUsa0JBQUwsQ0FBd0IsS0FBS0MsaUJBQTdCLElBQWtEckgsTUFBbEQsQ0FSbUM7QUFBQSxRQVduQzNMLGFBQUEsQ0FBY2xCLENBQWQsSUFBbUI2TSxNQUFBLEdBQVMsS0FBS2tILFlBQWpDLENBWG1DO0FBQUEsUUFjbkMsS0FBS0csaUJBQUwsR0FkbUM7QUFBQSxRQWVuQyxJQUFJLEtBQUtBLGlCQUFMLElBQTBCLEtBQUtELGtCQUFMLENBQXdCL1QsTUFBeEIsR0FBK0IsQ0FBN0QsRUFBZ0U7QUFBQSxZQUM5RCxLQUFLZ1UsaUJBQUwsR0FBeUIsQ0FBekIsQ0FEOEQ7QUFBQSxTQWY3QjtBQUFBLFFBbUJuQyxLQUFLQyxrQkFBTCxHQW5CbUM7QUFBQSxRQW9CbkMsSUFBSSxLQUFLQSxrQkFBTCxJQUEyQixLQUFLRixrQkFBTCxDQUF3Qi9ULE1BQXhCLEdBQStCLENBQTlELEVBQWlFO0FBQUEsWUFDL0QsS0FBS2lVLGtCQUFMLEdBQTBCLENBQTFCLENBRCtEO0FBQUEsU0FwQjlCO0FBQUEsS0FKVTtBQUFBLElBNkIvQyxPQUFPalQsYUFBUCxDQTdCK0M7QUFBQSxDQUFqRCxDQTc4REE7QUFnZ0VBLFNBQVNzVCxXQUFULENBQXFCWCxxQkFBckIsRUFBNENDLGNBQTVDLEVBQTRERSxXQUE1RCxFQUF5RTtBQUFBLElBQ3ZFLEtBQUtDLGtCQUFMLEdBQTBCLElBQUkxVCxZQUFKLENBQWlCc1QscUJBQWpCLENBQTFCLENBRHVFO0FBQUEsSUFFdkUsS0FBS0ssaUJBQUwsR0FBMEJKLGNBQTFCLENBRnVFO0FBQUEsSUFHdkUsS0FBS0ssa0JBQUwsR0FBMEIsQ0FBMUIsQ0FIdUU7QUFBQSxJQUt2RSxLQUFLTCxjQUFMLEdBQTBCQSxjQUExQixDQUx1RTtBQUFBLElBTXZFLEtBQUtFLFdBQUwsR0FBMEJBLFdBQTFCLENBTnVFO0FBQUEsQ0FoZ0V6RTtBQThnRUFRLFdBQUEsQ0FBWTlRLFNBQVosQ0FBc0IwUSxpQkFBdEIsR0FBMEMsVUFBU04sY0FBVCxFQUF5QjtBQUFBLElBQ2pFLEtBQUtBLGNBQUwsR0FBc0JBLGNBQXRCLENBRGlFO0FBQUEsSUFFakUsS0FBS0ksaUJBQUwsR0FBeUIsS0FBS0Msa0JBQUwsR0FBMEJMLGNBQW5ELENBRmlFO0FBQUEsSUFJakUsSUFBSSxLQUFLSSxpQkFBTCxJQUEwQixLQUFLRCxrQkFBTCxDQUF3Qi9ULE1BQXhCLEdBQStCLENBQTdELEVBQWdFO0FBQUEsUUFDOUQsS0FBS2dVLGlCQUFMLEdBQXlCLEtBQUtBLGlCQUFMLEdBQXlCLEtBQUtELGtCQUFMLENBQXdCL1QsTUFBMUUsQ0FEOEQ7QUFBQSxLQUpDO0FBQUEsQ0FBbkUsQ0E5Z0VBO0FBNGhFQXNVLFdBQUEsQ0FBWTlRLFNBQVosQ0FBc0I0USxjQUF0QixHQUF1QyxVQUFTTixXQUFULEVBQXNCO0FBQUEsSUFDM0QsS0FBS0EsV0FBTCxHQUFtQkEsV0FBbkIsQ0FEMkQ7QUFBQSxDQUE3RCxDQTVoRUE7QUF3aUVBUSxXQUFBLENBQVk5USxTQUFaLENBQXNCaUcsT0FBdEIsR0FBZ0MsVUFBUzFCLE9BQVQsRUFBa0I7QUFBQSxJQUVoRCxJQUFJL0csYUFBQSxHQUFnQixJQUFJWCxZQUFKLENBQWlCMEgsT0FBQSxDQUFRL0gsTUFBekIsQ0FBcEIsQ0FGZ0Q7QUFBQSxJQUloRCxLQUFLLElBQUlGLENBQUEsR0FBRSxDQUFOLENBQUwsQ0FBY0EsQ0FBQSxHQUFFaUksT0FBQSxDQUFRL0gsTUFBeEIsRUFBZ0NGLENBQUEsRUFBaEMsRUFBcUM7QUFBQSxRQUduQyxLQUFLaVUsa0JBQUwsQ0FBd0IsS0FBS0MsaUJBQTdCLElBQWtEak0sT0FBQSxDQUFRakksQ0FBUixDQUFsRCxDQUhtQztBQUFBLFFBTW5DLElBQUl1VSxXQUFBLEdBQWMsS0FBS04sa0JBQUwsQ0FBd0IsS0FBS0Usa0JBQTdCLENBQWxCLENBTm1DO0FBQUEsUUFTbkNqVCxhQUFBLENBQWNsQixDQUFkLElBQW1CdVUsV0FBQSxHQUFjLEtBQUtQLFdBQXRDLENBVG1DO0FBQUEsUUFZbkMsS0FBS0UsaUJBQUwsR0FabUM7QUFBQSxRQWNuQyxJQUFJLEtBQUtBLGlCQUFMLElBQTBCLEtBQUtELGtCQUFMLENBQXdCL1QsTUFBeEIsR0FBK0IsQ0FBN0QsRUFBZ0U7QUFBQSxZQUM5RCxLQUFLZ1UsaUJBQUwsR0FBeUIsQ0FBekIsQ0FEOEQ7QUFBQSxTQWQ3QjtBQUFBLFFBa0JuQyxLQUFLQyxrQkFBTCxHQWxCbUM7QUFBQSxRQW9CbkMsSUFBSSxLQUFLQSxrQkFBTCxJQUEyQixLQUFLRixrQkFBTCxDQUF3Qi9ULE1BQXhCLEdBQStCLENBQTlELEVBQWlFO0FBQUEsWUFDL0QsS0FBS2lVLGtCQUFMLEdBQTBCLENBQTFCLENBRCtEO0FBQUEsU0FwQjlCO0FBQUEsS0FKVztBQUFBLElBNkJoRCxPQUFPalQsYUFBUCxDQTdCZ0Q7QUFBQSxDQUFsRCxDQXhpRUE7QUEybEVBLFNBQVN1VCxNQUFULENBQWdCWixxQkFBaEIsRUFBdUNDLGNBQXZDLEVBQXVEQyxZQUF2RCxFQUFxRVcsU0FBckUsRUFBZ0ZWLFdBQWhGLEVBQTZGVyxhQUE3RixFQUE0RztBQUFBLElBQzFHLEtBQUtiLGNBQUwsR0FBd0JBLGNBQXhCLENBRDBHO0FBQUEsSUFFMUcsS0FBS0MsWUFBTCxHQUF3QkEsWUFBeEIsQ0FGMEc7QUFBQSxJQUcxRyxLQUFLVyxTQUFMLEdBQXVCQSxTQUF2QixDQUgwRztBQUFBLElBSTFHLEtBQUtWLFdBQUwsR0FBdUJBLFdBQXZCLENBSjBHO0FBQUEsSUFLMUcsS0FBS1csYUFBTCxHQUF5QkEsYUFBekIsQ0FMMEc7QUFBQSxJQU8xRyxLQUFLQyxpQkFBTCxHQUF5QixDQUF6QixDQVAwRztBQUFBLElBUTFHLEtBQUtDLGtCQUFMLEdBQTBCLENBQTFCLENBUjBHO0FBQUEsSUFVMUcsS0FBS0MsUUFBTCxHQUFnQixJQUFJakgsVUFBSixDQUFlalEsR0FBQSxDQUFJUSxPQUFuQixFQUE0QnVXLGFBQTVCLEVBQTJDLENBQTNDLEVBQThDLEtBQTlDLENBQWhCLENBVjBHO0FBQUEsSUFXMUcsS0FBS0ksUUFBTCxHQUFnQixJQUFJbEgsVUFBSixDQUFlalEsR0FBQSxDQUFJUSxPQUFuQixFQUE0QnVXLGFBQTVCLEVBQTJDLENBQTNDLEVBQThDLEtBQTlDLENBQWhCLENBWDBHO0FBQUEsSUFhMUcsS0FBS0ssWUFBTCxHQUFvQixFQUFwQixDQWIwRztBQUFBLElBZTFHLElBQUloVixDQUFKLEVBQU9pVixhQUFQLENBZjBHO0FBQUEsSUFpQjFHLEtBQUtqVixDQUFBLEdBQUksQ0FBVCxFQUFZQSxDQUFBLEdBQUksS0FBSzZVLGtCQUFyQixFQUF5QzdVLENBQUEsRUFBekMsRUFBOEM7QUFBQSxRQUM1Q2lWLGFBQUEsR0FBZ0IsSUFBT2pWLENBQUEsR0FBRSxDQUF6QixDQUQ0QztBQUFBLFFBRTVDLEtBQUtnVixZQUFMLENBQWtCaFYsQ0FBbEIsSUFBdUIsSUFBSXdVLFdBQUosQ0FBZ0JYLHFCQUFoQixFQUF1Q3RVLElBQUEsQ0FBSzJLLEtBQUwsQ0FBVyxLQUFLNEosY0FBTCxHQUFzQm1CLGFBQWpDLENBQXZDLEVBQXdGLEtBQUtqQixXQUE3RixDQUF2QixDQUY0QztBQUFBLEtBakI0RDtBQUFBLElBc0IxRyxLQUFLa0IsV0FBTCxHQUFtQixFQUFuQixDQXRCMEc7QUFBQSxJQXdCMUcsS0FBS2xWLENBQUEsR0FBSSxDQUFULEVBQVlBLENBQUEsR0FBSSxLQUFLNFUsaUJBQXJCLEVBQXdDNVUsQ0FBQSxFQUF4QyxFQUE2QztBQUFBLFFBQzNDaVYsYUFBQSxHQUFnQixJQUFPalYsQ0FBQSxHQUFFLEVBQXpCLENBRDJDO0FBQUEsUUFFM0MsS0FBS2tWLFdBQUwsQ0FBaUJsVixDQUFqQixJQUFzQixJQUFJNFQsVUFBSixDQUFlQyxxQkFBZixFQUFzQ3RVLElBQUEsQ0FBSzJLLEtBQUwsQ0FBVyxLQUFLNEosY0FBTCxHQUFzQm1CLGFBQWpDLENBQXRDLEVBQXVGLEtBQUtsQixZQUE1RixFQUEwRyxLQUFLQyxXQUEvRyxDQUF0QixDQUYyQztBQUFBLEtBeEI2RDtBQUFBLENBM2xFNUc7QUE4bkVBUyxNQUFBLENBQU8vUSxTQUFQLENBQWlCMFEsaUJBQWpCLEdBQXFDLFVBQVVOLGNBQVYsRUFBeUI7QUFBQSxJQUM1RCxLQUFLQSxjQUFMLEdBQXNCQSxjQUF0QixDQUQ0RDtBQUFBLElBRzVELElBQUk5VCxDQUFKLEVBQU9pVixhQUFQLENBSDREO0FBQUEsSUFLNUQsS0FBS2pWLENBQUEsR0FBSSxDQUFULEVBQVlBLENBQUEsR0FBSSxLQUFLNlUsa0JBQXJCLEVBQXlDN1UsQ0FBQSxFQUF6QyxFQUE4QztBQUFBLFFBQzVDaVYsYUFBQSxHQUFnQixJQUFPalYsQ0FBQSxHQUFFLENBQXpCLENBRDRDO0FBQUEsUUFFNUMsS0FBS2dWLFlBQUwsQ0FBa0JoVixDQUFsQixFQUFxQm9VLGlCQUFyQixDQUF3QzdVLElBQUEsQ0FBSzJLLEtBQUwsQ0FBVyxLQUFLNEosY0FBTCxHQUFzQm1CLGFBQWpDLENBQXhDLEVBRjRDO0FBQUEsS0FMYztBQUFBLElBVTVELEtBQUtqVixDQUFBLEdBQUksQ0FBVCxFQUFZQSxDQUFBLEdBQUksS0FBSzRVLGlCQUFyQixFQUF3QzVVLENBQUEsRUFBeEMsRUFBNkM7QUFBQSxRQUMzQ2lWLGFBQUEsR0FBZ0IsSUFBT2pWLENBQUEsR0FBRSxFQUF6QixDQUQyQztBQUFBLFFBRTNDLEtBQUtrVixXQUFMLENBQWlCbFYsQ0FBakIsRUFBb0JvVSxpQkFBcEIsQ0FBdUM3VSxJQUFBLENBQUsySyxLQUFMLENBQVcsS0FBSzRKLGNBQUwsR0FBc0JtQixhQUFqQyxDQUF2QyxFQUYyQztBQUFBLEtBVmU7QUFBQSxDQUE5RCxDQTluRUE7QUFtcEVBUixNQUFBLENBQU8vUSxTQUFQLENBQWlCMlEsZUFBakIsR0FBbUMsVUFBVU4sWUFBVixFQUF1QjtBQUFBLElBQ3hELEtBQUtBLFlBQUwsR0FBb0JBLFlBQXBCLENBRHdEO0FBQUEsQ0FBMUQsQ0FucEVBO0FBNHBFQVUsTUFBQSxDQUFPL1EsU0FBUCxDQUFpQnlSLFlBQWpCLEdBQWdDLFVBQVVULFNBQVYsRUFBb0I7QUFBQSxJQUNsRCxLQUFLQSxTQUFMLEdBQWlCQSxTQUFqQixDQURrRDtBQUFBLENBQXBELENBNXBFQTtBQXFxRUFELE1BQUEsQ0FBTy9RLFNBQVAsQ0FBaUI0USxjQUFqQixHQUFrQyxVQUFVTixXQUFWLEVBQXNCO0FBQUEsSUFDdEQsS0FBS0EsV0FBTCxHQUFtQkEsV0FBbkIsQ0FEc0Q7QUFBQSxJQUd0RCxJQUFJaFUsQ0FBSixDQUhzRDtBQUFBLElBS3RELEtBQUtBLENBQUEsR0FBSSxDQUFULEVBQVlBLENBQUEsR0FBRSxLQUFLNlUsa0JBQW5CLEVBQXVDN1UsQ0FBQSxFQUF2QyxFQUE0QztBQUFBLFFBQzFDLEtBQUtnVixZQUFMLENBQWtCaFYsQ0FBbEIsRUFBcUJzVSxjQUFyQixDQUFvQyxLQUFLTixXQUF6QyxFQUQwQztBQUFBLEtBTFU7QUFBQSxJQVN0RCxLQUFLaFUsQ0FBQSxHQUFJLENBQVQsRUFBWUEsQ0FBQSxHQUFFLEtBQUs0VSxpQkFBbkIsRUFBc0M1VSxDQUFBLEVBQXRDLEVBQTJDO0FBQUEsUUFDekMsS0FBS2tWLFdBQUwsQ0FBaUJsVixDQUFqQixFQUFvQnNVLGNBQXBCLENBQW1DLEtBQUtOLFdBQXhDLEVBRHlDO0FBQUEsS0FUVztBQUFBLENBQXhELENBcnFFQTtBQXdyRUFTLE1BQUEsQ0FBTy9RLFNBQVAsQ0FBaUIwUixnQkFBakIsR0FBb0MsVUFBVVQsYUFBVixFQUF3QjtBQUFBLElBQzFELEtBQUtBLGFBQUwsR0FBcUJBLGFBQXJCLENBRDBEO0FBQUEsSUFHMUQsS0FBS0csUUFBTCxDQUFjeEgsR0FBZCxDQUFrQnFILGFBQWxCLEVBQWlDLENBQWpDLEVBSDBEO0FBQUEsSUFJMUQsS0FBS0ksUUFBTCxDQUFjekgsR0FBZCxDQUFrQnFILGFBQWxCLEVBQWlDLENBQWpDLEVBSjBEO0FBQUEsQ0FBNUQsQ0F4ckVBO0FBc3NFQUYsTUFBQSxDQUFPL1EsU0FBUCxDQUFpQmlHLE9BQWpCLEdBQTJCLFVBQVUwTCxrQkFBVixFQUE2QjtBQUFBLElBRXRELElBQUluVSxhQUFBLEdBQWdCLElBQUlYLFlBQUosQ0FBaUI4VSxrQkFBQSxDQUFtQm5WLE1BQXBDLENBQXBCLENBRnNEO0FBQUEsSUFLdEQsSUFBSW9WLFlBQUEsR0FBZTFYLEdBQUEsQ0FBSTRDLFlBQUosQ0FBaUI2VSxrQkFBakIsQ0FBbkIsQ0FMc0Q7QUFBQSxJQU10RCxLQUFLUCxRQUFMLENBQWNuTCxPQUFkLENBQXVCMkwsWUFBQSxDQUFhMVgsR0FBQSxDQUFJQyxJQUFqQixDQUF2QixFQU5zRDtBQUFBLElBT3RELEtBQUtrWCxRQUFMLENBQWNwTCxPQUFkLENBQXVCMkwsWUFBQSxDQUFhMVgsR0FBQSxDQUFJRSxLQUFqQixDQUF2QixFQVBzRDtBQUFBLElBUXRELElBQUl5WCxlQUFBLEdBQWtCM1gsR0FBQSxDQUFJdUMsVUFBSixDQUFlbVYsWUFBQSxDQUFhMVgsR0FBQSxDQUFJQyxJQUFqQixDQUFmLEVBQXVDeVgsWUFBQSxDQUFhMVgsR0FBQSxDQUFJRSxLQUFqQixDQUF2QyxDQUF0QixDQVJzRDtBQUFBLElBVXRELElBQUlrQyxDQUFKLENBVnNEO0FBQUEsSUFhdEQsS0FBS0EsQ0FBQSxHQUFJLENBQVQsRUFBWUEsQ0FBQSxHQUFFLEtBQUs0VSxpQkFBbkIsRUFBc0M1VSxDQUFBLEVBQXRDLEVBQTJDO0FBQUEsUUFFekNrQixhQUFBLEdBQWdCdEQsR0FBQSxDQUFJaUQsZ0JBQUosQ0FBcUJLLGFBQXJCLEVBQW9DLEtBQUtnVSxXQUFMLENBQWlCbFYsQ0FBakIsRUFBb0IySixPQUFwQixDQUE0QjRMLGVBQTVCLENBQXBDLEVBQWtGLElBQUV2VixDQUFGLEtBQVEsQ0FBMUYsRUFBNkYsS0FBSzRVLGlCQUFsRyxDQUFoQixDQUZ5QztBQUFBLEtBYlc7QUFBQSxJQW1CdEQsSUFBSVksa0JBQUEsR0FBcUIsSUFBSWpWLFlBQUosQ0FBaUJXLGFBQUEsQ0FBY2hCLE1BQS9CLENBQXpCLENBbkJzRDtBQUFBLElBb0J0RCxLQUFLRixDQUFBLEdBQUksQ0FBVCxFQUFZQSxDQUFBLEdBQUUsS0FBSzZVLGtCQUFuQixFQUF1QzdVLENBQUEsRUFBdkMsRUFBNEM7QUFBQSxRQUUxQ3dWLGtCQUFBLEdBQXFCNVgsR0FBQSxDQUFJaUQsZ0JBQUosQ0FBcUIyVSxrQkFBckIsRUFBeUMsS0FBS1IsWUFBTCxDQUFrQmhWLENBQWxCLEVBQXFCMkosT0FBckIsQ0FBNkJ6SSxhQUE3QixDQUF6QyxFQUFzRixJQUFFbEIsQ0FBRixLQUFRLENBQTlGLEVBQWlHLENBQWpHLENBQXJCLENBRjBDO0FBQUEsS0FwQlU7QUFBQSxJQTBCdEQsS0FBS0EsQ0FBQSxHQUFJLENBQVQsRUFBWUEsQ0FBQSxHQUFFd1Ysa0JBQUEsQ0FBbUJ0VixNQUFqQyxFQUF5Q0YsQ0FBQSxFQUF6QyxFQUE4QztBQUFBLFFBQzVDd1Ysa0JBQUEsQ0FBbUJ4VixDQUFuQixLQUF5QixLQUFLMFUsU0FBOUIsQ0FENEM7QUFBQSxLQTFCUTtBQUFBLElBK0J0RHhULGFBQUEsR0FBZ0J0RCxHQUFBLENBQUlpRCxnQkFBSixDQUFxQjJVLGtCQUFyQixFQUF5Q0gsa0JBQXpDLEVBQTZELENBQTdELEVBQWdFLENBQWhFLENBQWhCLENBL0JzRDtBQUFBLElBa0N0RCxLQUFLclYsQ0FBQSxHQUFJLENBQVQsRUFBWUEsQ0FBQSxHQUFFa0IsYUFBQSxDQUFjaEIsTUFBNUIsRUFBb0NGLENBQUEsRUFBcEMsRUFBeUM7QUFBQSxRQUN2Q2tCLGFBQUEsQ0FBY2xCLENBQWQsS0FBb0IsS0FBSytULFlBQXpCLENBRHVDO0FBQUEsS0FsQ2E7QUFBQSxJQXNDdEQsT0FBTzdTLGFBQVAsQ0F0Q3NEO0FBQUEsQ0FBeEQsQ0F0c0VBO0FBOHVFQSxDQTl1RUE7QUFndkVBLElBQUl1VSxLQUFKLENBaHZFQTtBQWl2RUEsQ0FBQyxVQUFVQSxLQUFWLEVBQWlCO0FBQUEsSUFDZCxJQUFJQyxHQUFKLENBRGM7QUFBQSxJQUVkLENBQUMsVUFBVUEsR0FBVixFQUFlO0FBQUEsUUFDWixTQUFTQyxRQUFULENBQWtCek4sTUFBbEIsRUFBMEJnRyxLQUExQixFQUFpQzVMLFVBQWpDLEVBQTZDO0FBQUEsWUFDekMsSUFBSXNULEdBQUEsR0FBTSxJQUFJL1IsR0FBSixDQUFRcUssS0FBQSxDQUFNaE8sTUFBZCxFQUFzQm9DLFVBQXRCLENBQVYsQ0FEeUM7QUFBQSxZQUV6Q3NULEdBQUEsQ0FBSWpTLE9BQUosQ0FBWXVFLE1BQVosRUFGeUM7QUFBQSxZQUd6QyxJQUFJMk4sWUFBQSxHQUFlLElBQUl0VixZQUFKLENBQWlCcVYsR0FBQSxDQUFJcFQsUUFBckIsQ0FBbkIsQ0FIeUM7QUFBQSxZQUl6QyxJQUFJc1QsUUFBQSxHQUFXLElBQUl2VixZQUFKLENBQWlCcVYsR0FBQSxDQUFJblQsSUFBckIsQ0FBZixDQUp5QztBQUFBLFlBS3pDLElBQUlzVCxRQUFBLEdBQVcsSUFBSXhWLFlBQUosQ0FBaUJxVixHQUFBLENBQUlsVCxJQUFyQixDQUFmLENBTHlDO0FBQUEsWUFNekNrVCxHQUFBLENBQUlqUyxPQUFKLENBQVl1SyxLQUFaLEVBTnlDO0FBQUEsWUFPekMsSUFBSTFMLFFBQUEsR0FBVyxJQUFJakMsWUFBSixDQUFpQnFWLEdBQUEsQ0FBSXBULFFBQXJCLENBQWYsQ0FQeUM7QUFBQSxZQVF6QyxJQUFJQyxJQUFBLEdBQU8sSUFBSWxDLFlBQUosQ0FBaUJxVixHQUFBLENBQUluVCxJQUFyQixDQUFYLENBUnlDO0FBQUEsWUFTekMsSUFBSUMsSUFBQSxHQUFPLElBQUluQyxZQUFKLENBQWlCcVYsR0FBQSxDQUFJbFQsSUFBckIsQ0FBWCxDQVR5QztBQUFBLFlBVXpDLElBQUlzVCxVQUFBLEdBQWFuVyxLQUFBLENBQU02RCxTQUFOLENBQWdCdVMsR0FBaEIsQ0FBb0I1UyxJQUFwQixDQUF5QlosSUFBekIsRUFBK0IsVUFBVXlULENBQVYsRUFBYWxXLENBQWIsRUFBZ0I7QUFBQSxnQkFBRSxPQUFPOFYsUUFBQSxDQUFTOVYsQ0FBVCxJQUFjeUMsSUFBQSxDQUFLekMsQ0FBTCxDQUFkLEdBQXdCeUMsSUFBQSxDQUFLdkMsTUFBcEMsQ0FBRjtBQUFBLGFBQS9DLENBQWpCLENBVnlDO0FBQUEsWUFXekMsSUFBSWlXLFVBQUEsR0FBYXRXLEtBQUEsQ0FBTTZELFNBQU4sQ0FBZ0J1UyxHQUFoQixDQUFvQjVTLElBQXBCLENBQXlCWCxJQUF6QixFQUErQixVQUFVd1QsQ0FBVixFQUFhbFcsQ0FBYixFQUFnQjtBQUFBLGdCQUFFLE9BQU8sQ0FBQzhWLFFBQUEsQ0FBUzlWLENBQVQsQ0FBRCxHQUFlMEMsSUFBQSxDQUFLMUMsQ0FBTCxDQUFmLEdBQXlCMEMsSUFBQSxDQUFLeEMsTUFBckMsQ0FBRjtBQUFBLGFBQS9DLENBQWpCLENBWHlDO0FBQUEsWUFZekMsSUFBSWtXLFFBQUEsR0FBV1IsR0FBQSxDQUFJNVEsT0FBSixDQUFZZ1IsVUFBWixFQUF3QkcsVUFBeEIsQ0FBZixDQVp5QztBQUFBLFlBYXpDLE9BQU9DLFFBQVAsQ0FieUM7QUFBQSxTQURqQztBQUFBLFFBZ0JaVixHQUFBLENBQUlDLFFBQUosR0FBZUEsUUFBZixDQWhCWTtBQUFBLFFBaUJaLFNBQVNVLE9BQVQsQ0FBaUJDLENBQWpCLEVBQW9CM0ksQ0FBcEIsRUFBdUI0SSxDQUF2QixFQUEwQjtBQUFBLFlBQ3RCLElBQUlBLENBQUEsR0FBSSxDQUFSLEVBQVc7QUFBQSxnQkFDUEEsQ0FBQSxJQUFLLENBQUwsQ0FETztBQUFBLGFBRFc7QUFBQSxZQUl0QixJQUFJQSxDQUFBLEdBQUksQ0FBUixFQUFXO0FBQUEsZ0JBQ1BBLENBQUEsSUFBSyxDQUFMLENBRE87QUFBQSxhQUpXO0FBQUEsWUFPdEIsSUFBSUEsQ0FBQSxHQUFJLElBQUksQ0FBWixFQUFlO0FBQUEsZ0JBQ1gsT0FBT0QsQ0FBQSxHQUFLLENBQUEzSSxDQUFBLEdBQUkySSxDQUFKLENBQUQsR0FBVSxDQUFWLEdBQWNDLENBQXpCLENBRFc7QUFBQSxhQVBPO0FBQUEsWUFVdEIsSUFBSUEsQ0FBQSxHQUFJLElBQUksQ0FBWixFQUFlO0FBQUEsZ0JBQ1gsT0FBTzVJLENBQVAsQ0FEVztBQUFBLGFBVk87QUFBQSxZQWF0QixJQUFJNEksQ0FBQSxHQUFJLElBQUksQ0FBWixFQUFlO0FBQUEsZ0JBQ1gsT0FBT0QsQ0FBQSxHQUFLLENBQUEzSSxDQUFBLEdBQUkySSxDQUFKLENBQUQsR0FBVyxLQUFJLENBQUosR0FBUUMsQ0FBUixDQUFYLEdBQXdCLENBQW5DLENBRFc7QUFBQSxhQWJPO0FBQUEsWUFnQnRCLE9BQU9ELENBQVAsQ0FoQnNCO0FBQUEsU0FqQmQ7QUFBQSxRQW1DWlosR0FBQSxDQUFJVyxPQUFKLEdBQWNBLE9BQWQsQ0FuQ1k7QUFBQSxRQW9DWixTQUFTRyxRQUFULENBQWtCOVEsQ0FBbEIsRUFBcUI4TCxDQUFyQixFQUF3QmlGLENBQXhCLEVBQTJCO0FBQUEsWUFFdkIsSUFBSTNGLENBQUosRUFBT2EsQ0FBUCxFQUFVMkUsQ0FBVixFQUFhM0ksQ0FBYixFQUFnQmxJLENBQWhCLENBRnVCO0FBQUEsWUFHdkJDLENBQUEsSUFBSyxJQUFJLENBQVQsQ0FIdUI7QUFBQSxZQUl2QixJQUFJQSxDQUFBLEdBQUksQ0FBUixFQUFXO0FBQUEsZ0JBQ1BBLENBQUEsR0FBSSxDQUFKLENBRE87QUFBQSxhQUpZO0FBQUEsWUFPdkIsSUFBSSxJQUFJLENBQUosR0FBUUEsQ0FBWixFQUFlO0FBQUEsZ0JBQ1hBLENBQUEsR0FBSSxJQUFJLENBQVIsQ0FEVztBQUFBLGFBUFE7QUFBQSxZQVV2QixJQUFJOEwsQ0FBQSxLQUFNLENBQVYsRUFBYTtBQUFBLGdCQUNUL0wsQ0FBQSxHQUFJa00sQ0FBQSxHQUFJYixDQUFBLEdBQUkyRixDQUFaLENBRFM7QUFBQSxhQUFiLE1BR0s7QUFBQSxnQkFDRDlJLENBQUEsR0FBSThJLENBQUEsR0FBSSxHQUFKLEdBQVVBLENBQUEsR0FBSyxLQUFJakYsQ0FBSixDQUFmLEdBQXdCaUYsQ0FBQSxHQUFJakYsQ0FBSixHQUFRaUYsQ0FBQSxHQUFJakYsQ0FBeEMsQ0FEQztBQUFBLGdCQUVEOEUsQ0FBQSxHQUFJLElBQUlHLENBQUosR0FBUTlJLENBQVosQ0FGQztBQUFBLGdCQUdEbEksQ0FBQSxHQUFJNFEsT0FBQSxDQUFRQyxDQUFSLEVBQVczSSxDQUFYLEVBQWNqSSxDQUFBLEdBQUksSUFBSSxDQUF0QixDQUFKLENBSEM7QUFBQSxnQkFJRGlNLENBQUEsR0FBSTBFLE9BQUEsQ0FBUUMsQ0FBUixFQUFXM0ksQ0FBWCxFQUFjakksQ0FBZCxDQUFKLENBSkM7QUFBQSxnQkFLRG9MLENBQUEsR0FBSXVGLE9BQUEsQ0FBUUMsQ0FBUixFQUFXM0ksQ0FBWCxFQUFjakksQ0FBQSxHQUFJLElBQUksQ0FBdEIsQ0FBSixDQUxDO0FBQUEsYUFia0I7QUFBQSxZQW9CdkIsT0FBTztBQUFBLGdCQUFDRCxDQUFBLEdBQUksR0FBTDtBQUFBLGdCQUFVa00sQ0FBQSxHQUFJLEdBQWQ7QUFBQSxnQkFBbUJiLENBQUEsR0FBSSxHQUF2QjtBQUFBLGFBQVAsQ0FwQnVCO0FBQUEsU0FwQ2Y7QUFBQSxRQTBEWjRFLEdBQUEsQ0FBSWMsUUFBSixHQUFlQSxRQUFmLENBMURZO0FBQUEsUUEyRFosU0FBU0UsV0FBVCxDQUFxQjdULEtBQXJCLEVBQTRCUCxVQUE1QixFQUF3Q3FVLE9BQXhDLEVBQWlEO0FBQUEsWUFDN0MsT0FBUTlULEtBQUEsR0FBUVAsVUFBVCxHQUF1QnFVLE9BQTlCLENBRDZDO0FBQUEsU0EzRHJDO0FBQUEsUUE4RFpqQixHQUFBLENBQUlnQixXQUFKLEdBQWtCQSxXQUFsQixDQTlEWTtBQUFBLFFBK0RaLFNBQVNFLFdBQVQsQ0FBcUI3SSxJQUFyQixFQUEyQnpMLFVBQTNCLEVBQXVDcVUsT0FBdkMsRUFBZ0Q7QUFBQSxZQUM1QyxPQUFRNUksSUFBQSxHQUFPNEksT0FBUixHQUFtQnJVLFVBQW5CLEdBQWdDLENBQXZDLENBRDRDO0FBQUEsU0EvRHBDO0FBQUEsUUFrRVpvVCxHQUFBLENBQUlrQixXQUFKLEdBQWtCQSxXQUFsQixDQWxFWTtBQUFBLFFBbUVaLFNBQVNDLFdBQVQsQ0FBcUJ2VSxVQUFyQixFQUFpQ3dVLElBQWpDLEVBQXVDO0FBQUEsWUFDbkMsT0FBT3hVLFVBQUEsR0FBYXdVLElBQWIsR0FBb0IsQ0FBM0IsQ0FEbUM7QUFBQSxTQW5FM0I7QUFBQSxRQXNFWnBCLEdBQUEsQ0FBSW1CLFdBQUosR0FBa0JBLFdBQWxCLENBdEVZO0FBQUEsUUF1RVosU0FBU0UsV0FBVCxDQUFxQnpVLFVBQXJCLEVBQWlDMFUsWUFBakMsRUFBK0M7QUFBQSxZQUMzQyxPQUFPQSxZQUFBLEdBQWUxVSxVQUF0QixDQUQyQztBQUFBLFNBdkVuQztBQUFBLFFBMEVab1QsR0FBQSxDQUFJcUIsV0FBSixHQUFrQkEsV0FBbEIsQ0ExRVk7QUFBQSxRQTJFWixTQUFTRSxTQUFULENBQW1CQyxHQUFuQixFQUF3QjtBQUFBLFlBQ3BCLElBQUkxUCxDQUFKLEVBQU92SCxHQUFQLEVBQVlrWCxHQUFaLEVBQWlCQyxDQUFqQixDQURvQjtBQUFBLFlBRXBCRCxHQUFBLEdBQU0sQ0FBTixDQUZvQjtBQUFBLFlBR3BCLEtBQUszUCxDQUFBLEdBQUksQ0FBSixFQUFPdkgsR0FBQSxHQUFNaVgsR0FBQSxDQUFJaFgsTUFBdEIsRUFBOEJzSCxDQUFBLEdBQUl2SCxHQUFsQyxFQUF1Q3VILENBQUEsRUFBdkMsRUFBNEM7QUFBQSxnQkFDeEM0UCxDQUFBLEdBQUlGLEdBQUEsQ0FBSTFQLENBQUosQ0FBSixDQUR3QztBQUFBLGdCQUV4QzJQLEdBQUEsSUFBT0MsQ0FBUCxDQUZ3QztBQUFBLGFBSHhCO0FBQUEsWUFPcEIsT0FBT0QsR0FBUCxDQVBvQjtBQUFBLFNBM0VaO0FBQUEsUUFvRlp6QixHQUFBLENBQUl1QixTQUFKLEdBQWdCQSxTQUFoQixDQXBGWTtBQUFBLFFBcUZaLFNBQVNJLE9BQVQsQ0FBaUJILEdBQWpCLEVBQXNCO0FBQUEsWUFDbEIsT0FBT0QsU0FBQSxDQUFVQyxHQUFWLElBQWlCQSxHQUFBLENBQUloWCxNQUE1QixDQURrQjtBQUFBLFNBckZWO0FBQUEsUUF3Rlp3VixHQUFBLENBQUkyQixPQUFKLEdBQWNBLE9BQWQsQ0F4Rlk7QUFBQSxRQXlGWixTQUFTQyxRQUFULENBQWtCSixHQUFsQixFQUF1QjtBQUFBLFlBQ25CLElBQUlLLEdBQUosRUFBUy9QLENBQVQsRUFBWXZILEdBQVosRUFBaUJrWCxHQUFqQixFQUFzQkMsQ0FBdEIsQ0FEbUI7QUFBQSxZQUVuQkcsR0FBQSxHQUFNRixPQUFBLENBQVFILEdBQVIsQ0FBTixDQUZtQjtBQUFBLFlBR25CQyxHQUFBLEdBQU0sQ0FBTixDQUhtQjtBQUFBLFlBSW5CLEtBQUszUCxDQUFBLEdBQUksQ0FBSixFQUFPdkgsR0FBQSxHQUFNaVgsR0FBQSxDQUFJaFgsTUFBdEIsRUFBOEJzSCxDQUFBLEdBQUl2SCxHQUFsQyxFQUF1Q3VILENBQUEsRUFBdkMsRUFBNEM7QUFBQSxnQkFDeEM0UCxDQUFBLEdBQUlGLEdBQUEsQ0FBSTFQLENBQUosQ0FBSixDQUR3QztBQUFBLGdCQUV4QzJQLEdBQUEsSUFBTzVYLElBQUEsQ0FBSzhFLEdBQUwsQ0FBUytTLENBQUEsR0FBSUcsR0FBYixFQUFrQixDQUFsQixDQUFQLENBRndDO0FBQUEsYUFKekI7QUFBQSxZQVFuQixPQUFPSixHQUFBLEdBQU8sQ0FBQUQsR0FBQSxDQUFJaFgsTUFBSixHQUFhLENBQWIsQ0FBZCxDQVJtQjtBQUFBLFNBekZYO0FBQUEsUUFtR1p3VixHQUFBLENBQUk0QixRQUFKLEdBQWVBLFFBQWYsQ0FuR1k7QUFBQSxRQW9HWixTQUFTRSxLQUFULENBQWVOLEdBQWYsRUFBb0I7QUFBQSxZQUNoQixPQUFPM1gsSUFBQSxDQUFLeUMsSUFBTCxDQUFVc1YsUUFBQSxDQUFTSixHQUFULENBQVYsQ0FBUCxDQURnQjtBQUFBLFNBcEdSO0FBQUEsUUF1R1p4QixHQUFBLENBQUk4QixLQUFKLEdBQVlBLEtBQVosQ0F2R1k7QUFBQSxRQXdHWixTQUFTQyxVQUFULENBQW9CUCxHQUFwQixFQUF5QjtBQUFBLFlBQ3JCLElBQUlsWCxDQUFKLENBRHFCO0FBQUEsWUFFckIsT0FBTyxDQUFDLENBQUQsRUFBSTBYLE1BQUosQ0FBWSxZQUFZO0FBQUEsZ0JBQzNCLElBQUlsUSxDQUFKLEVBQU9tUSxHQUFQLEVBQVlDLE9BQVosQ0FEMkI7QUFBQSxnQkFFM0JBLE9BQUEsR0FBVSxFQUFWLENBRjJCO0FBQUEsZ0JBRzNCLEtBQUs1WCxDQUFBLEdBQUl3SCxDQUFBLEdBQUksQ0FBUixFQUFXbVEsR0FBQSxHQUFNVCxHQUFBLENBQUloWCxNQUFKLEdBQWEsQ0FBbkMsRUFBc0MsS0FBS3lYLEdBQUwsR0FBV25RLENBQUEsSUFBS21RLEdBQWhCLEdBQXNCblEsQ0FBQSxJQUFLbVEsR0FBakUsRUFBc0UzWCxDQUFBLEdBQUksS0FBSzJYLEdBQUwsR0FBVyxFQUFFblEsQ0FBYixHQUFpQixFQUFFQSxDQUE3RixFQUFnRztBQUFBLG9CQUM1Rm9RLE9BQUEsQ0FBUXpPLElBQVIsQ0FBYStOLEdBQUEsQ0FBSWxYLENBQUosSUFBU2tYLEdBQUEsQ0FBSWxYLENBQUEsR0FBSSxDQUFSLENBQXRCLEVBRDRGO0FBQUEsaUJBSHJFO0FBQUEsZ0JBTTNCLE9BQU80WCxPQUFQLENBTjJCO0FBQUEsYUFBYixFQUFYLENBQVAsQ0FGcUI7QUFBQSxTQXhHYjtBQUFBLFFBbUhabEMsR0FBQSxDQUFJK0IsVUFBSixHQUFpQkEsVUFBakIsQ0FuSFk7QUFBQSxRQW9IWixTQUFTSSxNQUFULENBQWdCWCxHQUFoQixFQUFxQjtBQUFBLFlBQ2pCLE9BQU9yWCxLQUFBLENBQU02RCxTQUFOLENBQWdCb1UsS0FBaEIsQ0FBc0J6VSxJQUF0QixDQUEyQjZULEdBQTNCLEVBQWdDLENBQWhDLEVBQW1DYSxJQUFuQyxHQUEwQ2IsR0FBQSxDQUFJaFgsTUFBSixHQUFhLENBQWIsR0FBaUIsQ0FBM0QsQ0FBUCxDQURpQjtBQUFBLFNBcEhUO0FBQUEsUUF1SFp3VixHQUFBLENBQUltQyxNQUFKLEdBQWFBLE1BQWIsQ0F2SFk7QUFBQSxRQXdIWixTQUFTRyxHQUFULENBQWFkLEdBQWIsRUFBa0J4UixDQUFsQixFQUFxQjtBQUFBLFlBQ2pCLElBQUlvSSxDQUFKLEVBQU90RyxDQUFQLEVBQVV5USxNQUFWLEVBQWtCaFksR0FBbEIsRUFBdUIyWCxPQUF2QixFQUFnQ2hTLENBQWhDLENBRGlCO0FBQUEsWUFFakIsSUFBSUYsQ0FBQSxJQUFLLElBQVQsRUFBZTtBQUFBLGdCQUNYQSxDQUFBLEdBQUksT0FBTzhSLEtBQUEsQ0FBTU4sR0FBTixDQUFQLEdBQW9CM1gsSUFBQSxDQUFLOEUsR0FBTCxDQUFTNlMsR0FBQSxDQUFJaFgsTUFBYixFQUFxQixDQUFDLENBQUQsR0FBSyxDQUExQixDQUFwQixHQUFtRCxLQUF2RCxDQURXO0FBQUEsYUFGRTtBQUFBLFlBS2pCK1gsTUFBQSxHQUFTLFVBQVVyUyxDQUFWLEVBQWE7QUFBQSxnQkFDbEIsT0FBT3JHLElBQUEsQ0FBSzhFLEdBQUwsQ0FBUzlFLElBQUEsQ0FBSzRQLENBQWQsRUFBaUIsQ0FBQzVQLElBQUEsQ0FBSzhFLEdBQUwsQ0FBU3VCLENBQVQsRUFBWSxDQUFaLENBQUQsR0FBa0IsQ0FBbkMsSUFBd0NyRyxJQUFBLENBQUt5QyxJQUFMLENBQVUsSUFBSXpDLElBQUEsQ0FBS0MsRUFBbkIsQ0FBL0MsQ0FEa0I7QUFBQSxhQUF0QixDQUxpQjtBQUFBLFlBUWpCc08sQ0FBQSxHQUFJLFVBQVVsSSxDQUFWLEVBQWE7QUFBQSxnQkFDYixJQUFJNUYsQ0FBSixFQUFPd0gsQ0FBUCxFQUFVdkgsR0FBVixFQUFldVIsQ0FBZixFQUFrQjRGLENBQWxCLENBRGE7QUFBQSxnQkFFYjVGLENBQUEsR0FBSSxDQUFKLENBRmE7QUFBQSxnQkFHYixLQUFLeFIsQ0FBQSxHQUFJd0gsQ0FBQSxHQUFJLENBQVIsRUFBV3ZILEdBQUEsR0FBTWlYLEdBQUEsQ0FBSWhYLE1BQTFCLEVBQWtDc0gsQ0FBQSxHQUFJdkgsR0FBdEMsRUFBMkNELENBQUEsR0FBSSxFQUFFd0gsQ0FBakQsRUFBb0Q7QUFBQSxvQkFDaEQ0UCxDQUFBLEdBQUlGLEdBQUEsQ0FBSWxYLENBQUosQ0FBSixDQURnRDtBQUFBLG9CQUVoRHdSLENBQUEsSUFBS3lHLE1BQUEsQ0FBUSxDQUFBclMsQ0FBQSxHQUFJd1IsQ0FBSixDQUFELEdBQVUxUixDQUFqQixDQUFMLENBRmdEO0FBQUEsaUJBSHZDO0FBQUEsZ0JBT2IsT0FBTzhMLENBQUEsR0FBSyxDQUFBOUwsQ0FBQSxHQUFJd1IsR0FBQSxDQUFJaFgsTUFBUixDQUFaLENBUGE7QUFBQSxhQUFqQixDQVJpQjtBQUFBLFlBaUJqQjBYLE9BQUEsR0FBVSxFQUFWLENBakJpQjtBQUFBLFlBa0JqQixLQUFLcFEsQ0FBQSxHQUFJLENBQUosRUFBT3ZILEdBQUEsR0FBTWlYLEdBQUEsQ0FBSWhYLE1BQXRCLEVBQThCc0gsQ0FBQSxHQUFJdkgsR0FBbEMsRUFBdUN1SCxDQUFBLEVBQXZDLEVBQTRDO0FBQUEsZ0JBQ3hDNUIsQ0FBQSxHQUFJc1IsR0FBQSxDQUFJMVAsQ0FBSixDQUFKLENBRHdDO0FBQUEsZ0JBRXhDb1EsT0FBQSxDQUFRek8sSUFBUixDQUFhMkUsQ0FBQSxDQUFFbEksQ0FBRixDQUFiLEVBRndDO0FBQUEsYUFsQjNCO0FBQUEsWUFzQmpCLE9BQU9nUyxPQUFQLENBdEJpQjtBQUFBLFNBeEhUO0FBQUEsUUFnSlpsQyxHQUFBLENBQUlzQyxHQUFKLEdBQVVBLEdBQVYsQ0FoSlk7QUFBQSxRQWlKWixTQUFTRSxJQUFULENBQWNoQixHQUFkLEVBQW1CO0FBQUEsWUFDZixPQUFPQSxHQUFBLENBQUlpQixPQUFBLENBQVFILEdBQUEsQ0FBSWQsR0FBSixFQUFTLENBQVQsQ0FBUixFQUFxQixDQUFyQixDQUFKLENBQVAsQ0FEZTtBQUFBLFNBakpQO0FBQUEsUUFvSlp4QixHQUFBLENBQUl3QyxJQUFKLEdBQVdBLElBQVgsQ0FwSlk7QUFBQSxRQXFKWixTQUFTRSxRQUFULENBQWtCeFMsQ0FBbEIsRUFBcUI7QUFBQSxZQUNqQixPQUFPLElBQUlyRyxJQUFBLENBQUt5QyxJQUFMLENBQVUsSUFBSXpDLElBQUEsQ0FBS0MsRUFBbkIsQ0FBSixHQUE2QkQsSUFBQSxDQUFLZ1EsR0FBTCxDQUFTLENBQUNoUSxJQUFBLENBQUs4RSxHQUFMLENBQVN1QixDQUFULEVBQVksQ0FBWixDQUFELEdBQWtCLENBQTNCLENBQXBDLENBRGlCO0FBQUEsU0FySlQ7QUFBQSxRQXdKWjhQLEdBQUEsQ0FBSTBDLFFBQUosR0FBZUEsUUFBZixDQXhKWTtBQUFBLFFBeUpaLFNBQVNELE9BQVQsQ0FBaUJqQixHQUFqQixFQUFzQmxKLEdBQXRCLEVBQTJCb0QsR0FBM0IsRUFBZ0M7QUFBQSxZQUM1QixJQUFJcFIsQ0FBSixFQUFPNkMsS0FBUCxFQUFjMkUsQ0FBZCxFQUFpQm1RLEdBQWpCLEVBQXNCVSxJQUF0QixFQUE0QmhHLE1BQTVCLENBRDRCO0FBQUEsWUFFNUIsSUFBSXJFLEdBQUEsSUFBTyxJQUFYLEVBQWlCO0FBQUEsZ0JBQ2JBLEdBQUEsR0FBTSxDQUFOLENBRGE7QUFBQSxhQUZXO0FBQUEsWUFLNUIsSUFBSW9ELEdBQUEsSUFBTyxJQUFYLEVBQWlCO0FBQUEsZ0JBQ2JBLEdBQUEsR0FBTThGLEdBQUEsQ0FBSWhYLE1BQUosR0FBYSxDQUFuQixDQURhO0FBQUEsYUFMVztBQUFBLFlBUTVCbVMsTUFBQSxHQUFTLENBQUNpRyxRQUFWLENBUjRCO0FBQUEsWUFTNUJ6VixLQUFBLEdBQVEsQ0FBQyxDQUFULENBVDRCO0FBQUEsWUFVNUIsS0FBSzdDLENBQUEsR0FBSXdILENBQUEsR0FBSW1RLEdBQUEsR0FBTTNKLEdBQWQsRUFBbUJxSyxJQUFBLEdBQU9qSCxHQUEvQixFQUFvQ3VHLEdBQUEsSUFBT1UsSUFBUCxHQUFjN1EsQ0FBQSxJQUFLNlEsSUFBbkIsR0FBMEI3USxDQUFBLElBQUs2USxJQUFuRSxFQUF5RXJZLENBQUEsR0FBSTJYLEdBQUEsSUFBT1UsSUFBUCxHQUFjLEVBQUU3USxDQUFoQixHQUFvQixFQUFFQSxDQUFuRyxFQUFzRztBQUFBLGdCQUNsRyxJQUFJLENBQUUsQ0FBQTBQLEdBQUEsQ0FBSWxYLENBQUosSUFBU3FTLE1BQVQsQ0FBTixFQUF3QjtBQUFBLG9CQUNwQixTQURvQjtBQUFBLGlCQUQwRTtBQUFBLGdCQUlsR0EsTUFBQSxHQUFTNkUsR0FBQSxDQUFJbFgsQ0FBSixDQUFULENBSmtHO0FBQUEsZ0JBS2xHNkMsS0FBQSxHQUFRN0MsQ0FBUixDQUxrRztBQUFBLGFBVjFFO0FBQUEsWUFpQjVCLE9BQU87QUFBQSxnQkFBQ3FTLE1BQUQ7QUFBQSxnQkFBU3hQLEtBQVQ7QUFBQSxhQUFQLENBakI0QjtBQUFBLFNBekpwQjtBQUFBLFFBNEtaNlMsR0FBQSxDQUFJeUMsT0FBSixHQUFjQSxPQUFkLENBNUtZO0FBQUEsUUE2S1osU0FBU0ksT0FBVCxDQUFpQnJCLEdBQWpCLEVBQXNCbEosR0FBdEIsRUFBMkJvRCxHQUEzQixFQUFnQztBQUFBLFlBQzVCLElBQUlwUixDQUFKLEVBQU82QyxLQUFQLEVBQWMyRSxDQUFkLEVBQWlCbVEsR0FBakIsRUFBc0JVLElBQXRCLEVBQTRCaEcsTUFBNUIsQ0FENEI7QUFBQSxZQUU1QixJQUFJckUsR0FBQSxJQUFPLElBQVgsRUFBaUI7QUFBQSxnQkFDYkEsR0FBQSxHQUFNLENBQU4sQ0FEYTtBQUFBLGFBRlc7QUFBQSxZQUs1QixJQUFJb0QsR0FBQSxJQUFPLElBQVgsRUFBaUI7QUFBQSxnQkFDYkEsR0FBQSxHQUFNOEYsR0FBQSxDQUFJaFgsTUFBSixHQUFhLENBQW5CLENBRGE7QUFBQSxhQUxXO0FBQUEsWUFRNUJtUyxNQUFBLEdBQVNpRyxRQUFULENBUjRCO0FBQUEsWUFTNUJ6VixLQUFBLEdBQVEsQ0FBQyxDQUFULENBVDRCO0FBQUEsWUFVNUIsS0FBSzdDLENBQUEsR0FBSXdILENBQUEsR0FBSW1RLEdBQUEsR0FBTTNKLEdBQWQsRUFBbUJxSyxJQUFBLEdBQU9qSCxHQUEvQixFQUFvQ3VHLEdBQUEsSUFBT1UsSUFBUCxHQUFjN1EsQ0FBQSxJQUFLNlEsSUFBbkIsR0FBMEI3USxDQUFBLElBQUs2USxJQUFuRSxFQUF5RXJZLENBQUEsR0FBSTJYLEdBQUEsSUFBT1UsSUFBUCxHQUFjLEVBQUU3USxDQUFoQixHQUFvQixFQUFFQSxDQUFuRyxFQUFzRztBQUFBLGdCQUNsRyxJQUFJLENBQUUsQ0FBQTBQLEdBQUEsQ0FBSWxYLENBQUosSUFBU3FTLE1BQVQsQ0FBTixFQUF3QjtBQUFBLG9CQUNwQixTQURvQjtBQUFBLGlCQUQwRTtBQUFBLGdCQUlsR0EsTUFBQSxHQUFTNkUsR0FBQSxDQUFJbFgsQ0FBSixDQUFULENBSmtHO0FBQUEsZ0JBS2xHNkMsS0FBQSxHQUFRN0MsQ0FBUixDQUxrRztBQUFBLGFBVjFFO0FBQUEsWUFpQjVCLE9BQU87QUFBQSxnQkFBQ3FTLE1BQUQ7QUFBQSxnQkFBU3hQLEtBQVQ7QUFBQSxhQUFQLENBakI0QjtBQUFBLFNBN0twQjtBQUFBLFFBZ01aNlMsR0FBQSxDQUFJNkMsT0FBSixHQUFjQSxPQUFkLENBaE1ZO0FBQUEsS0FBaEIsQ0FpTUc3QyxHQUFBLEdBQU1ELEtBQUEsQ0FBTUMsR0FBTixJQUFjLENBQUFELEtBQUEsQ0FBTUMsR0FBTixHQUFZLEVBQVosQ0FqTXZCLEdBRmM7QUFBQSxDQUFsQixDQW9NR0QsS0FBQSxJQUFVLENBQUFBLEtBQUEsR0FBUSxFQUFSLENBcE1iLEdBanZFQTtBQXk3RUErQyxLQUFBLENBQU1DLE1BQU4sQ0FBYSxXQUFiLEVBejdFQTtBQTA3RUFELEtBQUEsQ0FBTUUsSUFBTixDQUFXLFVBQVgsRUFBdUIsVUFBVUMsTUFBVixFQUFrQjtBQUFBLElBQ3JDLElBQUlDLElBQUEsR0FBT25ELEtBQUEsQ0FBTUMsR0FBTixDQUFVQyxRQUFWLENBQW1CO0FBQUEsUUFBQyxDQUFEO0FBQUEsUUFBSSxDQUFKO0FBQUEsUUFBTyxDQUFQO0FBQUEsUUFBVSxDQUFWO0FBQUEsS0FBbkIsRUFBaUM7QUFBQSxRQUFDLENBQUQ7QUFBQSxRQUFJLENBQUo7QUFBQSxRQUFPLENBQVA7QUFBQSxRQUFVLENBQVY7QUFBQSxLQUFqQyxDQUFYLENBRHFDO0FBQUEsSUFFckMsT0FBT2dELE1BQUEsQ0FBT0UsRUFBUCxDQUFVRixNQUFBLENBQUFHLEtBQUEsQ0FBQUgsTUFBQSxDQUFBSSxLQUFBLENBQUFKLE1BQUEsQ0FBQUksS0FBQSxDQUFBSixNQUFBLENBQUFJLEtBQUEsQ0FBQUgsSUFBQSw2QkFBSyxDQUFMLDBCQUFXLElBQVg7QUFBQSxRQUFBSSxPQUFBO0FBQUEsUUFBQUMsUUFBQTtBQUFBLFFBQUFDLElBQUE7QUFBQSxNQUFWLENBQVAsQ0FGcUM7QUFBQSxDQUF6QyIsImZpbGUiOiJ0ZXN0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogIERTUC5qcyAtIGEgY29tcHJlaGVuc2l2ZSBkaWdpdGFsIHNpZ25hbCBwcm9jZXNzaW5nICBsaWJyYXJ5IGZvciBqYXZhc2NyaXB0XG4gKlxuICogIENyZWF0ZWQgYnkgQ29yYmFuIEJyb29rIDxjb3JiYW5icm9va0BnbWFpbC5jb20+IG9uIDIwMTAtMDEtMDEuXG4gKiAgQ29weXJpZ2h0IDIwMTAgQ29yYmFuIEJyb29rLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqL1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQ09OU1RBTlRTICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbi8qKlxuICogRFNQIGlzIGFuIG9iamVjdCB3aGljaCBjb250YWlucyBnZW5lcmFsIHB1cnBvc2UgdXRpbGl0eSBmdW5jdGlvbnMgYW5kIGNvbnN0YW50c1xuICovXG52YXIgRFNQID0ge1xuICAvLyBDaGFubmVsc1xuICBMRUZUOiAgICAgICAgICAgMCxcbiAgUklHSFQ6ICAgICAgICAgIDEsXG4gIE1JWDogICAgICAgICAgICAyLFxuXG4gIC8vIFdhdmVmb3Jtc1xuICBTSU5FOiAgICAgICAgICAgMSxcbiAgVFJJQU5HTEU6ICAgICAgIDIsXG4gIFNBVzogICAgICAgICAgICAzLFxuICBTUVVBUkU6ICAgICAgICAgNCxcblxuICAvLyBGaWx0ZXJzXG4gIExPV1BBU1M6ICAgICAgICAwLFxuICBISUdIUEFTUzogICAgICAgMSxcbiAgQkFORFBBU1M6ICAgICAgIDIsXG4gIE5PVENIOiAgICAgICAgICAzLFxuXG4gIC8vIFdpbmRvdyBmdW5jdGlvbnNcbiAgQkFSVExFVFQ6ICAgICAgIDEsXG4gIEJBUlRMRVRUSEFOTjogICAyLFxuICBCTEFDS01BTjogICAgICAgMyxcbiAgQ09TSU5FOiAgICAgICAgIDQsXG4gIEdBVVNTOiAgICAgICAgICA1LFxuICBIQU1NSU5HOiAgICAgICAgNixcbiAgSEFOTjogICAgICAgICAgIDcsXG4gIExBTkNaT1M6ICAgICAgICA4LFxuICBSRUNUQU5HVUxBUjogICAgOSxcbiAgVFJJQU5HVUxBUjogICAgIDEwLFxuXG4gIC8vIExvb3AgbW9kZXNcbiAgT0ZGOiAgICAgICAgICAgIDAsXG4gIEZXOiAgICAgICAgICAgICAxLFxuICBCVzogICAgICAgICAgICAgMixcbiAgRldCVzogICAgICAgICAgIDMsXG5cbiAgLy8gTWF0aFxuICBUV09fUEk6ICAgICAgICAgMipNYXRoLlBJXG59O1xuXG4vLyBTZXR1cCBhcnJheXMgZm9yIHBsYXRmb3JtcyB3aGljaCBkbyBub3Qgc3VwcG9ydCBieXRlIGFycmF5c1xuZnVuY3Rpb24gc2V0dXBUeXBlZEFycmF5KG5hbWUsIGZhbGxiYWNrKSB7XG4gIC8vIGNoZWNrIGlmIFR5cGVkQXJyYXkgZXhpc3RzXG4gIC8vIHR5cGVvZiBvbiBNaW5lZmllbGQgYW5kIENocm9tZSByZXR1cm4gZnVuY3Rpb24sIHR5cGVvZiBvbiBXZWJraXQgcmV0dXJucyBvYmplY3QuXG4gIGlmICh0eXBlb2YgdGhpc1tuYW1lXSAhPT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiB0aGlzW25hbWVdICE9PSBcIm9iamVjdFwiKSB7XG4gICAgLy8gbm9wZS4uIGNoZWNrIGlmIFdlYkdMQXJyYXkgZXhpc3RzXG4gICAgaWYgKHR5cGVvZiB0aGlzW2ZhbGxiYWNrXSA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiB0aGlzW2ZhbGxiYWNrXSAhPT0gXCJvYmplY3RcIikge1xuICAgICAgdGhpc1tuYW1lXSA9IHRoaXNbZmFsbGJhY2tdO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBub3BlLi4gc2V0IGFzIE5hdGl2ZSBKUyBhcnJheVxuICAgICAgdGhpc1tuYW1lXSA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICBpZiAob2JqIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBvYmogPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEFycmF5KG9iaik7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICB9XG59XG5cbnNldHVwVHlwZWRBcnJheShcIkZsb2F0MzJBcnJheVwiLCBcIldlYkdMRmxvYXRBcnJheVwiKTtcbnNldHVwVHlwZWRBcnJheShcIkludDMyQXJyYXlcIiwgICBcIldlYkdMSW50QXJyYXlcIik7XG5zZXR1cFR5cGVkQXJyYXkoXCJVaW50MTZBcnJheVwiLCAgXCJXZWJHTFVuc2lnbmVkU2hvcnRBcnJheVwiKTtcbnNldHVwVHlwZWRBcnJheShcIlVpbnQ4QXJyYXlcIiwgICBcIldlYkdMVW5zaWduZWRCeXRlQXJyYXlcIik7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgIERTUCBVVElMSVRZIEZVTkNUSU9OUyAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG4vKipcbiAqIEludmVydHMgdGhlIHBoYXNlIG9mIGEgc2lnbmFsXG4gKlxuICogQHBhcmFtIHtBcnJheX0gYnVmZmVyIEEgc2FtcGxlIGJ1ZmZlclxuICpcbiAqIEByZXR1cm5zIFRoZSBpbnZlcnRlZCBzYW1wbGUgYnVmZmVyXG4gKi9cbkRTUC5pbnZlcnQgPSBmdW5jdGlvbihidWZmZXIpIHtcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGJ1ZmZlci5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGJ1ZmZlcltpXSAqPSAtMTtcbiAgfVxuXG4gIHJldHVybiBidWZmZXI7XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIHNwbGl0LXN0ZXJlbyAoZHVhbCBtb25vKSBzYW1wbGUgYnVmZmVycyBpbnRvIGEgc3RlcmVvIGludGVybGVhdmVkIHNhbXBsZSBidWZmZXJcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBsZWZ0ICBBIHNhbXBsZSBidWZmZXJcbiAqIEBwYXJhbSB7QXJyYXl9IHJpZ2h0IEEgc2FtcGxlIGJ1ZmZlclxuICpcbiAqIEByZXR1cm5zIFRoZSBzdGVyZW8gaW50ZXJsZWF2ZWQgYnVmZmVyXG4gKi9cbkRTUC5pbnRlcmxlYXZlID0gZnVuY3Rpb24obGVmdCwgcmlnaHQpIHtcbiAgaWYgKGxlZnQubGVuZ3RoICE9PSByaWdodC5sZW5ndGgpIHtcbiAgICB0aHJvdyBcIkNhbiBub3QgaW50ZXJsZWF2ZS4gQ2hhbm5lbCBsZW5ndGhzIGRpZmZlci5cIjtcbiAgfVxuXG4gIHZhciBzdGVyZW9JbnRlcmxlYXZlZCA9IG5ldyBGbG9hdDMyQXJyYXkobGVmdC5sZW5ndGggKiAyKTtcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gbGVmdC5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIHN0ZXJlb0ludGVybGVhdmVkWzIqaV0gICA9IGxlZnRbaV07XG4gICAgc3RlcmVvSW50ZXJsZWF2ZWRbMippKzFdID0gcmlnaHRbaV07XG4gIH1cblxuICByZXR1cm4gc3RlcmVvSW50ZXJsZWF2ZWQ7XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIGEgc3RlcmVvLWludGVybGVhdmVkIHNhbXBsZSBidWZmZXIgaW50byBzcGxpdC1zdGVyZW8gKGR1YWwgbW9ubykgc2FtcGxlIGJ1ZmZlcnNcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBidWZmZXIgQSBzdGVyZW8taW50ZXJsZWF2ZWQgc2FtcGxlIGJ1ZmZlclxuICpcbiAqIEByZXR1cm5zIGFuIEFycmF5IGNvbnRhaW5pbmcgbGVmdCBhbmQgcmlnaHQgY2hhbm5lbHNcbiAqL1xuRFNQLmRlaW50ZXJsZWF2ZSA9IChmdW5jdGlvbigpIHtcbiAgdmFyIGxlZnQsIHJpZ2h0LCBtaXgsIGRlaW50ZXJsZWF2ZUNoYW5uZWwgPSBbXTtcblxuICBkZWludGVybGVhdmVDaGFubmVsW0RTUC5NSVhdID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGJ1ZmZlci5sZW5ndGgvMjsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBtaXhbaV0gPSAoYnVmZmVyWzIqaV0gKyBidWZmZXJbMippKzFdKSAvIDI7XG4gICAgfVxuICAgIHJldHVybiBtaXg7XG4gIH07XG5cbiAgZGVpbnRlcmxlYXZlQ2hhbm5lbFtEU1AuTEVGVF0gPSBmdW5jdGlvbihidWZmZXIpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYnVmZmVyLmxlbmd0aC8yOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGxlZnRbaV0gID0gYnVmZmVyWzIqaV07XG4gICAgfVxuICAgIHJldHVybiBsZWZ0O1xuICB9O1xuXG4gIGRlaW50ZXJsZWF2ZUNoYW5uZWxbRFNQLlJJR0hUXSA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBidWZmZXIubGVuZ3RoLzI7IGkgPCBsZW47IGkrKykge1xuICAgICAgcmlnaHRbaV0gID0gYnVmZmVyWzIqaSsxXTtcbiAgICB9XG4gICAgcmV0dXJuIHJpZ2h0O1xuICB9O1xuXG4gIHJldHVybiBmdW5jdGlvbihjaGFubmVsLCBidWZmZXIpIHtcbiAgICBsZWZ0ICA9IGxlZnQgIHx8IG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyLmxlbmd0aC8yKTtcbiAgICByaWdodCA9IHJpZ2h0IHx8IG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyLmxlbmd0aC8yKTtcbiAgICBtaXggICA9IG1peCAgIHx8IG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyLmxlbmd0aC8yKTtcblxuICAgIGlmIChidWZmZXIubGVuZ3RoLzIgIT09IGxlZnQubGVuZ3RoKSB7XG4gICAgICBsZWZ0ICA9IG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyLmxlbmd0aC8yKTtcbiAgICAgIHJpZ2h0ID0gbmV3IEZsb2F0MzJBcnJheShidWZmZXIubGVuZ3RoLzIpO1xuICAgICAgbWl4ICAgPSBuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlci5sZW5ndGgvMik7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlaW50ZXJsZWF2ZUNoYW5uZWxbY2hhbm5lbF0oYnVmZmVyKTtcbiAgfTtcbn0oKSk7XG5cbi8qKlxuICogU2VwYXJhdGVzIGEgY2hhbm5lbCBmcm9tIGEgc3RlcmVvLWludGVybGVhdmVkIHNhbXBsZSBidWZmZXJcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSAgYnVmZmVyIEEgc3RlcmVvLWludGVybGVhdmVkIHNhbXBsZSBidWZmZXJcbiAqIEBwYXJhbSB7TnVtYmVyfSBjaGFubmVsIEEgY2hhbm5lbCBjb25zdGFudCAoTEVGVCwgUklHSFQsIE1JWClcbiAqXG4gKiBAcmV0dXJucyBhbiBBcnJheSBjb250YWluaW5nIGEgc2lnbmFsIG1vbm8gc2FtcGxlIGJ1ZmZlclxuICovXG5EU1AuZ2V0Q2hhbm5lbCA9IERTUC5kZWludGVybGVhdmU7XG5cbi8qKlxuICogSGVscGVyIG1ldGhvZCAoZm9yIFJldmVyYikgdG8gbWl4IHR3byAoaW50ZXJsZWF2ZWQpIHNhbXBsZWJ1ZmZlcnMuIEl0J3MgcG9zc2libGVcbiAqIHRvIG5lZ2F0ZSB0aGUgc2Vjb25kIGJ1ZmZlciB3aGlsZSBtaXhpbmcgYW5kIHRvIHBlcmZvcm0gYSB2b2x1bWUgY29ycmVjdGlvblxuICogb24gdGhlIGZpbmFsIHNpZ25hbC5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBzYW1wbGVCdWZmZXIxIEFycmF5IGNvbnRhaW5pbmcgRmxvYXQgdmFsdWVzIG9yIGEgRmxvYXQzMkFycmF5XG4gKiBAcGFyYW0ge0FycmF5fSBzYW1wbGVCdWZmZXIyIEFycmF5IGNvbnRhaW5pbmcgRmxvYXQgdmFsdWVzIG9yIGEgRmxvYXQzMkFycmF5XG4gKiBAcGFyYW0ge0Jvb2xlYW59IG5lZ2F0ZSBXaGVuIHRydWUgaW52ZXJ0cy9mbGlwcyB0aGUgYXVkaW8gc2lnbmFsXG4gKiBAcGFyYW0ge051bWJlcn0gdm9sdW1lQ29ycmVjdGlvbiBXaGVuIHlvdSBhZGQgbXVsdGlwbGUgc2FtcGxlIGJ1ZmZlcnMsIHVzZSB0aGlzIHRvIHRhbWUgeW91ciBzaWduYWwgOylcbiAqXG4gKiBAcmV0dXJucyBBIG5ldyBGbG9hdDMyQXJyYXkgaW50ZXJsZWF2ZWQgYnVmZmVyLlxuICovXG5EU1AubWl4U2FtcGxlQnVmZmVycyA9IGZ1bmN0aW9uKHNhbXBsZUJ1ZmZlcjEsIHNhbXBsZUJ1ZmZlcjIsIG5lZ2F0ZSwgdm9sdW1lQ29ycmVjdGlvbil7XG4gIHZhciBvdXRwdXRTYW1wbGVzID0gbmV3IEZsb2F0MzJBcnJheShzYW1wbGVCdWZmZXIxKTtcblxuICBmb3IodmFyIGkgPSAwOyBpPHNhbXBsZUJ1ZmZlcjEubGVuZ3RoOyBpKyspe1xuICAgIG91dHB1dFNhbXBsZXNbaV0gKz0gKG5lZ2F0ZSA/IC1zYW1wbGVCdWZmZXIyW2ldIDogc2FtcGxlQnVmZmVyMltpXSkgLyB2b2x1bWVDb3JyZWN0aW9uO1xuICB9XG5cbiAgcmV0dXJuIG91dHB1dFNhbXBsZXM7XG59O1xuXG4vLyBCaXF1YWQgZmlsdGVyIHR5cGVzXG5EU1AuTFBGID0gMDsgICAgICAgICAgICAgICAgLy8gSChzKSA9IDEgLyAoc14yICsgcy9RICsgMSlcbkRTUC5IUEYgPSAxOyAgICAgICAgICAgICAgICAvLyBIKHMpID0gc14yIC8gKHNeMiArIHMvUSArIDEpXG5EU1AuQlBGX0NPTlNUQU5UX1NLSVJUID0gMjsgLy8gSChzKSA9IHMgLyAoc14yICsgcy9RICsgMSkgIChjb25zdGFudCBza2lydCBnYWluLCBwZWFrIGdhaW4gPSBRKVxuRFNQLkJQRl9DT05TVEFOVF9QRUFLID0gMzsgIC8vIEgocykgPSAocy9RKSAvIChzXjIgKyBzL1EgKyAxKSAgICAgIChjb25zdGFudCAwIGRCIHBlYWsgZ2FpbilcbkRTUC5OT1RDSCA9IDQ7ICAgICAgICAgICAgICAvLyBIKHMpID0gKHNeMiArIDEpIC8gKHNeMiArIHMvUSArIDEpXG5EU1AuQVBGID0gNTsgICAgICAgICAgICAgICAgLy8gSChzKSA9IChzXjIgLSBzL1EgKyAxKSAvIChzXjIgKyBzL1EgKyAxKVxuRFNQLlBFQUtJTkdfRVEgPSA2OyAgICAgICAgIC8vIEgocykgPSAoc14yICsgcyooQS9RKSArIDEpIC8gKHNeMiArIHMvKEEqUSkgKyAxKVxuRFNQLkxPV19TSEVMRiA9IDc7ICAgICAgICAgIC8vIEgocykgPSBBICogKHNeMiArIChzcXJ0KEEpL1EpKnMgKyBBKS8oQSpzXjIgKyAoc3FydChBKS9RKSpzICsgMSlcbkRTUC5ISUdIX1NIRUxGID0gODsgICAgICAgICAvLyBIKHMpID0gQSAqIChBKnNeMiArIChzcXJ0KEEpL1EpKnMgKyAxKS8oc14yICsgKHNxcnQoQSkvUSkqcyArIEEpXG5cbi8vIEJpcXVhZCBmaWx0ZXIgcGFyYW1ldGVyIHR5cGVzXG5EU1AuUSA9IDE7XG5EU1AuQlcgPSAyOyAvLyBTSEFSRUQgd2l0aCBCQUNLV0FSRFMgTE9PUCBNT0RFXG5EU1AuUyA9IDM7XG5cbi8vIEZpbmQgUk1TIG9mIHNpZ25hbFxuRFNQLlJNUyA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICB2YXIgdG90YWwgPSAwO1xuXG4gIGZvciAodmFyIGkgPSAwLCBuID0gYnVmZmVyLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgIHRvdGFsICs9IGJ1ZmZlcltpXSAqIGJ1ZmZlcltpXTtcbiAgfVxuXG4gIHJldHVybiBNYXRoLnNxcnQodG90YWwgLyBuKTtcbn07XG5cbi8vIEZpbmQgUGVhayBvZiBzaWduYWxcbkRTUC5QZWFrID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gIHZhciBwZWFrID0gMDtcblxuICBmb3IgKHZhciBpID0gMCwgbiA9IGJ1ZmZlci5sZW5ndGg7IGkgPCBuOyBpKyspIHtcbiAgICBwZWFrID0gKE1hdGguYWJzKGJ1ZmZlcltpXSkgPiBwZWFrKSA/IE1hdGguYWJzKGJ1ZmZlcltpXSkgOiBwZWFrO1xuICB9XG5cbiAgcmV0dXJuIHBlYWs7XG59O1xuXG4vLyBGb3VyaWVyIFRyYW5zZm9ybSBNb2R1bGUgdXNlZCBieSBERlQsIEZGVCwgUkZGVFxuZnVuY3Rpb24gRm91cmllclRyYW5zZm9ybShidWZmZXJTaXplLCBzYW1wbGVSYXRlKSB7XG4gIHRoaXMuYnVmZmVyU2l6ZSA9IGJ1ZmZlclNpemU7XG4gIHRoaXMuc2FtcGxlUmF0ZSA9IHNhbXBsZVJhdGU7XG4gIHRoaXMuYmFuZHdpZHRoICA9IDIgLyBidWZmZXJTaXplICogc2FtcGxlUmF0ZSAvIDI7XG5cbiAgdGhpcy5zcGVjdHJ1bSAgID0gbmV3IEZsb2F0MzJBcnJheShidWZmZXJTaXplLzIpO1xuICB0aGlzLnJlYWwgICAgICAgPSBuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlclNpemUpO1xuICB0aGlzLmltYWcgICAgICAgPSBuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlclNpemUpO1xuXG4gIHRoaXMucGVha0JhbmQgICA9IDA7XG4gIHRoaXMucGVhayAgICAgICA9IDA7XG5cbiAgLyoqXG4gICAqIENhbGN1bGF0ZXMgdGhlICptaWRkbGUqIGZyZXF1ZW5jeSBvZiBhbiBGRlQgYmFuZC5cbiAgICpcbiAgICogQHBhcmFtIHtOdW1iZXJ9IGluZGV4IFRoZSBpbmRleCBvZiB0aGUgRkZUIGJhbmQuXG4gICAqXG4gICAqIEByZXR1cm5zIFRoZSBtaWRkbGUgZnJlcXVlbmN5IGluIEh6LlxuICAgKi9cbiAgdGhpcy5nZXRCYW5kRnJlcXVlbmN5ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICByZXR1cm4gdGhpcy5iYW5kd2lkdGggKiBpbmRleCArIHRoaXMuYmFuZHdpZHRoIC8gMjtcbiAgfTtcblxuICB0aGlzLmNhbGN1bGF0ZVNwZWN0cnVtID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNwZWN0cnVtICA9IHRoaXMuc3BlY3RydW0sXG4gICAgICAgIHJlYWwgICAgICA9IHRoaXMucmVhbCxcbiAgICAgICAgaW1hZyAgICAgID0gdGhpcy5pbWFnLFxuICAgICAgICBiU2kgICAgICAgPSAyIC8gdGhpcy5idWZmZXJTaXplLFxuICAgICAgICBzcXJ0ICAgICAgPSBNYXRoLnNxcnQsXG4gICAgICAgIHJ2YWwsXG4gICAgICAgIGl2YWwsXG4gICAgICAgIG1hZztcblxuICAgIGZvciAodmFyIGkgPSAwLCBOID0gYnVmZmVyU2l6ZS8yOyBpIDwgTjsgaSsrKSB7XG4gICAgICBydmFsID0gcmVhbFtpXTtcbiAgICAgIGl2YWwgPSBpbWFnW2ldO1xuICAgICAgbWFnID0gYlNpICogc3FydChydmFsICogcnZhbCArIGl2YWwgKiBpdmFsKTtcblxuICAgICAgaWYgKG1hZyA+IHRoaXMucGVhaykge1xuICAgICAgICB0aGlzLnBlYWtCYW5kID0gaTtcbiAgICAgICAgdGhpcy5wZWFrID0gbWFnO1xuICAgICAgfVxuXG4gICAgICBzcGVjdHJ1bVtpXSA9IG1hZztcbiAgICB9XG4gIH07XG59XG5cbi8qKlxuICogREZUIGlzIGEgY2xhc3MgZm9yIGNhbGN1bGF0aW5nIHRoZSBEaXNjcmV0ZSBGb3VyaWVyIFRyYW5zZm9ybSBvZiBhIHNpZ25hbC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gYnVmZmVyU2l6ZSBUaGUgc2l6ZSBvZiB0aGUgc2FtcGxlIGJ1ZmZlciB0byBiZSBjb21wdXRlZFxuICogQHBhcmFtIHtOdW1iZXJ9IHNhbXBsZVJhdGUgVGhlIHNhbXBsZVJhdGUgb2YgdGhlIGJ1ZmZlciAoZWcuIDQ0MTAwKVxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBERlQoYnVmZmVyU2l6ZSwgc2FtcGxlUmF0ZSkge1xuICBGb3VyaWVyVHJhbnNmb3JtLmNhbGwodGhpcywgYnVmZmVyU2l6ZSwgc2FtcGxlUmF0ZSk7XG5cbiAgdmFyIE4gPSBidWZmZXJTaXplLzIgKiBidWZmZXJTaXplO1xuICB2YXIgVFdPX1BJID0gMiAqIE1hdGguUEk7XG5cbiAgdGhpcy5zaW5UYWJsZSA9IG5ldyBGbG9hdDMyQXJyYXkoTik7XG4gIHRoaXMuY29zVGFibGUgPSBuZXcgRmxvYXQzMkFycmF5KE4pO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgTjsgaSsrKSB7XG4gICAgdGhpcy5zaW5UYWJsZVtpXSA9IE1hdGguc2luKGkgKiBUV09fUEkgLyBidWZmZXJTaXplKTtcbiAgICB0aGlzLmNvc1RhYmxlW2ldID0gTWF0aC5jb3MoaSAqIFRXT19QSSAvIGJ1ZmZlclNpemUpO1xuICB9XG59XG5cbi8qKlxuICogUGVyZm9ybXMgYSBmb3J3YXJkIHRyYW5zZm9ybSBvbiB0aGUgc2FtcGxlIGJ1ZmZlci5cbiAqIENvbnZlcnRzIGEgdGltZSBkb21haW4gc2lnbmFsIHRvIGZyZXF1ZW5jeSBkb21haW4gc3BlY3RyYS5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBidWZmZXIgVGhlIHNhbXBsZSBidWZmZXJcbiAqXG4gKiBAcmV0dXJucyBUaGUgZnJlcXVlbmN5IHNwZWN0cnVtIGFycmF5XG4gKi9cbkRGVC5wcm90b3R5cGUuZm9yd2FyZCA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICB2YXIgcmVhbCA9IHRoaXMucmVhbCxcbiAgICAgIGltYWcgPSB0aGlzLmltYWcsXG4gICAgICBydmFsLFxuICAgICAgaXZhbDtcblxuICBmb3IgKHZhciBrID0gMDsgayA8IHRoaXMuYnVmZmVyU2l6ZS8yOyBrKyspIHtcbiAgICBydmFsID0gMC4wO1xuICAgIGl2YWwgPSAwLjA7XG5cbiAgICBmb3IgKHZhciBuID0gMDsgbiA8IGJ1ZmZlci5sZW5ndGg7IG4rKykge1xuICAgICAgcnZhbCArPSB0aGlzLmNvc1RhYmxlW2sqbl0gKiBidWZmZXJbbl07XG4gICAgICBpdmFsICs9IHRoaXMuc2luVGFibGVbaypuXSAqIGJ1ZmZlcltuXTtcbiAgICB9XG5cbiAgICByZWFsW2tdID0gcnZhbDtcbiAgICBpbWFnW2tdID0gaXZhbDtcbiAgfVxuXG4gIHJldHVybiB0aGlzLmNhbGN1bGF0ZVNwZWN0cnVtKCk7XG59O1xuXG5cbi8qKlxuICogRkZUIGlzIGEgY2xhc3MgZm9yIGNhbGN1bGF0aW5nIHRoZSBEaXNjcmV0ZSBGb3VyaWVyIFRyYW5zZm9ybSBvZiBhIHNpZ25hbFxuICogd2l0aCB0aGUgRmFzdCBGb3VyaWVyIFRyYW5zZm9ybSBhbGdvcml0aG0uXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGJ1ZmZlclNpemUgVGhlIHNpemUgb2YgdGhlIHNhbXBsZSBidWZmZXIgdG8gYmUgY29tcHV0ZWQuIE11c3QgYmUgcG93ZXIgb2YgMlxuICogQHBhcmFtIHtOdW1iZXJ9IHNhbXBsZVJhdGUgVGhlIHNhbXBsZVJhdGUgb2YgdGhlIGJ1ZmZlciAoZWcuIDQ0MTAwKVxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBGRlQoYnVmZmVyU2l6ZSwgc2FtcGxlUmF0ZSkge1xuICBGb3VyaWVyVHJhbnNmb3JtLmNhbGwodGhpcywgYnVmZmVyU2l6ZSwgc2FtcGxlUmF0ZSk7XG5cbiAgdGhpcy5yZXZlcnNlVGFibGUgPSBuZXcgVWludDMyQXJyYXkoYnVmZmVyU2l6ZSk7XG5cbiAgdmFyIGxpbWl0ID0gMTtcbiAgdmFyIGJpdCA9IGJ1ZmZlclNpemUgPj4gMTtcblxuICB2YXIgaTtcblxuICB3aGlsZSAobGltaXQgPCBidWZmZXJTaXplKSB7XG4gICAgZm9yIChpID0gMDsgaSA8IGxpbWl0OyBpKyspIHtcbiAgICAgIHRoaXMucmV2ZXJzZVRhYmxlW2kgKyBsaW1pdF0gPSB0aGlzLnJldmVyc2VUYWJsZVtpXSArIGJpdDtcbiAgICB9XG5cbiAgICBsaW1pdCA9IGxpbWl0IDw8IDE7XG4gICAgYml0ID0gYml0ID4+IDE7XG4gIH1cblxuICB0aGlzLnNpblRhYmxlID0gbmV3IEZsb2F0MzJBcnJheShidWZmZXJTaXplKTtcbiAgdGhpcy5jb3NUYWJsZSA9IG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyU2l6ZSk7XG5cbiAgZm9yIChpID0gMDsgaSA8IGJ1ZmZlclNpemU7IGkrKykge1xuICAgIHRoaXMuc2luVGFibGVbaV0gPSBNYXRoLnNpbigtTWF0aC5QSS9pKTtcbiAgICB0aGlzLmNvc1RhYmxlW2ldID0gTWF0aC5jb3MoLU1hdGguUEkvaSk7XG4gIH1cbn1cblxuLyoqXG4gKiBQZXJmb3JtcyBhIGZvcndhcmQgdHJhbnNmb3JtIG9uIHRoZSBzYW1wbGUgYnVmZmVyLlxuICogQ29udmVydHMgYSB0aW1lIGRvbWFpbiBzaWduYWwgdG8gZnJlcXVlbmN5IGRvbWFpbiBzcGVjdHJhLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGJ1ZmZlciBUaGUgc2FtcGxlIGJ1ZmZlci4gQnVmZmVyIExlbmd0aCBtdXN0IGJlIHBvd2VyIG9mIDJcbiAqXG4gKiBAcmV0dXJucyBUaGUgZnJlcXVlbmN5IHNwZWN0cnVtIGFycmF5XG4gKi9cbkZGVC5wcm90b3R5cGUuZm9yd2FyZCA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAvLyBMb2NhbGx5IHNjb3BlIHZhcmlhYmxlcyBmb3Igc3BlZWQgdXBcbiAgdmFyIGJ1ZmZlclNpemUgICAgICA9IHRoaXMuYnVmZmVyU2l6ZSxcbiAgICAgIGNvc1RhYmxlICAgICAgICA9IHRoaXMuY29zVGFibGUsXG4gICAgICBzaW5UYWJsZSAgICAgICAgPSB0aGlzLnNpblRhYmxlLFxuICAgICAgcmV2ZXJzZVRhYmxlICAgID0gdGhpcy5yZXZlcnNlVGFibGUsXG4gICAgICByZWFsICAgICAgICAgICAgPSB0aGlzLnJlYWwsXG4gICAgICBpbWFnICAgICAgICAgICAgPSB0aGlzLmltYWcsXG4gICAgICBzcGVjdHJ1bSAgICAgICAgPSB0aGlzLnNwZWN0cnVtO1xuXG4gIHZhciBrID0gTWF0aC5mbG9vcihNYXRoLmxvZyhidWZmZXJTaXplKSAvIE1hdGguTE4yKTtcblxuICBpZiAoTWF0aC5wb3coMiwgaykgIT09IGJ1ZmZlclNpemUpIHsgdGhyb3cgXCJJbnZhbGlkIGJ1ZmZlciBzaXplLCBtdXN0IGJlIGEgcG93ZXIgb2YgMi5cIjsgfVxuICBpZiAoYnVmZmVyU2l6ZSAhPT0gYnVmZmVyLmxlbmd0aCkgIHsgdGhyb3cgXCJTdXBwbGllZCBidWZmZXIgaXMgbm90IHRoZSBzYW1lIHNpemUgYXMgZGVmaW5lZCBGRlQuIEZGVCBTaXplOiBcIiArIGJ1ZmZlclNpemUgKyBcIiBCdWZmZXIgU2l6ZTogXCIgKyBidWZmZXIubGVuZ3RoOyB9XG5cbiAgdmFyIGhhbGZTaXplID0gMSxcbiAgICAgIHBoYXNlU2hpZnRTdGVwUmVhbCxcbiAgICAgIHBoYXNlU2hpZnRTdGVwSW1hZyxcbiAgICAgIGN1cnJlbnRQaGFzZVNoaWZ0UmVhbCxcbiAgICAgIGN1cnJlbnRQaGFzZVNoaWZ0SW1hZyxcbiAgICAgIG9mZixcbiAgICAgIHRyLFxuICAgICAgdGksXG4gICAgICB0bXBSZWFsLFxuICAgICAgaTtcblxuICBmb3IgKGkgPSAwOyBpIDwgYnVmZmVyU2l6ZTsgaSsrKSB7XG4gICAgcmVhbFtpXSA9IGJ1ZmZlcltyZXZlcnNlVGFibGVbaV1dO1xuICAgIGltYWdbaV0gPSAwO1xuICB9XG5cbiAgd2hpbGUgKGhhbGZTaXplIDwgYnVmZmVyU2l6ZSkge1xuICAgIC8vcGhhc2VTaGlmdFN0ZXBSZWFsID0gTWF0aC5jb3MoLU1hdGguUEkvaGFsZlNpemUpO1xuICAgIC8vcGhhc2VTaGlmdFN0ZXBJbWFnID0gTWF0aC5zaW4oLU1hdGguUEkvaGFsZlNpemUpO1xuICAgIHBoYXNlU2hpZnRTdGVwUmVhbCA9IGNvc1RhYmxlW2hhbGZTaXplXTtcbiAgICBwaGFzZVNoaWZ0U3RlcEltYWcgPSBzaW5UYWJsZVtoYWxmU2l6ZV07XG5cbiAgICBjdXJyZW50UGhhc2VTaGlmdFJlYWwgPSAxO1xuICAgIGN1cnJlbnRQaGFzZVNoaWZ0SW1hZyA9IDA7XG5cbiAgICBmb3IgKHZhciBmZnRTdGVwID0gMDsgZmZ0U3RlcCA8IGhhbGZTaXplOyBmZnRTdGVwKyspIHtcbiAgICAgIGkgPSBmZnRTdGVwO1xuXG4gICAgICB3aGlsZSAoaSA8IGJ1ZmZlclNpemUpIHtcbiAgICAgICAgb2ZmID0gaSArIGhhbGZTaXplO1xuICAgICAgICB0ciA9IChjdXJyZW50UGhhc2VTaGlmdFJlYWwgKiByZWFsW29mZl0pIC0gKGN1cnJlbnRQaGFzZVNoaWZ0SW1hZyAqIGltYWdbb2ZmXSk7XG4gICAgICAgIHRpID0gKGN1cnJlbnRQaGFzZVNoaWZ0UmVhbCAqIGltYWdbb2ZmXSkgKyAoY3VycmVudFBoYXNlU2hpZnRJbWFnICogcmVhbFtvZmZdKTtcblxuICAgICAgICByZWFsW29mZl0gPSByZWFsW2ldIC0gdHI7XG4gICAgICAgIGltYWdbb2ZmXSA9IGltYWdbaV0gLSB0aTtcbiAgICAgICAgcmVhbFtpXSArPSB0cjtcbiAgICAgICAgaW1hZ1tpXSArPSB0aTtcblxuICAgICAgICBpICs9IGhhbGZTaXplIDw8IDE7XG4gICAgICB9XG5cbiAgICAgIHRtcFJlYWwgPSBjdXJyZW50UGhhc2VTaGlmdFJlYWw7XG4gICAgICBjdXJyZW50UGhhc2VTaGlmdFJlYWwgPSAodG1wUmVhbCAqIHBoYXNlU2hpZnRTdGVwUmVhbCkgLSAoY3VycmVudFBoYXNlU2hpZnRJbWFnICogcGhhc2VTaGlmdFN0ZXBJbWFnKTtcbiAgICAgIGN1cnJlbnRQaGFzZVNoaWZ0SW1hZyA9ICh0bXBSZWFsICogcGhhc2VTaGlmdFN0ZXBJbWFnKSArIChjdXJyZW50UGhhc2VTaGlmdEltYWcgKiBwaGFzZVNoaWZ0U3RlcFJlYWwpO1xuICAgIH1cblxuICAgIGhhbGZTaXplID0gaGFsZlNpemUgPDwgMTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLmNhbGN1bGF0ZVNwZWN0cnVtKCk7XG59O1xuXG5GRlQucHJvdG90eXBlLmludmVyc2UgPSBmdW5jdGlvbihyZWFsLCBpbWFnKSB7XG4gIC8vIExvY2FsbHkgc2NvcGUgdmFyaWFibGVzIGZvciBzcGVlZCB1cFxuICB2YXIgYnVmZmVyU2l6ZSAgICAgID0gdGhpcy5idWZmZXJTaXplLFxuICAgICAgY29zVGFibGUgICAgICAgID0gdGhpcy5jb3NUYWJsZSxcbiAgICAgIHNpblRhYmxlICAgICAgICA9IHRoaXMuc2luVGFibGUsXG4gICAgICByZXZlcnNlVGFibGUgICAgPSB0aGlzLnJldmVyc2VUYWJsZSxcbiAgICAgIHNwZWN0cnVtICAgICAgICA9IHRoaXMuc3BlY3RydW07XG5cbiAgICAgIHJlYWwgPSByZWFsIHx8IHRoaXMucmVhbDtcbiAgICAgIGltYWcgPSBpbWFnIHx8IHRoaXMuaW1hZztcblxuICB2YXIgaGFsZlNpemUgPSAxLFxuICAgICAgcGhhc2VTaGlmdFN0ZXBSZWFsLFxuICAgICAgcGhhc2VTaGlmdFN0ZXBJbWFnLFxuICAgICAgY3VycmVudFBoYXNlU2hpZnRSZWFsLFxuICAgICAgY3VycmVudFBoYXNlU2hpZnRJbWFnLFxuICAgICAgb2ZmLFxuICAgICAgdHIsXG4gICAgICB0aSxcbiAgICAgIHRtcFJlYWwsXG4gICAgICBpO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBidWZmZXJTaXplOyBpKyspIHtcbiAgICBpbWFnW2ldICo9IC0xO1xuICB9XG5cbiAgdmFyIHJldlJlYWwgPSBuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlclNpemUpO1xuICB2YXIgcmV2SW1hZyA9IG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyU2l6ZSk7XG5cbiAgZm9yIChpID0gMDsgaSA8IHJlYWwubGVuZ3RoOyBpKyspIHtcbiAgICByZXZSZWFsW2ldID0gcmVhbFtyZXZlcnNlVGFibGVbaV1dO1xuICAgIHJldkltYWdbaV0gPSBpbWFnW3JldmVyc2VUYWJsZVtpXV07XG4gIH1cblxuICByZWFsID0gcmV2UmVhbDtcbiAgaW1hZyA9IHJldkltYWc7XG5cbiAgd2hpbGUgKGhhbGZTaXplIDwgYnVmZmVyU2l6ZSkge1xuICAgIHBoYXNlU2hpZnRTdGVwUmVhbCA9IGNvc1RhYmxlW2hhbGZTaXplXTtcbiAgICBwaGFzZVNoaWZ0U3RlcEltYWcgPSBzaW5UYWJsZVtoYWxmU2l6ZV07XG4gICAgY3VycmVudFBoYXNlU2hpZnRSZWFsID0gMTtcbiAgICBjdXJyZW50UGhhc2VTaGlmdEltYWcgPSAwO1xuXG4gICAgZm9yICh2YXIgZmZ0U3RlcCA9IDA7IGZmdFN0ZXAgPCBoYWxmU2l6ZTsgZmZ0U3RlcCsrKSB7XG4gICAgICBpID0gZmZ0U3RlcDtcblxuICAgICAgd2hpbGUgKGkgPCBidWZmZXJTaXplKSB7XG4gICAgICAgIG9mZiA9IGkgKyBoYWxmU2l6ZTtcbiAgICAgICAgdHIgPSAoY3VycmVudFBoYXNlU2hpZnRSZWFsICogcmVhbFtvZmZdKSAtIChjdXJyZW50UGhhc2VTaGlmdEltYWcgKiBpbWFnW29mZl0pO1xuICAgICAgICB0aSA9IChjdXJyZW50UGhhc2VTaGlmdFJlYWwgKiBpbWFnW29mZl0pICsgKGN1cnJlbnRQaGFzZVNoaWZ0SW1hZyAqIHJlYWxbb2ZmXSk7XG5cbiAgICAgICAgcmVhbFtvZmZdID0gcmVhbFtpXSAtIHRyO1xuICAgICAgICBpbWFnW29mZl0gPSBpbWFnW2ldIC0gdGk7XG4gICAgICAgIHJlYWxbaV0gKz0gdHI7XG4gICAgICAgIGltYWdbaV0gKz0gdGk7XG5cbiAgICAgICAgaSArPSBoYWxmU2l6ZSA8PCAxO1xuICAgICAgfVxuXG4gICAgICB0bXBSZWFsID0gY3VycmVudFBoYXNlU2hpZnRSZWFsO1xuICAgICAgY3VycmVudFBoYXNlU2hpZnRSZWFsID0gKHRtcFJlYWwgKiBwaGFzZVNoaWZ0U3RlcFJlYWwpIC0gKGN1cnJlbnRQaGFzZVNoaWZ0SW1hZyAqIHBoYXNlU2hpZnRTdGVwSW1hZyk7XG4gICAgICBjdXJyZW50UGhhc2VTaGlmdEltYWcgPSAodG1wUmVhbCAqIHBoYXNlU2hpZnRTdGVwSW1hZykgKyAoY3VycmVudFBoYXNlU2hpZnRJbWFnICogcGhhc2VTaGlmdFN0ZXBSZWFsKTtcbiAgICB9XG5cbiAgICBoYWxmU2l6ZSA9IGhhbGZTaXplIDw8IDE7XG4gIH1cblxuICB2YXIgYnVmZmVyID0gbmV3IEZsb2F0MzJBcnJheShidWZmZXJTaXplKTsgLy8gdGhpcyBzaG91bGQgYmUgcmV1c2VkIGluc3RlYWRcbiAgZm9yIChpID0gMDsgaSA8IGJ1ZmZlclNpemU7IGkrKykge1xuICAgIGJ1ZmZlcltpXSA9IHJlYWxbaV0gLyBidWZmZXJTaXplO1xuICB9XG5cbiAgcmV0dXJuIGJ1ZmZlcjtcbn07XG5cbi8qKlxuICogUkZGVCBpcyBhIGNsYXNzIGZvciBjYWxjdWxhdGluZyB0aGUgRGlzY3JldGUgRm91cmllciBUcmFuc2Zvcm0gb2YgYSBzaWduYWxcbiAqIHdpdGggdGhlIEZhc3QgRm91cmllciBUcmFuc2Zvcm0gYWxnb3JpdGhtLlxuICpcbiAqIFRoaXMgbWV0aG9kIGN1cnJlbnRseSBvbmx5IGNvbnRhaW5zIGEgZm9yd2FyZCB0cmFuc2Zvcm0gYnV0IGlzIGhpZ2hseSBvcHRpbWl6ZWQuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGJ1ZmZlclNpemUgVGhlIHNpemUgb2YgdGhlIHNhbXBsZSBidWZmZXIgdG8gYmUgY29tcHV0ZWQuIE11c3QgYmUgcG93ZXIgb2YgMlxuICogQHBhcmFtIHtOdW1iZXJ9IHNhbXBsZVJhdGUgVGhlIHNhbXBsZVJhdGUgb2YgdGhlIGJ1ZmZlciAoZWcuIDQ0MTAwKVxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5cbi8vIGxvb2t1cCB0YWJsZXMgZG9uJ3QgcmVhbGx5IGdhaW4gdXMgYW55IHNwZWVkLCBidXQgdGhleSBkbyBpbmNyZWFzZVxuLy8gY2FjaGUgZm9vdHByaW50LCBzbyBkb24ndCB1c2UgdGhlbSBpbiBoZXJlXG5cbi8vIGFsc28gd2UgZG9uJ3QgdXNlIHNlcGVhcmF0ZSBhcnJheXMgZm9yIHJlYWwvaW1hZ2luYXJ5IHBhcnRzXG5cbi8vIHRoaXMgb25lIGEgbGl0dGxlIG1vcmUgdGhhbiB0d2ljZSBhcyBmYXN0IGFzIHRoZSBvbmUgaW4gRkZUXG4vLyBob3dldmVyIEkgb25seSBkaWQgdGhlIGZvcndhcmQgdHJhbnNmb3JtXG5cbi8vIHRoZSByZXN0IG9mIHRoaXMgd2FzIHRyYW5zbGF0ZWQgZnJvbSBDLCBzZWUgaHR0cDovL3d3dy5qamouZGUvZnh0L1xuLy8gdGhpcyBpcyB0aGUgcmVhbCBzcGxpdCByYWRpeCBGRlRcblxuZnVuY3Rpb24gUkZGVChidWZmZXJTaXplLCBzYW1wbGVSYXRlKSB7XG4gIEZvdXJpZXJUcmFuc2Zvcm0uY2FsbCh0aGlzLCBidWZmZXJTaXplLCBzYW1wbGVSYXRlKTtcblxuICB0aGlzLnRyYW5zID0gbmV3IEZsb2F0MzJBcnJheShidWZmZXJTaXplKTtcblxuICB0aGlzLnJldmVyc2VUYWJsZSA9IG5ldyBVaW50MzJBcnJheShidWZmZXJTaXplKTtcblxuICAvLyBkb24ndCB1c2UgYSBsb29rdXAgdGFibGUgdG8gZG8gdGhlIHBlcm11dGUsIHVzZSB0aGlzIGluc3RlYWRcbiAgdGhpcy5yZXZlcnNlQmluUGVybXV0ZSA9IGZ1bmN0aW9uIChkZXN0LCBzb3VyY2UpIHtcbiAgICB2YXIgYnVmZmVyU2l6ZSAgPSB0aGlzLmJ1ZmZlclNpemUsXG4gICAgICAgIGhhbGZTaXplICAgID0gYnVmZmVyU2l6ZSA+Pj4gMSxcbiAgICAgICAgbm0xICAgICAgICAgPSBidWZmZXJTaXplIC0gMSxcbiAgICAgICAgaSA9IDEsIHIgPSAwLCBoO1xuXG4gICAgZGVzdFswXSA9IHNvdXJjZVswXTtcblxuICAgIGRvIHtcbiAgICAgIHIgKz0gaGFsZlNpemU7XG4gICAgICBkZXN0W2ldID0gc291cmNlW3JdO1xuICAgICAgZGVzdFtyXSA9IHNvdXJjZVtpXTtcblxuICAgICAgaSsrO1xuXG4gICAgICBoID0gaGFsZlNpemUgPDwgMTtcbiAgICAgIHdoaWxlIChoID0gaCA+PiAxLCAhKChyIF49IGgpICYgaCkpO1xuXG4gICAgICBpZiAociA+PSBpKSB7XG4gICAgICAgIGRlc3RbaV0gICAgID0gc291cmNlW3JdO1xuICAgICAgICBkZXN0W3JdICAgICA9IHNvdXJjZVtpXTtcblxuICAgICAgICBkZXN0W25tMS1pXSA9IHNvdXJjZVtubTEtcl07XG4gICAgICAgIGRlc3Rbbm0xLXJdID0gc291cmNlW25tMS1pXTtcbiAgICAgIH1cbiAgICAgIGkrKztcbiAgICB9IHdoaWxlIChpIDwgaGFsZlNpemUpO1xuICAgIGRlc3Rbbm0xXSA9IHNvdXJjZVtubTFdO1xuICB9O1xuXG4gIHRoaXMuZ2VuZXJhdGVSZXZlcnNlVGFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGJ1ZmZlclNpemUgID0gdGhpcy5idWZmZXJTaXplLFxuICAgICAgICBoYWxmU2l6ZSAgICA9IGJ1ZmZlclNpemUgPj4+IDEsXG4gICAgICAgIG5tMSAgICAgICAgID0gYnVmZmVyU2l6ZSAtIDEsXG4gICAgICAgIGkgPSAxLCByID0gMCwgaDtcblxuICAgIHRoaXMucmV2ZXJzZVRhYmxlWzBdID0gMDtcblxuICAgIGRvIHtcbiAgICAgIHIgKz0gaGFsZlNpemU7XG5cbiAgICAgIHRoaXMucmV2ZXJzZVRhYmxlW2ldID0gcjtcbiAgICAgIHRoaXMucmV2ZXJzZVRhYmxlW3JdID0gaTtcblxuICAgICAgaSsrO1xuXG4gICAgICBoID0gaGFsZlNpemUgPDwgMTtcbiAgICAgIHdoaWxlIChoID0gaCA+PiAxLCAhKChyIF49IGgpICYgaCkpO1xuXG4gICAgICBpZiAociA+PSBpKSB7XG4gICAgICAgIHRoaXMucmV2ZXJzZVRhYmxlW2ldID0gcjtcbiAgICAgICAgdGhpcy5yZXZlcnNlVGFibGVbcl0gPSBpO1xuXG4gICAgICAgIHRoaXMucmV2ZXJzZVRhYmxlW25tMS1pXSA9IG5tMS1yO1xuICAgICAgICB0aGlzLnJldmVyc2VUYWJsZVtubTEtcl0gPSBubTEtaTtcbiAgICAgIH1cbiAgICAgIGkrKztcbiAgICB9IHdoaWxlIChpIDwgaGFsZlNpemUpO1xuXG4gICAgdGhpcy5yZXZlcnNlVGFibGVbbm0xXSA9IG5tMTtcbiAgfTtcblxuICB0aGlzLmdlbmVyYXRlUmV2ZXJzZVRhYmxlKCk7XG59XG5cblxuLy8gT3JkZXJpbmcgb2Ygb3V0cHV0OlxuLy9cbi8vIHRyYW5zWzBdICAgICA9IHJlWzBdICg9PXplcm8gZnJlcXVlbmN5LCBwdXJlbHkgcmVhbClcbi8vIHRyYW5zWzFdICAgICA9IHJlWzFdXG4vLyAgICAgICAgICAgICAuLi5cbi8vIHRyYW5zW24vMi0xXSA9IHJlW24vMi0xXVxuLy8gdHJhbnNbbi8yXSAgID0gcmVbbi8yXSAgICAoPT1ueXF1aXN0IGZyZXF1ZW5jeSwgcHVyZWx5IHJlYWwpXG4vL1xuLy8gdHJhbnNbbi8yKzFdID0gaW1bbi8yLTFdXG4vLyB0cmFuc1tuLzIrMl0gPSBpbVtuLzItMl1cbi8vICAgICAgICAgICAgIC4uLlxuLy8gdHJhbnNbbi0xXSAgID0gaW1bMV1cblxuUkZGVC5wcm90b3R5cGUuZm9yd2FyZCA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICB2YXIgbiAgICAgICAgID0gdGhpcy5idWZmZXJTaXplLFxuICAgICAgc3BlY3RydW0gID0gdGhpcy5zcGVjdHJ1bSxcbiAgICAgIHggICAgICAgICA9IHRoaXMudHJhbnMsXG4gICAgICBUV09fUEkgICAgPSAyKk1hdGguUEksXG4gICAgICBzcXJ0ICAgICAgPSBNYXRoLnNxcnQsXG4gICAgICBpICAgICAgICAgPSBuID4+PiAxLFxuICAgICAgYlNpICAgICAgID0gMiAvIG4sXG4gICAgICBuMiwgbjQsIG44LCBubixcbiAgICAgIHQxLCB0MiwgdDMsIHQ0LFxuICAgICAgaTEsIGkyLCBpMywgaTQsIGk1LCBpNiwgaTcsIGk4LFxuICAgICAgc3QxLCBjYzEsIHNzMSwgY2MzLCBzczMsXG4gICAgICBlLFxuICAgICAgYSxcbiAgICAgIHJ2YWwsIGl2YWwsIG1hZztcblxuICB0aGlzLnJldmVyc2VCaW5QZXJtdXRlKHgsIGJ1ZmZlcik7XG5cbiAgLypcbiAgdmFyIHJldmVyc2VUYWJsZSA9IHRoaXMucmV2ZXJzZVRhYmxlO1xuXG4gIGZvciAodmFyIGsgPSAwLCBsZW4gPSByZXZlcnNlVGFibGUubGVuZ3RoOyBrIDwgbGVuOyBrKyspIHtcbiAgICB4W2tdID0gYnVmZmVyW3JldmVyc2VUYWJsZVtrXV07XG4gIH1cbiAgKi9cblxuICBmb3IgKHZhciBpeCA9IDAsIGlkID0gNDsgaXggPCBuOyBpZCAqPSA0KSB7XG4gICAgZm9yICh2YXIgaTAgPSBpeDsgaTAgPCBuOyBpMCArPSBpZCkge1xuICAgICAgLy9zdW1kaWZmKHhbaTBdLCB4W2kwKzFdKTsgLy8ge2EsIGJ9ICA8LS18IHthK2IsIGEtYn1cbiAgICAgIHN0MSA9IHhbaTBdIC0geFtpMCsxXTtcbiAgICAgIHhbaTBdICs9IHhbaTArMV07XG4gICAgICB4W2kwKzFdID0gc3QxO1xuICAgIH1cbiAgICBpeCA9IDIqKGlkLTEpO1xuICB9XG5cbiAgbjIgPSAyO1xuICBubiA9IG4gPj4+IDE7XG5cbiAgd2hpbGUoKG5uID0gbm4gPj4+IDEpKSB7XG4gICAgaXggPSAwO1xuICAgIG4yID0gbjIgPDwgMTtcbiAgICBpZCA9IG4yIDw8IDE7XG4gICAgbjQgPSBuMiA+Pj4gMjtcbiAgICBuOCA9IG4yID4+PiAzO1xuICAgIGRvIHtcbiAgICAgIGlmKG40ICE9PSAxKSB7XG4gICAgICAgIGZvcihpMCA9IGl4OyBpMCA8IG47IGkwICs9IGlkKSB7XG4gICAgICAgICAgaTEgPSBpMDtcbiAgICAgICAgICBpMiA9IGkxICsgbjQ7XG4gICAgICAgICAgaTMgPSBpMiArIG40O1xuICAgICAgICAgIGk0ID0gaTMgKyBuNDtcblxuICAgICAgICAgIC8vZGlmZnN1bTNfcih4W2kzXSwgeFtpNF0sIHQxKTsgLy8ge2EsIGIsIHN9IDwtLXwge2EsIGItYSwgYStifVxuICAgICAgICAgIHQxID0geFtpM10gKyB4W2k0XTtcbiAgICAgICAgICB4W2k0XSAtPSB4W2kzXTtcbiAgICAgICAgICAvL3N1bWRpZmYzKHhbaTFdLCB0MSwgeFtpM10pOyAgIC8vIHthLCBiLCBkfSA8LS18IHthK2IsIGIsIGEtYn1cbiAgICAgICAgICB4W2kzXSA9IHhbaTFdIC0gdDE7XG4gICAgICAgICAgeFtpMV0gKz0gdDE7XG5cbiAgICAgICAgICBpMSArPSBuODtcbiAgICAgICAgICBpMiArPSBuODtcbiAgICAgICAgICBpMyArPSBuODtcbiAgICAgICAgICBpNCArPSBuODtcblxuICAgICAgICAgIC8vc3VtZGlmZih4W2kzXSwgeFtpNF0sIHQxLCB0Mik7IC8vIHtzLCBkfSAgPC0tfCB7YStiLCBhLWJ9XG4gICAgICAgICAgdDEgPSB4W2kzXSArIHhbaTRdO1xuICAgICAgICAgIHQyID0geFtpM10gLSB4W2k0XTtcblxuICAgICAgICAgIHQxID0gLXQxICogTWF0aC5TUVJUMV8yO1xuICAgICAgICAgIHQyICo9IE1hdGguU1FSVDFfMjtcblxuICAgICAgICAgIC8vIHN1bWRpZmYodDEsIHhbaTJdLCB4W2k0XSwgeFtpM10pOyAvLyB7cywgZH0gIDwtLXwge2ErYiwgYS1ifVxuICAgICAgICAgIHN0MSA9IHhbaTJdO1xuICAgICAgICAgIHhbaTRdID0gdDEgKyBzdDE7XG4gICAgICAgICAgeFtpM10gPSB0MSAtIHN0MTtcblxuICAgICAgICAgIC8vc3VtZGlmZjMoeFtpMV0sIHQyLCB4W2kyXSk7IC8vIHthLCBiLCBkfSA8LS18IHthK2IsIGIsIGEtYn1cbiAgICAgICAgICB4W2kyXSA9IHhbaTFdIC0gdDI7XG4gICAgICAgICAgeFtpMV0gKz0gdDI7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvcihpMCA9IGl4OyBpMCA8IG47IGkwICs9IGlkKSB7XG4gICAgICAgICAgaTEgPSBpMDtcbiAgICAgICAgICBpMiA9IGkxICsgbjQ7XG4gICAgICAgICAgaTMgPSBpMiArIG40O1xuICAgICAgICAgIGk0ID0gaTMgKyBuNDtcblxuICAgICAgICAgIC8vZGlmZnN1bTNfcih4W2kzXSwgeFtpNF0sIHQxKTsgLy8ge2EsIGIsIHN9IDwtLXwge2EsIGItYSwgYStifVxuICAgICAgICAgIHQxID0geFtpM10gKyB4W2k0XTtcbiAgICAgICAgICB4W2k0XSAtPSB4W2kzXTtcblxuICAgICAgICAgIC8vc3VtZGlmZjMoeFtpMV0sIHQxLCB4W2kzXSk7ICAgLy8ge2EsIGIsIGR9IDwtLXwge2ErYiwgYiwgYS1ifVxuICAgICAgICAgIHhbaTNdID0geFtpMV0gLSB0MTtcbiAgICAgICAgICB4W2kxXSArPSB0MTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpeCA9IChpZCA8PCAxKSAtIG4yO1xuICAgICAgaWQgPSBpZCA8PCAyO1xuICAgIH0gd2hpbGUgKGl4IDwgbik7XG5cbiAgICBlID0gVFdPX1BJIC8gbjI7XG5cbiAgICBmb3IgKHZhciBqID0gMTsgaiA8IG44OyBqKyspIHtcbiAgICAgIGEgPSBqICogZTtcbiAgICAgIHNzMSA9IE1hdGguc2luKGEpO1xuICAgICAgY2MxID0gTWF0aC5jb3MoYSk7XG5cbiAgICAgIC8vc3MzID0gc2luKDMqYSk7IGNjMyA9IGNvcygzKmEpO1xuICAgICAgY2MzID0gNCpjYzEqKGNjMSpjYzEtMC43NSk7XG4gICAgICBzczMgPSA0KnNzMSooMC43NS1zczEqc3MxKTtcblxuICAgICAgaXggPSAwOyBpZCA9IG4yIDw8IDE7XG4gICAgICBkbyB7XG4gICAgICAgIGZvciAoaTAgPSBpeDsgaTAgPCBuOyBpMCArPSBpZCkge1xuICAgICAgICAgIGkxID0gaTAgKyBqO1xuICAgICAgICAgIGkyID0gaTEgKyBuNDtcbiAgICAgICAgICBpMyA9IGkyICsgbjQ7XG4gICAgICAgICAgaTQgPSBpMyArIG40O1xuXG4gICAgICAgICAgaTUgPSBpMCArIG40IC0gajtcbiAgICAgICAgICBpNiA9IGk1ICsgbjQ7XG4gICAgICAgICAgaTcgPSBpNiArIG40O1xuICAgICAgICAgIGk4ID0gaTcgKyBuNDtcblxuICAgICAgICAgIC8vY211bHQoYywgcywgeCwgeSwgJnUsICZ2KVxuICAgICAgICAgIC8vY211bHQoY2MxLCBzczEsIHhbaTddLCB4W2kzXSwgdDIsIHQxKTsgLy8ge3Usdn0gPC0tfCB7eCpjLXkqcywgeCpzK3kqY31cbiAgICAgICAgICB0MiA9IHhbaTddKmNjMSAtIHhbaTNdKnNzMTtcbiAgICAgICAgICB0MSA9IHhbaTddKnNzMSArIHhbaTNdKmNjMTtcblxuICAgICAgICAgIC8vY211bHQoY2MzLCBzczMsIHhbaThdLCB4W2k0XSwgdDQsIHQzKTtcbiAgICAgICAgICB0NCA9IHhbaThdKmNjMyAtIHhbaTRdKnNzMztcbiAgICAgICAgICB0MyA9IHhbaThdKnNzMyArIHhbaTRdKmNjMztcblxuICAgICAgICAgIC8vc3VtZGlmZih0MiwgdDQpOyAgIC8vIHthLCBifSA8LS18IHthK2IsIGEtYn1cbiAgICAgICAgICBzdDEgPSB0MiAtIHQ0O1xuICAgICAgICAgIHQyICs9IHQ0O1xuICAgICAgICAgIHQ0ID0gc3QxO1xuXG4gICAgICAgICAgLy9zdW1kaWZmKHQyLCB4W2k2XSwgeFtpOF0sIHhbaTNdKTsgLy8ge3MsIGR9ICA8LS18IHthK2IsIGEtYn1cbiAgICAgICAgICAvL3N0MSA9IHhbaTZdOyB4W2k4XSA9IHQyICsgc3QxOyB4W2kzXSA9IHQyIC0gc3QxO1xuICAgICAgICAgIHhbaThdID0gdDIgKyB4W2k2XTtcbiAgICAgICAgICB4W2kzXSA9IHQyIC0geFtpNl07XG5cbiAgICAgICAgICAvL3N1bWRpZmZfcih0MSwgdDMpOyAvLyB7YSwgYn0gPC0tfCB7YStiLCBiLWF9XG4gICAgICAgICAgc3QxID0gdDMgLSB0MTtcbiAgICAgICAgICB0MSArPSB0MztcbiAgICAgICAgICB0MyA9IHN0MTtcblxuICAgICAgICAgIC8vc3VtZGlmZih0MywgeFtpMl0sIHhbaTRdLCB4W2k3XSk7IC8vIHtzLCBkfSAgPC0tfCB7YStiLCBhLWJ9XG4gICAgICAgICAgLy9zdDEgPSB4W2kyXTsgeFtpNF0gPSB0MyArIHN0MTsgeFtpN10gPSB0MyAtIHN0MTtcbiAgICAgICAgICB4W2k0XSA9IHQzICsgeFtpMl07XG4gICAgICAgICAgeFtpN10gPSB0MyAtIHhbaTJdO1xuXG4gICAgICAgICAgLy9zdW1kaWZmMyh4W2kxXSwgdDEsIHhbaTZdKTsgICAvLyB7YSwgYiwgZH0gPC0tfCB7YStiLCBiLCBhLWJ9XG4gICAgICAgICAgeFtpNl0gPSB4W2kxXSAtIHQxO1xuICAgICAgICAgIHhbaTFdICs9IHQxO1xuXG4gICAgICAgICAgLy9kaWZmc3VtM19yKHQ0LCB4W2k1XSwgeFtpMl0pOyAvLyB7YSwgYiwgc30gPC0tfCB7YSwgYi1hLCBhK2J9XG4gICAgICAgICAgeFtpMl0gPSB0NCArIHhbaTVdO1xuICAgICAgICAgIHhbaTVdIC09IHQ0O1xuICAgICAgICB9XG5cbiAgICAgICAgaXggPSAoaWQgPDwgMSkgLSBuMjtcbiAgICAgICAgaWQgPSBpZCA8PCAyO1xuXG4gICAgICB9IHdoaWxlIChpeCA8IG4pO1xuICAgIH1cbiAgfVxuXG4gIHdoaWxlICgtLWkpIHtcbiAgICBydmFsID0geFtpXTtcbiAgICBpdmFsID0geFtuLWktMV07XG4gICAgbWFnID0gYlNpICogc3FydChydmFsICogcnZhbCArIGl2YWwgKiBpdmFsKTtcblxuICAgIGlmIChtYWcgPiB0aGlzLnBlYWspIHtcbiAgICAgIHRoaXMucGVha0JhbmQgPSBpO1xuICAgICAgdGhpcy5wZWFrID0gbWFnO1xuICAgIH1cblxuICAgIHNwZWN0cnVtW2ldID0gbWFnO1xuICB9XG5cbiAgc3BlY3RydW1bMF0gPSBiU2kgKiB4WzBdO1xuXG4gIHJldHVybiBzcGVjdHJ1bTtcbn07XG5cbmZ1bmN0aW9uIFNhbXBsZXIoZmlsZSwgYnVmZmVyU2l6ZSwgc2FtcGxlUmF0ZSwgcGxheVN0YXJ0LCBwbGF5RW5kLCBsb29wU3RhcnQsIGxvb3BFbmQsIGxvb3BNb2RlKSB7XG4gIHRoaXMuZmlsZSA9IGZpbGU7XG4gIHRoaXMuYnVmZmVyU2l6ZSA9IGJ1ZmZlclNpemU7XG4gIHRoaXMuc2FtcGxlUmF0ZSA9IHNhbXBsZVJhdGU7XG4gIHRoaXMucGxheVN0YXJ0ICA9IHBsYXlTdGFydCB8fCAwOyAvLyAwJVxuICB0aGlzLnBsYXlFbmQgICAgPSBwbGF5RW5kICAgfHwgMTsgLy8gMTAwJVxuICB0aGlzLmxvb3BTdGFydCAgPSBsb29wU3RhcnQgfHwgMDtcbiAgdGhpcy5sb29wRW5kICAgID0gbG9vcEVuZCAgIHx8IDE7XG4gIHRoaXMubG9vcE1vZGUgICA9IGxvb3BNb2RlICB8fCBEU1AuT0ZGO1xuICB0aGlzLmxvYWRlZCAgICAgPSBmYWxzZTtcbiAgdGhpcy5zYW1wbGVzICAgID0gW107XG4gIHRoaXMuc2lnbmFsICAgICA9IG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyU2l6ZSk7XG4gIHRoaXMuZnJhbWVDb3VudCA9IDA7XG4gIHRoaXMuZW52ZWxvcGUgICA9IG51bGw7XG4gIHRoaXMuYW1wbGl0dWRlICA9IDE7XG4gIHRoaXMucm9vdEZyZXF1ZW5jeSA9IDExMDsgLy8gQTIgMTEwXG4gIHRoaXMuZnJlcXVlbmN5ICA9IDU1MDtcbiAgdGhpcy5zdGVwICAgICAgID0gdGhpcy5mcmVxdWVuY3kgLyB0aGlzLnJvb3RGcmVxdWVuY3k7XG4gIHRoaXMuZHVyYXRpb24gICA9IDA7XG4gIHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCA9IDA7XG4gIHRoaXMucGxheWhlYWQgICA9IDA7XG5cbiAgdmFyIGF1ZGlvID0gLyogbmV3IEF1ZGlvKCk7Ki8gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkFVRElPXCIpO1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdGhpcy5sb2FkU2FtcGxlcyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgdmFyIGJ1ZmZlciA9IERTUC5nZXRDaGFubmVsKERTUC5NSVgsIGV2ZW50LmZyYW1lQnVmZmVyKTtcbiAgICBmb3IgKCB2YXIgaSA9IDA7IGkgPCBidWZmZXIubGVuZ3RoOyBpKyspIHtcbiAgICAgIHNlbGYuc2FtcGxlcy5wdXNoKGJ1ZmZlcltpXSk7XG4gICAgfVxuICB9O1xuXG4gIHRoaXMubG9hZENvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gY29udmVydCBmbGV4aWJsZSBqcyBhcnJheSBpbnRvIGEgZmFzdCB0eXBlZCBhcnJheVxuICAgIHNlbGYuc2FtcGxlcyA9IG5ldyBGbG9hdDMyQXJyYXkoc2VsZi5zYW1wbGVzKTtcbiAgICBzZWxmLmxvYWRlZCA9IHRydWU7XG4gIH07XG5cbiAgdGhpcy5sb2FkTWV0YURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICBzZWxmLmR1cmF0aW9uID0gYXVkaW8uZHVyYXRpb247XG4gIH07XG5cbiAgYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcihcIk1vekF1ZGlvQXZhaWxhYmxlXCIsIHRoaXMubG9hZFNhbXBsZXMsIGZhbHNlKTtcbiAgYXVkaW8uYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRlZG1ldGFkYXRhXCIsIHRoaXMubG9hZE1ldGFEYXRhLCBmYWxzZSk7XG4gIGF1ZGlvLmFkZEV2ZW50TGlzdGVuZXIoXCJlbmRlZFwiLCB0aGlzLmxvYWRDb21wbGV0ZSwgZmFsc2UpO1xuICBhdWRpby5tdXRlZCA9IHRydWU7XG4gIGF1ZGlvLnNyYyA9IGZpbGU7XG4gIGF1ZGlvLnBsYXkoKTtcbn1cblxuU2FtcGxlci5wcm90b3R5cGUuYXBwbHlFbnZlbG9wZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmVudmVsb3BlLnByb2Nlc3ModGhpcy5zaWduYWwpO1xuICByZXR1cm4gdGhpcy5zaWduYWw7XG59O1xuXG5TYW1wbGVyLnByb3RvdHlwZS5nZW5lcmF0ZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZnJhbWVPZmZzZXQgPSB0aGlzLmZyYW1lQ291bnQgKiB0aGlzLmJ1ZmZlclNpemU7XG5cbiAgdmFyIGxvb3BXaWR0aCA9IHRoaXMucGxheUVuZCAqIHRoaXMuc2FtcGxlcy5sZW5ndGggLSB0aGlzLnBsYXlTdGFydCAqIHRoaXMuc2FtcGxlcy5sZW5ndGg7XG4gIHZhciBwbGF5U3RhcnRTYW1wbGVzID0gdGhpcy5wbGF5U3RhcnQgKiB0aGlzLnNhbXBsZXMubGVuZ3RoOyAvLyBpZSAwLjUgLT4gNTAlIG9mIHRoZSBsZW5ndGhcbiAgdmFyIHBsYXlFbmRTYW1wbGVzID0gdGhpcy5wbGF5RW5kICogdGhpcy5zYW1wbGVzLmxlbmd0aDsgLy8gaWUgMC41IC0+IDUwJSBvZiB0aGUgbGVuZ3RoXG4gIHZhciBvZmZzZXQ7XG5cbiAgZm9yICggdmFyIGkgPSAwOyBpIDwgdGhpcy5idWZmZXJTaXplOyBpKysgKSB7XG4gICAgc3dpdGNoICh0aGlzLmxvb3BNb2RlKSB7XG4gICAgICBjYXNlIERTUC5PRkY6XG4gICAgICAgIHRoaXMucGxheWhlYWQgPSBNYXRoLnJvdW5kKHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCAqIHRoaXMuc3RlcCArIHBsYXlTdGFydFNhbXBsZXMpO1xuICAgICAgICBpZiAodGhpcy5wbGF5aGVhZCA8ICh0aGlzLnBsYXlFbmQgKiB0aGlzLnNhbXBsZXMubGVuZ3RoKSApIHtcbiAgICAgICAgICB0aGlzLnNpZ25hbFtpXSA9IHRoaXMuc2FtcGxlc1t0aGlzLnBsYXloZWFkXSAqIHRoaXMuYW1wbGl0dWRlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuc2lnbmFsW2ldID0gMDtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBEU1AuRlc6XG4gICAgICAgIHRoaXMucGxheWhlYWQgPSBNYXRoLnJvdW5kKCh0aGlzLnNhbXBsZXNQcm9jZXNzZWQgKiB0aGlzLnN0ZXApICUgbG9vcFdpZHRoICsgcGxheVN0YXJ0U2FtcGxlcyk7XG4gICAgICAgIGlmICh0aGlzLnBsYXloZWFkIDwgKHRoaXMucGxheUVuZCAqIHRoaXMuc2FtcGxlcy5sZW5ndGgpICkge1xuICAgICAgICAgIHRoaXMuc2lnbmFsW2ldID0gdGhpcy5zYW1wbGVzW3RoaXMucGxheWhlYWRdICogdGhpcy5hbXBsaXR1ZGU7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgRFNQLkJXOlxuICAgICAgICB0aGlzLnBsYXloZWFkID0gcGxheUVuZFNhbXBsZXMgLSBNYXRoLnJvdW5kKCh0aGlzLnNhbXBsZXNQcm9jZXNzZWQgKiB0aGlzLnN0ZXApICUgbG9vcFdpZHRoKTtcbiAgICAgICAgaWYgKHRoaXMucGxheWhlYWQgPCAodGhpcy5wbGF5RW5kICogdGhpcy5zYW1wbGVzLmxlbmd0aCkgKSB7XG4gICAgICAgICAgdGhpcy5zaWduYWxbaV0gPSB0aGlzLnNhbXBsZXNbdGhpcy5wbGF5aGVhZF0gKiB0aGlzLmFtcGxpdHVkZTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBEU1AuRldCVzpcbiAgICAgICAgaWYgKCBNYXRoLmZsb29yKHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCAqIHRoaXMuc3RlcCAvIGxvb3BXaWR0aCkgJSAyID09PSAwICkge1xuICAgICAgICAgIHRoaXMucGxheWhlYWQgPSBNYXRoLnJvdW5kKCh0aGlzLnNhbXBsZXNQcm9jZXNzZWQgKiB0aGlzLnN0ZXApICUgbG9vcFdpZHRoICsgcGxheVN0YXJ0U2FtcGxlcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5wbGF5aGVhZCA9IHBsYXlFbmRTYW1wbGVzIC0gTWF0aC5yb3VuZCgodGhpcy5zYW1wbGVzUHJvY2Vzc2VkICogdGhpcy5zdGVwKSAlIGxvb3BXaWR0aCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMucGxheWhlYWQgPCAodGhpcy5wbGF5RW5kICogdGhpcy5zYW1wbGVzLmxlbmd0aCkgKSB7XG4gICAgICAgICAgdGhpcy5zaWduYWxbaV0gPSB0aGlzLnNhbXBsZXNbdGhpcy5wbGF5aGVhZF0gKiB0aGlzLmFtcGxpdHVkZTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgdGhpcy5zYW1wbGVzUHJvY2Vzc2VkKys7XG4gIH1cblxuICB0aGlzLmZyYW1lQ291bnQrKztcblxuICByZXR1cm4gdGhpcy5zaWduYWw7XG59O1xuXG5TYW1wbGVyLnByb3RvdHlwZS5zZXRGcmVxID0gZnVuY3Rpb24oZnJlcXVlbmN5KSB7XG4gICAgdmFyIHRvdGFsUHJvY2Vzc2VkID0gdGhpcy5zYW1wbGVzUHJvY2Vzc2VkICogdGhpcy5zdGVwO1xuICAgIHRoaXMuZnJlcXVlbmN5ID0gZnJlcXVlbmN5O1xuICAgIHRoaXMuc3RlcCA9IHRoaXMuZnJlcXVlbmN5IC8gdGhpcy5yb290RnJlcXVlbmN5O1xuICAgIHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCA9IE1hdGgucm91bmQodG90YWxQcm9jZXNzZWQvdGhpcy5zdGVwKTtcbn07XG5cblNhbXBsZXIucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCA9IDA7XG4gIHRoaXMucGxheWhlYWQgPSAwO1xufTtcblxuLyoqXG4gKiBPc2NpbGxhdG9yIGNsYXNzIGZvciBnZW5lcmF0aW5nIGFuZCBtb2RpZnlpbmcgc2lnbmFsc1xuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB0eXBlICAgICAgIEEgd2F2ZWZvcm0gY29uc3RhbnQgKGVnLiBEU1AuU0lORSlcbiAqIEBwYXJhbSB7TnVtYmVyfSBmcmVxdWVuY3kgIEluaXRpYWwgZnJlcXVlbmN5IG9mIHRoZSBzaWduYWxcbiAqIEBwYXJhbSB7TnVtYmVyfSBhbXBsaXR1ZGUgIEluaXRpYWwgYW1wbGl0dWRlIG9mIHRoZSBzaWduYWxcbiAqIEBwYXJhbSB7TnVtYmVyfSBidWZmZXJTaXplIFNpemUgb2YgdGhlIHNhbXBsZSBidWZmZXIgdG8gZ2VuZXJhdGVcbiAqIEBwYXJhbSB7TnVtYmVyfSBzYW1wbGVSYXRlIFRoZSBzYW1wbGUgcmF0ZSBvZiB0aGUgc2lnbmFsXG4gKlxuICogQGNvbnRydWN0b3JcbiAqL1xuZnVuY3Rpb24gT3NjaWxsYXRvcih0eXBlLCBmcmVxdWVuY3ksIGFtcGxpdHVkZSwgYnVmZmVyU2l6ZSwgc2FtcGxlUmF0ZSkge1xuICB0aGlzLmZyZXF1ZW5jeSAgPSBmcmVxdWVuY3k7XG4gIHRoaXMuYW1wbGl0dWRlICA9IGFtcGxpdHVkZTtcbiAgdGhpcy5idWZmZXJTaXplID0gYnVmZmVyU2l6ZTtcbiAgdGhpcy5zYW1wbGVSYXRlID0gc2FtcGxlUmF0ZTtcbiAgLy90aGlzLnB1bHNlV2lkdGggPSBwdWxzZVdpZHRoO1xuICB0aGlzLmZyYW1lQ291bnQgPSAwO1xuXG4gIHRoaXMud2F2ZVRhYmxlTGVuZ3RoID0gMjA0ODtcblxuICB0aGlzLmN5Y2xlc1BlclNhbXBsZSA9IGZyZXF1ZW5jeSAvIHNhbXBsZVJhdGU7XG5cbiAgdGhpcy5zaWduYWwgPSBuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlclNpemUpO1xuICB0aGlzLmVudmVsb3BlID0gbnVsbDtcblxuICBzd2l0Y2gocGFyc2VJbnQodHlwZSwgMTApKSB7XG4gICAgY2FzZSBEU1AuVFJJQU5HTEU6XG4gICAgICB0aGlzLmZ1bmMgPSBPc2NpbGxhdG9yLlRyaWFuZ2xlO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIERTUC5TQVc6XG4gICAgICB0aGlzLmZ1bmMgPSBPc2NpbGxhdG9yLlNhdztcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBEU1AuU1FVQVJFOlxuICAgICAgdGhpcy5mdW5jID0gT3NjaWxsYXRvci5TcXVhcmU7XG4gICAgICBicmVhaztcblxuICAgIGRlZmF1bHQ6XG4gICAgY2FzZSBEU1AuU0lORTpcbiAgICAgIHRoaXMuZnVuYyA9IE9zY2lsbGF0b3IuU2luZTtcbiAgICAgIGJyZWFrO1xuICB9XG5cbiAgdGhpcy5nZW5lcmF0ZVdhdmVUYWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgIE9zY2lsbGF0b3Iud2F2ZVRhYmxlW3RoaXMuZnVuY10gPSBuZXcgRmxvYXQzMkFycmF5KDIwNDgpO1xuICAgIHZhciB3YXZlVGFibGVUaW1lID0gdGhpcy53YXZlVGFibGVMZW5ndGggLyB0aGlzLnNhbXBsZVJhdGU7XG4gICAgdmFyIHdhdmVUYWJsZUh6ID0gMSAvIHdhdmVUYWJsZVRpbWU7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMud2F2ZVRhYmxlTGVuZ3RoOyBpKyspIHtcbiAgICAgIE9zY2lsbGF0b3Iud2F2ZVRhYmxlW3RoaXMuZnVuY11baV0gPSB0aGlzLmZ1bmMoaSAqIHdhdmVUYWJsZUh6L3RoaXMuc2FtcGxlUmF0ZSk7XG4gICAgfVxuICB9O1xuXG4gIGlmICggdHlwZW9mIE9zY2lsbGF0b3Iud2F2ZVRhYmxlID09PSAndW5kZWZpbmVkJyApIHtcbiAgICBPc2NpbGxhdG9yLndhdmVUYWJsZSA9IHt9O1xuICB9XG5cbiAgaWYgKCB0eXBlb2YgT3NjaWxsYXRvci53YXZlVGFibGVbdGhpcy5mdW5jXSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG4gICAgdGhpcy5nZW5lcmF0ZVdhdmVUYWJsZSgpO1xuICB9XG5cbiAgdGhpcy53YXZlVGFibGUgPSBPc2NpbGxhdG9yLndhdmVUYWJsZVt0aGlzLmZ1bmNdO1xufVxuXG4vKipcbiAqIFNldCB0aGUgYW1wbGl0dWRlIG9mIHRoZSBzaWduYWxcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gYW1wbGl0dWRlIFRoZSBhbXBsaXR1ZGUgb2YgdGhlIHNpZ25hbCAoYmV0d2VlbiAwIGFuZCAxKVxuICovXG5Pc2NpbGxhdG9yLnByb3RvdHlwZS5zZXRBbXAgPSBmdW5jdGlvbihhbXBsaXR1ZGUpIHtcbiAgaWYgKGFtcGxpdHVkZSA+PSAwICYmIGFtcGxpdHVkZSA8PSAxKSB7XG4gICAgdGhpcy5hbXBsaXR1ZGUgPSBhbXBsaXR1ZGU7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgXCJBbXBsaXR1ZGUgb3V0IG9mIHJhbmdlICgwLi4xKS5cIjtcbiAgfVxufTtcblxuLyoqXG4gKiBTZXQgdGhlIGZyZXF1ZW5jeSBvZiB0aGUgc2lnbmFsXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGZyZXF1ZW5jeSBUaGUgZnJlcXVlbmN5IG9mIHRoZSBzaWduYWxcbiAqL1xuT3NjaWxsYXRvci5wcm90b3R5cGUuc2V0RnJlcSA9IGZ1bmN0aW9uKGZyZXF1ZW5jeSkge1xuICB0aGlzLmZyZXF1ZW5jeSA9IGZyZXF1ZW5jeTtcbiAgdGhpcy5jeWNsZXNQZXJTYW1wbGUgPSBmcmVxdWVuY3kgLyB0aGlzLnNhbXBsZVJhdGU7XG59O1xuXG4vLyBBZGQgYW4gb3NjaWxsYXRvclxuT3NjaWxsYXRvci5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24ob3NjaWxsYXRvcikge1xuICBmb3IgKCB2YXIgaSA9IDA7IGkgPCB0aGlzLmJ1ZmZlclNpemU7IGkrKyApIHtcbiAgICAvL3RoaXMuc2lnbmFsW2ldICs9IG9zY2lsbGF0b3IudmFsdWVBdChpKTtcbiAgICB0aGlzLnNpZ25hbFtpXSArPSBvc2NpbGxhdG9yLnNpZ25hbFtpXTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLnNpZ25hbDtcbn07XG5cbi8vIEFkZCBhIHNpZ25hbCB0byB0aGUgY3VycmVudCBnZW5lcmF0ZWQgb3NjIHNpZ25hbFxuT3NjaWxsYXRvci5wcm90b3R5cGUuYWRkU2lnbmFsID0gZnVuY3Rpb24oc2lnbmFsKSB7XG4gIGZvciAoIHZhciBpID0gMDsgaSA8IHNpZ25hbC5sZW5ndGg7IGkrKyApIHtcbiAgICBpZiAoIGkgPj0gdGhpcy5idWZmZXJTaXplICkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHRoaXMuc2lnbmFsW2ldICs9IHNpZ25hbFtpXTtcblxuICAgIC8qXG4gICAgLy8gQ29uc3RyYWluIGFtcGxpdHVkZVxuICAgIGlmICggdGhpcy5zaWduYWxbaV0gPiAxICkge1xuICAgICAgdGhpcy5zaWduYWxbaV0gPSAxO1xuICAgIH0gZWxzZSBpZiAoIHRoaXMuc2lnbmFsW2ldIDwgLTEgKSB7XG4gICAgICB0aGlzLnNpZ25hbFtpXSA9IC0xO1xuICAgIH1cbiAgICAqL1xuICB9XG4gIHJldHVybiB0aGlzLnNpZ25hbDtcbn07XG5cbi8vIEFkZCBhbiBlbnZlbG9wZSB0byB0aGUgb3NjaWxsYXRvclxuT3NjaWxsYXRvci5wcm90b3R5cGUuYWRkRW52ZWxvcGUgPSBmdW5jdGlvbihlbnZlbG9wZSkge1xuICB0aGlzLmVudmVsb3BlID0gZW52ZWxvcGU7XG59O1xuXG5Pc2NpbGxhdG9yLnByb3RvdHlwZS5hcHBseUVudmVsb3BlID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuZW52ZWxvcGUucHJvY2Vzcyh0aGlzLnNpZ25hbCk7XG59O1xuXG5Pc2NpbGxhdG9yLnByb3RvdHlwZS52YWx1ZUF0ID0gZnVuY3Rpb24ob2Zmc2V0KSB7XG4gIHJldHVybiB0aGlzLndhdmVUYWJsZVtvZmZzZXQgJSB0aGlzLndhdmVUYWJsZUxlbmd0aF07XG59O1xuXG5Pc2NpbGxhdG9yLnByb3RvdHlwZS5nZW5lcmF0ZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZnJhbWVPZmZzZXQgPSB0aGlzLmZyYW1lQ291bnQgKiB0aGlzLmJ1ZmZlclNpemU7XG4gIHZhciBzdGVwID0gdGhpcy53YXZlVGFibGVMZW5ndGggKiB0aGlzLmZyZXF1ZW5jeSAvIHRoaXMuc2FtcGxlUmF0ZTtcbiAgdmFyIG9mZnNldDtcblxuICBmb3IgKCB2YXIgaSA9IDA7IGkgPCB0aGlzLmJ1ZmZlclNpemU7IGkrKyApIHtcbiAgICAvL3ZhciBzdGVwID0gKGZyYW1lT2Zmc2V0ICsgaSkgKiB0aGlzLmN5Y2xlc1BlclNhbXBsZSAlIDE7XG4gICAgLy90aGlzLnNpZ25hbFtpXSA9IHRoaXMuZnVuYyhzdGVwKSAqIHRoaXMuYW1wbGl0dWRlO1xuICAgIC8vdGhpcy5zaWduYWxbaV0gPSB0aGlzLnZhbHVlQXQoTWF0aC5yb3VuZCgoZnJhbWVPZmZzZXQgKyBpKSAqIHN0ZXApKSAqIHRoaXMuYW1wbGl0dWRlO1xuICAgIG9mZnNldCA9IE1hdGgucm91bmQoKGZyYW1lT2Zmc2V0ICsgaSkgKiBzdGVwKTtcbiAgICB0aGlzLnNpZ25hbFtpXSA9IHRoaXMud2F2ZVRhYmxlW29mZnNldCAlIHRoaXMud2F2ZVRhYmxlTGVuZ3RoXSAqIHRoaXMuYW1wbGl0dWRlO1xuICB9XG5cbiAgdGhpcy5mcmFtZUNvdW50Kys7XG5cbiAgcmV0dXJuIHRoaXMuc2lnbmFsO1xufTtcblxuT3NjaWxsYXRvci5TaW5lID0gZnVuY3Rpb24oc3RlcCkge1xuICByZXR1cm4gTWF0aC5zaW4oRFNQLlRXT19QSSAqIHN0ZXApO1xufTtcblxuT3NjaWxsYXRvci5TcXVhcmUgPSBmdW5jdGlvbihzdGVwKSB7XG4gIHJldHVybiBzdGVwIDwgMC41ID8gMSA6IC0xO1xufTtcblxuT3NjaWxsYXRvci5TYXcgPSBmdW5jdGlvbihzdGVwKSB7XG4gIHJldHVybiAyICogKHN0ZXAgLSBNYXRoLnJvdW5kKHN0ZXApKTtcbn07XG5cbk9zY2lsbGF0b3IuVHJpYW5nbGUgPSBmdW5jdGlvbihzdGVwKSB7XG4gIHJldHVybiAxIC0gNCAqIE1hdGguYWJzKE1hdGgucm91bmQoc3RlcCkgLSBzdGVwKTtcbn07XG5cbk9zY2lsbGF0b3IuUHVsc2UgPSBmdW5jdGlvbihzdGVwKSB7XG4gIC8vIHN0dWJcbn07XG5cbmZ1bmN0aW9uIEFEU1IoYXR0YWNrTGVuZ3RoLCBkZWNheUxlbmd0aCwgc3VzdGFpbkxldmVsLCBzdXN0YWluTGVuZ3RoLCByZWxlYXNlTGVuZ3RoLCBzYW1wbGVSYXRlKSB7XG4gIHRoaXMuc2FtcGxlUmF0ZSA9IHNhbXBsZVJhdGU7XG4gIC8vIExlbmd0aCBpbiBzZWNvbmRzXG4gIHRoaXMuYXR0YWNrTGVuZ3RoICA9IGF0dGFja0xlbmd0aDtcbiAgdGhpcy5kZWNheUxlbmd0aCAgID0gZGVjYXlMZW5ndGg7XG4gIHRoaXMuc3VzdGFpbkxldmVsICA9IHN1c3RhaW5MZXZlbDtcbiAgdGhpcy5zdXN0YWluTGVuZ3RoID0gc3VzdGFpbkxlbmd0aDtcbiAgdGhpcy5yZWxlYXNlTGVuZ3RoID0gcmVsZWFzZUxlbmd0aDtcbiAgdGhpcy5zYW1wbGVSYXRlICAgID0gc2FtcGxlUmF0ZTtcblxuICAvLyBMZW5ndGggaW4gc2FtcGxlc1xuICB0aGlzLmF0dGFja1NhbXBsZXMgID0gYXR0YWNrTGVuZ3RoICAqIHNhbXBsZVJhdGU7XG4gIHRoaXMuZGVjYXlTYW1wbGVzICAgPSBkZWNheUxlbmd0aCAgICogc2FtcGxlUmF0ZTtcbiAgdGhpcy5zdXN0YWluU2FtcGxlcyA9IHN1c3RhaW5MZW5ndGggKiBzYW1wbGVSYXRlO1xuICB0aGlzLnJlbGVhc2VTYW1wbGVzID0gcmVsZWFzZUxlbmd0aCAqIHNhbXBsZVJhdGU7XG5cbiAgLy8gVXBkYXRlcyB0aGUgZW52ZWxvcGUgc2FtcGxlIHBvc2l0aW9uc1xuICB0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuYXR0YWNrICAgICAgICAgPSAgICAgICAgICAgICAgICB0aGlzLmF0dGFja1NhbXBsZXM7XG4gICAgdGhpcy5kZWNheSAgICAgICAgICA9IHRoaXMuYXR0YWNrICArIHRoaXMuZGVjYXlTYW1wbGVzO1xuICAgIHRoaXMuc3VzdGFpbiAgICAgICAgPSB0aGlzLmRlY2F5ICAgKyB0aGlzLnN1c3RhaW5TYW1wbGVzO1xuICAgIHRoaXMucmVsZWFzZSAgICAgICAgPSB0aGlzLnN1c3RhaW4gKyB0aGlzLnJlbGVhc2VTYW1wbGVzO1xuICB9O1xuXG4gIHRoaXMudXBkYXRlKCk7XG5cbiAgdGhpcy5zYW1wbGVzUHJvY2Vzc2VkID0gMDtcbn1cblxuQURTUi5wcm90b3R5cGUubm90ZU9uID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCA9IDA7XG4gIHRoaXMuc3VzdGFpblNhbXBsZXMgPSB0aGlzLnN1c3RhaW5MZW5ndGggKiB0aGlzLnNhbXBsZVJhdGU7XG4gIHRoaXMudXBkYXRlKCk7XG59O1xuXG4vLyBTZW5kIGEgbm90ZSBvZmYgd2hlbiB1c2luZyBhIHN1c3RhaW4gb2YgaW5maW5pdHkgdG8gbGV0IHRoZSBlbnZlbG9wZSBlbnRlciB0aGUgcmVsZWFzZSBwaGFzZVxuQURTUi5wcm90b3R5cGUubm90ZU9mZiA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnN1c3RhaW5TYW1wbGVzID0gdGhpcy5zYW1wbGVzUHJvY2Vzc2VkIC0gdGhpcy5kZWNheVNhbXBsZXM7XG4gIHRoaXMudXBkYXRlKCk7XG59O1xuXG5BRFNSLnByb3RvdHlwZS5wcm9jZXNzU2FtcGxlID0gZnVuY3Rpb24oc2FtcGxlKSB7XG4gIHZhciBhbXBsaXR1ZGUgPSAwO1xuXG4gIGlmICggdGhpcy5zYW1wbGVzUHJvY2Vzc2VkIDw9IHRoaXMuYXR0YWNrICkge1xuICAgIGFtcGxpdHVkZSA9IDAgKyAoMSAtIDApICogKCh0aGlzLnNhbXBsZXNQcm9jZXNzZWQgLSAwKSAvICh0aGlzLmF0dGFjayAtIDApKTtcbiAgfSBlbHNlIGlmICggdGhpcy5zYW1wbGVzUHJvY2Vzc2VkID4gdGhpcy5hdHRhY2sgJiYgdGhpcy5zYW1wbGVzUHJvY2Vzc2VkIDw9IHRoaXMuZGVjYXkgKSB7XG4gICAgYW1wbGl0dWRlID0gMSArICh0aGlzLnN1c3RhaW5MZXZlbCAtIDEpICogKCh0aGlzLnNhbXBsZXNQcm9jZXNzZWQgLSB0aGlzLmF0dGFjaykgLyAodGhpcy5kZWNheSAtIHRoaXMuYXR0YWNrKSk7XG4gIH0gZWxzZSBpZiAoIHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCA+IHRoaXMuZGVjYXkgJiYgdGhpcy5zYW1wbGVzUHJvY2Vzc2VkIDw9IHRoaXMuc3VzdGFpbiApIHtcbiAgICBhbXBsaXR1ZGUgPSB0aGlzLnN1c3RhaW5MZXZlbDtcbiAgfSBlbHNlIGlmICggdGhpcy5zYW1wbGVzUHJvY2Vzc2VkID4gdGhpcy5zdXN0YWluICYmIHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCA8PSB0aGlzLnJlbGVhc2UgKSB7XG4gICAgYW1wbGl0dWRlID0gdGhpcy5zdXN0YWluTGV2ZWwgKyAoMCAtIHRoaXMuc3VzdGFpbkxldmVsKSAqICgodGhpcy5zYW1wbGVzUHJvY2Vzc2VkIC0gdGhpcy5zdXN0YWluKSAvICh0aGlzLnJlbGVhc2UgLSB0aGlzLnN1c3RhaW4pKTtcbiAgfVxuXG4gIHJldHVybiBzYW1wbGUgKiBhbXBsaXR1ZGU7XG59O1xuXG5BRFNSLnByb3RvdHlwZS52YWx1ZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgYW1wbGl0dWRlID0gMDtcblxuICBpZiAoIHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCA8PSB0aGlzLmF0dGFjayApIHtcbiAgICBhbXBsaXR1ZGUgPSAwICsgKDEgLSAwKSAqICgodGhpcy5zYW1wbGVzUHJvY2Vzc2VkIC0gMCkgLyAodGhpcy5hdHRhY2sgLSAwKSk7XG4gIH0gZWxzZSBpZiAoIHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCA+IHRoaXMuYXR0YWNrICYmIHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCA8PSB0aGlzLmRlY2F5ICkge1xuICAgIGFtcGxpdHVkZSA9IDEgKyAodGhpcy5zdXN0YWluTGV2ZWwgLSAxKSAqICgodGhpcy5zYW1wbGVzUHJvY2Vzc2VkIC0gdGhpcy5hdHRhY2spIC8gKHRoaXMuZGVjYXkgLSB0aGlzLmF0dGFjaykpO1xuICB9IGVsc2UgaWYgKCB0aGlzLnNhbXBsZXNQcm9jZXNzZWQgPiB0aGlzLmRlY2F5ICYmIHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCA8PSB0aGlzLnN1c3RhaW4gKSB7XG4gICAgYW1wbGl0dWRlID0gdGhpcy5zdXN0YWluTGV2ZWw7XG4gIH0gZWxzZSBpZiAoIHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCA+IHRoaXMuc3VzdGFpbiAmJiB0aGlzLnNhbXBsZXNQcm9jZXNzZWQgPD0gdGhpcy5yZWxlYXNlICkge1xuICAgIGFtcGxpdHVkZSA9IHRoaXMuc3VzdGFpbkxldmVsICsgKDAgLSB0aGlzLnN1c3RhaW5MZXZlbCkgKiAoKHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCAtIHRoaXMuc3VzdGFpbikgLyAodGhpcy5yZWxlYXNlIC0gdGhpcy5zdXN0YWluKSk7XG4gIH1cblxuICByZXR1cm4gYW1wbGl0dWRlO1xufTtcblxuQURTUi5wcm90b3R5cGUucHJvY2VzcyA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICBmb3IgKCB2YXIgaSA9IDA7IGkgPCBidWZmZXIubGVuZ3RoOyBpKysgKSB7XG4gICAgYnVmZmVyW2ldICo9IHRoaXMudmFsdWUoKTtcblxuICAgIHRoaXMuc2FtcGxlc1Byb2Nlc3NlZCsrO1xuICB9XG5cbiAgcmV0dXJuIGJ1ZmZlcjtcbn07XG5cblxuQURTUi5wcm90b3R5cGUuaXNBY3RpdmUgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCB0aGlzLnNhbXBsZXNQcm9jZXNzZWQgPiB0aGlzLnJlbGVhc2UgfHwgdGhpcy5zYW1wbGVzUHJvY2Vzc2VkID09PSAtMSApIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn07XG5cbkFEU1IucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5zYW1wbGVzUHJvY2Vzc2VkID0gLTE7XG59O1xuXG5mdW5jdGlvbiBJSVJGaWx0ZXIodHlwZSwgY3V0b2ZmLCByZXNvbmFuY2UsIHNhbXBsZVJhdGUpIHtcbiAgdGhpcy5zYW1wbGVSYXRlID0gc2FtcGxlUmF0ZTtcblxuICBzd2l0Y2godHlwZSkge1xuICAgIGNhc2UgRFNQLkxPV1BBU1M6XG4gICAgY2FzZSBEU1AuTFAxMjpcbiAgICAgIHRoaXMuZnVuYyA9IG5ldyBJSVJGaWx0ZXIuTFAxMihjdXRvZmYsIHJlc29uYW5jZSwgc2FtcGxlUmF0ZSk7XG4gICAgICBicmVhaztcbiAgfVxufVxuXG5JSVJGaWx0ZXIucHJvdG90eXBlLl9fZGVmaW5lR2V0dGVyX18oJ2N1dG9mZicsXG4gIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmZ1bmMuY3V0b2ZmO1xuICB9XG4pO1xuXG5JSVJGaWx0ZXIucHJvdG90eXBlLl9fZGVmaW5lR2V0dGVyX18oJ3Jlc29uYW5jZScsXG4gIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmZ1bmMucmVzb25hbmNlO1xuICB9XG4pO1xuXG5JSVJGaWx0ZXIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKGN1dG9mZiwgcmVzb25hbmNlKSB7XG4gIHRoaXMuZnVuYy5jYWxjQ29lZmYoY3V0b2ZmLCByZXNvbmFuY2UpO1xufTtcblxuSUlSRmlsdGVyLnByb3RvdHlwZS5wcm9jZXNzID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gIHRoaXMuZnVuYy5wcm9jZXNzKGJ1ZmZlcik7XG59O1xuXG4vLyBBZGQgYW4gZW52ZWxvcGUgdG8gdGhlIGZpbHRlclxuSUlSRmlsdGVyLnByb3RvdHlwZS5hZGRFbnZlbG9wZSA9IGZ1bmN0aW9uKGVudmVsb3BlKSB7XG4gIGlmICggZW52ZWxvcGUgaW5zdGFuY2VvZiBBRFNSICkge1xuICAgIHRoaXMuZnVuYy5hZGRFbnZlbG9wZShlbnZlbG9wZSk7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgXCJOb3QgYW4gZW52ZWxvcGUuXCI7XG4gIH1cbn07XG5cbklJUkZpbHRlci5MUDEyID0gZnVuY3Rpb24oY3V0b2ZmLCByZXNvbmFuY2UsIHNhbXBsZVJhdGUpIHtcbiAgdGhpcy5zYW1wbGVSYXRlID0gc2FtcGxlUmF0ZTtcbiAgdGhpcy52aWJyYVBvcyAgID0gMDtcbiAgdGhpcy52aWJyYVNwZWVkID0gMDtcbiAgdGhpcy5lbnZlbG9wZSA9IGZhbHNlO1xuXG4gIHRoaXMuY2FsY0NvZWZmID0gZnVuY3Rpb24oY3V0b2ZmLCByZXNvbmFuY2UpIHtcbiAgICB0aGlzLncgPSAyLjAgKiBNYXRoLlBJICogY3V0b2ZmIC8gdGhpcy5zYW1wbGVSYXRlO1xuICAgIHRoaXMucSA9IDEuMCAtIHRoaXMudyAvICgyLjAgKiAocmVzb25hbmNlICsgMC41IC8gKDEuMCArIHRoaXMudykpICsgdGhpcy53IC0gMi4wKTtcbiAgICB0aGlzLnIgPSB0aGlzLnEgKiB0aGlzLnE7XG4gICAgdGhpcy5jID0gdGhpcy5yICsgMS4wIC0gMi4wICogTWF0aC5jb3ModGhpcy53KSAqIHRoaXMucTtcblxuICAgIHRoaXMuY3V0b2ZmID0gY3V0b2ZmO1xuICAgIHRoaXMucmVzb25hbmNlID0gcmVzb25hbmNlO1xuICB9O1xuXG4gIHRoaXMuY2FsY0NvZWZmKGN1dG9mZiwgcmVzb25hbmNlKTtcblxuICB0aGlzLnByb2Nlc3MgPSBmdW5jdGlvbihidWZmZXIpIHtcbiAgICBmb3IgKCB2YXIgaSA9IDA7IGkgPCBidWZmZXIubGVuZ3RoOyBpKysgKSB7XG4gICAgICB0aGlzLnZpYnJhU3BlZWQgKz0gKGJ1ZmZlcltpXSAtIHRoaXMudmlicmFQb3MpICogdGhpcy5jO1xuICAgICAgdGhpcy52aWJyYVBvcyAgICs9IHRoaXMudmlicmFTcGVlZDtcbiAgICAgIHRoaXMudmlicmFTcGVlZCAqPSB0aGlzLnI7XG5cbiAgICAgIC8qXG4gICAgICB2YXIgdGVtcCA9IHRoaXMudmlicmFQb3M7XG5cbiAgICAgIGlmICggdGVtcCA+IDEuMCApIHtcbiAgICAgICAgdGVtcCA9IDEuMDtcbiAgICAgIH0gZWxzZSBpZiAoIHRlbXAgPCAtMS4wICkge1xuICAgICAgICB0ZW1wID0gLTEuMDtcbiAgICAgIH0gZWxzZSBpZiAoIHRlbXAgIT0gdGVtcCApIHtcbiAgICAgICAgdGVtcCA9IDE7XG4gICAgICB9XG5cbiAgICAgIGJ1ZmZlcltpXSA9IHRlbXA7XG4gICAgICAqL1xuXG4gICAgICBpZiAodGhpcy5lbnZlbG9wZSkge1xuICAgICAgICBidWZmZXJbaV0gPSAoYnVmZmVyW2ldICogKDEgLSB0aGlzLmVudmVsb3BlLnZhbHVlKCkpKSArICh0aGlzLnZpYnJhUG9zICogdGhpcy5lbnZlbG9wZS52YWx1ZSgpKTtcbiAgICAgICAgdGhpcy5lbnZlbG9wZS5zYW1wbGVzUHJvY2Vzc2VkKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBidWZmZXJbaV0gPSB0aGlzLnZpYnJhUG9zO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn07XG5cbklJUkZpbHRlci5MUDEyLnByb3RvdHlwZS5hZGRFbnZlbG9wZSA9IGZ1bmN0aW9uKGVudmVsb3BlKSB7XG4gIHRoaXMuZW52ZWxvcGUgPSBlbnZlbG9wZTtcbn07XG5cbmZ1bmN0aW9uIElJUkZpbHRlcjIodHlwZSwgY3V0b2ZmLCByZXNvbmFuY2UsIHNhbXBsZVJhdGUpIHtcbiAgdGhpcy50eXBlID0gdHlwZTtcbiAgdGhpcy5jdXRvZmYgPSBjdXRvZmY7XG4gIHRoaXMucmVzb25hbmNlID0gcmVzb25hbmNlO1xuICB0aGlzLnNhbXBsZVJhdGUgPSBzYW1wbGVSYXRlO1xuXG4gIHRoaXMuZiA9IEZsb2F0MzJBcnJheSg0KTtcbiAgdGhpcy5mWzBdID0gMC4wOyAvLyBscFxuICB0aGlzLmZbMV0gPSAwLjA7IC8vIGhwXG4gIHRoaXMuZlsyXSA9IDAuMDsgLy8gYnBcbiAgdGhpcy5mWzNdID0gMC4wOyAvLyBiclxuXG4gIHRoaXMuY2FsY0NvZWZmID0gZnVuY3Rpb24oY3V0b2ZmLCByZXNvbmFuY2UpIHtcbiAgICB0aGlzLmZyZXEgPSAyICogTWF0aC5zaW4oTWF0aC5QSSAqIE1hdGgubWluKDAuMjUsIGN1dG9mZi8odGhpcy5zYW1wbGVSYXRlKjIpKSk7XG4gICAgdGhpcy5kYW1wID0gTWF0aC5taW4oMiAqICgxIC0gTWF0aC5wb3cocmVzb25hbmNlLCAwLjI1KSksIE1hdGgubWluKDIsIDIvdGhpcy5mcmVxIC0gdGhpcy5mcmVxICogMC41KSk7XG4gIH07XG5cbiAgdGhpcy5jYWxjQ29lZmYoY3V0b2ZmLCByZXNvbmFuY2UpO1xufVxuXG5JSVJGaWx0ZXIyLnByb3RvdHlwZS5wcm9jZXNzID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gIHZhciBpbnB1dCwgb3V0cHV0O1xuICB2YXIgZiA9IHRoaXMuZjtcblxuICBmb3IgKCB2YXIgaSA9IDA7IGkgPCBidWZmZXIubGVuZ3RoOyBpKysgKSB7XG4gICAgaW5wdXQgPSBidWZmZXJbaV07XG5cbiAgICAvLyBmaXJzdCBwYXNzXG4gICAgZlszXSA9IGlucHV0IC0gdGhpcy5kYW1wICogZlsyXTtcbiAgICBmWzBdID0gZlswXSArIHRoaXMuZnJlcSAqIGZbMl07XG4gICAgZlsxXSA9IGZbM10gLSBmWzBdO1xuICAgIGZbMl0gPSB0aGlzLmZyZXEgKiBmWzFdICsgZlsyXTtcbiAgICBvdXRwdXQgPSAwLjUgKiBmW3RoaXMudHlwZV07XG5cbiAgICAvLyBzZWNvbmQgcGFzc1xuICAgIGZbM10gPSBpbnB1dCAtIHRoaXMuZGFtcCAqIGZbMl07XG4gICAgZlswXSA9IGZbMF0gKyB0aGlzLmZyZXEgKiBmWzJdO1xuICAgIGZbMV0gPSBmWzNdIC0gZlswXTtcbiAgICBmWzJdID0gdGhpcy5mcmVxICogZlsxXSArIGZbMl07XG4gICAgb3V0cHV0ICs9IDAuNSAqIGZbdGhpcy50eXBlXTtcblxuICAgIGlmICh0aGlzLmVudmVsb3BlKSB7XG4gICAgICBidWZmZXJbaV0gPSAoYnVmZmVyW2ldICogKDEgLSB0aGlzLmVudmVsb3BlLnZhbHVlKCkpKSArIChvdXRwdXQgKiB0aGlzLmVudmVsb3BlLnZhbHVlKCkpO1xuICAgICAgdGhpcy5lbnZlbG9wZS5zYW1wbGVzUHJvY2Vzc2VkKys7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJ1ZmZlcltpXSA9IG91dHB1dDtcbiAgICB9XG4gIH1cbn07XG5cbklJUkZpbHRlcjIucHJvdG90eXBlLmFkZEVudmVsb3BlID0gZnVuY3Rpb24oZW52ZWxvcGUpIHtcbiAgaWYgKCBlbnZlbG9wZSBpbnN0YW5jZW9mIEFEU1IgKSB7XG4gICAgdGhpcy5lbnZlbG9wZSA9IGVudmVsb3BlO1xuICB9IGVsc2Uge1xuICAgIHRocm93IFwiVGhpcyBpcyBub3QgYW4gZW52ZWxvcGUuXCI7XG4gIH1cbn07XG5cbklJUkZpbHRlcjIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKGN1dG9mZiwgcmVzb25hbmNlKSB7XG4gIHRoaXMuY2FsY0NvZWZmKGN1dG9mZiwgcmVzb25hbmNlKTtcbn07XG5cblxuXG5mdW5jdGlvbiBXaW5kb3dGdW5jdGlvbih0eXBlLCBhbHBoYSkge1xuICB0aGlzLmFscGhhID0gYWxwaGE7XG5cbiAgc3dpdGNoKHR5cGUpIHtcbiAgICBjYXNlIERTUC5CQVJUTEVUVDpcbiAgICAgIHRoaXMuZnVuYyA9IFdpbmRvd0Z1bmN0aW9uLkJhcnRsZXR0O1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIERTUC5CQVJUTEVUVEhBTk46XG4gICAgICB0aGlzLmZ1bmMgPSBXaW5kb3dGdW5jdGlvbi5CYXJ0bGV0dEhhbm47XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgRFNQLkJMQUNLTUFOOlxuICAgICAgdGhpcy5mdW5jID0gV2luZG93RnVuY3Rpb24uQmxhY2ttYW47XG4gICAgICB0aGlzLmFscGhhID0gdGhpcy5hbHBoYSB8fCAwLjE2O1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIERTUC5DT1NJTkU6XG4gICAgICB0aGlzLmZ1bmMgPSBXaW5kb3dGdW5jdGlvbi5Db3NpbmU7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgRFNQLkdBVVNTOlxuICAgICAgdGhpcy5mdW5jID0gV2luZG93RnVuY3Rpb24uR2F1c3M7XG4gICAgICB0aGlzLmFscGhhID0gdGhpcy5hbHBoYSB8fCAwLjI1O1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIERTUC5IQU1NSU5HOlxuICAgICAgdGhpcy5mdW5jID0gV2luZG93RnVuY3Rpb24uSGFtbWluZztcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBEU1AuSEFOTjpcbiAgICAgIHRoaXMuZnVuYyA9IFdpbmRvd0Z1bmN0aW9uLkhhbm47XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgRFNQLkxBTkNaT1M6XG4gICAgICB0aGlzLmZ1bmMgPSBXaW5kb3dGdW5jdGlvbi5MYW5jem96O1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIERTUC5SRUNUQU5HVUxBUjpcbiAgICAgIHRoaXMuZnVuYyA9IFdpbmRvd0Z1bmN0aW9uLlJlY3Rhbmd1bGFyO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIERTUC5UUklBTkdVTEFSOlxuICAgICAgdGhpcy5mdW5jID0gV2luZG93RnVuY3Rpb24uVHJpYW5ndWxhcjtcbiAgICAgIGJyZWFrO1xuICB9XG59XG5cbldpbmRvd0Z1bmN0aW9uLnByb3RvdHlwZS5wcm9jZXNzID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gIHZhciBsZW5ndGggPSBidWZmZXIubGVuZ3RoO1xuICBmb3IgKCB2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKyApIHtcbiAgICBidWZmZXJbaV0gKj0gdGhpcy5mdW5jKGxlbmd0aCwgaSwgdGhpcy5hbHBoYSk7XG4gIH1cbiAgcmV0dXJuIGJ1ZmZlcjtcbn07XG5cbldpbmRvd0Z1bmN0aW9uLkJhcnRsZXR0ID0gZnVuY3Rpb24obGVuZ3RoLCBpbmRleCkge1xuICByZXR1cm4gMiAvIChsZW5ndGggLSAxKSAqICgobGVuZ3RoIC0gMSkgLyAyIC0gTWF0aC5hYnMoaW5kZXggLSAobGVuZ3RoIC0gMSkgLyAyKSk7XG59O1xuXG5XaW5kb3dGdW5jdGlvbi5CYXJ0bGV0dEhhbm4gPSBmdW5jdGlvbihsZW5ndGgsIGluZGV4KSB7XG4gIHJldHVybiAwLjYyIC0gMC40OCAqIE1hdGguYWJzKGluZGV4IC8gKGxlbmd0aCAtIDEpIC0gMC41KSAtIDAuMzggKiBNYXRoLmNvcyhEU1AuVFdPX1BJICogaW5kZXggLyAobGVuZ3RoIC0gMSkpO1xufTtcblxuV2luZG93RnVuY3Rpb24uQmxhY2ttYW4gPSBmdW5jdGlvbihsZW5ndGgsIGluZGV4LCBhbHBoYSkge1xuICB2YXIgYTAgPSAoMSAtIGFscGhhKSAvIDI7XG4gIHZhciBhMSA9IDAuNTtcbiAgdmFyIGEyID0gYWxwaGEgLyAyO1xuXG4gIHJldHVybiBhMCAtIGExICogTWF0aC5jb3MoRFNQLlRXT19QSSAqIGluZGV4IC8gKGxlbmd0aCAtIDEpKSArIGEyICogTWF0aC5jb3MoNCAqIE1hdGguUEkgKiBpbmRleCAvIChsZW5ndGggLSAxKSk7XG59O1xuXG5XaW5kb3dGdW5jdGlvbi5Db3NpbmUgPSBmdW5jdGlvbihsZW5ndGgsIGluZGV4KSB7XG4gIHJldHVybiBNYXRoLmNvcyhNYXRoLlBJICogaW5kZXggLyAobGVuZ3RoIC0gMSkgLSBNYXRoLlBJIC8gMik7XG59O1xuXG5XaW5kb3dGdW5jdGlvbi5HYXVzcyA9IGZ1bmN0aW9uKGxlbmd0aCwgaW5kZXgsIGFscGhhKSB7XG4gIHJldHVybiBNYXRoLnBvdyhNYXRoLkUsIC0wLjUgKiBNYXRoLnBvdygoaW5kZXggLSAobGVuZ3RoIC0gMSkgLyAyKSAvIChhbHBoYSAqIChsZW5ndGggLSAxKSAvIDIpLCAyKSk7XG59O1xuXG5XaW5kb3dGdW5jdGlvbi5IYW1taW5nID0gZnVuY3Rpb24obGVuZ3RoLCBpbmRleCkge1xuICByZXR1cm4gMC41NCAtIDAuNDYgKiBNYXRoLmNvcyhEU1AuVFdPX1BJICogaW5kZXggLyAobGVuZ3RoIC0gMSkpO1xufTtcblxuV2luZG93RnVuY3Rpb24uSGFubiA9IGZ1bmN0aW9uKGxlbmd0aCwgaW5kZXgpIHtcbiAgcmV0dXJuIDAuNSAqICgxIC0gTWF0aC5jb3MoRFNQLlRXT19QSSAqIGluZGV4IC8gKGxlbmd0aCAtIDEpKSk7XG59O1xuXG5XaW5kb3dGdW5jdGlvbi5MYW5jem9zID0gZnVuY3Rpb24obGVuZ3RoLCBpbmRleCkge1xuICB2YXIgeCA9IDIgKiBpbmRleCAvIChsZW5ndGggLSAxKSAtIDE7XG4gIHJldHVybiBNYXRoLnNpbihNYXRoLlBJICogeCkgLyAoTWF0aC5QSSAqIHgpO1xufTtcblxuV2luZG93RnVuY3Rpb24uUmVjdGFuZ3VsYXIgPSBmdW5jdGlvbihsZW5ndGgsIGluZGV4KSB7XG4gIHJldHVybiAxO1xufTtcblxuV2luZG93RnVuY3Rpb24uVHJpYW5ndWxhciA9IGZ1bmN0aW9uKGxlbmd0aCwgaW5kZXgpIHtcbiAgcmV0dXJuIDIgLyBsZW5ndGggKiAobGVuZ3RoIC8gMiAtIE1hdGguYWJzKGluZGV4IC0gKGxlbmd0aCAtIDEpIC8gMikpO1xufTtcblxuZnVuY3Rpb24gc2luaCAoYXJnKSB7XG4gIC8vIFJldHVybnMgdGhlIGh5cGVyYm9saWMgc2luZSBvZiB0aGUgbnVtYmVyLCBkZWZpbmVkIGFzIChleHAobnVtYmVyKSAtIGV4cCgtbnVtYmVyKSkvMlxuICAvL1xuICAvLyB2ZXJzaW9uOiAxMDA0LjIzMTRcbiAgLy8gZGlzY3VzcyBhdDogaHR0cDovL3BocGpzLm9yZy9mdW5jdGlvbnMvc2luaCAgICAvLyArICAgb3JpZ2luYWwgYnk6IE9ubm8gTWFyc21hblxuICAvLyAqICAgICBleGFtcGxlIDE6IHNpbmgoLTAuOTgzNDMzMDM0ODgyNTkwOSk7XG4gIC8vICogICAgIHJldHVybnMgMTogLTEuMTQ5Nzk3MTQwMjYzNjUwMlxuICByZXR1cm4gKE1hdGguZXhwKGFyZykgLSBNYXRoLmV4cCgtYXJnKSkvMjtcbn1cblxuLypcbiAqICBCaXF1YWQgZmlsdGVyXG4gKlxuICogIENyZWF0ZWQgYnkgUmljYXJkIE1hcnhlciA8ZW1haWxAcmljYXJkbWFyeGVyLmNvbT4gb24gMjAxMC0wNS0yMy5cbiAqICBDb3B5cmlnaHQgMjAxMCBSaWNhcmQgTWFyeGVyLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqL1xuLy8gSW1wbGVtZW50YXRpb24gYmFzZWQgb246XG4vLyBodHRwOi8vd3d3Lm11c2ljZHNwLm9yZy9maWxlcy9BdWRpby1FUS1Db29rYm9vay50eHRcbmZ1bmN0aW9uIEJpcXVhZCh0eXBlLCBzYW1wbGVSYXRlKSB7XG4gIHRoaXMuRnMgPSBzYW1wbGVSYXRlO1xuICB0aGlzLnR5cGUgPSB0eXBlOyAgLy8gdHlwZSBvZiB0aGUgZmlsdGVyXG4gIHRoaXMucGFyYW1ldGVyVHlwZSA9IERTUC5ROyAvLyB0eXBlIG9mIHRoZSBwYXJhbWV0ZXJcblxuICB0aGlzLnhfMV9sID0gMDtcbiAgdGhpcy54XzJfbCA9IDA7XG4gIHRoaXMueV8xX2wgPSAwO1xuICB0aGlzLnlfMl9sID0gMDtcblxuICB0aGlzLnhfMV9yID0gMDtcbiAgdGhpcy54XzJfciA9IDA7XG4gIHRoaXMueV8xX3IgPSAwO1xuICB0aGlzLnlfMl9yID0gMDtcblxuICB0aGlzLmIwID0gMTtcbiAgdGhpcy5hMCA9IDE7XG5cbiAgdGhpcy5iMSA9IDA7XG4gIHRoaXMuYTEgPSAwO1xuXG4gIHRoaXMuYjIgPSAwO1xuICB0aGlzLmEyID0gMDtcblxuICB0aGlzLmIwYTAgPSB0aGlzLmIwIC8gdGhpcy5hMDtcbiAgdGhpcy5iMWEwID0gdGhpcy5iMSAvIHRoaXMuYTA7XG4gIHRoaXMuYjJhMCA9IHRoaXMuYjIgLyB0aGlzLmEwO1xuICB0aGlzLmExYTAgPSB0aGlzLmExIC8gdGhpcy5hMDtcbiAgdGhpcy5hMmEwID0gdGhpcy5hMiAvIHRoaXMuYTA7XG5cbiAgdGhpcy5mMCA9IDMwMDA7ICAgLy8gXCJ3aGVyZXZlciBpdCdzIGhhcHBlbmluJywgbWFuLlwiICBDZW50ZXIgRnJlcXVlbmN5IG9yXG4gICAgICAgICAgICAgICAgICAgIC8vIENvcm5lciBGcmVxdWVuY3ksIG9yIHNoZWxmIG1pZHBvaW50IGZyZXF1ZW5jeSwgZGVwZW5kaW5nXG4gICAgICAgICAgICAgICAgICAgIC8vIG9uIHdoaWNoIGZpbHRlciB0eXBlLiAgVGhlIFwic2lnbmlmaWNhbnQgZnJlcXVlbmN5XCIuXG5cbiAgdGhpcy5kQmdhaW4gPSAxMjsgLy8gdXNlZCBvbmx5IGZvciBwZWFraW5nIGFuZCBzaGVsdmluZyBmaWx0ZXJzXG5cbiAgdGhpcy5RID0gMTsgICAgICAgLy8gdGhlIEVFIGtpbmQgb2YgZGVmaW5pdGlvbiwgZXhjZXB0IGZvciBwZWFraW5nRVEgaW4gd2hpY2ggQSpRIGlzXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSBjbGFzc2ljIEVFIFEuICBUaGF0IGFkanVzdG1lbnQgaW4gZGVmaW5pdGlvbiB3YXMgbWFkZSBzbyB0aGF0XG4gICAgICAgICAgICAgICAgICAgIC8vIGEgYm9vc3Qgb2YgTiBkQiBmb2xsb3dlZCBieSBhIGN1dCBvZiBOIGRCIGZvciBpZGVudGljYWwgUSBhbmRcbiAgICAgICAgICAgICAgICAgICAgLy8gZjAvRnMgcmVzdWx0cyBpbiBhIHByZWNpc2VseSBmbGF0IHVuaXR5IGdhaW4gZmlsdGVyIG9yIFwid2lyZVwiLlxuXG4gIHRoaXMuQlcgPSAtMzsgICAgIC8vIHRoZSBiYW5kd2lkdGggaW4gb2N0YXZlcyAoYmV0d2VlbiAtMyBkQiBmcmVxdWVuY2llcyBmb3IgQlBGXG4gICAgICAgICAgICAgICAgICAgIC8vIGFuZCBub3RjaCBvciBiZXR3ZWVuIG1pZHBvaW50IChkQmdhaW4vMikgZ2FpbiBmcmVxdWVuY2llcyBmb3JcbiAgICAgICAgICAgICAgICAgICAgLy8gcGVha2luZyBFUVxuXG4gIHRoaXMuUyA9IDE7ICAgICAgIC8vIGEgXCJzaGVsZiBzbG9wZVwiIHBhcmFtZXRlciAoZm9yIHNoZWx2aW5nIEVRIG9ubHkpLiAgV2hlbiBTID0gMSxcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIHNoZWxmIHNsb3BlIGlzIGFzIHN0ZWVwIGFzIGl0IGNhbiBiZSBhbmQgcmVtYWluIG1vbm90b25pY2FsbHlcbiAgICAgICAgICAgICAgICAgICAgLy8gaW5jcmVhc2luZyBvciBkZWNyZWFzaW5nIGdhaW4gd2l0aCBmcmVxdWVuY3kuICBUaGUgc2hlbGYgc2xvcGUsIGluXG4gICAgICAgICAgICAgICAgICAgIC8vIGRCL29jdGF2ZSwgcmVtYWlucyBwcm9wb3J0aW9uYWwgdG8gUyBmb3IgYWxsIG90aGVyIHZhbHVlcyBmb3IgYVxuICAgICAgICAgICAgICAgICAgICAvLyBmaXhlZCBmMC9GcyBhbmQgZEJnYWluLlxuXG4gIHRoaXMuY29lZmZpY2llbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGIgPSBbdGhpcy5iMCwgdGhpcy5iMSwgdGhpcy5iMl07XG4gICAgdmFyIGEgPSBbdGhpcy5hMCwgdGhpcy5hMSwgdGhpcy5hMl07XG4gICAgcmV0dXJuIHtiOiBiLCBhOmF9O1xuICB9O1xuXG4gIHRoaXMuc2V0RmlsdGVyVHlwZSA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgIHRoaXMucmVjYWxjdWxhdGVDb2VmZmljaWVudHMoKTtcbiAgfTtcblxuICB0aGlzLnNldFNhbXBsZVJhdGUgPSBmdW5jdGlvbihyYXRlKSB7XG4gICAgdGhpcy5GcyA9IHJhdGU7XG4gICAgdGhpcy5yZWNhbGN1bGF0ZUNvZWZmaWNpZW50cygpO1xuICB9O1xuXG4gIHRoaXMuc2V0USA9IGZ1bmN0aW9uKHEpIHtcbiAgICB0aGlzLnBhcmFtZXRlclR5cGUgPSBEU1AuUTtcbiAgICB0aGlzLlEgPSBNYXRoLm1heChNYXRoLm1pbihxLCAxMTUuMCksIDAuMDAxKTtcbiAgICB0aGlzLnJlY2FsY3VsYXRlQ29lZmZpY2llbnRzKCk7XG4gIH07XG5cbiAgdGhpcy5zZXRCVyA9IGZ1bmN0aW9uKGJ3KSB7XG4gICAgdGhpcy5wYXJhbWV0ZXJUeXBlID0gRFNQLkJXO1xuICAgIHRoaXMuQlcgPSBidztcbiAgICB0aGlzLnJlY2FsY3VsYXRlQ29lZmZpY2llbnRzKCk7XG4gIH07XG5cbiAgdGhpcy5zZXRTID0gZnVuY3Rpb24ocykge1xuICAgIHRoaXMucGFyYW1ldGVyVHlwZSA9IERTUC5TO1xuICAgIHRoaXMuUyA9IE1hdGgubWF4KE1hdGgubWluKHMsIDUuMCksIDAuMDAwMSk7XG4gICAgdGhpcy5yZWNhbGN1bGF0ZUNvZWZmaWNpZW50cygpO1xuICB9O1xuXG4gIHRoaXMuc2V0RjAgPSBmdW5jdGlvbihmcmVxKSB7XG4gICAgdGhpcy5mMCA9IGZyZXE7XG4gICAgdGhpcy5yZWNhbGN1bGF0ZUNvZWZmaWNpZW50cygpO1xuICB9O1xuXG4gIHRoaXMuc2V0RGJHYWluID0gZnVuY3Rpb24oZykge1xuICAgIHRoaXMuZEJnYWluID0gZztcbiAgICB0aGlzLnJlY2FsY3VsYXRlQ29lZmZpY2llbnRzKCk7XG4gIH07XG5cbiAgdGhpcy5yZWNhbGN1bGF0ZUNvZWZmaWNpZW50cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBBO1xuICAgIGlmICh0eXBlID09PSBEU1AuUEVBS0lOR19FUSB8fCB0eXBlID09PSBEU1AuTE9XX1NIRUxGIHx8IHR5cGUgPT09IERTUC5ISUdIX1NIRUxGICkge1xuICAgICAgQSA9IE1hdGgucG93KDEwLCAodGhpcy5kQmdhaW4vNDApKTsgIC8vIGZvciBwZWFraW5nIGFuZCBzaGVsdmluZyBFUSBmaWx0ZXJzIG9ubHlcbiAgICB9IGVsc2Uge1xuICAgICAgQSAgPSBNYXRoLnNxcnQoIE1hdGgucG93KDEwLCAodGhpcy5kQmdhaW4vMjApKSApO1xuICAgIH1cblxuICAgIHZhciB3MCA9IERTUC5UV09fUEkgKiB0aGlzLmYwIC8gdGhpcy5GcztcblxuICAgIHZhciBjb3N3MCA9IE1hdGguY29zKHcwKTtcbiAgICB2YXIgc2ludzAgPSBNYXRoLnNpbih3MCk7XG5cbiAgICB2YXIgYWxwaGEgPSAwO1xuXG4gICAgc3dpdGNoICh0aGlzLnBhcmFtZXRlclR5cGUpIHtcbiAgICAgIGNhc2UgRFNQLlE6XG4gICAgICAgIGFscGhhID0gc2ludzAvKDIqdGhpcy5RKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgRFNQLkJXOlxuICAgICAgICBhbHBoYSA9IHNpbncwICogc2luaCggTWF0aC5MTjIvMiAqIHRoaXMuQlcgKiB3MC9zaW53MCApO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBEU1AuUzpcbiAgICAgICAgYWxwaGEgPSBzaW53MC8yICogTWF0aC5zcXJ0KCAoQSArIDEvQSkqKDEvdGhpcy5TIC0gMSkgKyAyICk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAgICBGWUk6IFRoZSByZWxhdGlvbnNoaXAgYmV0d2VlbiBiYW5kd2lkdGggYW5kIFEgaXNcbiAgICAgICAgICAgICAxL1EgPSAyKnNpbmgobG4oMikvMipCVyp3MC9zaW4odzApKSAgICAgKGRpZ2l0YWwgZmlsdGVyIHcgQkxUKVxuICAgICAgICBvciAgIDEvUSA9IDIqc2luaChsbigyKS8yKkJXKSAgICAgICAgICAgICAoYW5hbG9nIGZpbHRlciBwcm90b3R5cGUpXG5cbiAgICAgICAgVGhlIHJlbGF0aW9uc2hpcCBiZXR3ZWVuIHNoZWxmIHNsb3BlIGFuZCBRIGlzXG4gICAgICAgICAgICAgMS9RID0gc3FydCgoQSArIDEvQSkqKDEvUyAtIDEpICsgMilcbiAgICAqL1xuXG4gICAgdmFyIGNvZWZmO1xuXG4gICAgc3dpdGNoICh0aGlzLnR5cGUpIHtcbiAgICAgIGNhc2UgRFNQLkxQRjogICAgICAgLy8gSChzKSA9IDEgLyAoc14yICsgcy9RICsgMSlcbiAgICAgICAgdGhpcy5iMCA9ICAoMSAtIGNvc3cwKS8yO1xuICAgICAgICB0aGlzLmIxID0gICAxIC0gY29zdzA7XG4gICAgICAgIHRoaXMuYjIgPSAgKDEgLSBjb3N3MCkvMjtcbiAgICAgICAgdGhpcy5hMCA9ICAgMSArIGFscGhhO1xuICAgICAgICB0aGlzLmExID0gIC0yICogY29zdzA7XG4gICAgICAgIHRoaXMuYTIgPSAgIDEgLSBhbHBoYTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgRFNQLkhQRjogICAgICAgLy8gSChzKSA9IHNeMiAvIChzXjIgKyBzL1EgKyAxKVxuICAgICAgICB0aGlzLmIwID0gICgxICsgY29zdzApLzI7XG4gICAgICAgIHRoaXMuYjEgPSAtKDEgKyBjb3N3MCk7XG4gICAgICAgIHRoaXMuYjIgPSAgKDEgKyBjb3N3MCkvMjtcbiAgICAgICAgdGhpcy5hMCA9ICAgMSArIGFscGhhO1xuICAgICAgICB0aGlzLmExID0gIC0yICogY29zdzA7XG4gICAgICAgIHRoaXMuYTIgPSAgIDEgLSBhbHBoYTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgRFNQLkJQRl9DT05TVEFOVF9TS0lSVDogICAgICAgLy8gSChzKSA9IHMgLyAoc14yICsgcy9RICsgMSkgIChjb25zdGFudCBza2lydCBnYWluLCBwZWFrIGdhaW4gPSBRKVxuICAgICAgICB0aGlzLmIwID0gICBzaW53MC8yO1xuICAgICAgICB0aGlzLmIxID0gICAwO1xuICAgICAgICB0aGlzLmIyID0gIC1zaW53MC8yO1xuICAgICAgICB0aGlzLmEwID0gICAxICsgYWxwaGE7XG4gICAgICAgIHRoaXMuYTEgPSAgLTIqY29zdzA7XG4gICAgICAgIHRoaXMuYTIgPSAgIDEgLSBhbHBoYTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgRFNQLkJQRl9DT05TVEFOVF9QRUFLOiAgICAgICAvLyBIKHMpID0gKHMvUSkgLyAoc14yICsgcy9RICsgMSkgICAgICAoY29uc3RhbnQgMCBkQiBwZWFrIGdhaW4pXG4gICAgICAgIHRoaXMuYjAgPSAgIGFscGhhO1xuICAgICAgICB0aGlzLmIxID0gICAwO1xuICAgICAgICB0aGlzLmIyID0gIC1hbHBoYTtcbiAgICAgICAgdGhpcy5hMCA9ICAgMSArIGFscGhhO1xuICAgICAgICB0aGlzLmExID0gIC0yKmNvc3cwO1xuICAgICAgICB0aGlzLmEyID0gICAxIC0gYWxwaGE7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIERTUC5OT1RDSDogICAgIC8vIEgocykgPSAoc14yICsgMSkgLyAoc14yICsgcy9RICsgMSlcbiAgICAgICAgdGhpcy5iMCA9ICAgMTtcbiAgICAgICAgdGhpcy5iMSA9ICAtMipjb3N3MDtcbiAgICAgICAgdGhpcy5iMiA9ICAgMTtcbiAgICAgICAgdGhpcy5hMCA9ICAgMSArIGFscGhhO1xuICAgICAgICB0aGlzLmExID0gIC0yKmNvc3cwO1xuICAgICAgICB0aGlzLmEyID0gICAxIC0gYWxwaGE7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIERTUC5BUEY6ICAgICAgIC8vIEgocykgPSAoc14yIC0gcy9RICsgMSkgLyAoc14yICsgcy9RICsgMSlcbiAgICAgICAgdGhpcy5iMCA9ICAgMSAtIGFscGhhO1xuICAgICAgICB0aGlzLmIxID0gIC0yKmNvc3cwO1xuICAgICAgICB0aGlzLmIyID0gICAxICsgYWxwaGE7XG4gICAgICAgIHRoaXMuYTAgPSAgIDEgKyBhbHBoYTtcbiAgICAgICAgdGhpcy5hMSA9ICAtMipjb3N3MDtcbiAgICAgICAgdGhpcy5hMiA9ICAgMSAtIGFscGhhO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBEU1AuUEVBS0lOR19FUTogIC8vIEgocykgPSAoc14yICsgcyooQS9RKSArIDEpIC8gKHNeMiArIHMvKEEqUSkgKyAxKVxuICAgICAgICB0aGlzLmIwID0gICAxICsgYWxwaGEqQTtcbiAgICAgICAgdGhpcy5iMSA9ICAtMipjb3N3MDtcbiAgICAgICAgdGhpcy5iMiA9ICAgMSAtIGFscGhhKkE7XG4gICAgICAgIHRoaXMuYTAgPSAgIDEgKyBhbHBoYS9BO1xuICAgICAgICB0aGlzLmExID0gIC0yKmNvc3cwO1xuICAgICAgICB0aGlzLmEyID0gICAxIC0gYWxwaGEvQTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgRFNQLkxPV19TSEVMRjogICAvLyBIKHMpID0gQSAqIChzXjIgKyAoc3FydChBKS9RKSpzICsgQSkvKEEqc14yICsgKHNxcnQoQSkvUSkqcyArIDEpXG4gICAgICAgIGNvZWZmID0gc2ludzAgKiBNYXRoLnNxcnQoIChBXjIgKyAxKSooMS90aGlzLlMgLSAxKSArIDIqQSApO1xuICAgICAgICB0aGlzLmIwID0gICAgQSooKEErMSkgLSAoQS0xKSpjb3N3MCArIGNvZWZmKTtcbiAgICAgICAgdGhpcy5iMSA9ICAyKkEqKChBLTEpIC0gKEErMSkqY29zdzApO1xuICAgICAgICB0aGlzLmIyID0gICAgQSooKEErMSkgLSAoQS0xKSpjb3N3MCAtIGNvZWZmKTtcbiAgICAgICAgdGhpcy5hMCA9ICAgICAgIChBKzEpICsgKEEtMSkqY29zdzAgKyBjb2VmZjtcbiAgICAgICAgdGhpcy5hMSA9ICAgLTIqKChBLTEpICsgKEErMSkqY29zdzApO1xuICAgICAgICB0aGlzLmEyID0gICAgICAgKEErMSkgKyAoQS0xKSpjb3N3MCAtIGNvZWZmO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBEU1AuSElHSF9TSEVMRjogICAvLyBIKHMpID0gQSAqIChBKnNeMiArIChzcXJ0KEEpL1EpKnMgKyAxKS8oc14yICsgKHNxcnQoQSkvUSkqcyArIEEpXG4gICAgICAgIGNvZWZmID0gc2ludzAgKiBNYXRoLnNxcnQoIChBXjIgKyAxKSooMS90aGlzLlMgLSAxKSArIDIqQSApO1xuICAgICAgICB0aGlzLmIwID0gICAgQSooKEErMSkgKyAoQS0xKSpjb3N3MCArIGNvZWZmKTtcbiAgICAgICAgdGhpcy5iMSA9IC0yKkEqKChBLTEpICsgKEErMSkqY29zdzApO1xuICAgICAgICB0aGlzLmIyID0gICAgQSooKEErMSkgKyAoQS0xKSpjb3N3MCAtIGNvZWZmKTtcbiAgICAgICAgdGhpcy5hMCA9ICAgICAgIChBKzEpIC0gKEEtMSkqY29zdzAgKyBjb2VmZjtcbiAgICAgICAgdGhpcy5hMSA9ICAgIDIqKChBLTEpIC0gKEErMSkqY29zdzApO1xuICAgICAgICB0aGlzLmEyID0gICAgICAgKEErMSkgLSAoQS0xKSpjb3N3MCAtIGNvZWZmO1xuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICB0aGlzLmIwYTAgPSB0aGlzLmIwL3RoaXMuYTA7XG4gICAgdGhpcy5iMWEwID0gdGhpcy5iMS90aGlzLmEwO1xuICAgIHRoaXMuYjJhMCA9IHRoaXMuYjIvdGhpcy5hMDtcbiAgICB0aGlzLmExYTAgPSB0aGlzLmExL3RoaXMuYTA7XG4gICAgdGhpcy5hMmEwID0gdGhpcy5hMi90aGlzLmEwO1xuICB9O1xuXG4gIHRoaXMucHJvY2VzcyA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgICAgLy95W25dID0gKGIwL2EwKSp4W25dICsgKGIxL2EwKSp4W24tMV0gKyAoYjIvYTApKnhbbi0yXVxuICAgICAgLy8gICAgICAgLSAoYTEvYTApKnlbbi0xXSAtIChhMi9hMCkqeVtuLTJdXG5cbiAgICAgIHZhciBsZW4gPSBidWZmZXIubGVuZ3RoO1xuICAgICAgdmFyIG91dHB1dCA9IG5ldyBGbG9hdDMyQXJyYXkobGVuKTtcblxuICAgICAgZm9yICggdmFyIGk9MDsgaTxidWZmZXIubGVuZ3RoOyBpKysgKSB7XG4gICAgICAgIG91dHB1dFtpXSA9IHRoaXMuYjBhMCpidWZmZXJbaV0gKyB0aGlzLmIxYTAqdGhpcy54XzFfbCArIHRoaXMuYjJhMCp0aGlzLnhfMl9sIC0gdGhpcy5hMWEwKnRoaXMueV8xX2wgLSB0aGlzLmEyYTAqdGhpcy55XzJfbDtcbiAgICAgICAgdGhpcy55XzJfbCA9IHRoaXMueV8xX2w7XG4gICAgICAgIHRoaXMueV8xX2wgPSBvdXRwdXRbaV07XG4gICAgICAgIHRoaXMueF8yX2wgPSB0aGlzLnhfMV9sO1xuICAgICAgICB0aGlzLnhfMV9sID0gYnVmZmVyW2ldO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb3V0cHV0O1xuICB9O1xuXG4gIHRoaXMucHJvY2Vzc1N0ZXJlbyA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgICAgLy95W25dID0gKGIwL2EwKSp4W25dICsgKGIxL2EwKSp4W24tMV0gKyAoYjIvYTApKnhbbi0yXVxuICAgICAgLy8gICAgICAgLSAoYTEvYTApKnlbbi0xXSAtIChhMi9hMCkqeVtuLTJdXG5cbiAgICAgIHZhciBsZW4gPSBidWZmZXIubGVuZ3RoO1xuICAgICAgdmFyIG91dHB1dCA9IG5ldyBGbG9hdDMyQXJyYXkobGVuKTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW4vMjsgaSsrKSB7XG4gICAgICAgIG91dHB1dFsyKmldID0gdGhpcy5iMGEwKmJ1ZmZlclsyKmldICsgdGhpcy5iMWEwKnRoaXMueF8xX2wgKyB0aGlzLmIyYTAqdGhpcy54XzJfbCAtIHRoaXMuYTFhMCp0aGlzLnlfMV9sIC0gdGhpcy5hMmEwKnRoaXMueV8yX2w7XG4gICAgICAgIHRoaXMueV8yX2wgPSB0aGlzLnlfMV9sO1xuICAgICAgICB0aGlzLnlfMV9sID0gb3V0cHV0WzIqaV07XG4gICAgICAgIHRoaXMueF8yX2wgPSB0aGlzLnhfMV9sO1xuICAgICAgICB0aGlzLnhfMV9sID0gYnVmZmVyWzIqaV07XG5cbiAgICAgICAgb3V0cHV0WzIqaSsxXSA9IHRoaXMuYjBhMCpidWZmZXJbMippKzFdICsgdGhpcy5iMWEwKnRoaXMueF8xX3IgKyB0aGlzLmIyYTAqdGhpcy54XzJfciAtIHRoaXMuYTFhMCp0aGlzLnlfMV9yIC0gdGhpcy5hMmEwKnRoaXMueV8yX3I7XG4gICAgICAgIHRoaXMueV8yX3IgPSB0aGlzLnlfMV9yO1xuICAgICAgICB0aGlzLnlfMV9yID0gb3V0cHV0WzIqaSsxXTtcbiAgICAgICAgdGhpcy54XzJfciA9IHRoaXMueF8xX3I7XG4gICAgICAgIHRoaXMueF8xX3IgPSBidWZmZXJbMippKzFdO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb3V0cHV0O1xuICB9O1xufVxuXG4vKlxuICogIE1hZ25pdHVkZSB0byBkZWNpYmVsc1xuICpcbiAqICBDcmVhdGVkIGJ5IFJpY2FyZCBNYXJ4ZXIgPGVtYWlsQHJpY2FyZG1hcnhlci5jb20+IG9uIDIwMTAtMDUtMjMuXG4gKiAgQ29weXJpZ2h0IDIwMTAgUmljYXJkIE1hcnhlci4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiAgQGJ1ZmZlciBhcnJheSBvZiBtYWduaXR1ZGVzIHRvIGNvbnZlcnQgdG8gZGVjaWJlbHNcbiAqXG4gKiAgQHJldHVybnMgdGhlIGFycmF5IGluIGRlY2liZWxzXG4gKlxuICovXG5EU1AubWFnMmRiID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gIHZhciBtaW5EYiA9IC0xMjA7XG4gIHZhciBtaW5NYWcgPSBNYXRoLnBvdygxMC4wLCBtaW5EYiAvIDIwLjApO1xuXG4gIHZhciBsb2cgPSBNYXRoLmxvZztcbiAgdmFyIG1heCA9IE1hdGgubWF4O1xuXG4gIHZhciByZXN1bHQgPSBGbG9hdDMyQXJyYXkoYnVmZmVyLmxlbmd0aCk7XG4gIGZvciAodmFyIGk9MDsgaTxidWZmZXIubGVuZ3RoOyBpKyspIHtcbiAgICByZXN1bHRbaV0gPSAyMC4wKmxvZyhtYXgoYnVmZmVyW2ldLCBtaW5NYWcpKTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKlxuICogIEZyZXF1ZW5jeSByZXNwb25zZVxuICpcbiAqICBDcmVhdGVkIGJ5IFJpY2FyZCBNYXJ4ZXIgPGVtYWlsQHJpY2FyZG1hcnhlci5jb20+IG9uIDIwMTAtMDUtMjMuXG4gKiAgQ29weXJpZ2h0IDIwMTAgUmljYXJkIE1hcnhlci4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiAgQ2FsY3VsYXRlcyB0aGUgZnJlcXVlbmN5IHJlc3BvbnNlIGF0IHRoZSBnaXZlbiBwb2ludHMuXG4gKlxuICogIEBiIGIgY29lZmZpY2llbnRzIG9mIHRoZSBmaWx0ZXJcbiAqICBAYSBhIGNvZWZmaWNpZW50cyBvZiB0aGUgZmlsdGVyXG4gKiAgQHcgdyBwb2ludHMgKG5vcm1hbGx5IGJldHdlZW4gLVBJIGFuZCBQSSkgd2hlcmUgdG8gY2FsY3VsYXRlIHRoZSBmcmVxdWVuY3kgcmVzcG9uc2VcbiAqXG4gKiAgQHJldHVybnMgdGhlIGZyZXF1ZW5jeSByZXNwb25zZSBpbiBtYWduaXR1ZGVcbiAqXG4gKi9cbkRTUC5mcmVxeiA9IGZ1bmN0aW9uKGIsIGEsIHcpIHtcbiAgdmFyIGksIGo7XG5cbiAgaWYgKCF3KSB7XG4gICAgdyA9IEZsb2F0MzJBcnJheSgyMDApO1xuICAgIGZvciAoaT0wO2k8dy5sZW5ndGg7IGkrKykge1xuICAgICAgd1tpXSA9IERTUC5UV09fUEkvdy5sZW5ndGggKiBpIC0gTWF0aC5QSTtcbiAgICB9XG4gIH1cblxuICB2YXIgcmVzdWx0ID0gRmxvYXQzMkFycmF5KHcubGVuZ3RoKTtcblxuICB2YXIgc3FydCA9IE1hdGguc3FydDtcbiAgdmFyIGNvcyA9IE1hdGguY29zO1xuICB2YXIgc2luID0gTWF0aC5zaW47XG5cbiAgZm9yIChpPTA7IGk8dy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBudW1lcmF0b3IgPSB7cmVhbDowLjAsIGltYWc6MC4wfTtcbiAgICBmb3IgKGo9MDsgajxiLmxlbmd0aDsgaisrKSB7XG4gICAgICBudW1lcmF0b3IucmVhbCArPSBiW2pdICogY29zKC1qKndbaV0pO1xuICAgICAgbnVtZXJhdG9yLmltYWcgKz0gYltqXSAqIHNpbigtaip3W2ldKTtcbiAgICB9XG5cbiAgICB2YXIgZGVub21pbmF0b3IgPSB7cmVhbDowLjAsIGltYWc6MC4wfTtcbiAgICBmb3IgKGo9MDsgajxhLmxlbmd0aDsgaisrKSB7XG4gICAgICBkZW5vbWluYXRvci5yZWFsICs9IGFbal0gKiBjb3MoLWoqd1tpXSk7XG4gICAgICBkZW5vbWluYXRvci5pbWFnICs9IGFbal0gKiBzaW4oLWoqd1tpXSk7XG4gICAgfVxuXG4gICAgcmVzdWx0W2ldID0gIHNxcnQobnVtZXJhdG9yLnJlYWwqbnVtZXJhdG9yLnJlYWwgKyBudW1lcmF0b3IuaW1hZypudW1lcmF0b3IuaW1hZykgLyBzcXJ0KGRlbm9taW5hdG9yLnJlYWwqZGVub21pbmF0b3IucmVhbCArIGRlbm9taW5hdG9yLmltYWcqZGVub21pbmF0b3IuaW1hZyk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuLypcbiAqICBHcmFwaGljYWwgRXF1YWxpemVyXG4gKlxuICogIEltcGxlbWVudGF0aW9uIG9mIGEgZ3JhcGhpYyBlcXVhbGl6ZXIgd2l0aCBhIGNvbmZpZ3VyYWJsZSBiYW5kcy1wZXItb2N0YXZlXG4gKiAgYW5kIG1pbmltdW0gYW5kIG1heGltdW0gZnJlcXVlbmNpZXNcbiAqXG4gKiAgQ3JlYXRlZCBieSBSaWNhcmQgTWFyeGVyIDxlbWFpbEByaWNhcmRtYXJ4ZXIuY29tPiBvbiAyMDEwLTA1LTIzLlxuICogIENvcHlyaWdodCAyMDEwIFJpY2FyZCBNYXJ4ZXIuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICovXG5mdW5jdGlvbiBHcmFwaGljYWxFcShzYW1wbGVSYXRlKSB7XG4gIHRoaXMuRlMgPSBzYW1wbGVSYXRlO1xuICB0aGlzLm1pbkZyZXEgPSA0MC4wO1xuICB0aGlzLm1heEZyZXEgPSAxNjAwMC4wO1xuXG4gIHRoaXMuYmFuZHNQZXJPY3RhdmUgPSAxLjA7XG5cbiAgdGhpcy5maWx0ZXJzID0gW107XG4gIHRoaXMuZnJlcXpzID0gW107XG5cbiAgdGhpcy5jYWxjdWxhdGVGcmVxenMgPSB0cnVlO1xuXG4gIHRoaXMucmVjYWxjdWxhdGVGaWx0ZXJzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGJhbmRDb3VudCA9IE1hdGgucm91bmQoTWF0aC5sb2codGhpcy5tYXhGcmVxL3RoaXMubWluRnJlcSkgKiB0aGlzLmJhbmRzUGVyT2N0YXZlLyBNYXRoLkxOMik7XG5cbiAgICB0aGlzLmZpbHRlcnMgPSBbXTtcbiAgICBmb3IgKHZhciBpPTA7IGk8YmFuZENvdW50OyBpKyspIHtcbiAgICAgIHZhciBmcmVxID0gdGhpcy5taW5GcmVxKihNYXRoLnBvdygyLCBpL3RoaXMuYmFuZHNQZXJPY3RhdmUpKTtcbiAgICAgIHZhciBuZXdGaWx0ZXIgPSBuZXcgQmlxdWFkKERTUC5QRUFLSU5HX0VRLCB0aGlzLkZTKTtcbiAgICAgIG5ld0ZpbHRlci5zZXREYkdhaW4oMCk7XG4gICAgICBuZXdGaWx0ZXIuc2V0QlcoMS90aGlzLmJhbmRzUGVyT2N0YXZlKTtcbiAgICAgIG5ld0ZpbHRlci5zZXRGMChmcmVxKTtcbiAgICAgIHRoaXMuZmlsdGVyc1tpXSA9IG5ld0ZpbHRlcjtcbiAgICAgIHRoaXMucmVjYWxjdWxhdGVGcmVxeihpKTtcbiAgICB9XG4gIH07XG5cbiAgdGhpcy5zZXRNaW5pbXVtRnJlcXVlbmN5ID0gZnVuY3Rpb24oZnJlcSkge1xuICAgIHRoaXMubWluRnJlcSA9IGZyZXE7XG4gICAgdGhpcy5yZWNhbGN1bGF0ZUZpbHRlcnMoKTtcbiAgfTtcblxuICB0aGlzLnNldE1heGltdW1GcmVxdWVuY3kgPSBmdW5jdGlvbihmcmVxKSB7XG4gICAgdGhpcy5tYXhGcmVxID0gZnJlcTtcbiAgICB0aGlzLnJlY2FsY3VsYXRlRmlsdGVycygpO1xuICB9O1xuXG4gIHRoaXMuc2V0QmFuZHNQZXJPY3RhdmUgPSBmdW5jdGlvbihiYW5kcykge1xuICAgIHRoaXMuYmFuZHNQZXJPY3RhdmUgPSBiYW5kcztcbiAgICB0aGlzLnJlY2FsY3VsYXRlRmlsdGVycygpO1xuICB9O1xuXG4gIHRoaXMuc2V0QmFuZEdhaW4gPSBmdW5jdGlvbihiYW5kSW5kZXgsIGdhaW4pIHtcbiAgICBpZiAoYmFuZEluZGV4IDwgMCB8fCBiYW5kSW5kZXggPiAodGhpcy5maWx0ZXJzLmxlbmd0aC0xKSkge1xuICAgICAgdGhyb3cgXCJUaGUgYmFuZCBpbmRleCBvZiB0aGUgZ3JhcGhpY2FsIGVxdWFsaXplciBpcyBvdXQgb2YgYm91bmRzLlwiO1xuICAgIH1cblxuICAgIGlmICghZ2Fpbikge1xuICAgICAgdGhyb3cgXCJBIGdhaW4gbXVzdCBiZSBwYXNzZWQuXCI7XG4gICAgfVxuXG4gICAgdGhpcy5maWx0ZXJzW2JhbmRJbmRleF0uc2V0RGJHYWluKGdhaW4pO1xuICAgIHRoaXMucmVjYWxjdWxhdGVGcmVxeihiYW5kSW5kZXgpO1xuICB9O1xuXG4gIHRoaXMucmVjYWxjdWxhdGVGcmVxeiA9IGZ1bmN0aW9uKGJhbmRJbmRleCkge1xuICAgIGlmICghdGhpcy5jYWxjdWxhdGVGcmVxenMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoYmFuZEluZGV4IDwgMCB8fCBiYW5kSW5kZXggPiAodGhpcy5maWx0ZXJzLmxlbmd0aC0xKSkge1xuICAgICAgdGhyb3cgXCJUaGUgYmFuZCBpbmRleCBvZiB0aGUgZ3JhcGhpY2FsIGVxdWFsaXplciBpcyBvdXQgb2YgYm91bmRzLiBcIiArIGJhbmRJbmRleCArIFwiIGlzIG91dCBvZiBbXCIgKyAwICsgXCIsIFwiICsgdGhpcy5maWx0ZXJzLmxlbmd0aC0xICsgXCJdXCI7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLncpIHtcbiAgICAgIHRoaXMudyA9IEZsb2F0MzJBcnJheSg0MDApO1xuICAgICAgZm9yICh2YXIgaT0wOyBpPHRoaXMudy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgdGhpcy53W2ldID0gTWF0aC5QSS90aGlzLncubGVuZ3RoICogaTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgYiA9IFt0aGlzLmZpbHRlcnNbYmFuZEluZGV4XS5iMCwgdGhpcy5maWx0ZXJzW2JhbmRJbmRleF0uYjEsIHRoaXMuZmlsdGVyc1tiYW5kSW5kZXhdLmIyXTtcbiAgICB2YXIgYSA9IFt0aGlzLmZpbHRlcnNbYmFuZEluZGV4XS5hMCwgdGhpcy5maWx0ZXJzW2JhbmRJbmRleF0uYTEsIHRoaXMuZmlsdGVyc1tiYW5kSW5kZXhdLmEyXTtcblxuICAgIHRoaXMuZnJlcXpzW2JhbmRJbmRleF0gPSBEU1AubWFnMmRiKERTUC5mcmVxeihiLCBhLCB0aGlzLncpKTtcbiAgfTtcblxuICB0aGlzLnByb2Nlc3MgPSBmdW5jdGlvbihidWZmZXIpIHtcbiAgICB2YXIgb3V0cHV0ID0gYnVmZmVyO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmZpbHRlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG91dHB1dCA9IHRoaXMuZmlsdGVyc1tpXS5wcm9jZXNzKG91dHB1dCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfTtcblxuICB0aGlzLnByb2Nlc3NTdGVyZW8gPSBmdW5jdGlvbihidWZmZXIpIHtcbiAgICB2YXIgb3V0cHV0ID0gYnVmZmVyO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmZpbHRlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG91dHB1dCA9IHRoaXMuZmlsdGVyc1tpXS5wcm9jZXNzU3RlcmVvKG91dHB1dCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfTtcbn1cblxuLyoqXG4gKiBNdWx0aURlbGF5IGVmZmVjdCBieSBBbG1lciBUaGllIChodHRwOi8vY29kZS5hbG1lcm9zLmNvbSkuXG4gKiBDb3B5cmlnaHQgMjAxMCBBbG1lciBUaGllLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogRXhhbXBsZTogaHR0cDovL2NvZGUuYWxtZXJvcy5jb20vY29kZS1leGFtcGxlcy9kZWxheS1maXJlZm94LWF1ZGlvLWFwaS9cbiAqXG4gKiBUaGlzIGlzIGEgZGVsYXkgdGhhdCBmZWVkcyBpdCdzIG93biBkZWxheWVkIHNpZ25hbCBiYWNrIGludG8gaXRzIGNpcmN1bGFyXG4gKiBidWZmZXIuIEFsc28ga25vd24gYXMgYSBDb21iRmlsdGVyLlxuICpcbiAqIENvbXBhdGlibGUgd2l0aCBpbnRlcmxlYXZlZCBzdGVyZW8gKG9yIG1vcmUgY2hhbm5lbCkgYnVmZmVycyBhbmRcbiAqIG5vbi1pbnRlcmxlYXZlZCBtb25vIGJ1ZmZlcnMuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG1heERlbGF5SW5TYW1wbGVzU2l6ZSBNYXhpbXVtIHBvc3NpYmxlIGRlbGF5IGluIHNhbXBsZXMgKHNpemUgb2YgY2lyY3VsYXIgYnVmZmVyKVxuICogQHBhcmFtIHtOdW1iZXJ9IGRlbGF5SW5TYW1wbGVzIEluaXRpYWwgZGVsYXkgaW4gc2FtcGxlc1xuICogQHBhcmFtIHtOdW1iZXJ9IG1hc3RlclZvbHVtZSBJbml0aWFsIG1hc3RlciB2b2x1bWUuIEZsb2F0IHZhbHVlOiAwLjAgKHNpbGVuY2UpLCAxLjAgKG5vcm1hbCksID4xLjAgKGFtcGxpZnkpXG4gKiBAcGFyYW0ge051bWJlcn0gZGVsYXlWb2x1bWUgSW5pdGlhbCBmZWVkYmFjayBkZWxheSB2b2x1bWUuIEZsb2F0IHZhbHVlOiAwLjAgKHNpbGVuY2UpLCAxLjAgKG5vcm1hbCksID4xLjAgKGFtcGxpZnkpXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIE11bHRpRGVsYXkobWF4RGVsYXlJblNhbXBsZXNTaXplLCBkZWxheUluU2FtcGxlcywgbWFzdGVyVm9sdW1lLCBkZWxheVZvbHVtZSkge1xuICB0aGlzLmRlbGF5QnVmZmVyU2FtcGxlcyAgID0gbmV3IEZsb2F0MzJBcnJheShtYXhEZWxheUluU2FtcGxlc1NpemUpOyAvLyBUaGUgbWF4aW11bSBzaXplIG9mIGRlbGF5XG4gIHRoaXMuZGVsYXlJbnB1dFBvaW50ZXIgICAgID0gZGVsYXlJblNhbXBsZXM7XG4gIHRoaXMuZGVsYXlPdXRwdXRQb2ludGVyICAgPSAwO1xuXG4gIHRoaXMuZGVsYXlJblNhbXBsZXMgICA9IGRlbGF5SW5TYW1wbGVzO1xuICB0aGlzLm1hc3RlclZvbHVtZSAgICAgPSBtYXN0ZXJWb2x1bWU7XG4gIHRoaXMuZGVsYXlWb2x1bWUgICAgID0gZGVsYXlWb2x1bWU7XG59XG5cbi8qKlxuICogQ2hhbmdlIHRoZSBkZWxheSB0aW1lIGluIHNhbXBsZXMuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGRlbGF5SW5TYW1wbGVzIERlbGF5IGluIHNhbXBsZXNcbiAqL1xuTXVsdGlEZWxheS5wcm90b3R5cGUuc2V0RGVsYXlJblNhbXBsZXMgPSBmdW5jdGlvbiAoZGVsYXlJblNhbXBsZXMpIHtcbiAgdGhpcy5kZWxheUluU2FtcGxlcyA9IGRlbGF5SW5TYW1wbGVzO1xuXG4gIHRoaXMuZGVsYXlJbnB1dFBvaW50ZXIgPSB0aGlzLmRlbGF5T3V0cHV0UG9pbnRlciArIGRlbGF5SW5TYW1wbGVzO1xuXG4gIGlmICh0aGlzLmRlbGF5SW5wdXRQb2ludGVyID49IHRoaXMuZGVsYXlCdWZmZXJTYW1wbGVzLmxlbmd0aC0xKSB7XG4gICAgdGhpcy5kZWxheUlucHV0UG9pbnRlciA9IHRoaXMuZGVsYXlJbnB1dFBvaW50ZXIgLSB0aGlzLmRlbGF5QnVmZmVyU2FtcGxlcy5sZW5ndGg7XG4gIH1cbn07XG5cbi8qKlxuICogQ2hhbmdlIHRoZSBtYXN0ZXIgdm9sdW1lLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBtYXN0ZXJWb2x1bWUgRmxvYXQgdmFsdWU6IDAuMCAoc2lsZW5jZSksIDEuMCAobm9ybWFsKSwgPjEuMCAoYW1wbGlmeSlcbiAqL1xuTXVsdGlEZWxheS5wcm90b3R5cGUuc2V0TWFzdGVyVm9sdW1lID0gZnVuY3Rpb24obWFzdGVyVm9sdW1lKSB7XG4gIHRoaXMubWFzdGVyVm9sdW1lID0gbWFzdGVyVm9sdW1lO1xufTtcblxuLyoqXG4gKiBDaGFuZ2UgdGhlIGRlbGF5IGZlZWRiYWNrIHZvbHVtZS5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gZGVsYXlWb2x1bWUgRmxvYXQgdmFsdWU6IDAuMCAoc2lsZW5jZSksIDEuMCAobm9ybWFsKSwgPjEuMCAoYW1wbGlmeSlcbiAqL1xuTXVsdGlEZWxheS5wcm90b3R5cGUuc2V0RGVsYXlWb2x1bWUgPSBmdW5jdGlvbihkZWxheVZvbHVtZSkge1xuICB0aGlzLmRlbGF5Vm9sdW1lID0gZGVsYXlWb2x1bWU7XG59O1xuXG4vKipcbiAqIFByb2Nlc3MgYSBnaXZlbiBpbnRlcmxlYXZlZCBvciBtb25vIG5vbi1pbnRlcmxlYXZlZCBmbG9hdCB2YWx1ZSBBcnJheSBhbmQgYWRkcyB0aGUgZGVsYXllZCBhdWRpby5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBzYW1wbGVzIEFycmF5IGNvbnRhaW5pbmcgRmxvYXQgdmFsdWVzIG9yIGEgRmxvYXQzMkFycmF5XG4gKlxuICogQHJldHVybnMgQSBuZXcgRmxvYXQzMkFycmF5IGludGVybGVhdmVkIG9yIG1vbm8gbm9uLWludGVybGVhdmVkIGFzIHdhcyBmZWQgdG8gdGhpcyBmdW5jdGlvbi5cbiAqL1xuTXVsdGlEZWxheS5wcm90b3R5cGUucHJvY2VzcyA9IGZ1bmN0aW9uKHNhbXBsZXMpIHtcbiAgLy8gTkIuIE1ha2UgYSBjb3B5IHRvIHB1dCBpbiB0aGUgb3V0cHV0IHNhbXBsZXMgdG8gcmV0dXJuLlxuICB2YXIgb3V0cHV0U2FtcGxlcyA9IG5ldyBGbG9hdDMyQXJyYXkoc2FtcGxlcy5sZW5ndGgpO1xuXG4gIGZvciAodmFyIGk9MDsgaTxzYW1wbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gZGVsYXlCdWZmZXJTYW1wbGVzIGNvdWxkIGNvbnRhaW4gaW5pdGlhbCBOVUxMJ3MsIHJldHVybiBzaWxlbmNlIGluIHRoYXQgY2FzZVxuICAgIHZhciBkZWxheVNhbXBsZSA9ICh0aGlzLmRlbGF5QnVmZmVyU2FtcGxlc1t0aGlzLmRlbGF5T3V0cHV0UG9pbnRlcl0gPT09IG51bGwgPyAwLjAgOiB0aGlzLmRlbGF5QnVmZmVyU2FtcGxlc1t0aGlzLmRlbGF5T3V0cHV0UG9pbnRlcl0pO1xuXG4gICAgLy8gTWl4IG5vcm1hbCBhdWRpbyBkYXRhIHdpdGggZGVsYXllZCBhdWRpb1xuICAgIHZhciBzYW1wbGUgPSAoZGVsYXlTYW1wbGUgKiB0aGlzLmRlbGF5Vm9sdW1lKSArIHNhbXBsZXNbaV07XG5cbiAgICAvLyBBZGQgYXVkaW8gZGF0YSB3aXRoIHRoZSBkZWxheSBpbiB0aGUgZGVsYXkgYnVmZmVyXG4gICAgdGhpcy5kZWxheUJ1ZmZlclNhbXBsZXNbdGhpcy5kZWxheUlucHV0UG9pbnRlcl0gPSBzYW1wbGU7XG5cbiAgICAvLyBSZXR1cm4gdGhlIGF1ZGlvIHdpdGggZGVsYXkgbWl4XG4gICAgb3V0cHV0U2FtcGxlc1tpXSA9IHNhbXBsZSAqIHRoaXMubWFzdGVyVm9sdW1lO1xuXG4gICAgLy8gTWFuYWdlIGNpcmN1bGFpciBkZWxheSBidWZmZXIgcG9pbnRlcnNcbiAgICB0aGlzLmRlbGF5SW5wdXRQb2ludGVyKys7XG4gICAgaWYgKHRoaXMuZGVsYXlJbnB1dFBvaW50ZXIgPj0gdGhpcy5kZWxheUJ1ZmZlclNhbXBsZXMubGVuZ3RoLTEpIHtcbiAgICAgIHRoaXMuZGVsYXlJbnB1dFBvaW50ZXIgPSAwO1xuICAgIH1cblxuICAgIHRoaXMuZGVsYXlPdXRwdXRQb2ludGVyKys7XG4gICAgaWYgKHRoaXMuZGVsYXlPdXRwdXRQb2ludGVyID49IHRoaXMuZGVsYXlCdWZmZXJTYW1wbGVzLmxlbmd0aC0xKSB7XG4gICAgICB0aGlzLmRlbGF5T3V0cHV0UG9pbnRlciA9IDA7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG91dHB1dFNhbXBsZXM7XG59O1xuXG4vKipcbiAqIFNpbmdsZURlbGF5IGVmZmVjdCBieSBBbG1lciBUaGllIChodHRwOi8vY29kZS5hbG1lcm9zLmNvbSkuXG4gKiBDb3B5cmlnaHQgMjAxMCBBbG1lciBUaGllLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogRXhhbXBsZTogU2VlIHVzYWdlIGluIFJldmVyYiBjbGFzc1xuICpcbiAqIFRoaXMgaXMgYSBkZWxheSB0aGF0IGRvZXMgTk9UIGZlZWRzIGl0J3Mgb3duIGRlbGF5ZWQgc2lnbmFsIGJhY2sgaW50byBpdHNcbiAqIGNpcmN1bGFyIGJ1ZmZlciwgbmVpdGhlciBkb2VzIGl0IHJldHVybiB0aGUgb3JpZ2luYWwgc2lnbmFsLiBBbHNvIGtub3duIGFzXG4gKiBhbiBBbGxQYXNzRmlsdGVyKD8pLlxuICpcbiAqIENvbXBhdGlibGUgd2l0aCBpbnRlcmxlYXZlZCBzdGVyZW8gKG9yIG1vcmUgY2hhbm5lbCkgYnVmZmVycyBhbmRcbiAqIG5vbi1pbnRlcmxlYXZlZCBtb25vIGJ1ZmZlcnMuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG1heERlbGF5SW5TYW1wbGVzU2l6ZSBNYXhpbXVtIHBvc3NpYmxlIGRlbGF5IGluIHNhbXBsZXMgKHNpemUgb2YgY2lyY3VsYXIgYnVmZmVyKVxuICogQHBhcmFtIHtOdW1iZXJ9IGRlbGF5SW5TYW1wbGVzIEluaXRpYWwgZGVsYXkgaW4gc2FtcGxlc1xuICogQHBhcmFtIHtOdW1iZXJ9IGRlbGF5Vm9sdW1lIEluaXRpYWwgZmVlZGJhY2sgZGVsYXkgdm9sdW1lLiBGbG9hdCB2YWx1ZTogMC4wIChzaWxlbmNlKSwgMS4wIChub3JtYWwpLCA+MS4wIChhbXBsaWZ5KVxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5cbmZ1bmN0aW9uIFNpbmdsZURlbGF5KG1heERlbGF5SW5TYW1wbGVzU2l6ZSwgZGVsYXlJblNhbXBsZXMsIGRlbGF5Vm9sdW1lKSB7XG4gIHRoaXMuZGVsYXlCdWZmZXJTYW1wbGVzID0gbmV3IEZsb2F0MzJBcnJheShtYXhEZWxheUluU2FtcGxlc1NpemUpOyAvLyBUaGUgbWF4aW11bSBzaXplIG9mIGRlbGF5XG4gIHRoaXMuZGVsYXlJbnB1dFBvaW50ZXIgID0gZGVsYXlJblNhbXBsZXM7XG4gIHRoaXMuZGVsYXlPdXRwdXRQb2ludGVyID0gMDtcblxuICB0aGlzLmRlbGF5SW5TYW1wbGVzICAgICA9IGRlbGF5SW5TYW1wbGVzO1xuICB0aGlzLmRlbGF5Vm9sdW1lICAgICAgICA9IGRlbGF5Vm9sdW1lO1xufVxuXG4vKipcbiAqIENoYW5nZSB0aGUgZGVsYXkgdGltZSBpbiBzYW1wbGVzLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBkZWxheUluU2FtcGxlcyBEZWxheSBpbiBzYW1wbGVzXG4gKi9cblNpbmdsZURlbGF5LnByb3RvdHlwZS5zZXREZWxheUluU2FtcGxlcyA9IGZ1bmN0aW9uKGRlbGF5SW5TYW1wbGVzKSB7XG4gIHRoaXMuZGVsYXlJblNhbXBsZXMgPSBkZWxheUluU2FtcGxlcztcbiAgdGhpcy5kZWxheUlucHV0UG9pbnRlciA9IHRoaXMuZGVsYXlPdXRwdXRQb2ludGVyICsgZGVsYXlJblNhbXBsZXM7XG5cbiAgaWYgKHRoaXMuZGVsYXlJbnB1dFBvaW50ZXIgPj0gdGhpcy5kZWxheUJ1ZmZlclNhbXBsZXMubGVuZ3RoLTEpIHtcbiAgICB0aGlzLmRlbGF5SW5wdXRQb2ludGVyID0gdGhpcy5kZWxheUlucHV0UG9pbnRlciAtIHRoaXMuZGVsYXlCdWZmZXJTYW1wbGVzLmxlbmd0aDtcbiAgfVxufTtcblxuLyoqXG4gKiBDaGFuZ2UgdGhlIHJldHVybiBzaWduYWwgdm9sdW1lLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBkZWxheVZvbHVtZSBGbG9hdCB2YWx1ZTogMC4wIChzaWxlbmNlKSwgMS4wIChub3JtYWwpLCA+MS4wIChhbXBsaWZ5KVxuICovXG5TaW5nbGVEZWxheS5wcm90b3R5cGUuc2V0RGVsYXlWb2x1bWUgPSBmdW5jdGlvbihkZWxheVZvbHVtZSkge1xuICB0aGlzLmRlbGF5Vm9sdW1lID0gZGVsYXlWb2x1bWU7XG59O1xuXG4vKipcbiAqIFByb2Nlc3MgYSBnaXZlbiBpbnRlcmxlYXZlZCBvciBtb25vIG5vbi1pbnRlcmxlYXZlZCBmbG9hdCB2YWx1ZSBBcnJheSBhbmRcbiAqIHJldHVybnMgdGhlIGRlbGF5ZWQgYXVkaW8uXG4gKlxuICogQHBhcmFtIHtBcnJheX0gc2FtcGxlcyBBcnJheSBjb250YWluaW5nIEZsb2F0IHZhbHVlcyBvciBhIEZsb2F0MzJBcnJheVxuICpcbiAqIEByZXR1cm5zIEEgbmV3IEZsb2F0MzJBcnJheSBpbnRlcmxlYXZlZCBvciBtb25vIG5vbi1pbnRlcmxlYXZlZCBhcyB3YXMgZmVkIHRvIHRoaXMgZnVuY3Rpb24uXG4gKi9cblNpbmdsZURlbGF5LnByb3RvdHlwZS5wcm9jZXNzID0gZnVuY3Rpb24oc2FtcGxlcykge1xuICAvLyBOQi4gTWFrZSBhIGNvcHkgdG8gcHV0IGluIHRoZSBvdXRwdXQgc2FtcGxlcyB0byByZXR1cm4uXG4gIHZhciBvdXRwdXRTYW1wbGVzID0gbmV3IEZsb2F0MzJBcnJheShzYW1wbGVzLmxlbmd0aCk7XG5cbiAgZm9yICh2YXIgaT0wOyBpPHNhbXBsZXMubGVuZ3RoOyBpKyspIHtcblxuICAgIC8vIEFkZCBhdWRpbyBkYXRhIHdpdGggdGhlIGRlbGF5IGluIHRoZSBkZWxheSBidWZmZXJcbiAgICB0aGlzLmRlbGF5QnVmZmVyU2FtcGxlc1t0aGlzLmRlbGF5SW5wdXRQb2ludGVyXSA9IHNhbXBsZXNbaV07XG5cbiAgICAvLyBkZWxheUJ1ZmZlclNhbXBsZXMgY291bGQgY29udGFpbiBpbml0aWFsIE5VTEwncywgcmV0dXJuIHNpbGVuY2UgaW4gdGhhdCBjYXNlXG4gICAgdmFyIGRlbGF5U2FtcGxlID0gdGhpcy5kZWxheUJ1ZmZlclNhbXBsZXNbdGhpcy5kZWxheU91dHB1dFBvaW50ZXJdO1xuXG4gICAgLy8gUmV0dXJuIHRoZSBhdWRpbyB3aXRoIGRlbGF5IG1peFxuICAgIG91dHB1dFNhbXBsZXNbaV0gPSBkZWxheVNhbXBsZSAqIHRoaXMuZGVsYXlWb2x1bWU7XG5cbiAgICAvLyBNYW5hZ2UgY2lyY3VsYWlyIGRlbGF5IGJ1ZmZlciBwb2ludGVyc1xuICAgIHRoaXMuZGVsYXlJbnB1dFBvaW50ZXIrKztcblxuICAgIGlmICh0aGlzLmRlbGF5SW5wdXRQb2ludGVyID49IHRoaXMuZGVsYXlCdWZmZXJTYW1wbGVzLmxlbmd0aC0xKSB7XG4gICAgICB0aGlzLmRlbGF5SW5wdXRQb2ludGVyID0gMDtcbiAgICB9XG5cbiAgICB0aGlzLmRlbGF5T3V0cHV0UG9pbnRlcisrO1xuXG4gICAgaWYgKHRoaXMuZGVsYXlPdXRwdXRQb2ludGVyID49IHRoaXMuZGVsYXlCdWZmZXJTYW1wbGVzLmxlbmd0aC0xKSB7XG4gICAgICB0aGlzLmRlbGF5T3V0cHV0UG9pbnRlciA9IDA7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG91dHB1dFNhbXBsZXM7XG59O1xuXG4vKipcbiAqIFJldmVyYiBlZmZlY3QgYnkgQWxtZXIgVGhpZSAoaHR0cDovL2NvZGUuYWxtZXJvcy5jb20pLlxuICogQ29weXJpZ2h0IDIwMTAgQWxtZXIgVGhpZS4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIEV4YW1wbGU6IGh0dHA6Ly9jb2RlLmFsbWVyb3MuY29tL2NvZGUtZXhhbXBsZXMvcmV2ZXJiLWZpcmVmb3gtYXVkaW8tYXBpL1xuICpcbiAqIFRoaXMgcmV2ZXJiIGNvbnNpc3RzIG9mIDYgU2luZ2xlRGVsYXlzLCA2IE11bHRpRGVsYXlzIGFuZCBhbiBJSVJGaWx0ZXIyXG4gKiBmb3IgZWFjaCBvZiB0aGUgdHdvIHN0ZXJlbyBjaGFubmVscy5cbiAqXG4gKiBDb21wYXRpYmxlIHdpdGggaW50ZXJsZWF2ZWQgc3RlcmVvIGJ1ZmZlcnMgb25seSFcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gbWF4RGVsYXlJblNhbXBsZXNTaXplIE1heGltdW0gcG9zc2libGUgZGVsYXkgaW4gc2FtcGxlcyAoc2l6ZSBvZiBjaXJjdWxhciBidWZmZXJzKVxuICogQHBhcmFtIHtOdW1iZXJ9IGRlbGF5SW5TYW1wbGVzIEluaXRpYWwgZGVsYXkgaW4gc2FtcGxlcyBmb3IgaW50ZXJuYWwgKFNpbmdsZS9NdWx0aSlkZWxheXNcbiAqIEBwYXJhbSB7TnVtYmVyfSBtYXN0ZXJWb2x1bWUgSW5pdGlhbCBtYXN0ZXIgdm9sdW1lLiBGbG9hdCB2YWx1ZTogMC4wIChzaWxlbmNlKSwgMS4wIChub3JtYWwpLCA+MS4wIChhbXBsaWZ5KVxuICogQHBhcmFtIHtOdW1iZXJ9IG1peFZvbHVtZSBJbml0aWFsIHJldmVyYiBzaWduYWwgbWl4IHZvbHVtZS4gRmxvYXQgdmFsdWU6IDAuMCAoc2lsZW5jZSksIDEuMCAobm9ybWFsKSwgPjEuMCAoYW1wbGlmeSlcbiAqIEBwYXJhbSB7TnVtYmVyfSBkZWxheVZvbHVtZSBJbml0aWFsIGZlZWRiYWNrIGRlbGF5IHZvbHVtZSBmb3IgaW50ZXJuYWwgKFNpbmdsZS9NdWx0aSlkZWxheXMuIEZsb2F0IHZhbHVlOiAwLjAgKHNpbGVuY2UpLCAxLjAgKG5vcm1hbCksID4xLjAgKGFtcGxpZnkpXG4gKiBAcGFyYW0ge051bWJlcn0gZGFtcEZyZXF1ZW5jeSBJbml0aWFsIGxvdyBwYXNzIGZpbHRlciBmcmVxdWVuY3kuIDAgdG8gNDQxMDAgKGRlcGVuZGluZyBvbiB5b3VyIG1heGltdW0gc2FtcGxpbmcgZnJlcXVlbmN5KVxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBSZXZlcmIobWF4RGVsYXlJblNhbXBsZXNTaXplLCBkZWxheUluU2FtcGxlcywgbWFzdGVyVm9sdW1lLCBtaXhWb2x1bWUsIGRlbGF5Vm9sdW1lLCBkYW1wRnJlcXVlbmN5KSB7XG4gIHRoaXMuZGVsYXlJblNhbXBsZXMgICA9IGRlbGF5SW5TYW1wbGVzO1xuICB0aGlzLm1hc3RlclZvbHVtZSAgICAgPSBtYXN0ZXJWb2x1bWU7XG4gIHRoaXMubWl4Vm9sdW1lICAgICAgID0gbWl4Vm9sdW1lO1xuICB0aGlzLmRlbGF5Vm9sdW1lICAgICA9IGRlbGF5Vm9sdW1lO1xuICB0aGlzLmRhbXBGcmVxdWVuY3kgICAgID0gZGFtcEZyZXF1ZW5jeTtcblxuICB0aGlzLk5SX09GX01VTFRJREVMQVlTID0gNjtcbiAgdGhpcy5OUl9PRl9TSU5HTEVERUxBWVMgPSA2O1xuXG4gIHRoaXMuTE9XUEFTU0wgPSBuZXcgSUlSRmlsdGVyMihEU1AuTE9XUEFTUywgZGFtcEZyZXF1ZW5jeSwgMCwgNDQxMDApO1xuICB0aGlzLkxPV1BBU1NSID0gbmV3IElJUkZpbHRlcjIoRFNQLkxPV1BBU1MsIGRhbXBGcmVxdWVuY3ksIDAsIDQ0MTAwKTtcblxuICB0aGlzLnNpbmdsZURlbGF5cyA9IFtdO1xuXG4gIHZhciBpLCBkZWxheU11bHRpcGx5O1xuXG4gIGZvciAoaSA9IDA7IGkgPCB0aGlzLk5SX09GX1NJTkdMRURFTEFZUzsgaSsrKSB7XG4gICAgZGVsYXlNdWx0aXBseSA9IDEuMCArIChpLzcuMCk7IC8vIDEuMCwgMS4xLCAxLjIuLi5cbiAgICB0aGlzLnNpbmdsZURlbGF5c1tpXSA9IG5ldyBTaW5nbGVEZWxheShtYXhEZWxheUluU2FtcGxlc1NpemUsIE1hdGgucm91bmQodGhpcy5kZWxheUluU2FtcGxlcyAqIGRlbGF5TXVsdGlwbHkpLCB0aGlzLmRlbGF5Vm9sdW1lKTtcbiAgfVxuXG4gIHRoaXMubXVsdGlEZWxheXMgPSBbXTtcblxuICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5OUl9PRl9NVUxUSURFTEFZUzsgaSsrKSB7XG4gICAgZGVsYXlNdWx0aXBseSA9IDEuMCArIChpLzEwLjApOyAvLyAxLjAsIDEuMSwgMS4yLi4uXG4gICAgdGhpcy5tdWx0aURlbGF5c1tpXSA9IG5ldyBNdWx0aURlbGF5KG1heERlbGF5SW5TYW1wbGVzU2l6ZSwgTWF0aC5yb3VuZCh0aGlzLmRlbGF5SW5TYW1wbGVzICogZGVsYXlNdWx0aXBseSksIHRoaXMubWFzdGVyVm9sdW1lLCB0aGlzLmRlbGF5Vm9sdW1lKTtcbiAgfVxufVxuXG4vKipcbiAqIENoYW5nZSB0aGUgZGVsYXkgdGltZSBpbiBzYW1wbGVzIGFzIGEgYmFzZSBmb3IgYWxsIGRlbGF5cy5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gZGVsYXlJblNhbXBsZXMgRGVsYXkgaW4gc2FtcGxlc1xuICovXG5SZXZlcmIucHJvdG90eXBlLnNldERlbGF5SW5TYW1wbGVzID0gZnVuY3Rpb24gKGRlbGF5SW5TYW1wbGVzKXtcbiAgdGhpcy5kZWxheUluU2FtcGxlcyA9IGRlbGF5SW5TYW1wbGVzO1xuXG4gIHZhciBpLCBkZWxheU11bHRpcGx5O1xuXG4gIGZvciAoaSA9IDA7IGkgPCB0aGlzLk5SX09GX1NJTkdMRURFTEFZUzsgaSsrKSB7XG4gICAgZGVsYXlNdWx0aXBseSA9IDEuMCArIChpLzcuMCk7IC8vIDEuMCwgMS4xLCAxLjIuLi5cbiAgICB0aGlzLnNpbmdsZURlbGF5c1tpXS5zZXREZWxheUluU2FtcGxlcyggTWF0aC5yb3VuZCh0aGlzLmRlbGF5SW5TYW1wbGVzICogZGVsYXlNdWx0aXBseSkgKTtcbiAgfVxuXG4gIGZvciAoaSA9IDA7IGkgPCB0aGlzLk5SX09GX01VTFRJREVMQVlTOyBpKyspIHtcbiAgICBkZWxheU11bHRpcGx5ID0gMS4wICsgKGkvMTAuMCk7IC8vIDEuMCwgMS4xLCAxLjIuLi5cbiAgICB0aGlzLm11bHRpRGVsYXlzW2ldLnNldERlbGF5SW5TYW1wbGVzKCBNYXRoLnJvdW5kKHRoaXMuZGVsYXlJblNhbXBsZXMgKiBkZWxheU11bHRpcGx5KSApO1xuICB9XG59O1xuXG4vKipcbiAqIENoYW5nZSB0aGUgbWFzdGVyIHZvbHVtZS5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gbWFzdGVyVm9sdW1lIEZsb2F0IHZhbHVlOiAwLjAgKHNpbGVuY2UpLCAxLjAgKG5vcm1hbCksID4xLjAgKGFtcGxpZnkpXG4gKi9cblJldmVyYi5wcm90b3R5cGUuc2V0TWFzdGVyVm9sdW1lID0gZnVuY3Rpb24gKG1hc3RlclZvbHVtZSl7XG4gIHRoaXMubWFzdGVyVm9sdW1lID0gbWFzdGVyVm9sdW1lO1xufTtcblxuLyoqXG4gKiBDaGFuZ2UgdGhlIHJldmVyYiBzaWduYWwgbWl4IGxldmVsLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBtaXhWb2x1bWUgRmxvYXQgdmFsdWU6IDAuMCAoc2lsZW5jZSksIDEuMCAobm9ybWFsKSwgPjEuMCAoYW1wbGlmeSlcbiAqL1xuUmV2ZXJiLnByb3RvdHlwZS5zZXRNaXhWb2x1bWUgPSBmdW5jdGlvbiAobWl4Vm9sdW1lKXtcbiAgdGhpcy5taXhWb2x1bWUgPSBtaXhWb2x1bWU7XG59O1xuXG4vKipcbiAqIENoYW5nZSBhbGwgZGVsYXlzIGZlZWRiYWNrIHZvbHVtZS5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gZGVsYXlWb2x1bWUgRmxvYXQgdmFsdWU6IDAuMCAoc2lsZW5jZSksIDEuMCAobm9ybWFsKSwgPjEuMCAoYW1wbGlmeSlcbiAqL1xuUmV2ZXJiLnByb3RvdHlwZS5zZXREZWxheVZvbHVtZSA9IGZ1bmN0aW9uIChkZWxheVZvbHVtZSl7XG4gIHRoaXMuZGVsYXlWb2x1bWUgPSBkZWxheVZvbHVtZTtcblxuICB2YXIgaTtcblxuICBmb3IgKGkgPSAwOyBpPHRoaXMuTlJfT0ZfU0lOR0xFREVMQVlTOyBpKyspIHtcbiAgICB0aGlzLnNpbmdsZURlbGF5c1tpXS5zZXREZWxheVZvbHVtZSh0aGlzLmRlbGF5Vm9sdW1lKTtcbiAgfVxuXG4gIGZvciAoaSA9IDA7IGk8dGhpcy5OUl9PRl9NVUxUSURFTEFZUzsgaSsrKSB7XG4gICAgdGhpcy5tdWx0aURlbGF5c1tpXS5zZXREZWxheVZvbHVtZSh0aGlzLmRlbGF5Vm9sdW1lKTtcbiAgfVxufTtcblxuLyoqXG4gKiBDaGFuZ2UgdGhlIExvdyBQYXNzIGZpbHRlciBmcmVxdWVuY3kuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGRhbXBGcmVxdWVuY3kgbG93IHBhc3MgZmlsdGVyIGZyZXF1ZW5jeS4gMCB0byA0NDEwMCAoZGVwZW5kaW5nIG9uIHlvdXIgbWF4aW11bSBzYW1wbGluZyBmcmVxdWVuY3kpXG4gKi9cblJldmVyYi5wcm90b3R5cGUuc2V0RGFtcEZyZXF1ZW5jeSA9IGZ1bmN0aW9uIChkYW1wRnJlcXVlbmN5KXtcbiAgdGhpcy5kYW1wRnJlcXVlbmN5ID0gZGFtcEZyZXF1ZW5jeTtcblxuICB0aGlzLkxPV1BBU1NMLnNldChkYW1wRnJlcXVlbmN5LCAwKTtcbiAgdGhpcy5MT1dQQVNTUi5zZXQoZGFtcEZyZXF1ZW5jeSwgMCk7XG59O1xuXG4vKipcbiAqIFByb2Nlc3MgYSBnaXZlbiBpbnRlcmxlYXZlZCBmbG9hdCB2YWx1ZSBBcnJheSBhbmQgY29waWVzIGFuZCBhZGRzIHRoZSByZXZlcmIgc2lnbmFsLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHNhbXBsZXMgQXJyYXkgY29udGFpbmluZyBGbG9hdCB2YWx1ZXMgb3IgYSBGbG9hdDMyQXJyYXlcbiAqXG4gKiBAcmV0dXJucyBBIG5ldyBGbG9hdDMyQXJyYXkgaW50ZXJsZWF2ZWQgYnVmZmVyLlxuICovXG5SZXZlcmIucHJvdG90eXBlLnByb2Nlc3MgPSBmdW5jdGlvbiAoaW50ZXJsZWF2ZWRTYW1wbGVzKXtcbiAgLy8gTkIuIE1ha2UgYSBjb3B5IHRvIHB1dCBpbiB0aGUgb3V0cHV0IHNhbXBsZXMgdG8gcmV0dXJuLlxuICB2YXIgb3V0cHV0U2FtcGxlcyA9IG5ldyBGbG9hdDMyQXJyYXkoaW50ZXJsZWF2ZWRTYW1wbGVzLmxlbmd0aCk7XG5cbiAgLy8gUGVyZm9ybSBsb3cgcGFzcyBvbiB0aGUgaW5wdXQgc2FtcGxlcyB0byBtaW1pY2sgZGFtcFxuICB2YXIgbGVmdFJpZ2h0TWl4ID0gRFNQLmRlaW50ZXJsZWF2ZShpbnRlcmxlYXZlZFNhbXBsZXMpO1xuICB0aGlzLkxPV1BBU1NMLnByb2Nlc3MoIGxlZnRSaWdodE1peFtEU1AuTEVGVF0gKTtcbiAgdGhpcy5MT1dQQVNTUi5wcm9jZXNzKCBsZWZ0UmlnaHRNaXhbRFNQLlJJR0hUXSApO1xuICB2YXIgZmlsdGVyZWRTYW1wbGVzID0gRFNQLmludGVybGVhdmUobGVmdFJpZ2h0TWl4W0RTUC5MRUZUXSwgbGVmdFJpZ2h0TWl4W0RTUC5SSUdIVF0pO1xuXG4gIHZhciBpO1xuXG4gIC8vIFByb2Nlc3MgTXVsdGlEZWxheXMgaW4gcGFyYWxsZWxcbiAgZm9yIChpID0gMDsgaTx0aGlzLk5SX09GX01VTFRJREVMQVlTOyBpKyspIHtcbiAgICAvLyBJbnZlcnQgdGhlIHNpZ25hbCBvZiBldmVyeSBldmVuIG11bHRpRGVsYXlcbiAgICBvdXRwdXRTYW1wbGVzID0gRFNQLm1peFNhbXBsZUJ1ZmZlcnMob3V0cHV0U2FtcGxlcywgdGhpcy5tdWx0aURlbGF5c1tpXS5wcm9jZXNzKGZpbHRlcmVkU2FtcGxlcyksIDIlaSA9PT0gMCwgdGhpcy5OUl9PRl9NVUxUSURFTEFZUyk7XG4gIH1cblxuICAvLyBQcm9jZXNzIFNpbmdsZURlbGF5cyBpbiBzZXJpZXNcbiAgdmFyIHNpbmdsZURlbGF5U2FtcGxlcyA9IG5ldyBGbG9hdDMyQXJyYXkob3V0cHV0U2FtcGxlcy5sZW5ndGgpO1xuICBmb3IgKGkgPSAwOyBpPHRoaXMuTlJfT0ZfU0lOR0xFREVMQVlTOyBpKyspIHtcbiAgICAvLyBJbnZlcnQgdGhlIHNpZ25hbCBvZiBldmVyeSBldmVuIHNpbmdsZURlbGF5XG4gICAgc2luZ2xlRGVsYXlTYW1wbGVzID0gRFNQLm1peFNhbXBsZUJ1ZmZlcnMoc2luZ2xlRGVsYXlTYW1wbGVzLCB0aGlzLnNpbmdsZURlbGF5c1tpXS5wcm9jZXNzKG91dHB1dFNhbXBsZXMpLCAyJWkgPT09IDAsIDEpO1xuICB9XG5cbiAgLy8gQXBwbHkgdGhlIHZvbHVtZSBvZiB0aGUgcmV2ZXJiIHNpZ25hbFxuICBmb3IgKGkgPSAwOyBpPHNpbmdsZURlbGF5U2FtcGxlcy5sZW5ndGg7IGkrKykge1xuICAgIHNpbmdsZURlbGF5U2FtcGxlc1tpXSAqPSB0aGlzLm1peFZvbHVtZTtcbiAgfVxuXG4gIC8vIE1peCB0aGUgb3JpZ2luYWwgc2lnbmFsIHdpdGggdGhlIHJldmVyYiBzaWduYWxcbiAgb3V0cHV0U2FtcGxlcyA9IERTUC5taXhTYW1wbGVCdWZmZXJzKHNpbmdsZURlbGF5U2FtcGxlcywgaW50ZXJsZWF2ZWRTYW1wbGVzLCAwLCAxKTtcblxuICAvLyBBcHBseSB0aGUgbWFzdGVyIHZvbHVtZSB0byB0aGUgY29tcGxldGUgc2lnbmFsXG4gIGZvciAoaSA9IDA7IGk8b3V0cHV0U2FtcGxlcy5sZW5ndGg7IGkrKykge1xuICAgIG91dHB1dFNhbXBsZXNbaV0gKj0gdGhpcy5tYXN0ZXJWb2x1bWU7XG4gIH1cblxuICByZXR1cm4gb3V0cHV0U2FtcGxlcztcbn07XG47Ly8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGluZ3MvdHNkLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3RoaXJkcGFydHkvZHNwL2RzcC5kLnRzXCIgLz5cbnZhciBkdXhjYTtcbihmdW5jdGlvbiAoZHV4Y2EpIHtcbiAgICB2YXIgbGliO1xuICAgIChmdW5jdGlvbiAobGliKSB7XG4gICAgICAgIGZ1bmN0aW9uIGNhbGNDb3JyKHNpZ25hbCwgaW5wdXQsIHNhbXBsZVJhdGUpIHtcbiAgICAgICAgICAgIHZhciBmZnQgPSBuZXcgRkZUKGlucHV0Lmxlbmd0aCwgc2FtcGxlUmF0ZSk7XG4gICAgICAgICAgICBmZnQuZm9yd2FyZChzaWduYWwpO1xuICAgICAgICAgICAgdmFyIHNpZ19zcGVjdHJ1bSA9IG5ldyBGbG9hdDMyQXJyYXkoZmZ0LnNwZWN0cnVtKTtcbiAgICAgICAgICAgIHZhciBzaWdfcmVhbCA9IG5ldyBGbG9hdDMyQXJyYXkoZmZ0LnJlYWwpO1xuICAgICAgICAgICAgdmFyIHNpZ19pbWFnID0gbmV3IEZsb2F0MzJBcnJheShmZnQuaW1hZyk7XG4gICAgICAgICAgICBmZnQuZm9yd2FyZChpbnB1dCk7XG4gICAgICAgICAgICB2YXIgc3BlY3RydW0gPSBuZXcgRmxvYXQzMkFycmF5KGZmdC5zcGVjdHJ1bSk7XG4gICAgICAgICAgICB2YXIgcmVhbCA9IG5ldyBGbG9hdDMyQXJyYXkoZmZ0LnJlYWwpO1xuICAgICAgICAgICAgdmFyIGltYWcgPSBuZXcgRmxvYXQzMkFycmF5KGZmdC5pbWFnKTtcbiAgICAgICAgICAgIHZhciBjcm9zc19yZWFsID0gQXJyYXkucHJvdG90eXBlLm1hcC5jYWxsKHJlYWwsIGZ1bmN0aW9uIChfLCBpKSB7IHJldHVybiBzaWdfcmVhbFtpXSAqIHJlYWxbaV0gLyByZWFsLmxlbmd0aDsgfSk7XG4gICAgICAgICAgICB2YXIgY3Jvc3NfaW1hZyA9IEFycmF5LnByb3RvdHlwZS5tYXAuY2FsbChpbWFnLCBmdW5jdGlvbiAoXywgaSkgeyByZXR1cm4gLXNpZ19yZWFsW2ldICogaW1hZ1tpXSAvIGltYWcubGVuZ3RoOyB9KTtcbiAgICAgICAgICAgIHZhciBpbnZfcmVhbCA9IGZmdC5pbnZlcnNlKGNyb3NzX3JlYWwsIGNyb3NzX2ltYWcpO1xuICAgICAgICAgICAgcmV0dXJuIGludl9yZWFsO1xuICAgICAgICB9XG4gICAgICAgIGxpYi5jYWxjQ29yciA9IGNhbGNDb3JyO1xuICAgICAgICBmdW5jdGlvbiBodWUycmdiKHAsIHEsIHQpIHtcbiAgICAgICAgICAgIGlmICh0IDwgMCkge1xuICAgICAgICAgICAgICAgIHQgKz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0ID4gMSkge1xuICAgICAgICAgICAgICAgIHQgLT0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0IDwgMSAvIDYpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcCArIChxIC0gcCkgKiA2ICogdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0IDwgMSAvIDIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0IDwgMiAvIDMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcCArIChxIC0gcCkgKiAoMiAvIDMgLSB0KSAqIDY7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcDtcbiAgICAgICAgfVxuICAgICAgICBsaWIuaHVlMnJnYiA9IGh1ZTJyZ2I7XG4gICAgICAgIGZ1bmN0aW9uIGhzbFRvUmdiKGgsIHMsIGwpIHtcbiAgICAgICAgICAgIC8vIGgsIHMsIGw6IDB+MVxuICAgICAgICAgICAgdmFyIGIsIGcsIHAsIHEsIHI7XG4gICAgICAgICAgICBoICo9IDUgLyA2O1xuICAgICAgICAgICAgaWYgKGggPCAwKSB7XG4gICAgICAgICAgICAgICAgaCA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoNSAvIDYgPCBoKSB7XG4gICAgICAgICAgICAgICAgaCA9IDUgLyA2O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICByID0gZyA9IGIgPSBsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcSA9IGwgPCAwLjUgPyBsICogKDEgKyBzKSA6IGwgKyBzIC0gbCAqIHM7XG4gICAgICAgICAgICAgICAgcCA9IDIgKiBsIC0gcTtcbiAgICAgICAgICAgICAgICByID0gaHVlMnJnYihwLCBxLCBoICsgMSAvIDMpO1xuICAgICAgICAgICAgICAgIGcgPSBodWUycmdiKHAsIHEsIGgpO1xuICAgICAgICAgICAgICAgIGIgPSBodWUycmdiKHAsIHEsIGggLSAxIC8gMyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gW3IgKiAyNTUsIGcgKiAyNTUsIGIgKiAyNTVdO1xuICAgICAgICB9XG4gICAgICAgIGxpYi5oc2xUb1JnYiA9IGhzbFRvUmdiO1xuICAgICAgICBmdW5jdGlvbiBpbmRleFRvRnJlcShpbmRleCwgc2FtcGxlUmF0ZSwgZmZ0U2l6ZSkge1xuICAgICAgICAgICAgcmV0dXJuIChpbmRleCAqIHNhbXBsZVJhdGUpIC8gZmZ0U2l6ZTtcbiAgICAgICAgfVxuICAgICAgICBsaWIuaW5kZXhUb0ZyZXEgPSBpbmRleFRvRnJlcTtcbiAgICAgICAgZnVuY3Rpb24gZnJlcVRvSW5kZXgoZnJlcSwgc2FtcGxlUmF0ZSwgZmZ0U2l6ZSkge1xuICAgICAgICAgICAgcmV0dXJuIChmcmVxICogZmZ0U2l6ZSkgLyBzYW1wbGVSYXRlIHwgMDtcbiAgICAgICAgfVxuICAgICAgICBsaWIuZnJlcVRvSW5kZXggPSBmcmVxVG9JbmRleDtcbiAgICAgICAgZnVuY3Rpb24gdGltZVRvSW5kZXgoc2FtcGxlUmF0ZSwgdGltZSkge1xuICAgICAgICAgICAgcmV0dXJuIHNhbXBsZVJhdGUgKiB0aW1lIHwgMDtcbiAgICAgICAgfVxuICAgICAgICBsaWIudGltZVRvSW5kZXggPSB0aW1lVG9JbmRleDtcbiAgICAgICAgZnVuY3Rpb24gaW5kZXhUb1RpbWUoc2FtcGxlUmF0ZSwgY3VycmVudEluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gY3VycmVudEluZGV4IC8gc2FtcGxlUmF0ZTtcbiAgICAgICAgfVxuICAgICAgICBsaWIuaW5kZXhUb1RpbWUgPSBpbmRleFRvVGltZTtcbiAgICAgICAgZnVuY3Rpb24gc3VtbWF0aW9uKGFyeSkge1xuICAgICAgICAgICAgdmFyIGosIGxlbiwgc3VtLCB2O1xuICAgICAgICAgICAgc3VtID0gMDtcbiAgICAgICAgICAgIGZvciAoaiA9IDAsIGxlbiA9IGFyeS5sZW5ndGg7IGogPCBsZW47IGorKykge1xuICAgICAgICAgICAgICAgIHYgPSBhcnlbal07XG4gICAgICAgICAgICAgICAgc3VtICs9IHY7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc3VtO1xuICAgICAgICB9XG4gICAgICAgIGxpYi5zdW1tYXRpb24gPSBzdW1tYXRpb247XG4gICAgICAgIGZ1bmN0aW9uIGF2ZXJhZ2UoYXJ5KSB7XG4gICAgICAgICAgICByZXR1cm4gc3VtbWF0aW9uKGFyeSkgLyBhcnkubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICAgIGxpYi5hdmVyYWdlID0gYXZlcmFnZTtcbiAgICAgICAgZnVuY3Rpb24gdmFyaWFuY2UoYXJ5KSB7XG4gICAgICAgICAgICB2YXIgYXZlLCBqLCBsZW4sIHN1bSwgdjtcbiAgICAgICAgICAgIGF2ZSA9IGF2ZXJhZ2UoYXJ5KTtcbiAgICAgICAgICAgIHN1bSA9IDA7XG4gICAgICAgICAgICBmb3IgKGogPSAwLCBsZW4gPSBhcnkubGVuZ3RoOyBqIDwgbGVuOyBqKyspIHtcbiAgICAgICAgICAgICAgICB2ID0gYXJ5W2pdO1xuICAgICAgICAgICAgICAgIHN1bSArPSBNYXRoLnBvdyh2IC0gYXZlLCAyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzdW0gLyAoYXJ5Lmxlbmd0aCAtIDEpO1xuICAgICAgICB9XG4gICAgICAgIGxpYi52YXJpYW5jZSA9IHZhcmlhbmNlO1xuICAgICAgICBmdW5jdGlvbiBzdGRldihhcnkpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLnNxcnQodmFyaWFuY2UoYXJ5KSk7XG4gICAgICAgIH1cbiAgICAgICAgbGliLnN0ZGV2ID0gc3RkZXY7XG4gICAgICAgIGZ1bmN0aW9uIGRlcml2YXRpdmUoYXJ5KSB7XG4gICAgICAgICAgICB2YXIgaTtcbiAgICAgICAgICAgIHJldHVybiBbMF0uY29uY2F0KChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGosIHJlZiwgcmVzdWx0cztcbiAgICAgICAgICAgICAgICByZXN1bHRzID0gW107XG4gICAgICAgICAgICAgICAgZm9yIChpID0gaiA9IDEsIHJlZiA9IGFyeS5sZW5ndGggLSAxOyAxIDw9IHJlZiA/IGogPD0gcmVmIDogaiA+PSByZWY7IGkgPSAxIDw9IHJlZiA/ICsraiA6IC0taikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goYXJ5W2ldIC0gYXJ5W2kgLSAxXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgICAgICAgfSkoKSk7XG4gICAgICAgIH1cbiAgICAgICAgbGliLmRlcml2YXRpdmUgPSBkZXJpdmF0aXZlO1xuICAgICAgICBmdW5jdGlvbiBtZWRpYW4oYXJ5KSB7XG4gICAgICAgICAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJ5LCAwKS5zb3J0KClbYXJ5Lmxlbmd0aCAvIDIgfCAwXTtcbiAgICAgICAgfVxuICAgICAgICBsaWIubWVkaWFuID0gbWVkaWFuO1xuICAgICAgICBmdW5jdGlvbiBLREUoYXJ5LCBoKSB7XG4gICAgICAgICAgICB2YXIgZiwgaiwga2VybmVsLCBsZW4sIHJlc3VsdHMsIHg7XG4gICAgICAgICAgICBpZiAoaCA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaCA9IDEuMDYgKiBzdGRldihhcnkpICogTWF0aC5wb3coYXJ5Lmxlbmd0aCwgLTEgLyA1KSArIDAuMDAwMDAwMDAwMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGtlcm5lbCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hdGgucG93KE1hdGguRSwgLU1hdGgucG93KHgsIDIpIC8gMikgLyBNYXRoLnNxcnQoMiAqIE1hdGguUEkpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGYgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHZhciBpLCBqLCBsZW4sIHMsIHY7XG4gICAgICAgICAgICAgICAgcyA9IDA7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gaiA9IDAsIGxlbiA9IGFyeS5sZW5ndGg7IGogPCBsZW47IGkgPSArK2opIHtcbiAgICAgICAgICAgICAgICAgICAgdiA9IGFyeVtpXTtcbiAgICAgICAgICAgICAgICAgICAgcyArPSBrZXJuZWwoKHggLSB2KSAvIGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcyAvIChoICogYXJ5Lmxlbmd0aCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmVzdWx0cyA9IFtdO1xuICAgICAgICAgICAgZm9yIChqID0gMCwgbGVuID0gYXJ5Lmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgICAgICAgICAgICAgeCA9IGFyeVtqXTtcbiAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goZih4KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgICAgfVxuICAgICAgICBsaWIuS0RFID0gS0RFO1xuICAgICAgICBmdW5jdGlvbiBtb2RlKGFyeSkge1xuICAgICAgICAgICAgcmV0dXJuIGFyeVtmaW5kTWF4KEtERShhcnksIDApKVsxXV07XG4gICAgICAgIH1cbiAgICAgICAgbGliLm1vZGUgPSBtb2RlO1xuICAgICAgICBmdW5jdGlvbiBnYXVzc2lhbih4KSB7XG4gICAgICAgICAgICByZXR1cm4gMSAvIE1hdGguc3FydCgyICogTWF0aC5QSSkgKiBNYXRoLmV4cCgtTWF0aC5wb3coeCwgMikgLyAyKTtcbiAgICAgICAgfVxuICAgICAgICBsaWIuZ2F1c3NpYW4gPSBnYXVzc2lhbjtcbiAgICAgICAgZnVuY3Rpb24gZmluZE1heChhcnksIG1pbiwgbWF4KSB7XG4gICAgICAgICAgICB2YXIgaSwgaW5kZXgsIGosIHJlZiwgcmVmMSwgcmVzdWx0O1xuICAgICAgICAgICAgaWYgKG1pbiA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgbWluID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtYXggPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIG1heCA9IGFyeS5sZW5ndGggLSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzdWx0ID0gLUluZmluaXR5O1xuICAgICAgICAgICAgaW5kZXggPSAtMTtcbiAgICAgICAgICAgIGZvciAoaSA9IGogPSByZWYgPSBtaW4sIHJlZjEgPSBtYXg7IHJlZiA8PSByZWYxID8gaiA8PSByZWYxIDogaiA+PSByZWYxOyBpID0gcmVmIDw9IHJlZjEgPyArK2ogOiAtLWopIHtcbiAgICAgICAgICAgICAgICBpZiAoIShhcnlbaV0gPiByZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHQgPSBhcnlbaV07XG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFtyZXN1bHQsIGluZGV4XTtcbiAgICAgICAgfVxuICAgICAgICBsaWIuZmluZE1heCA9IGZpbmRNYXg7XG4gICAgICAgIGZ1bmN0aW9uIGZpbmRNaW4oYXJ5LCBtaW4sIG1heCkge1xuICAgICAgICAgICAgdmFyIGksIGluZGV4LCBqLCByZWYsIHJlZjEsIHJlc3VsdDtcbiAgICAgICAgICAgIGlmIChtaW4gPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIG1pbiA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWF4ID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBtYXggPSBhcnkubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3VsdCA9IEluZmluaXR5O1xuICAgICAgICAgICAgaW5kZXggPSAtMTtcbiAgICAgICAgICAgIGZvciAoaSA9IGogPSByZWYgPSBtaW4sIHJlZjEgPSBtYXg7IHJlZiA8PSByZWYxID8gaiA8PSByZWYxIDogaiA+PSByZWYxOyBpID0gcmVmIDw9IHJlZjEgPyArK2ogOiAtLWopIHtcbiAgICAgICAgICAgICAgICBpZiAoIShhcnlbaV0gPCByZXN1bHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHQgPSBhcnlbaV07XG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFtyZXN1bHQsIGluZGV4XTtcbiAgICAgICAgfVxuICAgICAgICBsaWIuZmluZE1pbiA9IGZpbmRNaW47XG4gICAgfSkobGliID0gZHV4Y2EubGliIHx8IChkdXhjYS5saWIgPSB7fSkpO1xufSkoZHV4Y2EgfHwgKGR1eGNhID0ge30pKTtcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBpbmdzL3RzZC5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90aGlyZHBhcnR5L2RzcC9kc3AuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHMvZHV4Y2EubGliLnRzXCIgLz5cblFVbml0Lm1vZHVsZShcImR1eGNhLmxpYlwiKTtcblFVbml0LnRlc3QoXCJjYWxjQ29yclwiLCBmdW5jdGlvbiAoYXNzZXJ0KSB7XG4gICAgdmFyIHJzbHQgPSBkdXhjYS5saWIuY2FsY0NvcnIoWzEsIDAsIDAsIDBdLCBbMSwgMSwgMSwgMV0pO1xuICAgIHJldHVybiBhc3NlcnQub2socnNsdFswXSA9PSAwLjI1KTtcbn0pO1xuIl19
