var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var OSC = (function () {
            function OSC(actx) {
                this.actx = actx;
            }
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
