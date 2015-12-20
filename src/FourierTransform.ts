
// Fourier Transform Module used by DFT, FFT, RFFT
export class FourierTransform {
  bufferSize: number;
  sampleRate: number;
  bandwidth: number;
  spectrum: Float32Array;
  real: Float32Array;
  imag: Float32Array;
  peakBand: number;
  peak: number;
  constructor (bufferSize: number, sampleRate: number) {
    this.bufferSize = bufferSize;
    this.sampleRate = sampleRate;
    this.bandwidth  = 2 / bufferSize * sampleRate / 2;

    this.spectrum   = new Float32Array(bufferSize/2);
    this.real       = new Float32Array(bufferSize);
    this.imag       = new Float32Array(bufferSize);

    this.peakBand   = 0;
    this.peak       = 0;
  }

  /**
   * Calculates the *middle* frequency of an FFT band.
   *
   * @param {Number} index The index of the FFT band.
   *
   * @returns The middle frequency in Hz.
   */
  getBandFrequency(index: number): number {
    return this.bandwidth * index + this.bandwidth / 2;
  };

  calculateSpectrum (): Float32Array {
    var spectrum  = this.spectrum,
        real      = this.real,
        imag      = this.imag,
        bSi       = 2 / this.bufferSize,
        sqrt      = Math.sqrt,
        rval: number,
        ival: number,
        mag: number;

    for (var i = 0, N = this.bufferSize/2; i < N; i++) {
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
  }
}

/**
 * DFT is a class for calculating the Discrete Fourier Transform of a signal.
 *
 * @param {Number} bufferSize The size of the sample buffer to be computed
 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 *
 * @constructor
 */
export class DFT extends FourierTransform {
  sinTable: Float32Array;
  cosTable: Float32Array;
  constructor(bufferSize: number, sampleRate: number)  {
    super(bufferSize, sampleRate);

    var N = bufferSize/2 * bufferSize;
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
  forward(buffer: Float32Array): Float32Array {
    var real = this.real,
        imag = this.imag,
        rval: number,
        ival: number;

    for (var k = 0; k < this.bufferSize/2; k++) {
      rval = 0.0;
      ival = 0.0;

      for (var n = 0; n < buffer.length; n++) {
        rval += this.cosTable[k*n] * buffer[n];
        ival += this.sinTable[k*n] * buffer[n];
      }

      real[k] = rval;
      imag[k] = ival;
    }

    return this.calculateSpectrum();
  }
}

/**
 * FFT is a class for calculating the Discrete Fourier Transform of a signal
 * with the Fast Fourier Transform algorithm.
 *
 * @param {Number} bufferSize The size of the sample buffer to be computed. Must be power of 2
 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 *
 * @constructor
 */
export class FFT extends FourierTransform {
  reverseTable: Uint32Array;
  sinTable: Float32Array;
  cosTable: Float32Array;
  constructor(bufferSize: number, sampleRate: number) {
    super(bufferSize, sampleRate);

    this.reverseTable = new Uint32Array(bufferSize);

    var limit = 1;
    var bit = bufferSize >> 1;

    var i: number;

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
      this.sinTable[i] = Math.sin(-Math.PI/i);
      this.cosTable[i] = Math.cos(-Math.PI/i);
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
  forward(buffer: Float32Array): Float32Array {
    // Locally scope variables for speed up
    var bufferSize      = this.bufferSize,
        cosTable        = this.cosTable,
        sinTable        = this.sinTable,
        reverseTable    = this.reverseTable,
        real            = this.real,
        imag            = this.imag,
        spectrum        = this.spectrum;

    var k = Math.floor(Math.log(bufferSize) / Math.LN2);

    if (Math.pow(2, k) !== bufferSize) { throw "Invalid buffer size, must be a power of 2."; }
    if (bufferSize !== buffer.length)  { throw "Supplied buffer is not the same size as defined FFT. FFT Size: " + bufferSize + " Buffer Size: " + buffer.length; }

    var halfSize = 1,
        phaseShiftStepReal: number,
        phaseShiftStepImag: number,
        currentPhaseShiftReal: number,
        currentPhaseShiftImag: number,
        off: number,
        tr: number,
        ti: number,
        tmpReal: number,
        i: number;

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
  }

  inverse(real: Float32Array, imag: Float32Array): Float32Array {
    // Locally scope variables for speed up
    var bufferSize      = this.bufferSize,
        cosTable        = this.cosTable,
        sinTable        = this.sinTable,
        reverseTable    = this.reverseTable,
        spectrum        = this.spectrum;

        real = real || this.real;
        imag = imag || this.imag;

    var halfSize = 1,
        phaseShiftStepReal: number,
        phaseShiftStepImag: number,
        currentPhaseShiftReal: number,
        currentPhaseShiftImag: number,
        off: number,
        tr: number,
        ti: number,
        tmpReal: number,
        i: number;

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
  }
}


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
export class RFFT extends FourierTransform {
  trans: Float32Array;
  reverseTable: Float32Array;
  constructor (bufferSize: number, sampleRate: number) {
    super(bufferSize, sampleRate);

    this.trans = new Float32Array(bufferSize);
    this.reverseTable = new Uint32Array(bufferSize);
    this.generateReverseTable();
  }

