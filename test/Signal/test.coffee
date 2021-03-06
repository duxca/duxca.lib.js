
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
      "../dist/index.js"
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
  render = new CanvasRender(sinWave.length, 127)
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
  render = new CanvasRender(signal.length, 127)
  render.drawSignal(signal, true, true)
  frame.add(render.element, "sigal")
  render = new CanvasRender(correl.length, 127)
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
  render = new CanvasRender(signal.length, 127)
  render.drawSignal(signal, true, true)
  frame.add(render.element, "sigal")
  render = new CanvasRender(conv.length, 127)
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
  render = new CanvasRender(signal.length, 127)
  render.drawSignal(signal, true, true)
  frame.add(render.element, "sigal")
  render = new CanvasRender(correl.length, 127)
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
  render = new CanvasRender(signal.length, 127)
  render.drawSignal(signal, true, true)
  frame.add(render.element, "sigal")
  render = new CanvasRender(conv.length, 127)
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
  render = new CanvasRender(signal.length, 127)
  render.drawSignal(signal, true, true)
  frame.add(render.element, "sigal")
  render = new CanvasRender(_signal.length, 127)
  render.drawSignal(_signal, true, true)
  frame.add(render.element, "sigal")
  render = new CanvasRender(correl.length, 127)
  render.drawSignal(correl, true, true)
  frame.add(render.element, "auto-correl")
  render = new CanvasRender(correl2.length, 127)
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
  render = new CanvasRender(signal.length, 127)
  render.drawSignal(signal, true, true)
  frame.add(render.element, "signal")
  render = new CanvasRender(signal_noized.length, 127)
  render.drawSignal(signal_noized, true, true)
  frame.add(render.element, "signal_noized")
  render = new CanvasRender(correl.length, 127)
  render.drawSignal(correl, true, true)
  frame.add(render.element, "pof_correl")
  render = new CanvasRender(_correl.length, 127)
  render.drawSignal(_correl, true, true)
  frame.add(render.element, "fft_correl")
  render = new CanvasRender(correl.length, 127)
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
  render = new CanvasRender(seq.length, 127)
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
  render = new CanvasRender(correl.length, 127)
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
  render = new CanvasRender(sig.length, 127)
  render.drawSignal(sig, true, true)
  frame.add(render.element, "sig")
  render = new CanvasRender(sig2.length, 127)
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
  render = new CanvasRender(matched.length, 127)
  render.drawSignal(mseq, true, true)
  frame.add(render.element, "mseq")
  frame.add(document.createElement("br"))
  render = new CanvasRender(matched.length, 127)
  render.drawSignal(matched, true, true)
  frame.add(render.element, "matched")
  frame.add(document.createElement("br"))
  render = new CanvasRender(sig.length, 127)
  render.drawSignal(bits, true, true)
  frame.add(render.element, "bits")
  frame.add(document.createElement("br"))
  render = new CanvasRender(sig.length, 127)
  render.drawSignal(code, true, true)
  frame.add(render.element, "code")
  frame.add(document.createElement("br"))
  render = new CanvasRender(sig.length, 127)
  render.drawSignal(sig, true, true)
  frame.add(render.element, "sig")
  frame.add(document.createElement("br"))
  render = new CanvasRender(sig_long.length, 127)
  render.drawSignal(sig_long, true, true)
  frame.add(render.element, "sig_long")
  render = new CanvasRender(sig_noized.length, 127)
  render.drawSignal(sig_noized, true, true)
  frame.add(render.element, "sig_noized")
  render = new CanvasRender(correl.length, 127)
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
  render = new CanvasRender(signalA.length, 127)
  render.drawSignal(signalA, true, true)
  frame.add(render.element, "sigalA")
  render = new CanvasRender(correlAA.length, 127)
  render.drawSignal(correlAA, true, true)
  frame.add(render.element, "correlAA")
  correlBB = Signal.fft_smart_overwrap_correlation(signalB, signalB)
  render = new CanvasRender(signalB.length, 127)
  render.drawSignal(signalB, true, true)
  frame.add(render.element, "sigalA")
  render = new CanvasRender(correlBB.length, 127)
  render.drawSignal(correlBB, true, true)
  frame.add(render.element, "correlBB")
  correlAB = Signal.fft_smart_overwrap_correlation(signalA, signalB)
  render = new CanvasRender(correlAB.length, 127)
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
  [_, idA] = Statistics.findMax(correl_longMA)
  [_, idB] = Statistics.findMax(correl_longMB)
  assert.ok idA is 149
  assert.ok idB is 133
  render = new CanvasRender(correl_longMA.length, 127)
  render.drawSignal(correl_longMA, true, true)
  frame.add(render.element, "correl_longAB")
  render = new CanvasRender(correl_longMB.length, 127)
  render.drawSignal(correl_longMB, true, true)
  frame.add(render.element, "correl_longAB")


