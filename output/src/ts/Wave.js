/// <!--reference path="../../tsd/DataView/DataView.d.ts"/-->
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Wave = (function () {
            function Wave(channel, sampleRate, int16arr) {
                //int16arr is 16bit nCh PCM
                var size = int16arr.length * 2; // データサイズ (byte) # 8bit*2 = 16bit
                channel = channel; // チャンネル数 (1:モノラル or 2:ステレオ)
                var bitsPerSample = 16; // サンプルあたりのビット数 (8 or 16) # 16bit PCM
                var offset = 44; // ヘッダ部分のサイズ
                this.view = new DataView(new ArrayBuffer(offset + size)); // バイト配列を作成
                writeUTFBytes(this.view, 0, "RIFF"); // Chunk ID # RIFF ヘッダ
                this.view.setUint32(4, offset + size - 8, true); // Chunk Size # ファイルサイズ - 8
                writeUTFBytes(this.view, 8, "WAVE"); // Format # WAVE ヘッダ
                writeUTFBytes(this.view, 12, "fmt "); // Subchunk 1 ID # fmt チャンク
                this.view.setUint32(16, 16, true); // Subchunk 1 Size # fmt チャンクのバイト数
                this.view.setUint16(20, 1, true); // Audio Format # フォーマットID
                this.view.setUint16(22, channel, true); // Num Channels # チャンネル数
                this.view.setUint32(24, sampleRate, true); // Sample Rate (Hz) # サンプリングレート
                this.view.setUint32(28, sampleRate * (bitsPerSample >>> 3) * channel, true); // Byte Rate (サンプリング周波数 * ブロックサイズ) # データ速度
                this.view.setUint16(32, (bitsPerSample >>> 3) * channel, true); // Block Align (チャンネル数 * 1サンプルあたりのビット数 / 8) # ブロックサイズ
                this.view.setUint16(34, bitsPerSample, true); // Bits Per Sample # サンプルあたりのビット数
                writeUTFBytes(this.view, 36, 'data'); // Subchunk 2 ID
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
        })();
        lib.Wave = Wave;
        function writeUTFBytes(view, offset, str) {
            for (var i = 0; i < str.length; i++) {
                view.setUint8(offset + i, str.charCodeAt(i));
            }
        }
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
