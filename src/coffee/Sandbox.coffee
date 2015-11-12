main = ->
  soundSources = [
    [0, 0]
    [10, 0]
    [0, 10]
    [10, 10]
  ]
  listener = [5, 5];

intensity = (power, radius)->
  power/(4*Math.PI*radius)
