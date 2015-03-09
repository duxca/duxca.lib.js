var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var RecordBuffer = (function () {
            function RecordBuffer(bufferSize, channel, maximamRecordSize) {
                if (maximamRecordSize === void 0) { maximamRecordSize = Infinity; }
                var j, ref, results;
                this.bufferSize = bufferSize;
                this.channel = channel;
                this.maximamRecordSize = maximamRecordSize != null ? maximamRecordSize : Infinity;
                this.chsBuffers = (function () {
                    results = [];
                    for (var j = 1, ref = this.channel; 1 <= ref ? j <= ref : j >= ref; 1 <= ref ? j++ : j--) {
                        results.push(j);
                    }
                    return results;
                }).apply(this).map(function () {
                    return [];
                });
                this.lastTime = 0;
                this.count = 0;
            }
            RecordBuffer.prototype.clear = function () {
                var j, ref, results;
                this.chsBuffers = (function () {
                    results = [];
                    for (var j = 1, ref = this.channel; 1 <= ref ? j <= ref : j >= ref; 1 <= ref ? j++ : j--) {
                        results.push(j);
                    }
                    return results;
                }).apply(this).map(function () {
                    return [];
                });
                this.count = 0;
            };
            RecordBuffer.prototype.add = function (buffers, lastTime) {
                var buffer, chBuffers, i, j, k, len, len1, ref;
                this.lastTime = lastTime != null ? lastTime : 0;
                this.count++;
                for (i = j = 0, len = buffers.length; j < len; i = ++j) {
                    buffer = buffers[i];
                    this.chsBuffers[i].push(buffer);
                }
                if (this.chsBuffers[0].length >= this.maximamRecordSize) {
                    ref = this.chsBuffers;
                    for (k = 0, len1 = ref.length; k < len1; k++) {
                        chBuffers = ref[k];
                        chBuffers.shift();
                    }
                }
            };
            RecordBuffer.prototype.toPCM = function () {
                var chBuffers;
                return toInt16Array(interleave((function () {
                    var j, len, ref, results;
                    ref = this.chsBuffers;
                    results = [];
                    for (j = 0, len = ref.length; j < len; j++) {
                        chBuffers = ref[j];
                        results.push(mergeBuffers(chBuffers));
                    }
                    return results;
                }).call(this)));
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
        function mergeBuffers(chBuffer) {
            var bufferSize, f32ary, i, j, len, v;
            bufferSize = chBuffer[0].length;
            f32ary = new Float32Array(chBuffer.length * bufferSize);
            for (i = j = 0, len = chBuffer.length; j < len; i = ++j) {
                v = chBuffer[i];
                f32ary.set(v, i * bufferSize);
            }
            return f32ary;
        }
        function interleave(chs) {
            var ch, f32Ary, i, index, inputIndex, j, len, length;
            length = chs.length * chs[0].length;
            f32Ary = new Float32Array(length);
            inputIndex = 0;
            index = 0;
            while (index < length) {
                for (i = j = 0, len = chs.length; j < len; i = ++j) {
                    ch = chs[i];
                    f32Ary[index++] = ch[inputIndex];
                }
                inputIndex++;
            }
            return f32Ary;
        }
        function toInt16Array(f32ary) {
            var i, int16ary, j, len, v;
            int16ary = new Int16Array(f32ary.length);
            for (i = j = 0, len = f32ary.length; j < len; i = ++j) {
                v = f32ary[i];
                int16ary[i] = v * 0x7FFF * 0.8; // 32bit -> 16bit
            }
            return int16ary;
        }
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
