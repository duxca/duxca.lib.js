# http://altjsdoit.github.io/#zip=UEsDBAoAAAAIAOwKkUmeAiTyiwMAAJoGAAAGAAAAc2NyaXB0nVTfi9xEHH%2FPXzFeX5Ld7CRZW0Ghhesh4kOh0D7ssYQyl8wm00tmYjLZTYpIt6L4UDna0goiqCAqKPfig6jX9o9Jt737L%2FzOTG5v4a4ILsvuzPf7%2FXzm%2BzsSvBIZxVFGSWk7ViVLsU%2B3y5K06CqyIz53USQbF5GyddEsI8nk6oxkFTWXXXNxRtcshO4JkU8AxWboHW2JZEo5ChAFEwRUeMFimXpAhTPKE5n2oN0N0O45UEpZkkrvBpEpzkmDSVFkrc3rLNNeOUACHuI9mjB%2BE4zsU0ku5vS2sH13gwaNFGbqhwP9sDKdiRIxxDiaBhjjM%2BdC0BmijHFFpOMbsAvo2AadApgsgiNcsHuMJyqVDSQJNUNbx1ESHovcdkY%2BvuIM4MdivKilsptCsrVNJCoAhdq%2FRvvnYzz2Q7TXIh%2F7Vww7jVXyFBiSUxh4G6q31Kl%2F326d0IIKV%2FJO9UlNSqoemtPI1K2BG1wMvpAKW0hIEajaC1WBUuU6qD5Xo8DxLn%2Fqo0uo7ZaHJ0%2F%2F7JZP4XB59dWX8Bd0Dx7n3fLXbvlNt%2Fx5nA%2BD1cO%2FT549AfHq4MHx%2Fc%2B75W%2FNFMShkvz1x%2Bt%2FHq0ePoM3LqFUyuIDz1ssFphUJGUjTiUWJb5beJ8tyvf3R0KklXeTJLTyPuYzkc29Wx%2FdoDIVsVclc4ZTmWfAVIC3gfKveP37j%2BDS6qdvT374YnV00C1%2FOX756NXRkTISjKsaKLs3By9W34HHh93ye%2F19efziCH5fPf%2F6zfNDMC5pVWfKWpUlD3WKID0%2BqBYpyyg67SN0zRAPxwMIUTfVpIcVBmbfcRHbN8VQn%2BkoX1PaLD9TINMZhViAWGO0Qs1Pi6uMRdTWT7l9KEOk3zRWvQjyoK87AMoVG%2BNzWx9yiIep2Zq4RiOhTatCVNSeOI4huX6KWhvvuGhidNvndNddtGt0s9MR6CPZxiWNa%2FDXtqsaQiEuursZJwiHZLCOtlHqXum4yDdnUwJc1FUK3a4byEXb0Lnhuj4wRTwi8lyRRC3NvG1OhW0GyrEsmHDQxSKqc8qBpKRE0g8zqm72VkT4nFRbjrXeaWD87ti3NhZDL5BquJQ4oXJHcEkbwI9jwK7J90TcqqVGebwDjROrpetYZ2vklmwzNbBbkLGtzQW9sZ3XC8BWC8DMfzsIfH8YvOdDwmRZ0ws5k5JS%2FjZWk47%2FQ7uX1fRtrCb1%2F8n6L1BLAwQKAAAACADsCpFJ2rB0UEcAAABMAAAABgAAAG1hcmt1cB3HOwqAMAwA0Lt00iXBVehhYqo0oT%2BaCB5fkTc94ynDF5scQ3YfOyKnpgZc%2Bp2uQvME7hVJ6cEih2Elz2q4wecPVGmgFtYXUEsDBAoAAAAIAOwKkUm6EMeYHQAAABsAAAAFAAAAc3R5bGXTy0jNyckvz88pSlGoVkjOz8kvslIoSk2xVqgFAFBLAwQKAAAACADsCpFJtp%2BkVycBAAD%2FAQAABgAAAGNvbmZpZ2WQz0rDQBDG32W9ttBCK22PDVUoFiqxF2%2BzyaRZ3WTD7ESMImgPUvDcN%2FAmiODdlyntc7gx1mJ6G37fN%2F%2B%2Be8EqQcuQZGLQ7vTa%2FVa30%2Br2Wv2GU1ijGAgfbhTfXRfNU6Oh2H6u1k9v68VyvXjZrj42j6%2Bbr%2FfN8lk0BGi%2Bsq7BM1GE6AekMq5wzIl2whhCrEBgS6PPhc6tIyoiSPCiyMp9UhvpGIOcwrwER9LcNjFUbKjio6oeCLvbgSlIjSeKUObzM8WuLQJtcadcYsamxsbnOVJRg7M0RLKBofqEIQTX0qR1PPKPbaySGp2SCdBalc5rghcD%2FYT0j06A4wM4zQ9u8EyIE0VU%2Fs6U729ziXkQxHu%2FjQ0xpjMqY%2F%2FLZ5grHU7ckF%2FfwzdQSwECFAAKAAAACADsCpFJngIk8osDAACaBgAABgAAAAAAAAAAAAAAAAAAAAAAc2NyaXB0UEsBAhQACgAAAAgA7AqRSdqwdFBHAAAATAAAAAYAAAAAAAAAAAAAAAAArwMAAG1hcmt1cFBLAQIUAAoAAAAIAOwKkUm6EMeYHQAAABsAAAAFAAAAAAAAAAAAAAAAABoEAABzdHlsZVBLAQIUAAoAAAAIAOwKkUm2n6RXJwEAAP8BAAAGAAAAAAAAAAAAAAAAAFoEAABjb25maWdQSwUGAAAAAAQABADPAAAApQUAAAAA
console.clear()
strokeArray = (cnv, ctx, ary, flagX=false, flagY=false)->
  zoomX = if !flagX then 1 else cnv.width/ary.length
  zoomY = if !flagY then 1 else cnv.height/Math.max.apply(null, ary)
  ctx.beginPath()
  ctx.moveTo(0, cnv.height - ary[0]*zoomY)
  for i in [1...ary.length]
    ctx.lineTo(zoomX*i, cnv.height - ary[i]*zoomY)
  ctx.stroke()
