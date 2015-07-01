/// <reference path="../../tsd/dsp/dsp.d.ts" />

module duxca.lib.Signal {

  export function standard(arr: Float32Array, max_val=1):Float32Array {
    var min = duxca.lib.Statictics.findMin(arr)[0];
    var max = duxca.lib.Statictics.findMax(arr)[0];
    var _arr = new Float32Array(arr.length);
    for(var j=0; j<arr.length; j++){
      _arr[j] = (arr[j] - min) / (max - min) * max_val;
    }
    return _arr;
  }

  export function correlation(signalA: Float32Array, signalB: Float32Array, sampleRate?:number):Float32Array {
    if(signalA.length !== signalB.length) throw new Error("unmatch signal length A and B as "+signalA.length+" and "+signalB.length)
    var fft = new FFT(signalA.length, sampleRate);
    fft.forward(signalA);
    //var a_spectrum = new Float32Array(fft.spectrum);
    var a_real = new Float32Array(fft.real);
    var a_imag = new Float32Array(fft.imag);
    fft.forward(signalB);
    //var b_spectrum = new Float32Array(fft.spectrum);
    var b_real = fft.real;//new Float32Array(fft.real);
    var b_imag = fft.imag;//new Float32Array(fft.imag);
    var cross_real = b_real;//new Float32Array(b_real.length);
    var cross_imag = b_imag;//new Float32Array(b_imag.length);
    for(var i = 0; i<cross_real.length; i++){
      cross_real[i] = a_real[i] * b_real[i] / cross_real.length;
      cross_imag[i] = a_imag[i] * b_imag[i] / cross_imag.length;
    }
    var inv_real = fft.inverse(cross_real, cross_imag);
    for(var i=0; i<inv_real.length; i++){
      inv_real[i] = inv_real[i]/inv_real.length;
    }
    return inv_real;
  }

  export function fft(signal: Float32Array, sampleRate=44100): [Float32Array, Float32Array, Float32Array]{
    var fft = new FFT(signal.length, sampleRate);
    fft.forward(signal);
    return [fft.real, fft.imag, fft.spectrum];
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
    var fft = new FFT(pulse_length, 44100);
    var inv_real = fft.inverse(pulse_real, pulse_imag);
    return inv_real;
  }

  export function createBarkerCode(n: number): number[]{
    switch(n){
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

  export function autocorr(arr: number[]): number[]{
    function _autocorr(j:number): number{
      var sum = 0;
      for(var i=0; i<arr.length-j; i++) sum += arr[i]*arr[i+j];
      return sum;
    }
    return arr.map((v,j)=> _autocorr(j));
  }

  export function createBarkerCodedChirp(barkerCodeN: number, bitWithBinaryPower=10): Float32Array{
    var bitwidth = Math.pow(2, bitWithBinaryPower);
    var up_chirp = duxca.lib.Signal.createChirpSignal(bitwidth);
    var down_chirp = new Float32Array(up_chirp);
    for(var i=0; i<down_chirp.length; i++){
      down_chirp[i] *= -1;
    }
    var pulse = new Float32Array(bitwidth/2*barkerCodeN+bitwidth/2);
    var code = duxca.lib.Signal.createBarkerCode(barkerCodeN);
    for(var i=0; i<code.length; i++){
      var tmp = (code[i] === 1) ? up_chirp : down_chirp;
      for(var j=0; j<tmp.length; j++){
        pulse[i*bitwidth/2+j] += tmp[j];
      }
    }
    return pulse;
  }


}
