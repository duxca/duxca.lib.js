#http://altjsdoit.github.io/#zip=UEsDBAoAAAAIAKQFkUkZKfsEVQMAANwJAAAGAAAAc2NyaXB0lVZtb9MwEP7eX2ECH5w2ybZqQqgSqIOBBBIwaXwATRPKEre1ltid47TJv%2Bd8jvPSZmyr1sZ399xzPt%2Bdszzmgrwn4YcJIXue6g0I705PQdowvt5oEN%2BimIgdrFOZlDkTOloz%2FTljZvmx%2FppSD8yeb2GR48Fno2vZ7MJodQWisQHXJyk0qzT15inSpHINRsH25Epyoen3WG8iFYtU5tSfInFAhkpL3DhfbxlLgeEsOrOKS65York0yZp0tortuCyLy2PTSlaD2BjtZB40Wz%2BZ%2BxbUxrDiIY1unmuZPk33hnqv8QijHDbFcrljhLKdj3U55mC7SK5WBdO%2FA9Ku%2FxgiVQrBhTk8rUo2YE4yntyThrHDvWqWqOaroWz9M7kG%2F12ckW%2FXP39EhVZg56uagiEgngdfQrBumakberoiLNzCadtzWvQFtI4VZTGmRLQrwcItnLbz7QtoTWRW5mJx0yTn9QGeU1btqm5X%2Fb0%2BG3iRJCxjKu6cbvEXTmlxc4uNSVIV790A4vkPj78%2FT%2B3a2XRlaiHv2bWuMwYIT7HU7UTnW9BA50Q5F2VBIVW%2FMfWa19hTXuhYJAwhJ2c47odHCVActxiQcwrcUR2YEFFL%2BtfODfxG2wziHQxvInELLaEfNH6Pf9Cv4GLo50ea5wzJMAnfHyRs4tuEoRLOdHABPJWJvX3g99FM%2BoQvyWTg5zJxE%2BKPbbffQ3ZTiJ3S0RssHPhCMTtGcDaJdbU1Cng0CujJyHy3ZbEhN21GRxPUKKNqINWtdDTUjbLnYKRxh36yDeDWVXc2a1aPXN0jgf8%2FILFKKIxUYGCBzck%2Bav%2FZiJEId1nJXIhEyaLoUeA52EdH8SRGsYeSFfpC8BxP5ouKc0bNxeFP4JNkcVHYBjWvVSlgQ2WipVoQugSmZW1fI6aXQbXVIAJr19XLarbVESLNAqPiCHXoPjh04NCBsY0BLMrcoDswKKZmC%2FhEqLtrHPWkG48HpemkNy9buacmVGgY5j6ZjRjrcFkbIxwEniMUoHeU8Nfkbup0x9ZcXIEz9RuNec3%2BkrSanQNwdu7UGReoDo06PD9Eh%2BPo2RBtuwJCTaCLXrYt03YGExCgPIX0ppjy1Vdovjgr2HEIU3SZMXjFs1iBIof%2F6qj%2FD1BLAwQKAAAACACkBZFJF3ghzxkAAAAXAAAABgAAAG1hcmt1cEtOzCtLLFZOzivjKkmtKEksSk1UzslPBwBQSwMECgAAAAgApAWRSRA%2B7CRCAAAASwAAAAUAAABzdHlsZVNOziur5lJQSMovSkktslIwLKhQKM7PyUxRSMpJTM625qrlUs7JTwcpKc9MKcmwUjA2MCiosAbyM1Iz0zNK4AK1AFBLAwQKAAAACACkBZFJMcZTKvIAAADPAQAABgAAAGNvbmZpZ2XQwU7DMAwG4HcJ1yGtGiDa46pymDapqMCBm5O6TSBtKscRmxDvTko1BNkt%2BX7HcfIp2AzoGYZJFNnNfZavN9k63%2BS3q5iwRVGIzh21C2MrVgIsv%2FlIpes6xEaRmXhhzYONwQ5aXED5uXBfNU3cm45gwKfTNPeT1sloDLKGfoYr6Y7X2Bp2tHi1rAvhzzfgCNLigyGUod8bjsc6sB7PyStO7BLbPQakkyiYwq89jy2SV47SBltQ79KNKVfNnddmSLQmp9B7M%2FZJUGqgnx%2F6pwdgfYF1uJihdC0eDNH89L9Db%2BOHlaB0Wv9i8KNxgdQ5%2BPoGUEsBAhQACgAAAAgApAWRSRkp%2BwRVAwAA3AkAAAYAAAAAAAAAAAAAAAAAAAAAAHNjcmlwdFBLAQIUAAoAAAAIAKQFkUkXeCHPGQAAABcAAAAGAAAAAAAAAAAAAAAAAHkDAABtYXJrdXBQSwECFAAKAAAACACkBZFJED7sJEIAAABLAAAABQAAAAAAAAAAAAAAAAC2AwAAc3R5bGVQSwECFAAKAAAACACkBZFJMcZTKvIAAADPAQAABgAAAAAAAAAAAAAAAAAbBAAAY29uZmlnUEsFBgAAAAAEAAQAzwAAADEFAAAAAA%3D%3D
main = ->
  width = 800
  height = 600
  cnv = document.getElementById("cnv")
  cnv.width = width
  cnv.height = height
  ctx = cnv.getContext("2d")
  dog = new Point(Math.random()*width, Math.random()*height)
  dogSpeed = 1.1
  dogDirection = 0
  previousDogDirection = 0
  fox = new Point(width/2, height/2)
  foxSpeed = 1
  foxDirection = 0
  t = 0
  god = new Point(width/2, height/2)
  $("#cnv").mousemove (ev)->
    god = new Point(ev.offsetX, ev.offsetY)
  running = true
  $("#cnv").click ->
    running = !running
    if !running
      $("#log").val JSON.stringify(log, "", "  ")
  log =
    dogSpeed:dogSpeed
    dogDirection:dogDirection
    previousDogDirection:previousDogDirection
    foxSpeed:foxSpeed
    foxDirection:foxDirection
    column:[
      "foxDirection"
      "x"
      "y"
      "dogDirection"
      "x"
      "y"
      "dogDirectionAcceleration"
    ]
    log:[]
  do draw = ->
    if running
      cnv.width = cnv.width
      ctx.strokeStyle = "red"
      tmp = god.minus(fox)
      foxSpeed = god.distance(fox)/100
      foxDirection = Math.atan2(tmp.y, tmp.x)
      _fox = fox.plus(new Point(Math.cos(foxDirection),
                                Math.sin(foxDirection)).times(foxSpeed))
      tmp = fox.minus(dog)
      dogDirection = Math.atan2(tmp.y, tmp.x)
      _dog = dog.plus(new Point(Math.cos(dogDirection),
                                Math.sin(dogDirection)).times(dogSpeed))
      dogDirectionAcceleration = dogSpeed*(previousDogDirection - dogDirection)/1
      dog = _dog
      fox = _fox
      log.log.push [
        foxDirection
        fox.x
        fox.y
        dogDirection
        dog.x
        dog.y
        dogDirectionAcceleration
      ]
      t++
      previousDogDirection = dogDirection
      ctx.strokeStyle = "red"
      arc(cnv, ctx, fox.x, fox.y)
      arc(cnv, ctx, fox.x, fox.y)
      ctx.strokeStyle = "blue"
      cross(cnv, ctx, dog.x, dog.y)
      cross(cnv, ctx, dog.x, dog.y)
    requestAnimationFrame(draw)



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