main = ->
  width = height = 300
  realPts = (new Point(Math.random()*width, Math.random()*height) for i in [1..10])
  do setup = ->
    cnv = document.createElement("canvas")
    cnv.width = cnv.height = width
    document.body.appendChild(cnv)
    ctx = cnv.getContext("2d")
    pseudoPts = (new Point(Math.random()*width, Math.random()*height) for i in realPts)
    ds = []
    for _, i in realPts
      ds[i] = []
      for _, j in realPts
        ds[i][j] = realPts[i].distance(realPts[j])
    sdm = new SDM(pseudoPts, ds)
    K = 0
    do draw = ->
      if K++ < 200
        cnv.width = cnv.width
        sdm.step()
        ctx.strokeStyle = "red"
        for pt in realPts
          arc(cnv, ctx, pt.x, pt.y)
        ctx.strokeStyle = "blue"
        {x:offsetX, y:offsetY} = realPts[0].minus(sdm.pts[0])
        for pt in sdm.pts
          cross(cnv, ctx, pt.x+offsetX, pt.y+offsetY)
        requestAnimationFrame(draw)
      else
        ctx.fillStyle = "black"
        ctx.fillText(sdm.det(), 8, 18)
        requestAnimationFrame(setup)
        ###
        L = 0
        {x:offsetX, y:offsetY} = realPts[0].minus(sdm.pts[0])
        _pts = (new Point(pt.x+offsetX, pt.y+offsetY) for pt in sdm.pts)
        nwt = new Newton(0, realPts, _pts)
        do draw2 = ->
          if L++ < 100
            cnv.width = cnv.width
            nwt.step()
            ctx.strokeStyle = "red"
            for pt in realPts
              arc(cnv, ctx, pt.x, pt.y)
            ctx.strokeStyle = "blue"
            for pt in _pts
              x = pt.x*Math.cos(nwt.theta)-pt.y*Math.sin(nwt.theta)
              y = pt.x*Math.sin(nwt.theta)+pt.y*Math.cos(nwt.theta)
              cross(cnv, ctx, x, y)
            requestAnimationFrame(draw2)
          else
            ctx.fillStyle = "black"
            ctx.fillText(sdm.det(), 18, 18)
            requestAnimationFrame(setup)
        ###

class SDM
  constructor: (@pts, @ds, @a=0.05)->
  step: ->
    _pts = []
    console.clear()
    for _, i in @pts
      delta = @ds[i].reduce(((sumPt, _, j)=>
        if i is j
        then sumPt
        else
          sumPt.plus(
            (@pts[i].minus(@pts[j])).times(
              (1-@ds[i][j]/@pts[i].distance(@pts[j]))))
      ), new Point(0, 0)).times(2)
      _pts[i] = @pts[i].minus(delta.times(@a))
    @pts = _pts
  det: ->
    @pts.reduce(((sum, _, i)=>
      sum + @pts.reduce(((sum, _, j)=>
        if i is j
        then sum
        else sum + Math.pow(@pts[i].distance(@pts[j])-@ds[i][j], 2)
      ), 0)
    ), 0)

class Newton
  constructor: (@theta, @pts, @_pts)->
  step: ->
    _theta = @theta - @det(@theta)/@der(@theta)
    @theta = _theta
  det: (theta)->
    @pts.reduce (sum, _, k)=>
      (@pts[k].x - Math.pow((@_pts[k].x*Math.cos(theta) - @_pts[k].y*Math.sin(theta)), 2)) +
      (@pts[k].y - Math.pow((@_pts[k].x*Math.sin(theta) + @_pts[k].y*Math.cos(theta)), 2))
  der: (theta)->
    -2*@pts.reduce (sum, _, k)=>
      (@pts[k].x*(-1*@_pts[k].x*Math.sin(theta) - @_pts[k].y*Math.cos(theta))) +
      (@pts[k].y*(-1*@_pts[k].x*Math.cos(theta) - @_pts[k].y*Math.sin(theta)))

class Point
  constructor: (@x, @y)->
  plus: (pt)->   new Point(@x+pt.x, @y+pt.y)
  minus: (pt)->  new Point(@x-pt.x, @y-pt.y)
  times: (num)-> new Point(num*@x, num*@y)
  distance: (pt)->
    Math.sqrt(
      Math.pow(pt.x-@x, 2) +
      Math.pow(pt.y-@y, 2))

cross = (cnv, ctx, x, y)->
  ctx.beginPath()
  ctx.moveTo(x+4, y+4)
  ctx.lineTo(x-4, y-4)
  ctx.moveTo(x-4, y+4)
  ctx.lineTo(x+4, y-4)
  ctx.stroke()

arc = (cnv, ctx, x, y)->
  ctx.beginPath()
  ctx.arc(x, y, 4, 0, 2*Math.PI, false)
  ctx.stroke()

console.clear()
main()
