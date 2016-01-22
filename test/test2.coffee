class SignalViewer
  constructor: (width, height)->
    @cnv = document.createElement("canvas")
    @cnv.width = width
    @cnv.height = height
    @ctx = @cnv.getContext("2d")
    @offsetX = 0
    @offsetY = @cnv.height/2
    @zoomX = 1
    @zoomY = 1
    @drawZero = true
    @drawAuto = true
    @drawStatus = true
  text: (str, x, y)->
    {font, lineWidth, strokeStyle, fillStyle} = @ctx
    @ctx.font = "35px";
    @ctx.lineWidth = 4;
    @ctx.strokeStyle = "white"
    @ctx.strokeText(str, x, y)
    @ctx.fillStyle = "black"
    @ctx.fillText(str, x, y)
    o = {font, lineWidth, strokeStyle, fillStyle}
    Object.keys(o).forEach (key)=> @ctx[key] = o[key]
  draw: (_arr)->
    arr = _arr.map (v)-> if isFinite(v) then v else 0
    [max, _] = Signal.Statictics.findMax(arr)
    [min, _] = Signal.Statictics.findMin(arr)
    if @drawAuto
      @zoomX = @cnv.width / arr.length
      @zoomY = @cnv.height / (max - min)
      @offsetY = -min
    if @drawZero
      @ctx.beginPath()
      @ctx.moveTo(0,          @cnv.height - @zoomY * (0 + @offsetY))
      @ctx.lineTo(@cnv.width, @cnv.height - @zoomY * (0 + @offsetY))
      @ctx.stroke()
      @ctx.beginPath()
      @ctx.moveTo(@offsetX, @cnv.height - 0)
      @ctx.lineTo(@offsetX, @cnv.height - @cnv.height)
      @ctx.stroke()
    @ctx.beginPath()
    @ctx.moveTo(@zoomX * (0 + @offsetX), @cnv.height - @zoomY * (arr[0] + @offsetY))
    i = 0
    while i++<arr.length
      @ctx.lineTo(@zoomX * (i + @offsetX), @cnv.height - @zoomY * (arr[i] + @offsetY))
    @ctx.stroke()
    if @drawStatus
      @text("min:"+min, 5, 15)
      @text("max:"+max, 5, 25)
      @text("len:"+arr.length, 5, 35)

view = (arr,w=arr.length,h=128)->
  _view = new SignalViewer(w, h)
  document.body.appendChild(_view.cnv)
  _view.draw arr
n = (a)-> a.split("").map(Number)

QUnit.module 'Signal'
QUnit.test 'naive_convolution, fft_convolution, fft_smart_overwrap_convolution', (assert) ->
  assert.ok true
  T = 1024/2/2
  #signal = Signal.carrierGen(1000, 44100, 0, T)
  signal = new Float32Array(T)
  signal[0] = 1
  view signal
  inpulseResponse = new Float32Array(T)
  inpulseResponse[0] = 1
  inpulseResponse[10] = 1
  inpulseResponse[20] = 0.5
  view inpulseResponse
  conved = Signal.fft_smart_overwrap_convolution(signal, inpulseResponse)
  view conved
  conved2 = Signal.fft_convolution(signal, inpulseResponse)
  view conved2
  conved3 = Signal.naive_convolution(signal, inpulseResponse)
  view conved3


QUnit.test 'splated echo', (assert) ->
  assert.ok true
  offset = 100
  beta = 1/10
  pn = new Float32Array(Signal.mseqGen(11, n("01001001001")))
  view pn
  pn.forEach (_,i)-> pn[i] *= beta
  kernel = new Float32Array(1024*4)
  kernel[0] = 1
  kernel.set(pn, offset)
  view kernel
  inpulseResponse = kernel
  view Signal.fft_smart_overwrap_correlation(kernel, pn)
  view signal = Signal.carrierGen(1000, 44100, 0, 1024*4)
  view conved = Signal.fft_smart_overwrap_convolution(signal, inpulseResponse)
  console.log {real, imag} = Signal.fft(conved)
  view real
  view imag
  # 複素対数関数
  view _real = real.map (v)-> Math.log(Math.abs(v))
  view _imag = imag.map (v, i)-> Math.atan2(real[i], imag[i])#/Math.PI*180#(deg)
  view cepstrum = Signal.ifft(_real, _imag)
  view correl = Signal.fft_smart_overwrap_correlation(cepstrum, pn)
  view _correl = correl.map (v)->v*v
  console.log Signal.Statictics.findMax(_correl)

n = (a)-> a.split("").map(Number)
QUnit.test 'Gold', (assert) ->
  assert.ok true
  view goldA = Signal.goldSeqGen(12, n("111000011001"), n("011110111111"), 3)
  view goldB = Signal.goldSeqGen(12, n("100101000001"), n("101101010111"), 3)
  view signalA = Signal.BPSK(goldA, 1000, 44100, 0), 1024*4
  view signalB = Signal.BPSK(goldB, 1000, 44100, 0), 1024*4
  view correlAA = Signal.fft_smart_overwrap_correlation(signalA, signalA), 1024*4
  view correlAB = Signal.fft_smart_overwrap_correlation(signalA, signalB), 1024*4
  view correlBB = Signal.fft_smart_overwrap_correlation(signalB, signalB), 1024*4
