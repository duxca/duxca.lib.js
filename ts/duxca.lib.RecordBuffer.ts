

/*
class RecordBuffer
  constructor: (@bufferSize, @channel, @maximamRecordSize=Infinity)-> # 2ch, バッファ保持数
    @chsBuffers = [1..@channel].map -> []
    @lastTime = 0
    @count = 0
  clear: ->
    @chsBuffers = [1..@channel].map -> []
    @count = 0
    return
  add: (buffers, @lastTime=0)->
    @count++
    for buffer, i in buffers
      @chsBuffers[i].push(buffer)
    if @chsBuffers[0].length >= @maximamRecordSize
      for chBuffers in @chsBuffers
        chBuffers.shift()
    return
  toPCM: ->
    toInt16Array(
      interleave(
        (mergeBuffers(chBuffers) for chBuffers in @chsBuffers)))
  merge: (ch=0)->
    mergeBuffers(@chsBuffers[ch])
  getChannelData: (n)->
    mergeBuffers(@chsBuffers[n])
  mergeBuffers = (chBuffer)->
    bufferSize = chBuffer[0].length
    f32ary = new Float32Array(chBuffer.length * bufferSize)
    for v, i in chBuffer
      f32ary.set(v, i * bufferSize)
    f32ary
  interleave = (chs)->
    length = chs.length * chs[0].length
    f32Ary = new Float32Array(length)
    inputIndex = 0
    index = 0
    while index < length
      for ch, i in chs
        f32Ary[index++] = ch[inputIndex]
      inputIndex++
    f32Ary
  toInt16Array = (f32ary)->
    int16ary = new Int16Array(f32ary.length)
    for v, i in f32ary
      int16ary[i] = v * 0x7FFF * 0.8 # 32bit -> 16bit
    int16ary
*/
