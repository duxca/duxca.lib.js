/// <reference path="../../typings/tsd.d.ts"/>

class RecordBuffer {

  sampleRate: number
  bufferSize: number;
  channel: number;
  maximamRecordSize: number;
  chsBuffers: Float32Array[][];
  sampleTimes: number[];
  count: number;

  constructor(sampleRate: number, bufferSize:number, channel:number, maximamRecordSize:number=Infinity) {
    this.sampleRate = sampleRate;
    this.bufferSize = bufferSize;
    this.channel = channel;
    this.maximamRecordSize = typeof maximamRecordSize === "number" ? maximamRecordSize : Infinity;
    this.chsBuffers = [];
    this.sampleTimes = [];
    for(var i=0; i<this.channel; i++){
      this.chsBuffers.push([]);
    }
    this.count = 0;
  }

  clear():void {
    this.chsBuffers = [];
    for(var i=0; i<this.channel; i++){
      this.chsBuffers.push([]);
    }
    this.sampleTimes = [];
    this.count = 0;
  }

  add(chsBuffer:Float32Array[], currentTime:number):void {
    this.sampleTimes.push(currentTime)
    this.count++;
    for(var i=0; i<chsBuffer.length; i++){
      this.chsBuffers[i].push(chsBuffer[i]);
    }
    if (this.chsBuffers[0].length >= this.maximamRecordSize) {
      for(var i=0; i<this.chsBuffers.length; i++){
        this.chsBuffers[i].shift();
      }
    }
  }

  toPCM():Int16Array {
    var results:Float32Array[] = [];
    for(var i=0; i<this.chsBuffers.length; i++){
      results.push(RecordBuffer.mergeBuffers(this.chsBuffers[i]));
    }
    return RecordBuffer.float32ArrayToInt16Array(RecordBuffer.interleave(results));
  }

  merge(ch:number = 0):Float32Array {
    return RecordBuffer.mergeBuffers(this.chsBuffers[ch]);
  }

  getChannelData(n:number): Float32Array {
    return RecordBuffer.mergeBuffers(this.chsBuffers[n])
  }
}

namespace RecordBuffer {

  export function mergeBuffers(chBuffer:Float32Array[]):Float32Array {
    var bufferSize = chBuffer[0].length;
    var f32arr = new Float32Array(chBuffer.length * bufferSize);
    for (var i = 0; i < chBuffer.length; i++) {
      f32arr.set(chBuffer[i], i * bufferSize);
    }
    return f32arr;
  }

  export function interleave(chs:Float32Array[]):Float32Array {
    var length = chs.length * chs[0].length;
    var f32arr = new Float32Array(length);
    var inputIndex = 0;
    var index = 0;
    while (index < length) {
      for (var i = 0; i < chs.length; i++) {
        var ch = chs[i];
        f32arr[index++] = ch[inputIndex];
      }
      inputIndex++;
    }
    return f32arr;
  }

  export function float32ArrayToInt16Array(arr: Float32Array):Int16Array {
    var int16arr = new Int16Array(arr.length);
    for (var i = 0; i < arr.length;i++) {
      int16arr[i] = arr[i] * 0x7FFF * 0.8; // 32bit -> 16bit
    }
    return int16arr;
  }

}

export = RecordBuffer;
