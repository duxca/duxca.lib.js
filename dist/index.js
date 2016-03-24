(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Wave = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var Wave = (function () {
    function Wave(channel, sampleRate, int16arr) {
        //int16arr is 16bit nCh PCM
        var size = int16arr.length * 2; // データサイズ (byte) # 8bit*2 = 16bit
        channel = channel; // チャンネル数 (1:モノラル or 2:ステレオ)
        var bitsPerSample = 16; // サンプルあたりのビット数 (8 or 16) # 16bit PCM
        var offset = 44; // ヘッダ部分のサイズ
        this.view = new DataView(new ArrayBuffer(offset + size)); // バイト配列を作成
        Wave.writeUTFBytes(this.view, 0, "RIFF"); // Chunk ID # RIFF ヘッダ
        this.view.setUint32(4, offset + size - 8, true); // Chunk Size # ファイルサイズ - 8
        Wave.writeUTFBytes(this.view, 8, "WAVE"); // Format # WAVE ヘッダ
        Wave.writeUTFBytes(this.view, 12, "fmt "); // Subchunk 1 ID # fmt チャンク
        this.view.setUint32(16, 16, true); // Subchunk 1 Size # fmt チャンクのバイト数
        this.view.setUint16(20, 1, true); // Audio Format # フォーマットID
        this.view.setUint16(22, channel, true); // Num Channels # チャンネル数
        this.view.setUint32(24, sampleRate, true); // Sample Rate (Hz) # サンプリングレート
        this.view.setUint32(28, sampleRate * (bitsPerSample >>> 3) * channel, true); // Byte Rate (サンプリング周波数 * ブロックサイズ) # データ速度
        this.view.setUint16(32, (bitsPerSample >>> 3) * channel, true); // Block Align (チャンネル数 * 1サンプルあたりのビット数 / 8) # ブロックサイズ
        this.view.setUint16(34, bitsPerSample, true); // Bits Per Sample # サンプルあたりのビット数
        Wave.writeUTFBytes(this.view, 36, 'data'); // Subchunk 2 ID
        this.view.setUint32(40, size, true); // Subchunk 2 Size # 波形データのバイト数
        for (var i = 0; i < int16arr.length; i++) {
            this.view.setInt16(offset + i * 2, int16arr[i], true);
        }
    }
    Wave.prototype.toBlob = function () {
        return new Blob([this.view], {
            type: "audio/wav"
        });
    };
    Wave.prototype.toURL = function () {
        return URL.createObjectURL(this.toBlob());
    };
    Wave.prototype.toAudio = function () {
        var audio = document.createElement("audio");
        audio.src = this.toURL();
        audio.controls = true;
        return audio;
    };
    return Wave;
}());
var Wave;
(function (Wave) {
    function writeUTFBytes(view, offset, str) {
        for (var i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    }
    Wave.writeUTFBytes = writeUTFBytes;
})(Wave || (Wave = {}));
module.exports = Wave;

},{}]},{},[1])(1)
});