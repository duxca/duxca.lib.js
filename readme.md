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
