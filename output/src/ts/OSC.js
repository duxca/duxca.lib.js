var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
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
            OSC.prototype.createBarkerCodedChirp = function (barkerCodeN, powN) {
                var _this = this;
                return new Promise(function (resolve, reject) {
                    var actx = _this.actx;
                    var osc = _this;
                    var code = duxca.lib.Signal.createBarkerCode(barkerCodeN);
                    var chirp = duxca.lib.Signal.createCodedChirp(code, powN);
                    var abuf = osc.createAudioBufferFromArrayBuffer(chirp, 44100); // fix rate
                    var anode = osc.createAudioNodeFromAudioBuffer(abuf);
                    for (var pow = 8; chirp.length > Math.pow(2, pow); pow++)
                        ; // ajasting power of two for FFT
                    var processor = actx.createScriptProcessor(Math.pow(2, pow), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
                    var recbuf = new lib.RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
                    anode.start(actx.currentTime);
                    anode.connect(processor);
                    processor.connect(actx.destination);
                    processor.addEventListener("audioprocess", function handler(ev) {
                        processor.removeEventListener("audioprocess", handler);
                        processor.disconnect();
                        resolve(Promise.resolve(new Float32Array(ev.inputBuffer.getChannelData(0))));
                    });
                });
            };
            return OSC;
        })();
        lib.OSC = OSC;
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
