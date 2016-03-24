"use strict";
var CanvasRender = require("duxca.lib.canvasrender.js");
var Signal = require("duxca.lib.signal.js");
var RecordBuffer = require("duxca.lib.recordbuffer.js");
function screenshot(cnv) {
    document.body.appendChild(cnv);
}
;
var OSC = (function () {
    function OSC(actx) {
        this.actx = actx;
    }
    OSC.prototype.tone = function (freq, startTime, duration) {
        var osc = this.actx.createOscillator();
        osc.start(startTime);
        osc.stop(startTime + duration);
        var gain = this.actx.createGain();
        gain.gain.value = 0;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(1, startTime + 0.01);
        gain.gain.setValueAtTime(1, startTime + duration - 0.01);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);
        osc.connect(gain);
        return gain;
    };
    OSC.prototype.createAudioBufferFromArrayBuffer = function (arr, sampleRate) {
        var abuf = this.actx.createBuffer(1, arr.length, sampleRate);
        var buf = abuf.getChannelData(0);
        buf.set(arr);
        return abuf;
    };
    OSC.prototype.createAudioNodeFromAudioBuffer = function (abuf) {
        var asrc = this.actx.createBufferSource();
        asrc.buffer = abuf;
        return asrc;
    };
    OSC.prototype.createBarkerCodedChirp = function (barkerCodeN, powN, powL) {
        if (powL === void 0) { powL = 14; }
        var actx = this.actx;
        var osc = this;
        var code = Signal.createBarkerCode(barkerCodeN);
        var chirp = Signal.createCodedChirp(code, powN);
        return this.resampling(chirp, powL);
    };
    // todo: https://developer.mozilla.org/ja/docs/Web/API/AudioBuffer
    // sync resampling
    OSC.prototype.createAudioBufferFromURL = function (url) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';
            xhr.addEventListener("load", function () {
                var buf = xhr.response;
                _this.actx.decodeAudioData(buf, function (abuf) { return resolve(Promise.resolve(abuf)); }, function () { return console.error("decode error"); });
            });
            xhr.send();
        });
    };
    OSC.prototype.resampling = function (sig, pow, sampleRate) {
        var _this = this;
        if (pow === void 0) { pow = 14; }
        if (sampleRate === void 0) { sampleRate = 44100; }
        return new Promise(function (resolve, reject) {
            var abuf = _this.createAudioBufferFromArrayBuffer(sig, sampleRate); // fix rate
            var anode = _this.createAudioNodeFromAudioBuffer(abuf);
            var processor = _this.actx.createScriptProcessor(Math.pow(2, pow), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
            var recbuf = new RecordBuffer(_this.actx.sampleRate, processor.bufferSize, processor.channelCount);
            anode.start(_this.actx.currentTime);
            anode.connect(processor);
            processor.connect(_this.actx.destination);
            var actx = _this.actx;
            processor.addEventListener("audioprocess", function handler(ev) {
                recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                if (recbuf.count * recbuf.bufferSize > sig.length) {
                    processor.removeEventListener("audioprocess", handler);
                    processor.disconnect();
                    next();
                }
            });
            function next() {
                var rawdata = recbuf.merge();
                recbuf.clear();
                resolve(Promise.resolve(rawdata));
            }
        });
    };
    OSC.prototype.inpulseResponce = function (TEST_INPUT_MYSELF) {
        var _this = this;
        if (TEST_INPUT_MYSELF === void 0) { TEST_INPUT_MYSELF = false; }
        var up = Signal.createChirpSignal(Math.pow(2, 17), false);
        var down = Signal.createChirpSignal(Math.pow(2, 17), true);
        //up = up.subarray(up.length*1/4|0, up.length*3/4|0);
        //down = up.subarray(up.length*1/4|0, up.length*3/4|0);
        new Promise(function (resolbe, reject) { return navigator.getUserMedia({ video: false, audio: true }, resolbe, reject); })
            .then(function (stream) {
            var source = _this.actx.createMediaStreamSource(stream);
            var processor = _this.actx.createScriptProcessor(Math.pow(2, 14), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
            var abuf = _this.createAudioBufferFromArrayBuffer(up, _this.actx.sampleRate); // fix rate
            var anode = _this.createAudioNodeFromAudioBuffer(abuf);
            anode.start(_this.actx.currentTime + 0);
            anode.connect(TEST_INPUT_MYSELF ? processor : _this.actx.destination);
            !TEST_INPUT_MYSELF && source.connect(processor);
            processor.connect(_this.actx.destination);
            var recbuf = new RecordBuffer(_this.actx.sampleRate, processor.bufferSize, 1);
            var actx = _this.actx;
            processor.addEventListener("audioprocess", function handler(ev) {
                recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                console.log(recbuf.count);
                if (recbuf.count * recbuf.bufferSize > up.length * 2) {
                    console.log("done");
                    processor.removeEventListener("audioprocess", handler);
                    processor.disconnect();
                    stream.stop();
                    next();
                }
            });
            function next() {
                var rawdata = recbuf.merge();
                var corr = Signal.overwarpCorr(down, rawdata);
                var render = new CanvasRender(128, 128);
                console.log("raw", rawdata.length);
                render.cnv.width = rawdata.length / 256;
                render.drawSignal(rawdata, true, true);
                screenshot(render.element);
                console.log("corr", corr.length);
                render.cnv.width = corr.length / 256;
                render.drawSignal(corr, true, true);
                screenshot(render.element);
                console.log("up", up.length);
                render.cnv.width = up.length / 256;
                render.drawSignal(up, true, true);
                screenshot(render.element);
                render._drawSpectrogram(rawdata, recbuf.sampleRate);
                screenshot(render.cnv);
            }
        });
    };
    return OSC;
}());
module.exports = OSC;
