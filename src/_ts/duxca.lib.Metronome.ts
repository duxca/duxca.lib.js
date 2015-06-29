/*
class Metronome
  constructor: (@actx, @tempo=120)->
    @delay = 8/@tempo
    @interval = 1/(@tempo/60)
    @lastTime = @actx.currentTime
    @nextTime = @interval + @actx.currentTime
    @destination = @actx.destination
    @nextTick = ->
  step: ->
    if @actx.currentTime - @nextTime >= 0
      @lastTime = @nextTime
      @nextTime += @interval
      @nextTick(@nextTime)
    return
*/
