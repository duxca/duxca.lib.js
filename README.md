# ServerWorker
## simple request/response style inline worker

* `InlineServerWorker`
  - provide worker thread for heavy process
* `IframeServerWorker`
  - provide UI thread for DOM sandbox


## usage

```html
<script src="../dist/ServerWorker.js"></script>
<script>
function test(ServerWorker, name){
  var iworker = new ServerWorker(["foo.js", "bar.js"], function(emitter, math){
    // inline worker space
    emitter.on("hello", function(data, reply){
      reply("hello"+data+math.PI);
    });
  }, {PI:3.14});
  iworker.load().then(function(){
    iworker.request("hello", name).then(function(data){
      console.log(data); // -> helloworker3.14 | helloiframe3.14
      iworker.terminate();
    });
  }).catch(function(err){ console.error(err, err.stack)});
}

window.addEventListener("DOMContentLoaded", function(){
  test(InlineServerWorker, "worker");
  test(IFrameServerWorker, "iframe");
});
</script>

```
