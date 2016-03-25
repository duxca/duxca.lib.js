```javascript
location.href = "http://192.168.43.52:8000/demo/sandbox.html";
duxca.lib.Sandbox.testDetect9();$("body").append("<h1>master<h1>");
```


# todo

## 2015-06-30

* In typings/webrtc/MediaStream.d.ts, "MediaStream" interface does not extend "EventTarget" interface.
  * need pull req to DefinityTyped.
    * [2015-07-04] https://github.com/borisyankov/DefinitelyTyped/pull/4820
    * [2015-07-06]https://github.com/borisyankov/DefinitelyTyped/pull/4830
* typescript compiler does not have "DataView" interface.
  * npm install typescript --force
    * [2015-07-04] no effect.
* "AudioContext.prototype.createMediaStreamSource" is not found in typings/webrtc/MediaStream.d.ts and typings/webaudioapi/waa.d.ts
  * This is difficult problem. Wait implementation WebRTC on almost browsers.

## 2015-07-03

* In typings/peerjs/peerjs.d.ts, "PeerJs.Peer" interface does not extend "EventEmitter" interface.
  * need pull req to DefinityTyped.
    * [2015-07-04]https://github.com/borisyankov/DefinitelyTyped/pull/4820
    * [2015-07-07]https://github.com/borisyankov/DefinitelyTyped/pull/4829

## 2015-07-12

* measuring distance implemented.
* TODO
  * relational position detection.

# ServerWorker
## simple request/response style inline worker or iframe

* `InlineServerWorker`
  - provide worker thread for heavy process
* `IFrameServerWorker`
  - provide UI thread for DOM sandbox using `window`


## usage

```html
<script src="../dist/ServerWorker.js"></script>
<script>
function add2(x){return add1(add1(x))}
function add4(x){return add2(add2(x))}
function test(ServerWorker){
  var iworker = new ServerWorker(
    ["add1.js"],
    [add2,add4],
    function main(conn, PI){
      conn.on("add4addPI", function(data, reply){
        reply((add4(data + 4 + PI)));
      });
    },
    Math.PI
  );

  iworker.load().then(function(){
    iworker.request("hello", 1).then(function(data){
      console.assert(data === 1+Math.PI+4);
      iworker.unload();
    });
  }).catch(function(err){ console.error(err, err.stack); });
}

window.addEventListener("DOMContentLoaded", function(){
  test(InlineServerWorker);
  test(IFrameServerWorker);
});
</script>
```


## Types
```typescript
function Reply(data: any, transferable?: ArrayBuffer[]): void;
function Listener(data: any, reply: Reply): void;
interface Connection {
  on(event: string, listener: Listener): void;
}
function EntryFunction(conn: Connection, ...args: any[]): void;
interface ServerWorker {
  new (fn: EntryFunction, ...args: any[]);
  new (importScripts: string[], fn: EntryFunction, ...args:any[]);
  new (importScripts: string[], importFunctions: Function[], fn: EntryFunction, ...args:any[]);
  load(): Promise<ServerWorker>;
  request(event: string, data: any, transferable?: ArrayBuffer[]): Promise<any>;
  unload(): void;
}
interface InlineServerWorker extends ServerWorker{}
interface IFrameServerWorker extends ServerWorker{}
```
