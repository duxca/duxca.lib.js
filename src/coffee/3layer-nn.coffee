# http://altjsdoit.github.io/#zip=UEsDBAoAAAAIANEKkUkFUi54ZwIAAEEGAAAGAAAAc2NyaXB0lVQ9b9swEN31K66ZKFmmKRXtlgJF0KFDgQwZEgRGQUu0RVciDYmy5f76Hj8sy3CMJpPIu%2FfeHZ%2BOLLTqdC1oUQvekjjqTKv%2FiO9ty49wD6RQ%2BxQKM6TA22MK65pvnu%2FXvO6E37z4TTz%2FFgH81bp5RpZcwyeHBFMJBRkIhABK0YMsTbVAKVoLtTFVIL1MSC9XpErITWUWv7ipaMMHyne7%2BkhUX9euqxhFsEO6EhupHhFETpFG78WTJiydyMDccl7ZMnGFLXStW5AgFbxmlNJzc0vMeaFaKivkzpfIN%2BTkRM4SvIvWTrlptCytlQOaBNmCZDN3EjHsyHyI46jlqtRNZyFNCsqiCGGXXall7ALbU6BZxlEk1a43licnaEZpzhimT1n3ReN2oYVhgfmb2Txx3T3%2BTIbbCvOAiUzLseY1wuU7qXC3yGeMfokOzi6G2HBe4jne6hSmuzigsw%2Bh83ei8echstRF3whlaNEKbsSPWtgduSu42vPuzsH8uCL4c86iyT8PATPgyoY3wjxoZcSA%2FLxE7ii%2B0uXRzqtQ5UMl69LeJ5uGVhR9i3R3b6alxjXGOe4bN%2FV9baQd%2BuBiOFJsHSdhxOzorW4QMrwoV2DdG%2F9732LkKayuGJO3YfIwuBlwUDKk0s1HkjE2y76y2GZ7cZvre%2FgvWdhJOGOB%2FEYH%2FJuDLtnbR1wXuJp7GK7iZFwmJJvEkXWemGCQlz14WTiMVbanKoGB%2FNftEmbAaJaIDLejWvZhtWxU4%2FjxcslFoWQVul9dNM7GUuydpdhYyk3OrXIXfSU8FOeheCfMk2wEOknc%2FKbA4ugfUEsDBAoAAAAIANEKkUnasHRQRwAAAEwAAAAGAAAAbWFya3VwHcc7CoAwDADQu3TSJcFV6GFiqjShP5oIHl%2BRNz3jKcMXmxxDdh87IqemBlz6na5C8wTuFUnpwSKHYSXParjB5w9UaaAW1hdQSwMECgAAAAgA0QqRSboQx5gdAAAAGwAAAAUAAABzdHlsZdPLSM3JyS%2FPzylKUahWSM7PyS%2ByUihKTbFWqAUAUEsDBAoAAAAIANEKkUnQDxNxSgEAABgCAAAGAAAAY29uZmlnZZC%2FSwMxHMX%2Fl3Ot0GIrtWOPOhQLldrFLbn7Xi%2BauxxJDiziULII4qBSNxep%2BAtFcXA58I9JW%2Brkv2DOsxavW%2Fi8l5eXd2hJEoCQKIisWqlcLW0UK2uVcrVYLRhFUrBq1ldyMXkdaXWi1Y1WiVb3Wj1qdaqV0upYD%2B5mD6PJ%2B%2FM4uZqeP03fhnpw%2B3l5PR2%2BzD7OxkliFSxE5Z4wSTbzPICOw0kkM%2BzLgBqhiVzIgCNSY0f2aSwMIR5HAez0o7QIpgwbJhFuo14KVjA7WAWXSMYz3sjONUvM34AQYQqbhAOOe1tEmmseogLmyi5EkuVYczsG3s%2FBbugCFw7j%2BYQ6cvYxC%2FO40VkXPglytM2ZA0KQsJcTbB%2Fxn5H%2B0RaS%2FhJsx0sdbOZCi3Ce%2Fl3yeNHNLGYjx1%2F4hc%2B4hLDL09n%2F9qnHhLotE%2FLrO%2FoGUEsBAhQACgAAAAgA0QqRSQVSLnhnAgAAQQYAAAYAAAAAAAAAAAAAAAAAAAAAAHNjcmlwdFBLAQIUAAoAAAAIANEKkUnasHRQRwAAAEwAAAAGAAAAAAAAAAAAAAAAAIsCAABtYXJrdXBQSwECFAAKAAAACADRCpFJuhDHmB0AAAAbAAAABQAAAAAAAAAAAAAAAAD2AgAAc3R5bGVQSwECFAAKAAAACADRCpFJ0A8TcUoBAAAYAgAABgAAAAAAAAAAAAAAAAA2AwAAY29uZmlnUEsFBgAAAAAEAAQAzwAAAKQEAAAAAA%3D%3D

console.clear()
strokeArray = (cnv, ctx, ary, flagX=false, flagY=false)->
  zoomX = if !flagX then 1 else cnv.width/ary.length
  zoomY = if !flagY then 1 else cnv.height/Math.max.apply(null, ary)
  ctx.beginPath()
  ctx.moveTo(0, cnv.height - ary[0]*zoomY)
  for i in [1...ary.length]
    ctx.lineTo(zoomX*i, cnv.height - ary[i]*zoomY)
  ctx.stroke()
sigmoid = (x)-> 1/(1+Math.exp(-x))
randoms = (m, n)-> ((0 for i in [1..n]) for j in [1..m])

input = (i for i in [0..200])
input = input.map (x)-> x/200
input = input.map (x)-> 2*Math.PI*x
input = input.map (x)-> x-Math.PI
train = input.map (x)-> Math.sin(x)/2+0.5
weight0 = randoms(input.length, input.length)
weight1 = randoms(input.length, input.length)
weight2 = randoms(input.length, input.length)
cnv = document.createElement("canvas")
cnv.width = 320
cnv.height = 320
ctx = cnv.getContext("2d")
document.body.appendChild(cnv)
do recur = ->
  cnv.width = cnv.width
  a = math.multiply(weight0, input).map(sigmoid)
  b = math.multiply(weight1, a).map(sigmoid)
  output = math.multiply(weight2, b).map(sigmoid)
  strokeArray(cnv, ctx, train.map((x,i)-> x*100+160), true)
  strokeArray(cnv, ctx, output.map((x,i)-> x*100+160), true)
  e1 = output.map (_, i)->
    a[i]*(train[i]-output[i])*output[i]*(1-output[i])
  weight2 = weight1.map (w, i)-> w.map (_, j)->
    weight2[i][j] + 0.1*e1[i]
  weight1 = weight1.map (w, i)-> w.map (_, j)->
    weight1[i][j] + a[j]*e1[i]*weight2[i][j]*b[i]*(1-b[i])
  weight0 = weight0.map (w, i)-> w.map (_, j)->
    weight0[i][j] + input[j]*e1[i]*weight2[i][j]*weight1[i][j]*a[i]*(1-a[i])
  setTimeout(recur, 0)
