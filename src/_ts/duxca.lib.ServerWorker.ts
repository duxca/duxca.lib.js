/*
class ServerWorker
  constructor: (fn, args, imports=[])->
    @url = URL.createObjectURL(
      new Blob([
        imports.map((src)-> "importScripts('#{src}');\n").join("") + "\n"
        "(#{ServerWorker.Server})();\n"
        "(#{fn})(#{args.map(JSON.stringify).join(",")});"
      ], {type:"text/javascript"}))
    @worker = new Worker(@url)
    @worker.addEventListener "error", (ev)->
      console.error("#{ev.message}\n  at #{ev.filename}:#{ev.lineno}:#{ev.colno}")
      return
    @worker.addEventListener "message", ({data: [id, args]})=>
      cb = @callbacks[id]
      delete @callbacks[id]
      cb(args)
      return
    @requestId = 0
    @callbacks = {}
  request: (event, [data, transferable]..., callback)->
    id = @requestId++
    @callbacks[id] = callback
    @worker.postMessage([id, event, data], transferable)
    return
  terminate: ->
    @worker.terminate()
    URL.revokeObjectURL(@url)
    return
  @Server = ->
    handlers = {}
    self.addEventListener "message", ({data: [id, event, data]})->
      reply = (args, transferable)->
        self.postMessage([id, args], transferable)
        return
      handlers[event](data, reply)
      return
    self.on = (event, callback)->
      handlers[event] = callback
      return
    return
*/
