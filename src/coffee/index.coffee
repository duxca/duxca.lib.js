module.exports =
  lib:
    CanvasRender: require("./ts/CanvasRender");
    Chord: require("./ts/Chord");
    FDTD: require("./ts/FDTD");
    FPS: require("./ts/FPS");
    Metronome: require("./ts/Metronome");
    Newton: require("./ts/Newton");
    OSC: require("./ts/OSC");
    QRcode: require("./ts/QRCode");
    RecordBuffer: require("./ts/RecordBuffer");
    Sandbox: [
      require("./ts/Sandbox1"),
      require("./ts/Sandbox2"),
      require("./ts/Sandbox3"),
      require("./ts/Sandbox4"),
      require("./ts/Sandbox5"),
      require("./ts/Sandbox6"),
      require("./ts/Sandbox7"),
      require("./ts/Sandbox8"),
      require("./ts/Sandbox9"),
      require("./Sandbox")
    ].reduce((merged, obj)->
      Object.keys(obj).forEach (key)->
        merged[key] = obj[key]
      merged
    , {})
    Signal: require("./ts/Signal");
    Statictics: require("./ts/Statictics");
    Util:
      importObject: (hash)->
        Object.keys(hash).forEach (key)->
          self[key] = hash[key]
        console.log("some global variables appended: ", Object.keys(hash))
    Wave: require("./ts/Wave");
