Statistics = require("duxca.lib.statistics.js")
CanvasRender = require("duxca.lib.canvasrender.js")

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
  text: (str, x, y, opt={})->
    {font, lineWidth, strokeStyle, fillStyle} = @ctx
    {color} = opt
    color ?= "black"
    @ctx.font = "35px";
    @ctx.lineWidth = 4;
    @ctx.strokeStyle = "white"
    @ctx.strokeText(str, x, y)
    @ctx.fillStyle = color
    @ctx.fillText(str, x, y)
    o = {font, lineWidth, strokeStyle, fillStyle}
    Object.keys(o).forEach (key)=> @ctx[key] = o[key]
    @
  draw: (f32arr, opt={})->
    {sampleRate} = opt
    arr = f32arr.map (v)-> if isFinite(v) then v else 0
    sampleRate ?= 44100
    [max, _] = Signal.Statictics.findMax(arr)
    [min, _] = Signal.Statictics.findMin(arr)
    fillStyle = @ctx.fillStyle
    @ctx.fillStyle = "white"
    @ctx.fillRect(0, 0, @cnv.width, @cnv.height)
    @ctx.fillStyle = fillStyle
    if @drawAuto
      @zoomX = @cnv.width / arr.length
      @zoomY = @cnv.height / (max - min + 0.0000001)
      @offsetY = -min*@zoomY
    if @drawZero
      @ctx.beginPath()
      @ctx.moveTo(0,          @cnv.height - (@zoomY * 0 + @offsetY))
      @ctx.lineTo(@cnv.width, @cnv.height - (@zoomY * 0 + @offsetY))
      @ctx.stroke()
      @ctx.beginPath()
      @ctx.moveTo(@offsetX, @cnv.height - 0)
      @ctx.lineTo(@offsetX, @cnv.height - @cnv.height)
      @ctx.stroke()
    @ctx.beginPath()
    @ctx.moveTo(@zoomX * (0 + @offsetX), @cnv.height - (@zoomY * arr[0] + @offsetY))
    i = 0
    while i++<arr.length
      @ctx.lineTo(@zoomX * (i + @offsetX), @cnv.height - (@zoomY * arr[i] + @offsetY))
    @ctx.stroke()
    detail =
      "sampleRate": sampleRate
      "min": min
      "max": max
      "len": arr.length
      "len(ms)": arr.length/sampleRate*1000
      "size": @cnv.width+"x"+@cnv.height
    if @drawStatus
      Object.keys(detail).forEach (key, i)=>
        @text("#{key}:"+detail[key], 5, 15 + 10*i)
    @
  drawSpectrogram: (f32arr, opt={})->
    # FFTには矩形窓使用
    {sampleRate, windowSize, slideWidth, max} = opt
    f32arr = f32arr.map (v)-> if isFinite(v) then v else 0
    arr = new Float32Array(f32arr.length + windowSize)
    arr.set(f32arr, windowSize/2)
    sampleRate ?= 44100
    windowSize ?= Math.pow(2, 8); # spectrgram height
    slideWidth ?= Math.pow(2, 5); # spectrgram width rate
    max ?= 255
    ptr = 0
    spectrums = []
    while ptr+windowSize < arr.length
      buffer = arr.subarray(ptr, ptr+windowSize)
      if buffer.length isnt windowSize then break
      {spectrum} = Signal.fft(buffer, sampleRate)
      for _, i in spectrum
        spectrum[i] = spectrum[i]*20000
      spectrums.push(spectrum)
      ptr += slideWidth
    @cnv.width = spectrums.length
    @cnv.height = spectrums[0].length
    imgdata = @ctx.createImageData(spectrums.length, spectrums[0].length)
    for _, i in spectrums
      for _, j in spectrum
        [r, g, b] = SignalViewer.hslToRgb(spectrums[i][j] / max, 0.5, 0.5)
        [x, y] = [i, imgdata.height - 1 - j]
        index = x + y * imgdata.width
        imgdata.data[index * 4 + 0] = b | 0
        imgdata.data[index * 4 + 1] = g | 0
        imgdata.data[index * 4 + 2] = r | 0 # is this bug?
        imgdata.data[index * 4 + 3] = 255
    @ctx.putImageData(imgdata, 0, 0)
    detail =
      "sampleRate": sampleRate
      "windowSize": windowSize # 周波数分解能パラメータ
      "slideWidth": slideWidth # 時間分解能パラメータ
      "windowSize(ms)": windowSize/sampleRate*1000
      "slideWidth(ms)": slideWidth/sampleRate*1000
      "ptr": 0+"-"+(ptr-1)+"/"+arr.length
      "ms": 0/sampleRate*1000+"-"+(ptr-1)/sampleRate*1000+"/"+arr.length*1000/sampleRate
      "reso": arr.length/slideWidth
      "size": spectrums.length+"x"+spectrums[0].length
    if @drawStatus
      Object.keys(detail).forEach (key, i)=>
        @text("#{key}:"+detail[key], 5, 15 + 10*i)
    @
  appendTo: (element)->
    element.appendChild(@cnv)
    @
  @hue2rgb = CanvasRender.hue2rgb
  @hslToRgb = CanvasRender.hslToRgb

module.exports = SignalViewer
