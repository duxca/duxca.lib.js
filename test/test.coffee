QUnit.module 'Signal'


QUnit.test 'ServerWorker test', (assert) ->
  done = assert.async()
  WORKERS = 2
  ITERATIONS = 100
  workers = [1..WORKERS].map ->
    new InlineServerWorker [
      "../dist/Signal.js"
    ], (conn)->
      conn.on "echo", (data, reply)-> reply(data)
  Promise.all(
    workers.map (worker)-> worker.load()
  ).then (workers)->
    startTime = performance.now()
    Promise.all(
      [1..ITERATIONS].map (i)-> workers[i%workers.length].request("echo", i)
    ).then (results)->
      stopTime = performance.now()
      totalTime = stopTime - startTime
  .then (totalTime)->
    assert.ok WORKERS
    assert.ok ITERATIONS
    assert.ok totalTime/ITERATIONS
    done()

QUnit.test 'FFT,IFFT', (assert) ->
  startTime = performance.now()
  length = Math.pow(2, 14)
  sinWave = new Float32Array(length)
  for _, i in sinWave
    sinWave[i] = Math.sin(i);
  [real, imag, spectrum] = new Signal.fft(sinWave)
  _sinWave = new Signal.ifft(real, imag)
  stopTime = performance.now()
  totalTime = stopTime - startTime
  totalError = 0
  for _, i in sinWave
    a = sinWave[i] - _sinWave[i]
    totalError += a*a
  assert.ok length
  assert.ok totalError < Math.pow(2, -10)
  assert.ok totalTime

QUnit.test 'mseqGen', (assert) ->
  expected = [-1, -1, -1, 1, 1, 1, 1, -1, 1, -1, 1, 1, -1, -1, 1];
  startTime = performance.now()
  mseq = Signal.mseqGen(4, [1, 0, 0, 1]);
  stopTime = performance.now()
  totalTime = stopTime - startTime
  assert.ok mseq.length is expected.length
  expected.forEach (v, i)->
    assert.ok mseq[i] is expected[i]
  assert.ok totalTime
