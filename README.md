# P2PRingNet

create token ring with Chord DHT algorithm.

```html
<script src="../bower_components/peerjs/peer.min.js"></script>
<script src="../dist/P2PRingNet.js"></script>
<script>
var Chord = P2PRingNet.Chord;
var chord = new Chord(/*{host:"duxca.com", port:9000}*/);
// when `ping` token
chord.on("ping", function(token, pass){
  console.log(token.payload.event, token);
  pass(token);
});

var rootNodeId = prompt("peerid");

((typeof rootNodeId === "string")
  ? chord.join(rootNodeId)
  : chord.create()
).then(function recur(chord){
  console.info(chord.peer.id);
  if (typeof rootNodeId !== "string") {
    console.group("ping");
    console.time("ping");
    new Promise(function(resolve, reject){
      chord.request("ping").then(resolve);
      setTimeout(function(){reject(new Error("timeout:10000"))}, 10000);
    }).then(function(token){
      console.log(chord.peer.id, "fin", token.route);
    }).catch(function(err){
      console.warn(err);
    }).then(function(){ // finally
      console.timeEnd("ping");
      console.groupEnd();
      setTimeout(function(){recur(chord);}, 5000);
    });
  }
}).catch(function(err){console.error(err);});
</script>
```
