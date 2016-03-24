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

module.exports = SignalViewer
