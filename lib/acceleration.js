// Generated by CoffeeScript 1.12.2
(function() {
  var o;

  o = {};

  setInterval((function() {
    var x, y, z;
    x = o.x, y = o.y, z = o.z;
    return $("#acc").html(JSON.stringify([x, y, z], null, "  "));
  }), 250);

  window.ondevicemotion = function(ev) {
    return o = ev.accelerationIncludingGravity;
  };

}).call(this);
