// Generated by CoffeeScript 1.9.3
(function() {
  module.exports = {
    lib: {
      CanvasRender: require("../ts/CanvasRender"),
      Chord: require("../ts/Chord"),
      FDTD: require("../ts/FDTD"),
      FPS: require("../ts/FPS"),
      Metronome: require("../ts/Metronome"),
      Newton: require("../ts/Newton"),
      OSC: require("../ts/OSC"),
      QRcode: require("../ts/QRCode"),
      RecordBuffer: require("../ts/RecordBuffer"),
      Sandbox: [require("../ts/Sandbox1"), require("../ts/Sandbox2"), require("../ts/Sandbox3"), require("../ts/Sandbox4"), require("../ts/Sandbox5"), require("../ts/Sandbox6"), require("../ts/Sandbox7"), require("../ts/Sandbox8"), require("../ts/Sandbox9")].reduce(function(merged, obj) {
        Object.keys(obj).forEach(function(key) {
          return merged[key] = obj[key];
        });
        return merged;
      }, {}),
      Signal: require("../ts/Signal"),
      Statictics: require("../ts/Statictics"),
      Util: {
        importObject: function(hash) {
          Object.keys(hash).forEach(function(key) {
            return self[key] = hash[key];
          });
          return console.log("some global variables appended: ", Object.keys(hash));
        }
      },
      Wave: require("../ts/Wave")
    }
  };

}).call(this);
