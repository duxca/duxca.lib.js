/// <reference path="../typings/tsd.d.ts"/>

import _Render = require("./Render");
import * as _Statictics from "./Statictics";
import {FFT} from "./FourierTransform";

export var Render = _Render;
export var Statictics = _Statictics;

export function normalize(arr: Float32Array, max_val=1):Float32Array {
  var min = Statictics.findMin(arr)[0];
  var max = Statictics.findMax(arr)[0];
  var _arr = new Float32Array(arr.length);
  for(var j=0; j<arr.length; j++){
    _arr[j] = (arr[j] - min) / (max - min) * max_val;
  }
  return _arr;
}

export function correlation(signalA: Float32Array, signalB: Float32Array, sampleRate?:number): Float32Array {
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

export function smartCorrelation(short: Float32Array, long: Float32Array, sampleRate?:number):Float32Array {
  for(var pow=8; short.length+long.length > Math.pow(2, pow); pow++);
  var tmpA = new Float32Array(Math.pow(2, pow));
  var tmpB = new Float32Array(Math.pow(2, pow));
  tmpA.set(short, 0);
  tmpB.set(long, 0);
  var corrsec =  correlation(tmpA, tmpB, sampleRate);
  return corrsec.subarray(0, long.length > short.length ? long.length : short.length);
}


export function overwarpCorr(short:Float32Array, long:Float32Array):Float32Array{
  for(var pow=8; short.length > Math.pow(2, pow); pow++); // ajasting power of two for FFT
  var resized_short = new Float32Array(Math.pow(2, pow)); // for overwrap adding way correlation
  resized_short.set(short, 0);
  var buffer = new Float32Array(Math.pow(2, pow)); // for overwrap adding way correlation
  var _correlation = new Float32Array(long.length);
  var windowsize = Math.pow(2, pow - 1);
  //console.log(long.length, windowsize, resized_short.length, buffer.length, correlation.length)
  for(var i=0; long.length - (i+windowsize) >= resized_short.length; i+=windowsize){
    buffer.set(long.subarray(i, i+windowsize), 0);
    var corr = correlation(buffer, resized_short);
    for(var j=0; j<corr.length; j++){
      _correlation[i+j] = corr[j];
    }
  }
  return _correlation;
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

export function fft(signal: Float32Array, sampleRate=44100): {real: Float32Array, imag: Float32Array, spectrum: Float32Array}{
  var _fft = new FFT(signal.length, sampleRate);
  _fft.forward(signal);
  return {real: _fft.real, imag: _fft.imag, spectrum: _fft.spectrum};
}

export function ifft(pulse_real: Float32Array, pulse_imag: Float32Array, sampleRate=44100): Float32Array {
  var _fft = new FFT(pulse_real.length, sampleRate);
  var inv_real = _fft.inverse(pulse_real, pulse_imag);
  return inv_real;
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
    default: throw new Error("cannot make barker code excludes 2, 3, 4, 5, 7, 11, 13");
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
  var up_chirp = createChirpSignal(bitwidth);
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

// Signal.createM([3, 1], 7, [0,0,1])
// = [0, 0, 1, 1, 1, 0, 1, 0, 0, 1]
// Signal.createM([4, 1], 15, [1,0,0,0])
// = [1, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0]
export function createM(polynomial:number[], shiftN:number, seed?:number[]): number[] {
  if(!Array.isArray(seed)){
    seed = []
    for(var i=0; i<polynomial[0]; i++) seed[i] = Math.round(Math.random());
  }else if(seed.length !==　polynomial[0]){
    throw new Error("polynomial[0] !== seed.length");
  }
  var arr = seed.slice(0);
  for(var i=0; i<shiftN; i++){
    var tmp = arr[arr.length-polynomial[0]];
    for(var j=1; j<polynomial.length; j++){
      tmp = tmp ^ arr[arr.length-polynomial[j]];
    }
    arr.push(tmp);
  }
  return arr;
}

export function mseqGen(MSEQ_POL_LEN: number, MSEQ_POL_COEFF: number[]): Int8Array {
  //const MSEQ_POL_LEN = 4; // M系列を生成する多項式の次数
  //const MSEQ_POL_COEFF = [1, 0, 0, 1]; // M系列を生成する多項式の係数
  const L_MSEQ = Math.pow(2, MSEQ_POL_LEN)-1; // M系列の長さ
  const tap = new Uint8Array(MSEQ_POL_LEN);
  const mseqPol = new Uint8Array(MSEQ_POL_COEFF);
  const mseq = new Int8Array(L_MSEQ);
  tap[0] = 1;
  for(let i=0; i<mseq.length; i++){
    mseq[i] = tap[MSEQ_POL_LEN - 1];
    let tmp = 0;
    // 重み係数とタップの内容との積和演算
    for(let j=0; j<MSEQ_POL_LEN; j++){
      tmp += tap[j] * mseqPol[j];
      tmp = tmp % 2;
    }
    // タップの中身の右巡回シフト
    for(let k=MSEQ_POL_LEN-1; k>0; k--){
      tap[k] = tap[k-1];
    }
    tap[0] = tmp;
  }
  for(let i=0; i<mseq.length; i++){
    mseq[i] = mseq[i] <= 0 ? -1 : 1;
  }
  return mseq;
}

export function goldSeqGen(MSEQ_POL_LEN: number, MSEQ_POL_COEFF_A: number[], MSEQ_POL_COEFF_B: number[], shift: number): Int8Array {
  shift = shift % MSEQ_POL_COEFF_B.length;
  const seq_a = mseqGen(MSEQ_POL_LEN, MSEQ_POL_COEFF_A);
  const seq_b = mseqGen(MSEQ_POL_LEN, MSEQ_POL_COEFF_B);
  const gold = new Int8Array(seq_a.length)
  for(let i=0; i<gold.length; i++){
    gold[i] = seq_a[i] ^ seq_b[(i+shift)%seq_b.length];
  }
  return gold;
}

export function encode_chipcode(bits: number[], PNSeq: Int8Array): Int8Array {
  // bits: {-1, 1}
  // return: {-1, 1}
  let _PNSeq = new Int8Array(PNSeq);
  for(let i=0; i<_PNSeq.length; i++){
    _PNSeq[i] *= -1;
  }
  let zeros = new Int8Array(PNSeq.length);
  const seq = new Int8Array(PNSeq.length * bits.length);
  for(let i=0; i<bits.length; i++){
    let pt = i * PNSeq.length;
    let bit = bits[i];
    seq.set((bit === 0 ? zeros : bit > 0 ? PNSeq : _PNSeq), pt);
  }
  return seq;
}

export function encode_chipcode_separated_zero(bits: number[], PNSeq: Int8Array): Int8Array {
  // bits: {-1, 1}
  // return: {-1, 0, 1}
  // inverse phase pn sequence
  let _PNSeq = new Int8Array(PNSeq);
  for(let i=0; i<_PNSeq.length; i++){
    _PNSeq[i] *= -1;
  }
  const seq = new Int8Array(PNSeq.length * bits.length * 2 - 1);
  for(let i=0; i<bits.length; i++){
    let pt = i * PNSeq.length /* zero space -> */* 2;
    let bit = bits[i];
    seq.set((bit > 0 ? PNSeq : _PNSeq), pt);
  }
  return seq;
}


export function carrierGen(freq: number, sampleRate: number, currentTime: number, length: number): Float32Array {
  let result = new Float32Array(length);
  let phaseSec = 1/freq;
  let one_phase_sample = sampleRate/freq;
  let startId = currentTime*sampleRate;
  for(let i=0; i<result.length; i++){
    result[i] = Math.sin(2*Math.PI/one_phase_sample*(startId+i));
  }
  return result;
}

export function BPSK(bits: Int8Array, carrierFreq: number, sampleRate: number, currentTime: number, length?: number): Float32Array {
  // bits: {-1, 1}
  let one_phase_sample = sampleRate/carrierFreq;
  if(length == null){
    length = bits.length*one_phase_sample;
  }
  let result = carrierGen(carrierFreq, sampleRate, currentTime, length);
  let startId = currentTime*sampleRate;
  for(let i=0; i<result.length; i++){
    result[i] *= bits[((startId+i)/one_phase_sample|0)%bits.length];
  }
  return result;
}
export function fft_smart_correlation(signalA: Float32Array, signalB: Float32Array): Float32Array {
  let short: Float32Array;
  let long: Float32Array;
  if(signalA.length > signalB.length){
    short = signalB;
    long = signalA;
  }else{
    short = signalA;
    long = signalB;
  }
  let pow = 0;
  for(pow = 1; long.length > Math.pow(2, pow); pow++);
  let resized_long = new Float32Array(Math.pow(2, pow));
  resized_long.set(long, 0);
  let resized_short = new Float32Array(Math.pow(2, pow));
  resized_short.set(short, 0);
  let corr = fft_correlation(resized_short, resized_long);
  return corr;
}

export function fft_smart_overwrap_correlation(signalA: Float32Array, signalB: Float32Array, pof=true): Float32Array {
  let short: Float32Array;
  let long: Float32Array;
  if(signalA.length > signalB.length){
    short = signalB;
    long = signalA;
  }else{
    short = signalA;
    long = signalB;
  }
  // ajasting power of two for FFT for overwrap adding way correlation
  let pow = 0;
  for(pow = 1; short.length > Math.pow(2, pow); pow++);
  let resized_short = new Float32Array(Math.pow(2, pow+1));
  resized_short.set(short, 0);//resized_short.length/4);
  // short = [1,-1,1,-1,1] // length = 5
  // resized_short = [1,-1,1,-1,1,0,0,0] ++ [0,0,0,0,0,0,0,0] // length = 2^3 * 2 = 8 * 2 = 16
  let windowSize = resized_short.length/2;
  let slideWidth = short.length;
  let _correlation = new Float32Array(long.length);
  const filter = pof ? phase_only_filter : fft_correlation;
  for(let i=0; (long.length - (i+slideWidth)) >= 0; i+=slideWidth) {
    let resized_long = new Float32Array(resized_short.length);
    resized_long.set(long.subarray(i, i+windowSize), 0);//resized_short.length/4);
    let corr = filter(resized_short, resized_long);
    for(var j=0; j<corr.length/2; j++){
      _correlation[i+j] += corr[j];
    }
    for(var j=0; j<corr.length/2; j++){
      _correlation[i-j] += corr[corr.length-1-j];
    }
  }
  return _correlation;
}


export function fft_smart_overwrap_convolution(signalA: Float32Array, signalB: Float32Array): Float32Array {
  let short: Float32Array;
  let long: Float32Array;
  if(signalA.length > signalB.length){
    short = signalB;
    long = signalA;
  }else{
    short = signalA;
    long = signalB;
  }
  // ajasting power of two for FFT for overwrap adding way correlation
  let pow = 0;
  for(pow = 1; short.length > Math.pow(2, pow); pow++);
  let resized_short = new Float32Array(Math.pow(2, pow+1));
  resized_short.set(short, 0);//resized_short.length/4);
  // short = [1,-1,1,-1,1] // length = 5
  // resized_short = [1,-1,1,-1,1,0,0,0] ++ [0,0,0,0,0,0,0,0] // length = 2^3 * 2 = 8 * 2 = 16
  let windowSize = resized_short.length/2;
  let slideWidth = short.length;
  let _correlation = new Float32Array(long.length);
  const filter = fft_correlation;
  for(let i=0; (long.length - (i+slideWidth)) >= 0; i+=slideWidth) {
    let resized_long = new Float32Array(resized_short.length);
    resized_long.set(long.subarray(i, i+windowSize), 0);//resized_short.length/4);
    let corr = filter(resized_short, resized_long);
    for(var j=0; j<corr.length/2; j++){
      _correlation[i+j] += corr[j];
    }
    for(var j=0; j<corr.length/2; j++){
      _correlation[i-j] += corr[corr.length-1-j];
    }
  }
  return _correlation;
}


export function fft_correlation(signalA: Float32Array, signalB: Float32Array): Float32Array {
  const spectA = fft(signalA);
  const spectB = fft(signalB);
  const cross_real = new Float32Array(spectA.real.length);
  const cross_imag = new Float32Array(spectA.imag.length);
  for(var i = 0; i<spectA.real.length; i++){
    cross_real[i] = spectA.real[i] *  spectB.real[i];
    cross_imag[i] = spectA.imag[i] * -spectB.imag[i];
  }
  var inv_real = ifft(cross_real, cross_imag);
  return inv_real;
}

export function fft_convolution(signalA: Float32Array, signalB: Float32Array): Float32Array {
  let _signalA = new Float32Array(signalA.length*2)
  _signalA.set(signalA, 0)
  let _signalB = new Float32Array(signalB.length*2)
  _signalB.set(signalB, 0)
  const spectA = fft(_signalA);
  const spectB = fft(_signalB);
  const cross_real = new Float32Array(spectA.real.length);
  const cross_imag = new Float32Array(spectA.imag.length);
  for(var i = 0; i<spectA.real.length; i++){
    cross_real[i] = spectA.real[i] * spectB.real[i];
    cross_imag[i] = spectA.imag[i] * spectB.imag[i];
  }
  var inv_real = ifft(cross_real, cross_imag);
  return inv_real.subarray(0, inv_real.length/2);
}

export function naive_correlation(xs: number[], ys: number[]): number[]{
  return crosscorr(xs, ys);
}

export function naive_convolution(xs: number[], ys: number[]): number[]{
  // 引数が逆なのはインパルスレスポンスを畳み込んでみれば分かる
  const arr: number[] = [];
  let zs = new Float32Array(ys.length*2);
  zs.set(ys, 0);
  zs.set(ys, ys.length);
  for(let i=0; i<xs.length; i++){
    let sum = 0;
    for(let j=0; j<ys.length; j++){
      sum += xs[j]*zs[ys.length+i-j];
    }
    arr[i] = sum;
  }
  return arr;
}


export function phase_only_filter(xs: Float32Array, ys: Float32Array): Float32Array{
  const {real, imag, spectrum} = fft(xs);
  const _ys = fft(ys);
  for(let i=0; i<imag.length; i++){
    let abs = Math.sqrt(real[i]*real[i] + imag[i]*imag[i])
    if(abs === 0){
      // console.warn("Signal.phase_only_filter", "zero division detected")
      abs = 0.000001;
    }
    real[i] =  real[i]/abs;
    imag[i] = -imag[i]/abs;
    real[i] *= _ys.real[i];
    imag[i] *= _ys.imag[i];
  }
  return ifft(real, imag)
}
export function mean_squared_error(xs: Float32Array, ys: Float32Array): number {
  let sum = 0;
  for(let i=0; i<xs.length; i++){
    sum += Math.pow(xs[i] - ys[i], 2);
  }
  return sum/xs.length;
}
export function lowpass(input: Float32Array, sampleRate: number, freq: number, q: number): Float32Array{
  // float input[]  …入力信号の格納されたバッファ。
  // float sampleRate … サンプリング周波数。
  // float freq … カットオフ周波数。
  // float q    … フィルタのQ値。
  const size = input.length;
  const output = new Float32Array(size);
  // フィルタ係数を計算する
  const omega = 2.0 * Math.PI *  freq　/　sampleRate;
  const alpha = Math.sin(omega) / (2.0 * q);
  const a0 =  1.0 + alpha;
  const a1 = -2.0 * Math.cos(omega);
  const a2 =  1.0 - alpha;
  const b0 = (1.0 - Math.cos(omega)) / 2.0;
  const b1 =  1.0 - Math.cos(omega);
  const b2 = (1.0 - Math.cos(omega)) / 2.0;
  // フィルタ計算用のバッファ変数。
  let in1  = 0.0;
  let in2  = 0.0;
  let out1 = 0.0;
  let out2 = 0.0;
  // フィルタを適用
  for(let i=0; i<size; i++){
    // 入力信号にフィルタを適用し、出力信号として書き出す。
    output[i] = b0/a0 * input[i] + b1/a0 * in1
                                 + b2/a0 * in2
                                 - a1/a0 * out1
                                 - a2/a0 * out2;
    in2  = in1;       // 2つ前の入力信号を更新
    in1  = input[i];  // 1つ前の入力信号を更新
    out2 = out1;      // 2つ前の出力信号を更新
    out1 = output[i]; // 1つ前の出力信号を更新
  }
  return output
}

export function first_wave_detection(xs: Float32Array): number {
  let conv = xs.map((_,i)=>{
    let ys = new Float32Array(xs.length);
    ys.set(xs.subarray(i, xs.length), 0)
    let corr = fft_smart_overwrap_correlation(xs, ys);
    return corr[0];
  });
  let i = 1;
  while (conv[0]/2 < conv[i] ) i++;
  while (conv[i-1] - conv[i] > 0 ) i++;
  let [_,idx] = Statictics.findMax(conv.subarray(i, conv.length));
  return i+idx;
}
