window.craetePictureFrame = (description, target=document.body) ->
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
  mseqLen = mseq.length
  expLen = expected.length
  assert.ok mseqLen is expLen
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
  correlLen = correl.length
  sigLen = signal.length
  assert.ok correlLen is sigLen

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
  convLen = conv.length
  sigLen = signal.length
  assert.ok convLen is sigLen

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
  correlLen = correl.length
  sigLen = signal.length
  assert.ok correlLen is sigLen


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
  convLen = conv.length
  sigLen = signal.length
  assert.ok convLen is sigLen


QUnit.test 'mseqGen -> fft_correlation', (assert) ->
  frame = craetePictureFrame("mseqGen -> fft_correlation")
  length = Math.pow(2, 8)
  signal = Signal.mseqGen(7, [0, 0, 1, 0, 0, 0, 1]);
  T = 16
  _signal = new Int8Array(signal.length*T)
  for i in [0...T]
    _signal.set(signal, signal.length*i)
  correl = Signal.smartCorrelation(_signal, signal)
  correl2 = Signal.fft_smart_overwrap_correlation(_signal, signal)
  render = new Signal.Render(signal.length, 127)
  render.drawSignal(signal, true, true)
  frame.add(render.element, "sigal")
  render = new Signal.Render(_signal.length, 127)
  render.drawSignal(_signal, true, true)
  frame.add(render.element, "sigal")
  render = new Signal.Render(correl.length, 127)
  render.drawSignal(correl, true, true)
  frame.add(render.element, "auto-correl")
  render = new Signal.Render(correl2.length, 127)
  render.drawSignal(correl2, true, true)
  frame.add(render.element, "auto-correl2(POF)")
  correlLen = correl.length
  sigLen = _signal.length
  assert.ok correlLen is sigLen

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
  correlLen = correl.length
  sigLen = signal.length
  assert.ok correlLen is sigLen

QUnit.test 'encode_chipcode, fft_smart_overwrap_correlation', (assert) ->
  frame = craetePictureFrame("encode_chipcode, fft_smart_overwrap_correlation")
  mseq = Signal.mseqGen(10, [0,0,1,0,0,0,0,0,0,1]) # {1,-1}
  bits = [1,0,0,0,1,0,0,1,0]
  seq = Signal.encode_chipcode(bits, mseq)
  mseqLen = mseq.length
  bitsLen = bits.length
  seqLen = seq.length
  render = new Signal.Render(seq.length, 127)
  render.drawSignal(seq, true, true)
  frame.add(render.element, "encode_chipcode")
  assert.ok seqLen is mseqLen * bitsLen
  correl = Signal.fft_smart_overwrap_correlation(seq, mseq)
  correlLen = correl.length
  assert.ok correlLen is seqLen
  threshold = bits.length/2
  peaks = correl.reduce(((lst, v, i)-> if (Math.abs(v) > threshold) then lst.concat(i) else lst), [])
  assert.ok peaks.length is bitsLen
  if peaks.length > bitsLen
    throw "escape"
    return
  peaks.forEach (i)->
    peak = correl[i]
    assert.ok i % mseqLen is 0 && (Math.abs(peak) > threshold)
  render = new Signal.Render(correl.length, 127)
  render.drawSignal(correl, true, true)
  frame.add(render.element, "fft_smart_overwrap_correlation")

QUnit.test 'carrierGen, BPSK', (assert) ->
  frame = craetePictureFrame("carrierGen, BPSK")
  len = 103
  sig = Signal.BPSK([-1,1,1], 1000, 44100, 0, len)
  sig2 = Signal.BPSK([-1,1,1], 1000, 44100, len/44100, 1024)
  sigLen = sig.length
  sig2Len = sig2.length
  assert.ok sigLen is len
  assert.ok sig2Len is 1024
  assert.ok sig[sigLen-1] - sig2[0] < 0.1
  render = new Signal.Render(sig.length, 127)
  render.drawSignal(sig, true, true)
  frame.add(render.element, "sig")
  render = new Signal.Render(sig2.length, 127)
  render.drawSignal(sig2, true, true)
  frame.add(render.element, "sig2")

