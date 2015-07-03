/// <reference path="../../tsd/dsp/dsp.d.ts" />

module duxca.lib.Signal {

  export function normalize(arr: Float32Array, max_val=1):Float32Array {
    var min = duxca.lib.Statictics.findMin(arr)[0];
    var max = duxca.lib.Statictics.findMax(arr)[0];
    var _arr = new Float32Array(arr.length);
    for(var j=0; j<arr.length; j++){
      _arr[j] = (arr[j] - min) / (max - min) * max_val;
    }
    return _arr;
  }

  export function correlation(signalA: Float32Array|number[], signalB: Float32Array|number[], sampleRate?:number):Float32Array {
    if(signalA.length !== signalB.length) throw new Error("unmatch signal length A and B as "+signalA.length+" and "+signalB.length)
    var _fft = new FFT(signalA.length, sampleRate);
    _fft.forward(signalA);
    //var a_spectrum = new Float32Array(fft.spectrum);
    var a_real = new Float32Array(_fft.real);
    var a_imag = new Float32Array(_fft.imag);
    _fft.forward(signalB);
    //var b_spectrum = new Float32Array(_fft.spectrum);
    var b_real = _fft.real;//new Float32Array(_fft.real);
    var b_imag = _fft.imag;//new Float32Array(_fft.imag);
    var cross_real = b_real;//new Float32Array(b_real.length);
    var cross_imag = b_imag;//new Float32Array(b_imag.length);
    for(var i = 0; i<cross_real.length; i++){
      cross_real[i] = a_real[i] * b_real[i] / cross_real.length;
      cross_imag[i] = a_imag[i] * b_imag[i] / cross_imag.length;
    }
    var inv_real = _fft.inverse(cross_real, cross_imag);
    for(var i=0; i<inv_real.length; i++){
      inv_real[i] = inv_real[i]/inv_real.length;
    }
    return inv_real;
  }

  export function autocorr(arr: number[]): number[]{
    return crosscorr(arr, arr);
  }

  export function crosscorr(arrA: number[], arrB: number[]): number[]{
    function _autocorr(j:number): number{
      var sum = 0;
      for(var i=0; i<arrA.length-j; i++) sum += arrA[i]*arrB[i+j];
      return sum;
    }
    return arrA.map((v,j)=> _autocorr(j));
  }

  export function fft(signal: Float32Array, sampleRate=44100): [Float32Array, Float32Array, Float32Array]{
    var _fft = new FFT(signal.length, sampleRate);
    _fft.forward(signal);
    return [_fft.real, _fft.imag, _fft.spectrum];
  }

  export function createChirpSignal(pulse_length: number, downchirp=false): Float32Array{
    var flag = downchirp ? 1 : -1;
    var pulse_real = new Float32Array(pulse_length);
    var pulse_imag = new Float32Array(pulse_length);
    for(var i=0; i<pulse_length/2; i++){
      pulse_real[i] = Math.cos(Math.PI*i*(i/pulse_length + 1/2));
      pulse_imag[i] = flag*Math.sin(Math.PI*i*(i/pulse_length + 1/2));
    }
    for(var i=pulse_length/2+1; i<pulse_length; i++){
      pulse_real[i] = pulse_real[pulse_length-i];
      pulse_imag[i] = -pulse_imag[pulse_length-i];
    }
    var _fft = new FFT(pulse_length, 44100);
    var inv_real = _fft.inverse(pulse_real, pulse_imag);
    return inv_real;
  }

  export function createBarkerCode(n: number): number[]{
    switch(n){
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

  export function createComplementaryCode(pow2: number): number[][]{
    var a = [1, 1];
    var b = [1, -1];
    function compress(a:number[], b:number[]){
      return [a.concat(b), a.concat(b.map((x)=>-x))];
    }
    while(pow2--){
      [a, b] = compress(a, b);
    }
    return [a, b];
  }
  export function createCodedChirp(code: number[], bitWithBinaryPower=10): Float32Array{
    var bitwidth = Math.pow(2, bitWithBinaryPower);
    var up_chirp = duxca.lib.Signal.createChirpSignal(bitwidth);
    var down_chirp = new Float32Array(up_chirp);
    for(var i=0; i<down_chirp.length; i++){
      down_chirp[i] *= -1;
    }
    var pulse = new Float32Array(bitwidth/2*code.length+bitwidth/2);
    for(var i=0; i<code.length; i++){
      var tmp = (code[i] === 1) ? up_chirp : down_chirp;
      for(var j=0; j<tmp.length; j++){
        pulse[i*bitwidth/2+j] += tmp[j];
      }
    }
    return pulse;
  }

  export function createBarkerCodedChirp(barkerCodeN: number, bitWithBinaryPower=10): Float32Array{
    return createCodedChirp(createBarkerCode(barkerCodeN));
  }
}