QUnit.test 'phase_shift_detection', (assert) ->
  assert.ok true
  frame = craetePictureFrame("phase_shift_detection")
  _signal = new Int16Array(256)
  _signal[128] = 230
  _signal[142] = 255
  _signal[153] = 128
  _signal[164] = 100
  _signal[175] = 120
  T = _signal.length
  signal = new Int16Array(1024)
  offset = 0
  signal.set(_signal, offset)
  signal.set(_signal, offset+T)
  signal.set(_signal, offset+2*T)
  signal.forEach (v,i)-> signal[i] += (Math.random()-0.5)*2*16
  A = signal.subarray(0, T)
  B = signal.subarray(T+1, T*2+1)
  C = signal.subarray(T*2+2, T*3+2)
  [[signal, "signal"], [A, "A"], [C, "C"], [C, "C"]].forEach ([sig, title])->
    render = new CanvasRender(sig.length, 255)
    render.drawSignal(sig)
    frame.add(render.element, title)
    frame.add document.createElement "br"
  i = 0
  maxes = new Int16Array(T)
  _maxes = new Int16Array(T)
  do recur = ->
    unless i<T-T*0.1
    then return
    _A = new Int16Array(T)
    _A.set(A.subarray(T-i, T), 0)
    _C = new Int16Array(T)
    _C.set(C.subarray(T-i, T), 0)
    corr = Signal.fft_smart_overwrap_correlation(B, _A)
    [a, b]=Signal.Statistics.findMax(corr)
    maxes[i] = if b>0 then a else 0
    _corr = Signal.fft_smart_overwrap_correlation(B, _C)
    [a, b]=Signal.Statistics.findMax(_corr)
    _maxes[i] = if b>0 then a else 0
    console.log [_,a] = Signal.Statistics.findMax(maxes)
    console.log [_,b] = Signal.Statistics.findMax(_maxes)
    console.log (a+b)/2
    coms = [
      [B]
      [_A]
      [_C]
      [corr, false, true]
      [_corr, false, true]
      [maxes, false, true]
      [_maxes, false, true]
    ]
    renders = (new CanvasRender(A.length, 64) for _ in coms)
    renders.forEach (render)-> render.clear()
    renders.forEach (_, i)->
      CanvasRender::drawSignal.apply(renders[i], coms[i])
    renders.forEach (render)->
      frame.add(render.element)
      frame.add document.createElement "br"
    i++
    setTimeout(recur, 10)


QUnit.test 'phase_shift_detection2', (assert) ->
  assert.ok true
  frame = craetePictureFrame("phase_shift_detection")
  view = (sig, title="")->
    render = new CanvasRender(sig.length, 255)
    render.drawSignal(sig, true, true)
    frame.add(render.element, title)
    frame.add document.createElement "br"
  signal = new Float32Array(256)
  for i in [0...32]
    signal[i+62] += Math.sin(i/32 * Math.PI)
  for i in [0...32]
    signal[i+128] += Math.sin(i/32 * Math.PI)
  signal.forEach (_,i)->
    signal[i] += Math.sin(i/64 * Math.PI)/10
  signal.forEach (_,i)->
    signal[i] += Math.sin(i/32 * Math.PI)/10
  signal.forEach (v,i)-> signal[i] = Math.pow(signal[i], 2)
  #signal.forEach (v,i)-> signal[i] += Math.random()/10
  T = signal.length
  xs = signal
  ###
  view xs, "xs"
  conv = new Float32Array(T)
  xs.forEach (_,i)->
    ys = new Float32Array(T)
    ys.set(xs.subarray(i, T), 0)
    view ys, "ys"
    corr = Signal.fft_smart_overwrap_correlation(xs, ys)
    conv[i] = corr[0]
    view corr, "corr#{i}"
    #view conv, "conv#{i}"
  view conv, "conv"
  i = 1
  while conv[0]/2 < conv[i] then i++
  while conv[i-1] - conv[i] > 0 then i++
  [_,idx] = Signal.Statistics.findMax(conv.subarray(i, conv.length))
  console.log i+idx
  ###
  console.log Signal.first_wave_detection(xs)