QUnit.test 'encode_chipcode, fft_smart_overwrap_correlation, carrierGen, BPSK', (assert) ->
  frame = craetePictureFrame("encode_chipcode, fft_smart_overwrap_correlation, carrierGen, BPSK")
  mseq = Signal.mseqGen(7, [0,0,1,0,0,0,1]) # {1,-1}
  bits = [1,0]
  freq = 4000
  sampleRate = 44100
  code = Signal.encode_chipcode(bits, mseq)
  matched = Signal.BPSK(mseq, freq, sampleRate, 0)
  sig = Signal.BPSK(code, freq, sampleRate, 0)
  sig_long = Signal.BPSK(code, freq, sampleRate, 0, Math.pow(2, 14))
  sig_noized = sig_long.map (a)-> a + 2*(Math.random()-0.5)
  console.log correl = Signal.fft_smart_overwrap_correlation(sig_long, matched)
  console.log bits.length
  console.log mseq.length
  console.log code.length
  console.log matched.length
  console.log sig.length
  console.log sig_long.length
  console.log correl.length
  render = new Signal.Render(matched.length, 127)
  render.drawSignal(mseq, true, true)
  frame.add(render.element, "mseq")
  frame.add(document.createElement("br"))
  render = new Signal.Render(matched.length, 127)
  render.drawSignal(matched, true, true)
  frame.add(render.element, "matched")
  frame.add(document.createElement("br"))
  render = new Signal.Render(sig.length, 127)
  render.drawSignal(bits, true, true)
  frame.add(render.element, "bits")
  frame.add(document.createElement("br"))
  render = new Signal.Render(sig.length, 127)
  render.drawSignal(code, true, true)
  frame.add(render.element, "code")
  frame.add(document.createElement("br"))
  render = new Signal.Render(sig.length, 127)
  render.drawSignal(sig, true, true)
  frame.add(render.element, "sig")
  frame.add(document.createElement("br"))
  render = new Signal.Render(sig_long.length, 127)
  render.drawSignal(sig_long, true, true)
  frame.add(render.element, "sig_long")
  render = new Signal.Render(sig_noized.length, 127)
  render.drawSignal(sig_noized, true, true)
  frame.add(render.element, "sig_noized")
  render = new Signal.Render(correl.length, 127)
  render.drawSignal(correl, true, true)
  frame.add(render.element, "correl")
  assert.ok true


QUnit.test 'goldSeqGen', (assert) ->
  frame = craetePictureFrame("goldSeqGen")
  length = Math.pow(2, 8)
  signalA = Signal.goldSeqGen(7, [0, 0, 1, 0, 0, 0, 1], [1, 1, 0, 1, 1, 1, 1], 3);
  signalB = Signal.goldSeqGen(7, [0, 0, 1, 0, 0, 0, 1], [1, 0, 0, 0, 0, 0, 1], 4);
  T = 16
  correlAA = Signal.fft_smart_overwrap_correlation(signalA, signalA)
  render = new Signal.Render(signalA.length, 127)
  render.drawSignal(signalA, true, true)
  frame.add(render.element, "sigalA")
  render = new Signal.Render(correlAA.length, 127)
  render.drawSignal(correlAA, true, true)
  frame.add(render.element, "correlAA")
  correlBB = Signal.fft_smart_overwrap_correlation(signalB, signalB)
  render = new Signal.Render(signalB.length, 127)
  render.drawSignal(signalB, true, true)
  frame.add(render.element, "sigalA")
  render = new Signal.Render(correlBB.length, 127)
  render.drawSignal(correlBB, true, true)
  frame.add(render.element, "correlBB")
  correlAB = Signal.fft_smart_overwrap_correlation(signalA, signalB)
  render = new Signal.Render(correlAB.length, 127)
  render.drawSignal(correlAB, true, true)
  frame.add(render.element, "correlAB")
  correlLen = correlAA.length
  sigLen = signalA.length
  assert.ok correlLen is sigLen
  sig_longA = Signal.BPSK(signalA, 1000, 44100, 0)
  sig_longB = Signal.BPSK(signalB, 1000, 44100, 0)
  mixed = sig_longA.map (v, i)-> sig_longA[(i+149)%sig_longA.length] + sig_longB[(i+133)%sig_longB.length]
  correl_longMB = Signal.fft_smart_overwrap_correlation(mixed, sig_longB)
  correl_longMA = Signal.fft_smart_overwrap_correlation(mixed, sig_longA)
  [_, idA] = Signal.Statictics.findMax(correl_longMA)
  [_, idB] = Signal.Statictics.findMax(correl_longMB)
  assert.ok idA is 149
  assert.ok idB is 133
  render = new Signal.Render(correl_longMA.length, 127)
  render.drawSignal(correl_longMA, true, true)
  frame.add(render.element, "correl_longAB")
  render = new Signal.Render(correl_longMB.length, 127)
  render.drawSignal(correl_longMB, true, true)
  frame.add(render.element, "correl_longAB")
