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
            return OSC;
        })();
        lib.OSC = OSC;
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