QUnit.test 'picture', (assert) ->
  assert.ok true
  n = (a)-> a.split("").map(Number)
  length = 3
  seed = n("101")
  carrier_freq = 44100/16
  sampleRate = 44100
  PULSE_N = 1
  chip_width = 16
  zoom = 2
  chip_width*=zoom
  document.body.appendChild document.createElement "hr"
  ss_code = Signal.mseqGen(length, seed) # {1,-1}
  do ->
    sig = new Int8Array(ss_code.length*2)
    sig.forEach (_, i)->
      sig[i] = if i < ss_code.length then 1 else 0
    render = new CanvasRender(chip_width*sig.length*zoom, 128)
    render.ctx.beginPath()
    render.ctx.moveTo(0, render.cnv.height/2)
    lastPosX = chip_width*0
    lastPosY = (1+0)*render.cnv.height/2
    sig.forEach (v, i)->
      render.ctx.lineTo(chip_width*(i), (1-v)*render.cnv.height/2)
      lastPosX = chip_width*(i+1)
      lastPosY = (1-v)*render.cnv.height/2
      render.ctx.lineTo(lastPosX, lastPosY)
    render.ctx.stroke()
    document.body.appendChild render.element
    document.body.appendChild document.createElement "br"
  do ->
    sig = new Int8Array(ss_code.length*2)
    sig.set(ss_code, 0)
    sig.set(ss_code, ss_code.length)
    render = new CanvasRender(chip_width*sig.length*zoom, 128)
    render.ctx.beginPath()
    render.ctx.moveTo(0, render.cnv.height/2)
    lastPosX = chip_width*0
    lastPosY = (1+0)*render.cnv.height/2
    sig.forEach (v, i)->
      render.ctx.lineTo(chip_width*(i), (1-v)*render.cnv.height/2)
      lastPosX = chip_width*(i+1)
      lastPosY = (1-v)*render.cnv.height/2
      render.ctx.lineTo(lastPosX, lastPosY)
    render.ctx.stroke()
    document.body.appendChild render.element
    document.body.appendChild document.createElement "br"
  sig_coded = Signal.encode_chipcode(n("10"), ss_code)
  do ->
    sig = sig_coded
    render = new CanvasRender(chip_width*sig.length*zoom, 128)
    render.ctx.beginPath()
    render.ctx.moveTo(0, render.cnv.height/2)
    lastPosX = chip_width*0
    lastPosY = (1+0)*render.cnv.height/2
    sig.forEach (v, i)->
      render.ctx.lineTo(chip_width*(i), (1-v)*render.cnv.height/2)
      lastPosX = chip_width*(i+1)
      lastPosY = (1-v)*render.cnv.height/2
      render.ctx.lineTo(lastPosX, lastPosY)
    render.ctx.stroke()
    document.body.appendChild render.element
    document.body.appendChild document.createElement "br"
  do ->
    sig = Signal.BPSK(sig_coded.map(->1), carrier_freq, sampleRate, 0)
    render = new CanvasRender(sig.length*zoom, 128)
    render.drawSignal(sig, true, true)
    document.body.appendChild render.element
    document.body.appendChild document.createElement "br"
    Signal.BPSK(sig_coded, carrier_freq, sampleRate, 0)
  ss_sig = Signal.BPSK(sig_coded, carrier_freq, sampleRate, 0)
  do ->
    sig = ss_sig
    render = new CanvasRender(sig.length*zoom, 128)
    render.drawSignal(sig, true, true)
    document.body.appendChild render.element
    document.body.appendChild document.createElement "br"
  matched = Signal.BPSK(ss_code, carrier_freq, sampleRate, 0)
  ->
    sig = matched
    render = new CanvasRender(sig.length*zoom, 128)
    render.drawSignal(sig, true, true)
    document.body.appendChild render.element
    document.body.appendChild document.createElement "br"
  console.log corr = Signal.fft_smart_overwrap_correlation(ss_sig, matched)
  do ->
    sig = corr
    render = new CanvasRender(sig.length*zoom, 128)
    render.drawSignal(sig, true, true)
    document.body.appendChild render.element
    document.body.appendChild document.createElement "br"