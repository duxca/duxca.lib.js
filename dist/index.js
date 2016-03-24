(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.RecordBuffer = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var RecordBuffer = (function () {
    function RecordBuffer(sampleRate, bufferSize, channel, maximamRecordSize) {
        if (maximamRecordSize === void 0) { maximamRecordSize = Infinity; }
        this.sampleRate = sampleRate;
        this.bufferSize = bufferSize;
        this.channel = channel;
        this.maximamRecordSize = typeof maximamRecordSize === "number" ? maximamRecordSize : Infinity;
        this.chsBuffers = [];
        this.sampleTimes = [];
        for (var i = 0; i < this.channel; i++) {
            this.chsBuffers.push([]);
        }
        this.count = 0;
    }
    RecordBuffer.prototype.clear = function () {
        this.chsBuffers = [];
        for (var i = 0; i < this.channel; i++) {
            this.chsBuffers.push([]);
        }
        this.sampleTimes = [];
        this.count = 0;
    };
    RecordBuffer.prototype.add = function (chsBuffer, currentTime) {
        this.sampleTimes.push(currentTime);
        this.count++;
        for (var i = 0; i < chsBuffer.length; i++) {
            this.chsBuffers[i].push(chsBuffer[i]);
        }
        if (this.chsBuffers[0].length >= this.maximamRecordSize) {
            for (var i = 0; i < this.chsBuffers.length; i++) {
                this.chsBuffers[i].shift();
            }
        }
    };
    RecordBuffer.prototype.toPCM = function () {
        var results = [];
        for (var i = 0; i < this.chsBuffers.length; i++) {
            results.push(RecordBuffer.mergeBuffers(this.chsBuffers[i]));
        }
        return RecordBuffer.float32ArrayToInt16Array(RecordBuffer.interleave(results));
    };
    RecordBuffer.prototype.merge = function (ch) {
        if (ch === void 0) { ch = 0; }
        return RecordBuffer.mergeBuffers(this.chsBuffers[ch]);
    };
    RecordBuffer.prototype.getChannelData = function (n) {
        return RecordBuffer.mergeBuffers(this.chsBuffers[n]);
    };
    return RecordBuffer;
}());
var RecordBuffer;
(function (RecordBuffer) {
    function mergeBuffers(chBuffer) {
        var bufferSize = chBuffer[0].length;
        var f32arr = new Float32Array(chBuffer.length * bufferSize);
        for (var i = 0; i < chBuffer.length; i++) {
            f32arr.set(chBuffer[i], i * bufferSize);
        }
        return f32arr;
    }
    RecordBuffer.mergeBuffers = mergeBuffers;
    function interleave(chs) {
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
    RecordBuffer.interleave = interleave;
    function float32ArrayToInt16Array(arr) {
        var int16arr = new Int16Array(arr.length);
        for (var i = 0; i < arr.length; i++) {
            int16arr[i] = arr[i] * 0x7FFF * 0.8; // 32bit -> 16bit
        }
        return int16arr;
    }
    RecordBuffer.float32ArrayToInt16Array = float32ArrayToInt16Array;
})(RecordBuffer || (RecordBuffer = {}));
module.exports = RecordBuffer;

},{}]},{},[1])(1)
});