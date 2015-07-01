# todo

## 2015-6-30

* In typings/webrtc/MediaStream.d.ts, "MediaStream" interface does not extend "EventTarget" interface.
  * need pull req to DefinityTyped.
* typescript compiler does not have "DataView" interface.
  * npm install typescript --force
* "AudioContext.prototype.createMediaStreamSource" is not found in typings/webrtc/MediaStream.d.ts and typings/webaudioapi/waa.d.ts
  * This is difficult problem. Wait implementation WebRTC on almost browsers.
