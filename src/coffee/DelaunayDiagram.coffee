## http://altjsdoit.github.io/#zip=UEsDBAoAAAAIACIHkUlpWzAciQIAAOoGAAAGAAAAc2NyaXB0pVRNb9swDL3nVxBpD3LmCLLX41pgHz30MCDAethg6KDISuLVsQJZzpp%2FP0ryZ5OtK%2BaLRb2nJ5IiKXVV61JRWSphSDTbC7uDW3C%2FnzXa17C8mwHI6oi7uZbNXlWWbpW9L5Vbfjo95GSO8DwKNPqryL3EDWPtzk4V250dtuwzrh2AMp91ZdWzJfM09woHWyNIsq%2FoADWiyvWeRIteN4ZzIMhz2GgDBRQVZAmlCeNOzprC6eWqFE0lTgTl3XauoTnkwirEfHxT1%2Fu1R%2FAMRe17IXeAAlF7AKC2Rj%2Bpj0YSPBC7uGIkRx51Fw%2Bn0Hp57NEUotqWanTWsZBzTeZXPqH4KIV8AqKO3WHpspipI9WbTa3s9xj69Q%2FuGSEs8qoTxQZ2hSXS9teGDx2hwcFv9lS6%2FMyvNozNJ4S12hbVCh%2BCTA%2Fu9VE9ahTNGHcxZQmfEsqicgS8ERme1C5fEt%2BilAxKyf8ppYNSeq4kS12rC1GHdOHmDDPqirdLqk%2B2MMa9mTS6rldG5420xHUXrZu1NQKtkIIugCiGy7C00XAvvKKX9GFc1Eveqpf2T3VRL231eAiYqqMyJxKaBVsCcfgALAJt%2Fky4Q8JsNvbD5fJgE9dUaUhm1pnc5RQNKnUlhSUs8tuDyVs2hrpAAC9YOisNVuKbZbTBAsw6cgezjr8caTHOZ9Mm9q%2Fe93EmYljjmgenzztmVJfCv61oi21Uj2sPrM8BGaphBEwLc1qS%2FYyaunjAEjW3N39zUOBcO4SuOVhfMSYGFkO68CN49eAqolH%2F4kQ3fsOD1uHWIneT%2BUsLUetT2ZRuerVTehjojFKKfFqqamt3HNYneO9rF5%2B4zhDJCu79bI13ydRMOee%2FAVBLAwQKAAAACAAiB5FJhmw6rnQAAACaAAAABgAAAG1hcmt1cG3MwQrCMAwA0LufMS96SeagIoIfk6WVrXRpadKx%2Fb0wrzu%2By1Ouc7GbVv50k1nRNyJ7iQqccvPfRDUA5wUp0oZpHhUXsikq9jA46A9B1O5%2B0ZPKJ%2FA1lzFvTUPlLBbEjq%2Fh8HQP90IfEjWh%2FZ8wyUp6ZVl%2FUEsDBAoAAAAIACIHkUna97IxJAAAACIAAAAFAAAAc3R5bGVLTswrSyxWqFZIyi9KSS2yUjAsqFAozs%2FJTFFIyklMzrauBQBQSwMECgAAAAgAIgeRSdMiWMDwAAAAuwEAAAYAAABjb25maWdlkMFOwzAMht8lXIfE2EClx3XlMG1SUeHCzUndJpA2leNKVIh3JyUaGuGWfN9vx%2FGnYNOjZ%2BhHka%2B32frhZpPd3m222SoYtihysUcL0wDz3kBH0IuVAMtvPpjCtS1irciMHLHm3gZxgAYjUH4JHsu6DnfThnp8nselrbROBsYgK%2BgWcCXdxzU2hh1FXsZzLvz5BRxAWnw0hHLqjoZDWQvW49m84shO5EzTLzo8TUhzknsZGiSvHKUNdqDepRtSXNb3Xps%2BoRU5hd6boUtEoYF%2BNvSHnoD1Ai%2Bnq6Z%2FIxSuwZMhWn5%2BGd2FfRWgNEb89Q1QSwECFAAKAAAACAAiB5FJaVswHIkCAADqBgAABgAAAAAAAAAAAAAAAAAAAAAAc2NyaXB0UEsBAhQACgAAAAgAIgeRSYZsOq50AAAAmgAAAAYAAAAAAAAAAAAAAAAArQIAAG1hcmt1cFBLAQIUAAoAAAAIACIHkUna97IxJAAAACIAAAAFAAAAAAAAAAAAAAAAAEUDAABzdHlsZVBLAQIUAAoAAAAIACIHkUnTIljA8AAAALsBAAAGAAAAAAAAAAAAAAAAAIwDAABjb25maWdQSwUGAAAAAAQABADPAAAAoAQAAAAA
console.clear()
math = mathjs()
$ ->
  cnv = document.getElementById("cnv")
  cnv.width = 400
  cnv.height = 400
  ctx = cnv.getContext("2d")
  pts = ([Math.random()*cnv.width, Math.random()*cnv.height] for i in [1..10])
  tris = delaunay(pts)
  do update = ->
    cnv.width = cnv.width
    pts.forEach (pt)->
      strokeArc(cnv, ctx, pt)
    tris.forEach (tri)->
      strokeTriangle(cnv, ctx, tri)
  $("#cnv").click (ev)->
    ct = [ev.offsetX, ev.offsetY]
    update()
    tris.forEach (tri)->
      if hit(ct, tri)
        ctx.strokeStyle = "#f00"
        ctx.beginPath()
        ctx.moveTo(ct[0], ct[1])
        ctx.lineTo(tri[0][0], tri[0][1])
        ctx.moveTo(ct[0], ct[1])
        ctx.lineTo(tri[1][0], tri[1][1])
        ctx.moveTo(ct[0], ct[1])
        ctx.lineTo(tri[2][0], tri[2][1])
        ctx.closePath()
        ctx.stroke()

hit = (ct, tri)->
  arr = [crossProduct(math.subtract(tri[0], tri[1]), math.subtract(tri[0], ct))
         crossProduct(math.subtract(tri[1], tri[2]), math.subtract(tri[1], ct))
         crossProduct(math.subtract(tri[2], tri[0]), math.subtract(tri[2], ct))]
  arr.every((pt)-> pt[2] < 0) or
  arr.every((pt)-> pt[2] > 0)

crossProduct = (pt1, pt2)->
  [pt1, pt2] = [pt1.concat(0), pt2.concat(0)]
  [pt1[1]*pt2[2]-pt1[2]*pt2[1]
   pt1[2]*pt2[0]-pt1[0]*pt2[2]
   pt1[0]*pt2[1]-pt1[1]*pt2[0]]
strokeTriangle = (cnv, ctx, [a, b, c])->
  ctx.beginPath()
  ctx.moveTo(a[0], a[1])
  ctx.lineTo(b[0], b[1])
  ctx.lineTo(c[0], c[1])
  ctx.closePath()
  ctx.stroke()

strokeArc = (cnv, ctx, pt, r=4)->
  ctx.beginPath()
  ctx.arc(pt[0], pt[1], r, 0, 2*Math.PI, true)
  ctx.closePath()
  ctx.stroke()

delaunay = (pts)->
  ids = Delaunay.triangulate(pts)
  for i in [0...ids.length] by 3
    [pts[ids[i]], pts[ids[i+1]], pts[ids[i+2]]]