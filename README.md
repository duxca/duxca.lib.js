

```sh
npm run setup # install cli tools
npm run init  # install libraries
npm run build # build js code
npm run start # start incremental building and http-server
npm run stop  # stop http-server
npm run lint  # tslint
npm run doc   # typedoc
npm run check # type check
```


typedoc する前に tsconfig.json の target を es6 以上に指定すること。promise が読めない https://github.com/TypeStrong/typedoc/issues/315


# log

## 2016-12-12

* update to typescript@2.1

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
