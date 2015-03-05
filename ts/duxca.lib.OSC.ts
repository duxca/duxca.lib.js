/*
class OSC
  constructor: (@actx)->
  tone: (freq, startTime, duration)->
    osc = @actx.createOscillator()
    osc.start(startTime)
    osc.stop(startTime + duration)
    gain = @actx.createGain()
    gain.gain.value = 0
    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(1, startTime + 0.01)
    gain.gain.setValueAtTime(1, startTime + duration - 0.01)
    gain.gain.linearRampToValueAtTime(0, startTime + duration)
    osc.connect(gain)
    gain
  chirp: (startFreq, stopFreq, startTime, duration)->
    osc = @actx.createOscillator()
    osc.frequency.value = startFreq
    osc.frequency.setValueAtTime(startFreq, startTime)
    osc.frequency.exponentialRampToValueAtTime(stopFreq, startTime + duration)
    osc.start(startTime)
    osc.stop(startTime + duration)
    gain = @actx.createGain()
    gain.gain.value = 0
    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(1, (startTime + duration)/2)
    gain.gain.linearRampToValueAtTime(0, startTime + duration)
    osc.connect(gain)
    gain
*/
