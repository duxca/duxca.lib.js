CanvasRender = require("./ts/CanvasRender")
Signal = require("./ts/Signal")
RecordBuffer = require("./ts/RecordBuffer")
OSC = require("./ts/OSC")
Statictics = require("./ts/Statictics")
{Chord} = require("./ts/Chord")
Newton = require("./ts/Newton")
$ = require("jquery")
Point = Newton.Point
SDM = Newton.SDM
period = 0
self.$ = $
self.jQuery = $
chord = new Chord({host:"https://www.duxca.com/",port: 9000})
chord.debug = false
actx = new AudioContext()
osc = new OSC(actx)
isRecording = false
processor = actx.createScriptProcessor(Math.pow(2, 14), 1, 1)
#between Math.pow(2,8) and Math.pow(2,14).
recbuf = new RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount)
TEST_INPUT_MYSELF = false
abuf = null
pulseStartTime = {}
pulseStopTime = {}
pulse = null
fetchStream = ->
  new Promise (resolbe, reject)->
    navigator.getUserMedia({video: false, audio: true}, resolbe, reject)
  .then (stream)->
    source = actx.createMediaStreamSource(stream)
    if TEST_INPUT_MYSELF then source.connect(processor)
    processor.connect(actx.destination)
    processor.addEventListener "audioprocess", (ev)->
      if isRecording
        recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime)

fetchChord = (rootNodeId)->
  if typeof rootNodeId is "string"
  then chord.join(rootNodeId)
  else chord.create()

fetchPulse = ->
  osc.createBarkerCodedChirp(13, 8)
  .then (_pulse)->
    pulse = _pulse
    render = new CanvasRender(128, 128)
    render.cnv.width = 1024
    render.drawSignal(pulse, true, true)
    console.log("length", pulse.length, "sec", pulse.length/actx.sampleRate)
    document.body.appendChild(render.element)
    abuf = osc.createAudioBufferFromArrayBuffer(pulse, actx.sampleRate)


beep = (abuf)->
  anode = osc.createAudioNodeFromAudioBuffer(abuf)
  anode.connect(if TEST_INPUT_MYSELF then processor else actx.destination)
  anode.start(actx.currentTime)

addEventListeners = ->
  chord.on "ping",       (token, cb)-> cb(token)
  chord.on "recStart",   (token, cb)-> isRecording = true;  cb(token)
  chord.on "pulseStart", (token, cb)-> {payload:{data:id}} = token; pulseStartTime[id] = actx.currentTime; cb(token)
  chord.on "pulseBeep",  (token, cb)-> {payload:{data:id}} = token; if chord.peer.id isnt id then return cb(token); else beep(abuf); setTimeout (-> cb(token)), pulse.length/actx.sampleRate * 1000
  chord.on "pulseStop",  (token, cb)-> {payload:{data:id}} = token; pulseStopTime[id]  = actx.currentTime; cb(token)
  chord.on "recStop",    (token, cb)-> isRecording = false; cb(token)
  chord.on "collect",    (token, cb)-> cb(token)
  chord.on "distribute", (token, cb)-> cb(token)
  chord.on "play",       (token, cb)-> cb(token)

recur = ->
  console.group("period")
  chord.request("ping")
  .then (token)-> chord.request("recStart", null, token.route)
  .then (token)-> token.payload.addressee.reduce ((prm, id)->
      prm
      .then (token)-> chord.request("pulseStart", id, token.payload.addressee)
      .then (token)-> chord.request("pulseBeep", id, token.payload.addressee)
      .then (token)-> chord.request("pulseStop", id, token.payload.addressee)
    ), Promise.resolve(token)
  .then (token)-> chord.request("recStop", null, token.route)
  .then (token)-> chord.request("collect", null, token.route)
  .then (token)-> chord.request("distribute", null, token.route)
  .then (token)->
    console.log("period finish", period++)
    console.groupEnd()
    setTimeout recur, 5000


testDetect9 = (rootNodeId)->
  Promise.all([
    fetchStream()
    fetchPulse()
    fetchChord(rootNodeId)
  ]).then ([_, __, chord])->
    addEventListeners()
    console.info(chord.peer.id);
    recur({chord}) if !rootNodeId?




exports.testDetect9 = testDetect9
