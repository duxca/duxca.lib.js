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