noizing = (x)-> x+(Math.random()-0.5)*0.5
input = ([x, Math.cos(x)] for x in [0..20] by 0.05)
noized = input.map ([x, y])-> [x, noizing(y)]
least_square = (vec)->
  x = vec.map (pt)-> pt[0]
  y = vec.map (pt)-> pt[1]
  m = (x.length-1)/4|0 # yの長さの4分の1をmとして2m+1区間を参考にx[m+1]を平滑化
  # http://www.asahi-net.or.jp/~wr9k-oohs/Pages/Infolv/SGMethod/sgvi.html
  p = 10 # p次の多項式で近似
  point = 0 # 現在のたたみ込み位置
  result = [0..m].map -> 0
  while y.length > point+2*m+1
    X = [0..p].map (_, ik)->
      [-m..m].map (im)->
        Math.pow(im, ik)
    Y = y.slice(point, point + 2*m+1)
    point += 1
    C = math.inv(math.multiply(X, math.transpose(X)))
    B = math.multiply(C, X)
    A = math.multiply(B, Y)
    f = (x)->
      A.reduce(((sum, a, j)->
        sum+a*Math.pow(x, j)
      ), 0)
    result.push [x[m+1], A[0]]
  result.concat [0..m].map -> 0
output = least_square(noized)

cnv = document.createElement("canvas")
cnv.width = 320
cnv.height = 320
ctx = cnv.getContext("2d")
document.body.appendChild(cnv)
ctx.strokeStyle = "red"
strokeArray(cnv, ctx, input.map(([x,y])-> y*100+160), true)
ctx.strokeStyle = "green"
strokeArray(cnv, ctx, noized.map(([x,y])-> y*100+160), true)
ctx.strokeStyle = "blue"
strokeArray(cnv, ctx, output.map(([x,y])-> y*100+160), true)
