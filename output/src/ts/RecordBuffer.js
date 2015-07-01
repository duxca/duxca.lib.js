var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        function mergeBuffers(chBuffer) {
            var bufferSize = chBuffer[0].length;
            var f32arr = new Float32Array(chBuffer.length * bufferSize);
            for (var i = 0; i < chBuffer.length; i++) {
                f32arr.set(chBuffer[i], i * bufferSize);
            }
            return f32arr;
        }
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
        function float32ArrayToInt16Array(arr) {
            var int16arr = new Int16Array(arr.length);
            for (var i = 0; i < arr.length; i++) {
                int16arr[i] = arr[i] * 0x7FFF * 0.8; // 32bit -> 16bit
            }
            return int16arr;
        }
        var RecordBuffer = (function () {
            function RecordBuffer(sampleRate, bufferSize, channel, maximamRecordSize) {
                if (maximamRecordSize === void 0) { maximamRecordSize = Infinity; }
                this.sampleRate = sampleRate;
                this.bufferSize = bufferSize;
                this.channel = channel;
                this.maximamRecordSize = maximamRecordSize != null ? maximamRecordSize : Infinity;
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
                    results.push(mergeBuffers(this.chsBuffers[i]));
                }
                return float32ArrayToInt16Array(interleave(results));
            };
            RecordBuffer.prototype.merge = function (ch) {
                if (ch === void 0) { ch = 0; }
                return mergeBuffers(this.chsBuffers[ch]);
            };
            RecordBuffer.prototype.getChannelData = function (n) {
                return mergeBuffers(this.chsBuffers[n]);
            };
            return RecordBuffer;
        })();
        lib.RecordBuffer = RecordBuffer;
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
