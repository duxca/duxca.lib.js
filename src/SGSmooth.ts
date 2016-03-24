/*
class SGSmooth
  constructor: (@nth_degree_polynomial, @radius)->
    @currentWorker = 0
    @workers = [1..1].map (i)->
      new ServerWorker(workerScript, [@nth_degree_polynomial, @radius])
  process: (f32arr)->
    worker = @workers[@currentWorker++]
    if @workers.length is @currentWorker then @currentWorker = 0
    new Promise (resolve, reject)->
      worker.request("calc", f32arr, resolve)
  workerScript = (p, m)->
    importScripts("https://cdnjs.cloudflare.com/ajax/libs/mathjs/1.1.1/math.min.js") # math.js
    self.on "calc", (f32arr, reply)->
      y = f32arr
      # http://nekonomics-blog.tumblr.com/post/68363574423/savitzky-golay
      # http://www.asahi-net.or.jp/~wr9k-oohs/Pages/Infolv/SGMethod/sgvi.html
      #m = 8 # 平滑化のための前後データ点数
      #p = 3 # p次の多項式で近似
      point = 0 # 現在のたたみ込み位置
      derivatives = [0..p].map -> # p次の微分値
        new Float32Array(y.length)
      while y.length > point+2*m+1
        X = [0..p].map (_, ik)->
          [-m..m].map (im)->
            Math.pow(im, ik)
        Y = Array.prototype.slice.call(y, point, point + 2*m+1)
        C = math.inv(math.multiply(X, math.transpose(X)))
        B = math.multiply(C, X)
        A = math.multiply(B, Y)
        for k in [0..p]
          derivatives[k][point+m+1] = math.factorial(k)*A[k]
        point += 1
      reply(derivatives, derivatives.map ({buffer})-> buffer)
*/
