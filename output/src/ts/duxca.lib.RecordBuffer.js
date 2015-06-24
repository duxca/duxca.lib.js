var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var RecordBuffer = (function () {
            function RecordBuffer(bufferSize, channel, maximamRecordSize) {
                if (maximamRecordSize === void 0) { maximamRecordSize = Infinity; }
                /*
                var j, ref, results;
                this.bufferSize = bufferSize;
                this.channel = channel;
                this.maximamRecordSize = maximamRecordSize != null ? maximamRecordSize : Infinity;
                this.chsBuffers = (function() {
                  results = [];
                  for (var j = 1, ref = this.channel; 1 <= ref ? j <= ref : j >= ref; 1 <= ref ? j++ : j--){ results.push(j); }
                  return results;
                }).apply(this).map(function() { return []; });
                this.lastTime = 0;
                this.count = 0;
                */
            } /*
            clear():void {
              var j, ref, results;
              this.chsBuffers = (function() {
                results = [];
                for (var j = 1, ref = this.channel; 1 <= ref ? j <= ref : j >= ref; 1 <= ref ? j++ : j--){ results.push(j); }
                return results;
              }).apply(this).map(function() { return []; });
              this.count = 0;
            }
        
            add(buffers:Float32Array[], lastTime:number):void {
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
            }
        
            toPCM():Int16Array {
              var chBuffers;
              return toInt16Array(interleave((function() {
                var j, len, ref, results;
                ref = this.chsBuffers;
                results = [];
                for (j = 0, len = ref.length; j < len; j++) {
                  chBuffers = ref[j];
                  results.push(mergeBuffers(chBuffers));
                }
                return results;
              }).call(this)));
            }
        
            merge(ch:number = 0):Float32Array {
              return mergeBuffers(this.chsBuffers[ch]);
            }
        
            getChannelData(n:number): Float32Array {
              return mergeBuffers(this.chsBuffers[n])
            }*/
            return RecordBuffer;
        })();
        lib.RecordBuffer = RecordBuffer;
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
