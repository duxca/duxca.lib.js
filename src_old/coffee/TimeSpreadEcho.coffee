class TimeSpreadEcho
  constructor: (@pn, @bufferSize)->
    @cacheBufferA = new Float32Array(@bufferSize*2)
    @cacheBufferB = new Float32Array(@bufferSize*2)
    @cache = new Float32Array(@bufferSize)
    @offset = 300
    @beta = 0.08
  encode: (buffer)->
    signal = @cacheBufferA
    kernel = @cacheBufferB
    signal.set(buffer, 0)
    kernel.set(@pn.map((v,i)=> v*@beta*(@pn.length-i)/@pn.length), @offset); kernel[0] = 1
    # ここから畳み込み
    _signal = Signal.fft(signal)
    _kernel = Signal.fft(kernel)
    for _, i in _signal.real
      _signal.real[i] = _signal.real[i] * _kernel.real[i]
      _signal.imag[i] = _signal.imag[i] * _kernel.imag[i] # 畳み込み
    conved = Signal.ifft(_signal.real, _signal.imag)
    # ここまで畳み込み
    A = conved.subarray(0, conved.length/2) # 前半分は前回の後ろ半分と加算
    B = conved.subarray(conved.length/2, conved.length) # 後半分は次回のためにキャッシュ
    for _, i in A
      @cache[i] += conved[i]
    buffer.set(@cache, 0)
    @cache = B
    return
  decode: (buffer)->
    {real, imag} = Signal.fft(buffer)
    _real = real.map (v)-> Math.log(Math.abs(v))
    _imag = imag.map (v, i)-> Math.atan2(real[i], imag[i])#/Math.PI*180#(deg)
    cepstrum = Signal.ifft(_real, _imag)
    correl = Signal.fft_smart_overwrap_correlation(cepstrum, @pn)
    _correl = correl.map (v)->v*v
    view _correl, 1024
    [_, offset] = Signal.Statictics.findMax(_correl)
    return offset

module.exports = TimeSpreadEcho
