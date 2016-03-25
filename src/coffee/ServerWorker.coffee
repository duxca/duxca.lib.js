
class ServerWorker
  constructor: (importScriptsURLs, importFunctions, fn, consts...)->
    @importScriptsURLs = []
    @importFunctions = []
    if importScriptsURLs instanceof Function
      @fn = importScriptsURLs
      @consts = [].concat importFunctions, fn, consts
    else if importFunctions instanceof Function and Array.isArray(importScriptsURLs)
      @importScriptsURLs = importScriptsURLs
      @fn = importFunctions
      @consts = [].concat fn, consts
    else
      @importScriptsURLs = importScriptsURLs
      @importFunctions = importFunctions
      @fn = fn
      @consts = [].concat consts
    @error = createErrorLogger(@fn)


class InlineServerWorker extends ServerWorker
  constructor: (importScriptsURLs, importFunctions, fn, consts...)->
    (super)
    @loadedURLs = []
    @worker = null
  load: ->
    Promise.all(
      @importScriptsURLs.map (url)=>
        getArrayBuffer(url).then (buffer)=>
          URL.createObjectURL(
            new Blob([buffer], {"type": "text/javascript"}))
    ).then (urls)=>
      @loadedURLs = @loadedURLs.concat(urls)
      @loadedURLs.push url = URL.createObjectURL(new Blob(["""
        #{urls.map((url)-> "self.importScripts('#{url}');").join("\n")}
        #{@importFunctions.join("\n")}
        (#{@fn}).apply(this, (function INCLUDE_FUNCTION_SOURCE(consts){
            var events = {};
            var conn = {
              on: function on(event, listener){
                events[event] = listener;
              }
            };
            self.addEventListener("message", function (ev){
              var event = ev.data.event;
              var data = ev.data.data;
              var session = ev.data.session;
              var listener = events[event];
              function reply(data, transferable){
                self.postMessage({data:data, session:session}, transferable);
              }
              listener(data, reply);
            });
            return [conn].concat(consts);
        })([#{@consts.map((a)-> JSON.stringify(a)).join(",")}]) );
      """], {type:"text/javascript"}))
      @worker = new Worker(url)
      return @
  request: (event, data, transferable)->
    new Promise (resolve, reject)=>
      msg = {event, data, session: hash()}
      @worker.addEventListener "error", _err = (ev)=>
        @worker.removeEventListener("error", _err)
        @worker.removeEventListener("message", _msg)
        @error(ev)
        reject(ev)
      @worker.addEventListener "message", _msg = (ev)=>
        if msg.session is ev.data.session
          @worker.removeEventListener("error", _err)
          @worker.removeEventListener("message", _msg)
          resolve(ev.data.data)
      @worker.postMessage(msg, transferable)
      return
  unload: ->
    @loadedURLs.forEach (url)-> URL.revokeObjectURL(url)
    @worker.terminate()
    @worker = null
    return

class IFrameServerWorker extends ServerWorker
  constructor: (importScriptsURLs, importFunctions, fn, consts...)->
    (super)
    @iframe = document.createElement("iframe")
    @iframe.setAttribute("style", """
      position: absolute;
      top: 0px;
      left: 0px;
      width: 0px;
      height: 0px;
      border: 0px;
      margin: 0px;
      padding: 0px;
    """)
  load: ->
    document.body.appendChild(@iframe)
    @iframe.contentDocument.open()
    @iframe.contentDocument.write("""
      #{@importScriptsURLs.map((url)-> "<script src='#{url}'>\x3c/script>").join("\n")}
      <script>
      #{@importFunctions.join("\n")}
      (#{@fn}).apply(this, (function INCLUDE_FUNCTION_SOURCE(consts){
          var events = {};
          var conn = {
            on: function on(event, listener){
              events[event] = listener;
            }
          };
          self.addEventListener("message", function (ev){
            var event = ev.data.event;
            var data = ev.data.data;
            var session = ev.data.session;
            var source = ev.source;
            var listener = events[event];
            function reply(data, transferable){
              source.postMessage({data:data, session:session}, "*")
            }
            listener(data, reply);
          });
          return [conn].concat(consts);
      })([#{@consts.map((a)-> JSON.stringify(a)).join(",")}]) );
      \x3c/script>
    """)
    prm = new Promise (resolve)=>
      @iframe.addEventListener "load", => resolve(@)
    @iframe.contentDocument.close()
    return prm
  request: (event, data)->
    new Promise (resolve, reject)=>
      msg = {event, data, session: hash()}
      @iframe.contentWindow.addEventListener "error", _err = (ev)=>
        @iframe.contentWindow.removeEventListener("error", _err)
        window.removeEventListener("message", _msg)
        @error(ev)
        reject(ev)
      window.addEventListener "message", _msg = (ev)=>
        if msg.session is ev.data.session
          @iframe.contentWindow.removeEventListener("error", _err)
          window.removeEventListener("message", _msg)
          resolve(ev.data.data)
      @iframe.contentWindow.postMessage(msg, "*")
      return
  unload: ()->
    @iframe.removeAttribute("src")
    @iframe.removeAttribute("srcdoc")
    @iframe.contentWindow.removeEventListener()
    document.body.removeChild(@iframe)
    iframe = null
    return


``

hash = ->
  Math.round(Math.random() * Math.pow(16, 8)).toString(16)

createErrorLogger = (code)-> (ev)->
  console.error(ev.message + "\n  at " + ev.filename + ":" + ev.lineno + ":" + ev.colno)
  ev.error && console.error(ev.error.stack);
  console.info("(" + code + "}());".slice(0, 300) + "\n...")

getArrayBuffer = (url)->
  new Promise (resolve, reject)->
    xhr = new XMLHttpRequest();
    xhr.addEventListener "load", ->
      if 200 <= xhr.status and xhr.status < 300
        if xhr.response.error?
        then reject(new Error(xhr.response.error.message))
        else resolve(xhr.response)
      else reject(new Error(xhr.status))
    xhr.open("GET", url)
    xhr.responseType = "arraybuffer"
    xhr.send()

if typeof module isnt 'undefined' and typeof module.exports isnt 'undefined'
  module.exports.InlineServerWorker = InlineServerWorker
  module.exports.IFrameServerWorker = IFrameServerWorker
this.InlineServerWorker = InlineServerWorker
this.IFrameServerWorker = IFrameServerWorker
