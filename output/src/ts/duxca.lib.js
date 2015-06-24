/// <reference path="../../typings/tsd.d.ts" />
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




*/
