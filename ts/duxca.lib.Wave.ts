module duxca.lib {
  export class Wave {
    
    view: DataView;

    constructor(channel:number, sampleRate:number, int16ary:Int16Array) {
      //int16ary is 16bit nCh PCM
      var bitsPerSample, i, int16, j, len, offset, size, view;
      size = int16ary.length * 2;
      channel = channel;
      bitsPerSample = 16;
      offset = 44;
      this.view = new DataView(new ArrayBuffer(offset + size));
      this.writeUTFBytes(0, "RIFF");
      this.view.setUint32(4, offset + size - 8, true);
      this.writeUTFBytes(8, "WAVE");
      this.writeUTFBytes(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, channel, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * (bitsPerSample >>> 3) * channel, true);
      view.setUint16(32, (bitsPerSample >>> 3) * channel, true);
      view.setUint16(34, bitsPerSample, true);
      this.writeUTFBytes(36, 'data');
      view.setUint32(40, size, true);
      for (i = j = 0, len = int16ary.length; j < len; i = ++j) {
        int16 = int16ary[i];
        view.setInt16(offset + i * 2, int16, true);
      }
    }

    toBlob():Blob {
      return new Blob([this.view], {
        type: "audio/wav"
      });
    }

    toURL():string {
      return URL.createObjectURL(this.toBlob());
    }

    toAudio():HTMLAudioElement {
      var audio;
      audio = document.createElement("audio");
      audio.src = this.toURL();
      audio.controls = true;
      return audio;
    }

    writeUTFBytes(offset:number, str:string):void {
      var i, j, ref;
      for (i = j = 0, ref = str.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
        this.view.setUint8(offset + i, str.charCodeAt(i));
      }
    }
  }
}




/*



class Wave
  constructor: (channel, sampleRate, int16ary)->#int16ary is 16bit nCh PCM
    size = int16ary.length * 2 # データサイズ (byte) # 8bit*2 = 16bit
    channel = channel # チャンネル数 (1:モノラル or 2:ステレオ)
    bitsPerSample = 16 # サンプルあたりのビット数 (8 or 16) # 16bit PCM
    offset = 44 # ヘッダ部分のサイズ
    view = new DataView(new ArrayBuffer(offset + size)) # バイト配列を作成
    writeUTFBytes(view, 0, "RIFF")         # Chunk ID # RIFF ヘッダ
    view.setUint32(4, offset + size - 8, true) # Chunk Size # ファイルサイズ - 8
    writeUTFBytes(view, 8, "WAVE")         # Format # WAVE ヘッダ
    writeUTFBytes(view, 12, "fmt ")        # Subchunk 1 ID # fmt チャンク
    view.setUint32(16, 16, true)           # Subchunk 1 Size # fmt チャンクのバイト数
    view.setUint16(20, 1, true)            # Audio Format # フォーマットID
    view.setUint16(22, channel, true)            # Num Channels # チャンネル数
    view.setUint32(24, sampleRate, true)   # Sample Rate (Hz) # サンプリングレート
    view.setUint32(28, sampleRate * (bitsPerSample >>> 3) * channel, true) # Byte Rate (サンプリング周波数 * ブロックサイズ) # データ速度
    view.setUint16(32, (bitsPerSample >>> 3) * channel, true)              # Block Align (チャンネル数 * 1サンプルあたりのビット数 / 8) # ブロックサイズ
    view.setUint16(34, bitsPerSample, true)# Bits Per Sample # サンプルあたりのビット数
    writeUTFBytes(view, 36, 'data')        # Subchunk 2 ID
    view.setUint32(40, size, true)         # Subchunk 2 Size # 波形データのバイト数
    for int16, i in int16ary
      view.setInt16(offset + i*2, int16, true)
    @value = view
  toBlob: ->
    new Blob([@value], {type: "audio/wav"})
  toURL: ->
    URL.createObjectURL(@toBlob())
  toAudio: ->
    audio = document.createElement("audio")
    audio.src = @toURL()
    audio.controls = true
    audio
  writeUTFBytes = (view, offset, str)->
    for i in [0...str.length]
      view.setUint8(offset + i, str.charCodeAt(i), true)
    return
*/