  // don't use a lookup table to do the permute, use this instead
  reverseBinPermute(dest: Float32Array, source: Float32Array) {
    var bufferSize  = this.bufferSize,
        halfSize    = bufferSize >>> 1,
        nm1         = bufferSize - 1,
        i = 1, r = 0, h: number;

    dest[0] = source[0];

    do {
      r += halfSize;
      dest[i] = source[r];
      dest[r] = source[i];

      i++;

      h = halfSize << 1;
      while (h = h >> 1, !((r ^= h) & h));

      if (r >= i) {
        dest[i]     = source[r];
        dest[r]     = source[i];

        dest[nm1-i] = source[nm1-r];
        dest[nm1-r] = source[nm1-i];
      }
      i++;
    } while (i < halfSize);
    dest[nm1] = source[nm1];
  }

  generateReverseTable() {
    var bufferSize  = this.bufferSize,
        halfSize    = bufferSize >>> 1,
        nm1         = bufferSize - 1,
        i = 1, r = 0, h: number;

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

        this.reverseTable[nm1-i] = nm1-r;
        this.reverseTable[nm1-r] = nm1-i;
      }
      i++;
    } while (i < halfSize);

    this.reverseTable[nm1] = nm1;
  }

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
  forward(buffer: Float32Array): Float32Array {
    var n         = this.bufferSize,
        spectrum  = this.spectrum,
        x         = this.trans,
        TWO_PI    = 2*Math.PI,
        sqrt      = Math.sqrt,
        i         = n >>> 1,
        bSi       = 2 / n,
        n2: number, n4: number, n8: number, nn: number,
        t1: number, t2: number, t3: number, t4: number,
        i1: number, i2: number, i3: number, i4: number, i5: number, i6: number, i7: number, i8: number,
        st1: number, cc1: number, ss1: number, cc3: number, ss3: number,
        e: number,
        a: number,
        rval: number, ival: number, mag: number;

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
        st1 = x[i0] - x[i0+1];
        x[i0] += x[i0+1];
        x[i0+1] = st1;
      }
      ix = 2*(id-1);
    }

    n2 = 2;
    nn = n >>> 1;

    while((nn = nn >>> 1)) {
      ix = 0;
      n2 = n2 << 1;
      id = n2 << 1;
      n4 = n2 >>> 2;
      n8 = n2 >>> 3;
      do {
        if(n4 !== 1) {
          for(i0 = ix; i0 < n; i0 += id) {
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
        } else {
          for(i0 = ix; i0 < n; i0 += id) {
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
        cc3 = 4*cc1*(cc1*cc1-0.75);
        ss3 = 4*ss1*(0.75-ss1*ss1);

        ix = 0; id = n2 << 1;
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
            t2 = x[i7]*cc1 - x[i3]*ss1;
            t1 = x[i7]*ss1 + x[i3]*cc1;

            //cmult(cc3, ss3, x[i8], x[i4], t4, t3);
            t4 = x[i8]*cc3 - x[i4]*ss3;
            t3 = x[i8]*ss3 + x[i4]*cc3;

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
      ival = x[n-i-1];
      mag = bSi * sqrt(rval * rval + ival * ival);

      if (mag > this.peak) {
        this.peakBand = i;
        this.peak = mag;
      }

      spectrum[i] = mag;
    }

    spectrum[0] = bSi * x[0];

    return spectrum;
  }
}
