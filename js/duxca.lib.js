/// <reference path="../typings/tsd.d.ts" />
/*

separate = (arr, length, slidewidth)->
  results = []
  point = 0
  while arr.length > point + length
    results.push arr.subarray(point, point + length)
    point += slidewidth
  results

  getSocket = (url)->
    new Promise (resolve, reject)->
      transmitter = io(url)
      transmitter.on "connect", ->
        resolve(transmitter)
      transmitter.on "error", (err)->
        reject(err)
        
get = (url)->
  new Promise (resolve, reject)->
    xhr = new XMLHttpRequest()
    xhr.addEventListener "load", ()->
      if 200 <= xhr["status"] && xhr["status"] < 300
        if !xhr["response"]["error"]?
        then resolve(xhr["response"])
        else reject(new Error(xhr["response"]["error"]["message"]));
      else reject(new Error(xhr["status"]));
    xhr["open"]("GET", url);
    xhr["responseType"] = "arraybuffer"
    xhr["send"]()


    getPCM = (actx, osc, stopTime=1)->
      new Promise (resolve, reject)->
        processor = actx.createScriptProcessor(16384/16, 1, 1)
        recbuf = new RecordBuffer(processor.bufferSize, 1)
        stopSample = stopTime * actx.sampleRate
        #Opera 27.0.1689.33
        #Chrome 41.0.2259.0 canary (64-bit)
        console.log processor.onaudioprocess = (ev)->
          recbuf.add([ev.inputBuffer.getChannelData(0)])
          currentSample = recbuf.count * recbuf.bufferSize
          if currentSample - stopSample < 0 then return
          processor.disconnect(0)
          processor.onaudioprocess = null
          data = recbuf.getChannelData(0)
          recbuf.clear()
          resolve(data)
        osc.connect(processor)
        processor.connect(actx.destination)

*/
