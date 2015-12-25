craetePictureFrame = (description, target=document.body) ->
  fieldset = document.createElement('fieldset')
  style = document.createElement('style')
  style.appendChild(document.createTextNode("canvas,img{border:1px solid black;}"))
  style.setAttribute("scoped", "scoped")
  fieldset.appendChild(style)
  legend = document.createElement('legend')
  legend.appendChild(document.createTextNode(description))
  fieldset.appendChild(legend)
  fieldset.style.display = 'inline-block'
  target.appendChild(fieldset)
  fieldset.style.backgroundColor = "#D2E0E6"
  return {
    add: (element, txt)->
      if txt?
        frame = craetePictureFrame txt, fieldset
        frame.add element
      else if typeof element is "string"
        txtNode = document.createTextNode element
        p = document.createElement("p")
        p.appendChild txtNode
        fieldset.appendChild p
      else fieldset.appendChild element
  }

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
    sinWave[i] = Math.sin(i)
  {real, imag, spectrum} = new Signal.fft(sinWave)
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

QUnit.test 'drawSignal', (assert) ->
  length = Math.pow(2, 10)
  sinWave = new Float32Array(length)
  for _, i in sinWave
    sinWave[i] = Math.sin(i/10)
  render = new Signal.Render(sinWave.length, 127)
  render.drawSignal(sinWave, true, true)
  document.body.appendChild(render.element)
  assert.ok true

QUnit.test 'naive_correlation', (assert) ->
  frame = craetePictureFrame("naive_correlation")
  length = Math.pow(2, 8)
  signal = []
  for i in [0..length-1]
    signal[i] = if 64 > i > 32 then 1 else 0
  correl = Signal.naive_correlation(signal, signal)
  render = new Signal.Render(signal.length, 127)
  render.drawSignal(signal, true, true)
  frame.add(render.element, "sigal")
  render = new Signal.Render(correl.length, 127)
  render.drawSignal(correl, true, true)
  frame.add(render.element, "auto-correl")
  assert.ok correl.length is signal.length

QUnit.test 'naive_convolution', (assert) ->
  frame = craetePictureFrame("naive_convolution")
  length = Math.pow(2, 8)
  signal = []
  for i in [1..length]
    signal[i] = if 64 > i > 32 then 1 else 0
  conv = Signal.naive_convolution(signal, signal)
  render = new Signal.Render(signal.length, 127)
  render.drawSignal(signal, true, true)
  frame.add(render.element, "sigal")
  render = new Signal.Render(conv.length, 127)
  render.drawSignal(conv, true, true)
  frame.add(render.element, "auto-conv")
  assert.ok conv.length is signal.length

QUnit.test 'fft_correlation', (assert) ->
  frame = craetePictureFrame("fft_correlation")
  length = Math.pow(2, 8)
  signal = new Float32Array(length)
  for _, i in signal
    signal[i] = if 64 > i > 32 then 1 else 0
  correl = Signal.fft_correlation(signal, signal)
  render = new Signal.Render(signal.length, 127)
  render.drawSignal(signal, true, true)
  frame.add(render.element, "sigal")
  render = new Signal.Render(correl.length, 127)
  render.drawSignal(correl, true, true)
  frame.add(render.element, "auto-correl")
  assert.ok correl.length is signal.length


QUnit.test 'fft_convolution', (assert) ->
  frame = craetePictureFrame("fft_convolution")
  length = Math.pow(2, 8)
  signal = new Float32Array(length)
  for _, i in signal
    signal[i] = if 64 > i > 32 then 1 else 0
  conv = Signal.fft_convolution(signal, signal)
  render = new Signal.Render(signal.length, 127)
  render.drawSignal(signal, true, true)
  frame.add(render.element, "sigal")
  render = new Signal.Render(conv.length, 127)
  render.drawSignal(conv, true, true)
  frame.add(render.element, "auto-conv")
  assert.ok conv.length is signal.length


QUnit.test 'mseqGen -> fft_correlation', (assert) ->
  frame = craetePictureFrame("mseqGen -> fft_correlation")
  length = Math.pow(2, 8)
  signal = Signal.mseqGen(7, [0,0,1,0, 0, 0, 1]);
  T = 16
  _signal = new Int8Array(signal.length*T)
  for i in [0...T]
    _signal.set(signal, signal.length*i)
  signal = _signal
  correl = Signal.smartCorrelation(signal, signal)
  render = new Signal.Render(signal.length, 127)
  render.drawSignal(signal, true, true)
  frame.add(render.element, "sigal")
  render = new Signal.Render(correl.length, 127)
  render.drawSignal(correl, true, true)
  frame.add(render.element, "auto-correl")
  assert.ok correl.length is signal.length

QUnit.test 'phase_only_filter', (assert) ->
  frame = craetePictureFrame("phase_only_filter")
  length = Math.pow(2, 10)
  signal = new Float32Array(length)
  signal_noized = new Float32Array(length)
  for _, i in signal
    signal[i] = if 256 > i > 128 or 64 > i > 32 then 1 else 0
    signal_noized[i] = signal[i] + Math.random()
  correl = Signal.phase_only_filter(signal, signal_noized)
  _correl = Signal.correlation(signal, signal_noized)
  render = new Signal.Render(signal.length, 127)
  render.drawSignal(signal, true, true)
  frame.add(render.element, "signal")
  render = new Signal.Render(signal_noized.length, 127)
  render.drawSignal(signal_noized, true, true)
  frame.add(render.element, "signal_noized")
  render = new Signal.Render(correl.length, 127)
  render.drawSignal(correl, true, true)
  frame.add(render.element, "pof_correl")
  render = new Signal.Render(_correl.length, 127)
  render.drawSignal(_correl, true, true)
  frame.add(render.element, "fft_correl")
  render = new Signal.Render(correl.length, 127)
  render.drawSignal(correl, true, true)
  render.drawSignal(_correl, true, true)
  frame.add(render.element, "pof+fft_correl")
  assert.ok signal.length is correl.length
