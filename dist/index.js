(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.duxca = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var Ajax;
(function (Ajax) {
    function getArrayBuffer(url) {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.addEventListener("load", function () {
                if (200 <= xhr.status && xhr.status < 300) {
                    if (xhr.response.error == null) {
                        return resolve(xhr.response);
                    }
                    else {
                        return reject(new Error("message: " + xhr.response.error.message));
                    }
                }
                else {
                    return reject(new Error("status: " + xhr.status));
                }
            });
            xhr["open"]("GET", url);
            xhr["responseType"] = "arraybuffer";
            return xhr["send"]();
        });
    }
    Ajax.getArrayBuffer = getArrayBuffer;
    ;
})(Ajax || (Ajax = {}));
module.exports = Ajax;

},{}],2:[function(require,module,exports){
"use strict";
var CanvasRender = require("duxca.lib.canvasrender.js");
var FDTD = (function () {
    function FDTD(width, height) {
        if (width === void 0) { width = 100; }
        if (height === void 0) { height = 100; }
        this.DELTA_T = 0.001;
        this.DELTA_X = 0.001;
        this.DENSITY = 1;
        this.BLUK_MODULUS = 0.1;
        this.BOUNDARY_IMPEDANCE = 0.5;
        this.width = width;
        this.height = height;
        this.pressures = [new Float32Array(width * height), new Float32Array(width * height)];
        this.velocities = [
            [new Float32Array((width + 1) * (height + 1)), new Float32Array((width + 1) * (height + 1))],
            [new Float32Array((width + 1) * (height + 1)), new Float32Array((width + 1) * (height + 1))]
        ];
        this.counter = 0;
    }
    FDTD.prototype.step = function () {
        var preP = this.pressures[this.counter % this.pressures.length];
        var curP = this.pressures[(this.counter + 1) % this.pressures.length];
        var _a = this.velocities[this.counter % this.pressures.length], preVx = _a[0], preVy = _a[1];
        var _b = this.velocities[(this.counter + 1) % this.pressures.length], curVx = _b[0], curVy = _b[1];
        //console.assert(preP.length === curP.length);
        //console.assert(preVx !== curVx);
        //console.assert(preP.length+1 !== curVx.length);
        //console.log("x boundary condition");
        for (var j = 1; j <= this.height; j++) {
            var ptr = 0 + j * this.width;
            curVx[ptr] = preP[ptr] / this.BOUNDARY_IMPEDANCE;
            var ptr = this.width + j * this.width;
            var ptr1 = (this.width + 1) + j * this.width;
            curVx[ptr1] = preP[ptr] / this.BOUNDARY_IMPEDANCE;
        }
        //console.log("y boundary condition");
        for (var i = 1; i <= this.width; i++) {
            var ptr = i + 0 * this.width;
            curVy[ptr] = preP[ptr] / this.BOUNDARY_IMPEDANCE;
            var ptr = i + this.height * this.width;
            var ptr1 = i + (this.height + 1) * this.width;
            curVy[ptr1] = preP[ptr] / this.BOUNDARY_IMPEDANCE;
        }
        for (var j = 0; j < this.height - 1; j++) {
            for (var i = 0; i < this.width - 1; i++) {
                var ptr = i + j * this.width;
                var ptrx = (i + 1) + j * this.width;
                var ptry = i + (j + 1) * this.height;
                curVx[ptrx] = curVx[ptrx] - this.DELTA_T / (this.DELTA_X * this.DENSITY) * (preP[ptrx] - preP[ptr]);
                curVy[ptry] = curVy[ptry] - this.DELTA_T / (this.DELTA_X * this.DENSITY) * (preP[ptry] - preP[ptr]);
            }
        }
        for (var j = 0; j < this.height; j++) {
            for (var i = 0; i < this.width; i++) {
                var ptr = i + j * this.width;
                var ptrx = (i + 1) + j * this.width;
                var ptry = i + (j + 1) * this.height;
                curP[ptr] = preP[ptr] - (((this.DELTA_T * this.BLUK_MODULUS) / this.DELTA_X) * (curVx[ptrx] - curVx[ptr]) +
                    ((this.DELTA_T * this.BLUK_MODULUS) / this.DELTA_X) * (curVy[ptry] - curVy[ptr]));
            }
        }
        this.counter++;
        return this;
    };
    FDTD.prototype.draw = function (render) {
        var cnv = render.cnv;
        var ctx = render.ctx;
        cnv.width = this.width;
        cnv.height = this.height;
        var imgdata = ctx.getImageData(0, 0, cnv.width, cnv.height);
        var curP = this.pressures[(this.counter) % this.pressures.length];
        for (var j = 0; j < this.height; j++) {
            for (var i = 0; i < this.width; i++) {
                var ptr = i + j * this.width;
                var _a = CanvasRender.hslToRgb(1 - curP[ptr] / 1024, 0.5, 0.5), r = _a[0], g = _a[1], b = _a[2];
                imgdata.data[ptr * 4 + 0] = r | 0;
                imgdata.data[ptr * 4 + 1] = g | 0;
                imgdata.data[ptr * 4 + 2] = b | 0;
                imgdata.data[ptr * 4 + 3] = 255;
            }
        }
        ctx.putImageData(imgdata, 0, 0);
        return this;
    };
    return FDTD;
}());
module.exports = FDTD;

},{"duxca.lib.canvasrender.js":10}],3:[function(require,module,exports){
"use strict";
var FPS = (function () {
    function FPS(period) {
        this.period = period;
        this.lastTime = performance.now();
        this.fps = 0;
        this.counter = 0;
    }
    FPS.prototype.step = function () {
        var currentTime = performance.now();
        this.counter += 1;
        if (currentTime - this.lastTime > this.period) {
            this.fps = 1000 * this.counter / (currentTime - this.lastTime);
            this.counter = 0;
            this.lastTime = currentTime;
        }
    };
    FPS.prototype.valueOf = function () {
        return Math.round(this.fps * 1000) / 1000;
    };
    return FPS;
}());
module.exports = FPS;

},{}],4:[function(require,module,exports){
"use strict";
var Metronome = (function () {
    function Metronome(actx, interval) {
        this.actx = actx;
        this.interval = interval;
        this.lastTime = this.actx.currentTime;
        this.nextTime = this.interval + this.actx.currentTime;
        this.nextTick = function () { };
    }
    Metronome.prototype.step = function () {
        if (this.actx.currentTime - this.nextTime >= 0) {
            this.lastTime = this.nextTime;
            this.nextTime += this.interval;
            this.nextTick();
        }
    };
    return Metronome;
}());
module.exports = Metronome;

},{}],5:[function(require,module,exports){
"use strict";
var Newton = (function () {
    function Newton(theta, pts, _pts) {
        this.theta = theta;
        this.points = pts;
        this._pts = _pts;
    }
    Newton.prototype.step = function () {
        var _theta = this.theta - this.det(this.theta) / this.der(this.theta);
        this.theta = _theta;
    };
    Newton.prototype.det = function (theta) {
        var _this = this;
        return this.points.reduce(function (sum, _, k) {
            return (_this.points[k].x - Math.pow((_this._pts[k].x * Math.cos(theta) - _this._pts[k].y * Math.sin(theta)), 2)) +
                (_this.points[k].y - Math.pow((_this._pts[k].x * Math.sin(theta) + _this._pts[k].y * Math.cos(theta)), 2));
        }, 0);
    };
    Newton.prototype.der = function (theta) {
        var _this = this;
        return -2 * this.points.reduce(function (sum, _, k) {
            return (_this.points[k].x * (-1 * _this._pts[k].x * Math.sin(theta) - _this._pts[k].y * Math.cos(theta))) +
                (_this.points[k].y * (-1 * _this._pts[k].x * Math.cos(theta) - _this._pts[k].y * Math.sin(theta)));
        }, 0);
    };
    return Newton;
}());
var Newton;
(function (Newton) {
    var Point = (function () {
        function Point(x, y) {
            this.x = x;
            this.y = y;
        }
        Point.prototype.plus = function (pt) {
            return new Point(this.x + pt.x, this.y + pt.y);
        };
        Point.prototype.minus = function (pt) {
            return new Point(this.x - pt.x, this.y - pt.y);
        };
        Point.prototype.times = function (num) {
            return new Point(num * this.x, num * this.y);
        };
        Point.prototype.distance = function (pt) {
            return Math.sqrt(Math.pow(pt.x - this.x, 2) +
                Math.pow(pt.y - this.y, 2));
        };
        return Point;
    }());
    Newton.Point = Point;
    var SDM = (function () {
        function SDM(pts, ds, a) {
            if (a === void 0) { a = 0.05; }
            this.points = pts;
            this.distance = ds;
            this.a = a;
        }
        SDM.prototype.step = function () {
            var _this = this;
            var _pts = [];
            for (var i = 0; i < this.points.length; i++) {
                var delta = this.distance[i].reduce((function (sumPt, _, j) {
                    if (i === j) {
                        return sumPt;
                    }
                    else {
                        return sumPt.plus((_this.points[i].minus(_this.points[j])).times((1 - _this.distance[i][j] / _this.points[i].distance(_this.points[j]))));
                    }
                }), new Point(0, 0)).times(2);
                _pts[i] = this.points[i].minus(delta.times(this.a));
            }
            this.points = _pts;
        };
        SDM.prototype.det = function () {
            var _this = this;
            return this.points.reduce((function (sum, _, i) {
                return sum + _this.points.reduce((function (sum, _, j) {
                    return i === j ? sum :
                        sum + Math.pow(_this.points[i].distance(_this.points[j]) - _this.distance[i][j], 2);
                }), 0);
            }), 0);
        };
        return SDM;
    }());
    Newton.SDM = SDM;
})(Newton || (Newton = {}));
module.exports = Newton;

},{}],6:[function(require,module,exports){
// Generated by CoffeeScript 1.10.0
(function() {
  var SGSmooth;

  SGSmooth = (function() {
    var workerScript;

    function SGSmooth(nth_degree_polynomial, radius) {
      this.nth_degree_polynomial = nth_degree_polynomial;
      this.radius = radius;
      this.currentWorker = 0;
      this.workers = [1].map(function(i) {
        return new ServerWorker(workerScript, [this.nth_degree_polynomial, this.radius]);
      });
    }

    SGSmooth.prototype.process = function(f32arr) {
      var worker;
      worker = this.workers[this.currentWorker++];
      if (this.workers.length === this.currentWorker) {
        this.currentWorker = 0;
      }
      return new Promise(function(resolve, reject) {
        return worker.request("calc", f32arr, resolve);
      });
    };

    workerScript = function(p, m) {
      importScripts("https://cdnjs.cloudflare.com/ajax/libs/mathjs/1.1.1/math.min.js");
      return self.on("calc", function(f32arr, reply) {
        var A, B, C, X, Y, derivatives, j, k, l, n, point, ref, results, results1, y;
        y = f32arr;
        point = 0;
        derivatives = (function() {
          results = [];
          for (var j = 0; 0 <= p ? j <= p : j >= p; 0 <= p ? j++ : j--){ results.push(j); }
          return results;
        }).apply(this).map(function() {
          return new Float32Array(y.length);
        });
        while (y.length > point + 2 * m + 1) {
          X = (function() {
            results1 = [];
            for (var l = 0; 0 <= p ? l <= p : l >= p; 0 <= p ? l++ : l--){ results1.push(l); }
            return results1;
          }).apply(this).map(function(_, ik) {
            var l, ref, results1;
            return (function() {
              results1 = [];
              for (var l = ref = -m; ref <= m ? l <= m : l >= m; ref <= m ? l++ : l--){ results1.push(l); }
              return results1;
            }).apply(this).map(function(im) {
              return Math.pow(im, ik);
            });
          });
          Y = Array.prototype.slice.call(y, point, point + 2 * m + 1);
          C = math.inv(math.multiply(X, math.transpose(X)));
          B = math.multiply(C, X);
          A = math.multiply(B, Y);
          for (k = n = 0, ref = p; 0 <= ref ? n <= ref : n >= ref; k = 0 <= ref ? ++n : --n) {
            derivatives[k][point + m + 1] = math.factorial(k) * A[k];
          }
          point += 1;
        }
        return reply(derivatives, derivatives.map(function(arg) {
          var buffer;
          buffer = arg.buffer;
          return buffer;
        }));
      });
    };

    return SGSmooth;

  })();

  module.exports = SGSmooth;

}).call(this);

},{}],7:[function(require,module,exports){
// Generated by CoffeeScript 1.10.0
(function() {
  var IFrameServerWorker, InlineServerWorker, ServerWorker, createErrorLogger, getArrayBuffer, hash,
    slice = [].slice,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  ServerWorker = (function() {
    function ServerWorker() {
      var consts, fn, importFunctions, importScriptsURLs;
      importScriptsURLs = arguments[0], importFunctions = arguments[1], fn = arguments[2], consts = 4 <= arguments.length ? slice.call(arguments, 3) : [];
      this.importScriptsURLs = [];
      this.importFunctions = [];
      if (importScriptsURLs instanceof Function) {
        this.fn = importScriptsURLs;
        this.consts = [].concat(importFunctions, fn, consts);
      } else if (importFunctions instanceof Function && Array.isArray(importScriptsURLs)) {
        this.importScriptsURLs = importScriptsURLs;
        this.fn = importFunctions;
        this.consts = [].concat(fn, consts);
      } else {
        this.importScriptsURLs = importScriptsURLs;
        this.importFunctions = importFunctions;
        this.fn = fn;
        this.consts = [].concat(consts);
      }
      this.error = createErrorLogger(this.fn);
    }

    return ServerWorker;

  })();

  InlineServerWorker = (function(superClass) {
    extend(InlineServerWorker, superClass);

    function InlineServerWorker() {
      var consts, fn, importFunctions, importScriptsURLs;
      importScriptsURLs = arguments[0], importFunctions = arguments[1], fn = arguments[2], consts = 4 <= arguments.length ? slice.call(arguments, 3) : [];
      InlineServerWorker.__super__.constructor.apply(this, arguments);
      this.loadedURLs = [];
      this.worker = null;
    }

    InlineServerWorker.prototype.load = function() {
      return Promise.all(this.importScriptsURLs.map((function(_this) {
        return function(url) {
          return getArrayBuffer(url).then(function(buffer) {
            return URL.createObjectURL(new Blob([buffer], {
              "type": "text/javascript"
            }));
          });
        };
      })(this))).then((function(_this) {
        return function(urls) {
          var url;
          _this.loadedURLs = _this.loadedURLs.concat(urls);
          _this.loadedURLs.push(url = URL.createObjectURL(new Blob([
            (urls.map(function(url) {
              return "self.importScripts('" + url + "');";
            }).join("\n")) + "\n" + (_this.importFunctions.join("\n")) + "\n(" + _this.fn + ").apply(this, (function INCLUDE_FUNCTION_SOURCE(consts){\n    var events = {};\n    var conn = {\n      on: function on(event, listener){\n        events[event] = listener;\n      }\n    };\n    self.addEventListener(\"message\", function (ev){\n      var event = ev.data.event;\n      var data = ev.data.data;\n      var session = ev.data.session;\n      var listener = events[event];\n      function reply(data, transferable){\n        self.postMessage({data:data, session:session}, transferable);\n      }\n      listener(data, reply);\n    });\n    return [conn].concat(consts);\n})([" + (_this.consts.map(function(a) {
              return JSON.stringify(a);
            }).join(",")) + "]) );"
          ], {
            type: "text/javascript"
          })));
          _this.worker = new Worker(url);
          return _this;
        };
      })(this));
    };

    InlineServerWorker.prototype.request = function(event, data, transferable) {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          var _err, _msg, msg;
          msg = {
            event: event,
            data: data,
            session: hash()
          };
          _this.worker.addEventListener("error", _err = function(ev) {
            _this.worker.removeEventListener("error", _err);
            _this.worker.removeEventListener("message", _msg);
            _this.error(ev);
            return reject(ev);
          });
          _this.worker.addEventListener("message", _msg = function(ev) {
            if (msg.session === ev.data.session) {
              _this.worker.removeEventListener("error", _err);
              _this.worker.removeEventListener("message", _msg);
              return resolve(ev.data.data);
            }
          });
          _this.worker.postMessage(msg, transferable);
        };
      })(this));
    };

    InlineServerWorker.prototype.unload = function() {
      this.loadedURLs.forEach(function(url) {
        return URL.revokeObjectURL(url);
      });
      this.worker.terminate();
      this.worker = null;
    };

    return InlineServerWorker;

  })(ServerWorker);

  IFrameServerWorker = (function(superClass) {
    extend(IFrameServerWorker, superClass);

    function IFrameServerWorker() {
      var consts, fn, importFunctions, importScriptsURLs;
      importScriptsURLs = arguments[0], importFunctions = arguments[1], fn = arguments[2], consts = 4 <= arguments.length ? slice.call(arguments, 3) : [];
      IFrameServerWorker.__super__.constructor.apply(this, arguments);
      this.iframe = document.createElement("iframe");
      this.iframe.setAttribute("style", "position: absolute;\ntop: 0px;\nleft: 0px;\nwidth: 0px;\nheight: 0px;\nborder: 0px;\nmargin: 0px;\npadding: 0px;");
    }

    IFrameServerWorker.prototype.load = function() {
      var prm;
      document.body.appendChild(this.iframe);
      this.iframe.contentDocument.open();
      this.iframe.contentDocument.write((this.importScriptsURLs.map(function(url) {
        return "<script src='" + url + "'>\x3c/script>";
      }).join("\n")) + "\n<script>\n" + (this.importFunctions.join("\n")) + "\n(" + this.fn + ").apply(this, (function INCLUDE_FUNCTION_SOURCE(consts){\n    var events = {};\n    var conn = {\n      on: function on(event, listener){\n        events[event] = listener;\n      }\n    };\n    self.addEventListener(\"message\", function (ev){\n      var event = ev.data.event;\n      var data = ev.data.data;\n      var session = ev.data.session;\n      var source = ev.source;\n      var listener = events[event];\n      function reply(data, transferable){\n        source.postMessage({data:data, session:session}, \"*\")\n      }\n      listener(data, reply);\n    });\n    return [conn].concat(consts);\n})([" + (this.consts.map(function(a) {
        return JSON.stringify(a);
      }).join(",")) + "]) );\n\x3c/script>");
      prm = new Promise((function(_this) {
        return function(resolve) {
          return _this.iframe.addEventListener("load", function() {
            return resolve(_this);
          });
        };
      })(this));
      this.iframe.contentDocument.close();
      return prm;
    };

    IFrameServerWorker.prototype.request = function(event, data) {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          var _err, _msg, msg;
          msg = {
            event: event,
            data: data,
            session: hash()
          };
          _this.iframe.contentWindow.addEventListener("error", _err = function(ev) {
            _this.iframe.contentWindow.removeEventListener("error", _err);
            window.removeEventListener("message", _msg);
            _this.error(ev);
            return reject(ev);
          });
          window.addEventListener("message", _msg = function(ev) {
            if (msg.session === ev.data.session) {
              _this.iframe.contentWindow.removeEventListener("error", _err);
              window.removeEventListener("message", _msg);
              return resolve(ev.data.data);
            }
          });
          _this.iframe.contentWindow.postMessage(msg, "*");
        };
      })(this));
    };

    IFrameServerWorker.prototype.unload = function() {
      var iframe;
      this.iframe.removeAttribute("src");
      this.iframe.removeAttribute("srcdoc");
      this.iframe.contentWindow.removeEventListener();
      document.body.removeChild(this.iframe);
      iframe = null;
    };

    return IFrameServerWorker;

  })(ServerWorker);

  ;

  hash = function() {
    return Math.round(Math.random() * Math.pow(16, 8)).toString(16);
  };

  createErrorLogger = function(code) {
    return function(ev) {
      console.error(ev.message + "\n  at " + ev.filename + ":" + ev.lineno + ":" + ev.colno);
      ev.error && console.error(ev.error.stack);
      return console.info("(" + code + "}());".slice(0, 300) + "\n...");
    };
  };

  getArrayBuffer = function(url) {
    return new Promise(function(resolve, reject) {
      var xhr;
      xhr = new XMLHttpRequest();
      xhr.addEventListener("load", function() {
        if (200 <= xhr.status && xhr.status < 300) {
          if (xhr.response.error != null) {
            return reject(new Error(xhr.response.error.message));
          } else {
            return resolve(xhr.response);
          }
        } else {
          return reject(new Error(xhr.status));
        }
      });
      xhr.open("GET", url);
      xhr.responseType = "arraybuffer";
      return xhr.send();
    });
  };

  module.exports.InlineServerWorker = InlineServerWorker;

  module.exports.IFrameServerWorker = IFrameServerWorker;

}).call(this);

},{}],8:[function(require,module,exports){
// Generated by CoffeeScript 1.10.0
(function() {
  var CanvasRender, SignalViewer, Statistics;

  Statistics = require("duxca.lib.statistics.js");

  CanvasRender = require("duxca.lib.canvasrender.js");

  SignalViewer = (function() {
    function SignalViewer(width, height) {
      this.cnv = document.createElement("canvas");
      this.cnv.width = width;
      this.cnv.height = height;
      this.ctx = this.cnv.getContext("2d");
      this.offsetX = 0;
      this.offsetY = this.cnv.height / 2;
      this.zoomX = 1;
      this.zoomY = 1;
      this.drawZero = true;
      this.drawAuto = true;
      this.drawStatus = true;
    }

    SignalViewer.prototype.text = function(str, x, y, opt) {
      var color, fillStyle, font, lineWidth, o, ref, strokeStyle;
      if (opt == null) {
        opt = {};
      }
      ref = this.ctx, font = ref.font, lineWidth = ref.lineWidth, strokeStyle = ref.strokeStyle, fillStyle = ref.fillStyle;
      color = opt.color;
      if (color == null) {
        color = "black";
      }
      this.ctx.font = "35px";
      this.ctx.lineWidth = 4;
      this.ctx.strokeStyle = "white";
      this.ctx.strokeText(str, x, y);
      this.ctx.fillStyle = color;
      this.ctx.fillText(str, x, y);
      o = {
        font: font,
        lineWidth: lineWidth,
        strokeStyle: strokeStyle,
        fillStyle: fillStyle
      };
      Object.keys(o).forEach((function(_this) {
        return function(key) {
          return _this.ctx[key] = o[key];
        };
      })(this));
      return this;
    };

    SignalViewer.prototype.draw = function(f32arr, opt) {
      var _, arr, detail, fillStyle, i, max, min, ref, ref1, sampleRate;
      if (opt == null) {
        opt = {};
      }
      sampleRate = opt.sampleRate;
      arr = f32arr.map(function(v) {
        if (isFinite(v)) {
          return v;
        } else {
          return 0;
        }
      });
      if (sampleRate == null) {
        sampleRate = 44100;
      }
      ref = Statistics.findMax(arr), max = ref[0], _ = ref[1];
      ref1 = Statistics.findMin(arr), min = ref1[0], _ = ref1[1];
      fillStyle = this.ctx.fillStyle;
      this.ctx.fillStyle = "white";
      this.ctx.fillRect(0, 0, this.cnv.width, this.cnv.height);
      this.ctx.fillStyle = fillStyle;
      if (this.drawAuto) {
        this.zoomX = this.cnv.width / arr.length;
        this.zoomY = this.cnv.height / (max - min + 0.0000001);
        this.offsetY = -min * this.zoomY;
      }
      if (this.drawZero) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.cnv.height - (this.zoomY * 0 + this.offsetY));
        this.ctx.lineTo(this.cnv.width, this.cnv.height - (this.zoomY * 0 + this.offsetY));
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(this.offsetX, this.cnv.height - 0);
        this.ctx.lineTo(this.offsetX, this.cnv.height - this.cnv.height);
        this.ctx.stroke();
      }
      this.ctx.beginPath();
      this.ctx.moveTo(this.zoomX * (0 + this.offsetX), this.cnv.height - (this.zoomY * arr[0] + this.offsetY));
      i = 0;
      while (i++ < arr.length) {
        this.ctx.lineTo(this.zoomX * (i + this.offsetX), this.cnv.height - (this.zoomY * arr[i] + this.offsetY));
      }
      this.ctx.stroke();
      detail = {
        "sampleRate": sampleRate,
        "min": min,
        "max": max,
        "len": arr.length,
        "len(ms)": arr.length / sampleRate * 1000,
        "size": this.cnv.width + "x" + this.cnv.height
      };
      if (this.drawStatus) {
        Object.keys(detail).forEach((function(_this) {
          return function(key, i) {
            return _this.text((key + ":") + detail[key], 5, 15 + 10 * i);
          };
        })(this));
      }
      return this;
    };

    SignalViewer.prototype.drawSpectrogram = function(f32arr, opt) {
      var _, arr, b, buffer, detail, g, i, imgdata, index, j, k, l, len, len1, len2, m, max, ptr, r, ref, ref1, sampleRate, slideWidth, spectrum, spectrums, windowSize, x, y;
      if (opt == null) {
        opt = {};
      }
      sampleRate = opt.sampleRate, windowSize = opt.windowSize, slideWidth = opt.slideWidth, max = opt.max;
      f32arr = f32arr.map(function(v) {
        if (isFinite(v)) {
          return v;
        } else {
          return 0;
        }
      });
      arr = new Float32Array(f32arr.length + windowSize);
      arr.set(f32arr, windowSize / 2);
      if (sampleRate == null) {
        sampleRate = 44100;
      }
      if (windowSize == null) {
        windowSize = Math.pow(2, 8);
      }
      if (slideWidth == null) {
        slideWidth = Math.pow(2, 5);
      }
      if (max == null) {
        max = 255;
      }
      ptr = 0;
      spectrums = [];
      while (ptr + windowSize < arr.length) {
        buffer = arr.subarray(ptr, ptr + windowSize);
        if (buffer.length !== windowSize) {
          break;
        }
        spectrum = Signal.fft(buffer, sampleRate).spectrum;
        for (i = k = 0, len = spectrum.length; k < len; i = ++k) {
          _ = spectrum[i];
          spectrum[i] = spectrum[i] * 20000;
        }
        spectrums.push(spectrum);
        ptr += slideWidth;
      }
      this.cnv.width = spectrums.length;
      this.cnv.height = spectrums[0].length;
      imgdata = this.ctx.createImageData(spectrums.length, spectrums[0].length);
      for (i = l = 0, len1 = spectrums.length; l < len1; i = ++l) {
        _ = spectrums[i];
        for (j = m = 0, len2 = spectrum.length; m < len2; j = ++m) {
          _ = spectrum[j];
          ref = SignalViewer.hslToRgb(spectrums[i][j] / max, 0.5, 0.5), r = ref[0], g = ref[1], b = ref[2];
          ref1 = [i, imgdata.height - 1 - j], x = ref1[0], y = ref1[1];
          index = x + y * imgdata.width;
          imgdata.data[index * 4 + 0] = b | 0;
          imgdata.data[index * 4 + 1] = g | 0;
          imgdata.data[index * 4 + 2] = r | 0;
          imgdata.data[index * 4 + 3] = 255;
        }
      }
      this.ctx.putImageData(imgdata, 0, 0);
      detail = {
        "sampleRate": sampleRate,
        "windowSize": windowSize,
        "slideWidth": slideWidth,
        "windowSize(ms)": windowSize / sampleRate * 1000,
        "slideWidth(ms)": slideWidth / sampleRate * 1000,
        "ptr": 0 + "-" + (ptr - 1) + "/" + arr.length,
        "ms": 0 / sampleRate * 1000 + "-" + (ptr - 1) / sampleRate * 1000 + "/" + arr.length * 1000 / sampleRate,
        "reso": arr.length / slideWidth,
        "size": spectrums.length + "x" + spectrums[0].length
      };
      if (this.drawStatus) {
        Object.keys(detail).forEach((function(_this) {
          return function(key, i) {
            return _this.text((key + ":") + detail[key], 5, 15 + 10 * i);
          };
        })(this));
      }
      return this;
    };

    SignalViewer.prototype.appendTo = function(element) {
      element.appendChild(this.cnv);
      return this;
    };

    SignalViewer.hue2rgb = CanvasRender.hue2rgb;

    SignalViewer.hslToRgb = CanvasRender.hslToRgb;

    return SignalViewer;

  })();

  module.exports = SignalViewer;

}).call(this);

},{"duxca.lib.canvasrender.js":10,"duxca.lib.statistics.js":19}],9:[function(require,module,exports){
"use strict";
var _Statistics = require("duxca.lib.statistics.js");
var _Signal = require("duxca.lib.signal.js");
var _RecordBuffer = require("duxca.lib.recordbuffer.js");
var _Wave = require("duxca.lib.wave.js");
var _OSC = require("duxca.lib.osc.js");
var _CanvasRender = require("duxca.lib.canvasrender.js");
var _PNG = require("duxca.lib.png.js");
var _Metronome = require("./Metronome");
var _FPS = require("./FPS");
var _Newton = require("./Newton");
var _FDTD = require("./FDTD");
var _Chord = require("duxca.lib.chord.js");
var _Ajax = require("./Ajax");
var _SignalViewer = require("./SignalViewer");
var _SGSmooth = require("./SGSmooth");
var _ServerWorker = require("./ServerWorker");
var lib;
(function (lib) {
    lib.Statistics = _Statistics;
    lib.Signal = _Signal;
    lib.RecordBuffer = _RecordBuffer;
    lib.Wave = _Wave;
    lib.OSC = _OSC;
    lib.CanvasRender = _CanvasRender;
    lib.Metronome = _Metronome;
    lib.FPS = _FPS;
    lib.Newton = _Newton;
    lib.FDTD = _FDTD;
    lib.Chord = _Chord;
    lib.Ajax = _Ajax;
    lib.PNG = _PNG;
    //export const QRCode = _QRCode;
    lib.SignalViewer = _SignalViewer;
    lib.SGSmooth = _SGSmooth;
    lib.ServerWorker = _ServerWorker;
    var Util;
    (function (Util) {
        function importObject(hash) {
            Object.keys(hash).forEach(function (key) {
                self[key] = hash[key];
                console.log("some global variables appended: ", Object.keys(hash));
            });
        }
        Util.importObject = importObject;
    })(Util = lib.Util || (lib.Util = {}));
})(lib = exports.lib || (exports.lib = {}));

},{"./Ajax":1,"./FDTD":2,"./FPS":3,"./Metronome":4,"./Newton":5,"./SGSmooth":6,"./ServerWorker":7,"./SignalViewer":8,"duxca.lib.canvasrender.js":10,"duxca.lib.chord.js":11,"duxca.lib.osc.js":12,"duxca.lib.png.js":15,"duxca.lib.recordbuffer.js":16,"duxca.lib.signal.js":18,"duxca.lib.statistics.js":19,"duxca.lib.wave.js":20}],10:[function(require,module,exports){
"use strict";
var Signal = require("duxca.lib.signal.js");
var Statistics = require("duxca.lib.statistics.js");
var CanvasRender = (function () {
    function CanvasRender(width, height) {
        this.element = this.cnv = document.createElement("canvas");
        this.cnv.width = width;
        this.cnv.height = height;
        this.ctx = this.cnv.getContext("2d");
    }
    CanvasRender.prototype.clear = function () {
        this.cnv.width = this.cnv.width;
    };
    CanvasRender.prototype.drawSignal = function (signal, flagX, flagY) {
        if (flagX === void 0) { flagX = false; }
        if (flagY === void 0) { flagY = false; }
        if (flagY) {
            signal = Signal.normalize(signal, 1);
        }
        var zoomX = !flagX ? 1 : this.cnv.width / signal.length;
        var zoomY = !flagY ? 1 : this.cnv.height / Statistics.findMax(signal)[0];
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.cnv.height - signal[0] * zoomY);
        for (var i = 1; i < signal.length; i++) {
            this.ctx.lineTo(zoomX * i, this.cnv.height - signal[i] * zoomY);
        }
        this.ctx.stroke();
    };
    CanvasRender.prototype.drawColLine = function (x) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.cnv.height);
        this.ctx.stroke();
    };
    CanvasRender.prototype.drawRowLine = function (y) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.cnv.width, y);
        this.ctx.stroke();
    };
    CanvasRender.prototype.cross = function (x, y, size) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + size, y + size);
        this.ctx.lineTo(x - size, y - size);
        this.ctx.moveTo(x - size, y + size);
        this.ctx.lineTo(x + size, y - size);
        this.ctx.stroke();
    };
    CanvasRender.prototype.arc = function (x, y, size) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, 2 * Math.PI, false);
        this.ctx.stroke();
    };
    CanvasRender.prototype.drawSpectrogram = function (spectrogram, max) {
        if (max === void 0) { max = 255; }
        var imgdata = this.ctx.createImageData(spectrogram.length, spectrogram[0].length);
        for (var i = 0; i < spectrogram.length; i++) {
            for (var j = 0; j < spectrogram[i].length; j++) {
                var _a = CanvasRender.hslToRgb(spectrogram[i][j] / max, 0.5, 0.5), r = _a[0], g = _a[1], b = _a[2];
                var _b = [i, imgdata.height - 1 - j], x = _b[0], y = _b[1];
                var index = x + y * imgdata.width;
                imgdata.data[index * 4 + 0] = b | 0;
                imgdata.data[index * 4 + 1] = g | 0;
                imgdata.data[index * 4 + 2] = r | 0; // is this bug?
                imgdata.data[index * 4 + 3] = 255;
            }
        }
        this.ctx.putImageData(imgdata, 0, 0);
    };
    CanvasRender.prototype._drawSpectrogram = function (rawdata, sampleRate) {
        var windowsize = Math.pow(2, 8); // spectrgram height
        var slidewidth = Math.pow(2, 5); // spectrgram width rate
        console.log("sampleRate:", sampleRate, "\n", "windowsize:", windowsize, "\n", "slidewidth:", slidewidth, "\n", "windowsize(ms):", windowsize / sampleRate * 1000, "\n", "slidewidth(ms):", slidewidth / sampleRate * 1000, "\n");
        var spectrums = [];
        for (var ptr = 0; ptr + windowsize < rawdata.length; ptr += slidewidth) {
            var buffer = rawdata.subarray(ptr, ptr + windowsize);
            if (buffer.length !== windowsize)
                break;
            var spectrum = Signal.fft(buffer, sampleRate)[2];
            for (var i = 0; i < spectrum.length; i++) {
                spectrum[i] = spectrum[i] * 20000;
            }
            spectrums.push(spectrum);
        }
        console.log("ptr", 0 + "-" + (ptr - 1) + "/" + rawdata.length, "ms", 0 / sampleRate * 1000 + "-" + (ptr - 1) / sampleRate * 1000 + "/" + rawdata.length * 1000 / sampleRate, spectrums.length + "x" + spectrums[0].length);
        this.cnv.width = spectrums.length;
        this.cnv.height = spectrums[0].length;
        this.drawSpectrogram(spectrums);
    };
    return CanvasRender;
}());
var CanvasRender;
(function (CanvasRender) {
    function hue2rgb(p, q, t) {
        if (t < 0) {
            t += 1;
        }
        if (t > 1) {
            t -= 1;
        }
        if (t < 1 / 6) {
            return p + (q - p) * 6 * t;
        }
        if (t < 1 / 2) {
            return q;
        }
        if (t < 2 / 3) {
            return p + (q - p) * (2 / 3 - t) * 6;
        }
        return p;
    }
    CanvasRender.hue2rgb = hue2rgb;
    function hslToRgb(h, s, l) {
        // h, s, l: 0~1
        h *= 5 / 6;
        if (h < 0) {
            h = 0;
        }
        if (5 / 6 < h) {
            h = 5 / 6;
        }
        var r, g, b;
        if (s === 0) {
            r = g = b = l;
        }
        else {
            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return [r * 255, g * 255, b * 255];
    }
    CanvasRender.hslToRgb = hslToRgb;
})(CanvasRender || (CanvasRender = {}));
module.exports = CanvasRender;

},{"duxca.lib.signal.js":18,"duxca.lib.statistics.js":19}],11:[function(require,module,exports){
"use strict";
var Chord = (function () {
    function Chord(opt) {
        this.host = opt.host || location.hostname;
        this.port = opt.port || 9000;
        this.joined = false;
        this.successor = null;
        this.successors = [];
        this.predecessor = null;
        this.predecessors = [];
        this.peer = null;
        this.debug = true;
        this.tid = null;
        this.peer = null;
        this.listeners = {};
        this.requests = {};
        this.lastRequestId = 0;
        this.STABILIZE_INTERVAL = 5000;
    }
    Chord.prototype._init = function () {
        var _this = this;
        if (!!this.peer)
            return Promise.resolve(undefined);
        this.peer = new Peer({ host: this.host, port: this.port, debug: 2 });
        this.peer.on('open', function (id) { if (_this.debug)
            console.log(_this.peer.id, "peer:open", id); });
        // open
        // Emitted when a connection to the PeerServer is established.
        // You may use the peer before this is emitted, but messages to the server will be queued.
        // id is the brokering ID of the peer (which was either provided in the constructor or assigned by the server).
        //   You should not wait for this event before connecting to other peers if connection speed is important.
        this.peer.on('error', function (err) { if (_this.debug)
            console.error(_this.peer.id, "peer:error", err); });
        // error
        // Errors on the peer are almost always fatal and will destroy the peer.
        // Errors from the underlying socket and PeerConnections are forwarded here.
        this.peer.on('close', function () {
            if (_this.debug)
                console.log(_this.peer.id, "peer:close");
            clearInterval(_this.tid);
            _this.joined = false;
        });
        // close
        // Emitted when the peer is destroyed and can no longer accept or create any new connections.
        // At this time, the peer's connections will all be closed.
        //   To be extra certain that peers clean up correctly,
        //   we recommend calling peer.destroy() on a peer when it is no longer needed.
        this.peer.on('disconnected', function () { if (_this.debug)
            console.log(_this.peer.id, "peer:disconnected"); });
        // disconnected
        // Emitted when the peer is disconnected from the signalling server,
        // either manually or because the connection to the signalling server was lost.
        // When a peer is disconnected, its existing connections will stay alive,
        // but the peer cannot accept or create any new connections.
        // You can reconnect to the server by calling peer.reconnect().
        this.peer.on('connection', function (conn) {
            // Emitted when a new data connection is established from a remote peer.
            if (_this.debug)
                console.log(_this.peer.id, "peer:connection", "from", conn.peer);
            _this._connectionHandler(conn);
        });
        this.tid = setInterval(function () {
            if (_this.successor) {
                if (_this.debug)
                    console.log(_this.peer.id, "setInterval");
                _this.stabilize();
            }
        }, this.STABILIZE_INTERVAL);
        return new Promise(function (resolve, reject) {
            _this.peer.on('error', _error);
            _this.peer.on('open', _open);
            var off = function () {
                _this.peer.off('error', _error);
                _this.peer.off('open', _open);
            };
            function _open(id) { off(); resolve(Promise.resolve(undefined)); }
            function _error(err) { off(); reject(err); }
        });
    };
    Chord.prototype.create = function () {
        var _this = this;
        return this._init().then(function () {
            if (_this.peer.destroyed)
                return Promise.reject(new Error(_this.peer.id + " is already destroyed"));
            if (_this.debug)
                console.log(_this.peer.id, "create:done");
            return _this;
        });
    };
    Chord.prototype.join = function (id) {
        var _this = this;
        return this._init().then(function () {
            if (_this.peer.destroyed)
                return Promise.reject(new Error(_this.peer.id + " is already destroyed"));
            if (typeof id !== "string")
                return Promise.reject(new Error("peer id is not string."));
            var conn = _this.peer.connect(id);
            _this._connectionHandler(conn);
            return new Promise(function (resolve, reject) {
                conn.on('error', _error);
                conn.on('open', _open);
                var off = function () {
                    conn.off('error', _error);
                    conn.off('open', _open);
                };
                function _open() { off(); resolve(Promise.resolve(undefined)); }
                function _error(err) { off(); reject(err); }
            }).then(function () {
                if (_this.debug)
                    console.log(_this.peer.id, "join:done", "to", id);
                _this.successor = conn;
                _this.joined = true;
                setTimeout(function () { return _this.stabilize(); }, 0);
                return _this;
            });
        });
    };
    Chord.prototype.stabilize = function () {
        if (!this.peer)
            throw new Error("this node does not join yet");
        if (this.peer.destroyed)
            throw new Error(this.peer.id + " is already destroyed");
        if (this.debug)
            console.log(this.peer.id, "stabilize:to", this.successor.peer);
        if (!!this.successor && this.successor.open) {
            this.successor.send({ msg: "What is your predecessor?" });
        }
        if (this.joined && !!this.successor && !this.successor.open) {
            if (typeof this.successors[1] !== "string") {
                if (!!this.predecessor && this.predecessor.open) {
                    // when all successor are died, try predecessor as new successor
                    if (this.debug)
                        console.log(this.peer.id, "stabilize:successor", this.successor.peer, "is died. fail back to predecessor", this.predecessor.peer);
                    //this.successor.close();
                    this.successor = null;
                    this.join(this.predecessor.peer);
                }
                if (this.debug)
                    console.log(this.peer.id, "stabilize:all connects are lost. Nothing to do");
                this.joined = false;
                clearInterval(this.tid);
                return;
            }
            if (this.successors[1] !== this.peer.id) {
                if (this.debug)
                    console.log(this.peer.id, "stabilize:successor", this.successor.peer, "is died. try successor[1]", this.successors[1], this.successors);
                //this.successor.close();
                this.successor = null;
                this.join(this.successors[1]);
            }
            else {
                this.successors.shift();
                this.stabilize();
                return;
            }
        }
        if (this.joined && !!this.predecessor && !this.predecessor.open) {
            if (this.debug)
                console.log(this.peer.id, "stabilize:predecessor", this.predecessor.peer, "is died.");
            //this.predecessor.close();
            this.predecessor = null;
        }
    };
    Chord.prototype.request = function (event, data, addressee, timeout) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (!_this.peer)
                throw new Error("this node does not join yet");
            if (_this.peer.destroyed)
                reject(new Error(_this.peer.id + " is already destroyed"));
            if (!_this.successor && !!_this.predecessor)
                throw new Error(_this.peer.id + " does not have successor.");
            var token = {
                payload: { event: event, addressee: addressee, data: data },
                requestId: _this.lastRequestId++,
                route: [_this.peer.id],
                time: [Date.now()]
            };
            _this.requests[token.requestId] = function (_token) {
                delete _this.requests[token.requestId];
                resolve(Promise.resolve(_token));
            };
            if (typeof timeout === "number") {
                setTimeout(function () { return reject(new Error(_this.peer.id + "request(" + event + "):timeout(" + timeout + ")")); }, timeout);
            }
            if (_this.listeners[token.payload.event] instanceof Function
                && (!Array.isArray(token.payload.addressee) // broadcast
                    || token.payload.addressee.indexOf(_this.peer.id) >= 0)) {
                if (!_this.successor && !_this.predecessor) {
                    setTimeout(function () {
                        _this.listeners[token.payload.event](token, function (token) {
                            _this.requests[token.requestId](token);
                        });
                    }, 0);
                }
                else {
                    _this.listeners[token.payload.event](token, function (token) {
                        if (!_this.successor.open)
                            throw new Error(_this.peer.id + " has successor, but not open.");
                        _this.successor.send({ msg: "Token", token: token });
                    });
                }
            }
        });
    };
    Chord.prototype.on = function (event, listener) {
        this.listeners[event] = listener;
    };
    Chord.prototype.off = function (event, listener) {
        delete this.listeners[event];
    };
    Chord.prototype._connectionHandler = function (conn) {
        var _this = this;
        conn.on('open', function () { if (_this.debug)
            console.log(_this.peer.id, "conn:open", "to", conn.peer); });
        conn.on('close', function () {
            // Emitted when either you or the remote peer closes the data connection.
            //  Firefox does not yet support this event.
            if (_this.debug)
                console.log(_this.peer.id, "conn:close", "to", conn.peer);
        });
        conn.on('error', function (err) {
            if (_this.debug)
                console.error(_this.peer.id, "conn:error", "to", conn.peer, err);
            _this.stabilize();
        });
        var ondata = null;
        conn.on('data', ondata = function (data) {
            if (!_this.successor) {
                _this.join(conn.peer).then(function () {
                    ondata(data);
                });
                return;
            }
            if (!_this.predecessor) {
                _this.predecessor = conn;
            }
            if (_this.debug)
                console.log(_this.peer.id, "conn:data", data, "from", conn.peer);
            switch (data.msg) {
                // ring network trafic
                case "Token":
                    if (data.token.route[0] === _this.peer.id && _this.requests[data.token.requestId] instanceof Function) {
                        _this.requests[data.token.requestId](data.token);
                        break;
                    }
                    if (data.token.route.indexOf(_this.peer.id) !== -1) {
                        if (_this.debug)
                            console.log(_this.peer.id, "conn:token", "dead token detected.", data.token);
                        break;
                    }
                    data.token.route.push(_this.peer.id);
                    data.token.time.push(Date.now());
                    var tokenpassing = function (token) {
                        if (_this.successor.open) {
                            _this.successor.send({ msg: "Token", token: token });
                        }
                        else {
                            _this.stabilize();
                            setTimeout(function () { return tokenpassing(token); }, 1000);
                        }
                    };
                    if (_this.listeners[data.token.payload.event] instanceof Function
                        && (!Array.isArray(data.token.payload.addressee) // broadcast
                            || data.token.payload.addressee.indexOf(_this.peer.id) >= 0)) {
                        _this.listeners[data.token.payload.event](data.token, tokenpassing);
                    }
                    else {
                        tokenpassing(data.token);
                    }
                    break;
                // response
                case "This is my predecessor.":
                    var min = 0;
                    var max = Chord.distance("zzzzzzzzzzzzzzzz");
                    var myid = Chord.distance(_this.peer.id);
                    var succ = Chord.distance(conn.peer);
                    var succ_says_pred = Chord.distance(data.id);
                    if (_this.debug)
                        console.log(_this.peer.id, "conn:distance1", { min: min, max: max, myid: myid, succ: succ, succ_says_pred: succ_says_pred });
                    if (data.id === _this.peer.id) {
                        _this.successors = [conn.peer].concat(data.successors).slice(0, 4);
                    }
                    else if (succ > succ_says_pred && succ_says_pred > myid) {
                        conn.close();
                        _this.join(data.id);
                    }
                    else {
                        conn.send({ msg: "Check your predecessor." });
                    }
                    break;
                case "Your successor is worng.":
                    conn.close();
                    _this.join(data.id);
                    break;
                case "You need stabilize now.":
                    _this.stabilize();
                    break;
                // request
                case "What is your predecessor?":
                    conn.send({ msg: "This is my predecessor.", id: _this.predecessor.peer, successors: _this.successors });
                    break;
                case "Check your predecessor.":
                    var min = 0;
                    var max = Chord.distance("zzzzzzzzzzzzzzzz");
                    var myid = Chord.distance(_this.peer.id);
                    var succ = Chord.distance(_this.successor.peer);
                    var pred = Chord.distance(_this.predecessor.peer);
                    var newbee = Chord.distance(conn.peer);
                    if (_this.debug)
                        console.log(_this.peer.id, "conn:distance2", { min: min, max: max, myid: myid, succ: succ, pred: pred, newbee: newbee });
                    if ((myid > newbee && newbee > pred)) {
                        if (_this.predecessor.open) {
                            _this.predecessor.send({ msg: "You need stabilize now." });
                        }
                        _this.predecessor = conn;
                    }
                    else if ((myid > pred && pred > newbee)) {
                        conn.send({ msg: "Your successor is worng.", id: _this.predecessor.peer });
                    }
                    else if ((pred > myid && ((max > newbee && newbee > pred) || (myid > newbee && newbee > min)))) {
                        if (_this.predecessor.open) {
                            _this.predecessor.send({ msg: "You need stabilize now." });
                        }
                        _this.predecessor = conn;
                    }
                    else if (pred !== newbee && newbee > myid) {
                        conn.send({ msg: "Your successor is worng.", id: _this.predecessor.peer });
                    }
                    else if (newbee === pred) {
                    }
                    else {
                        console.warn("something wrong2");
                        debugger;
                    }
                    break;
                default:
                    console.warn("something wrong3", data.msg);
                    debugger;
                    break;
            }
        });
    };
    return Chord;
}());
var Chord;
(function (Chord) {
    function distance(str) {
        return Math.sqrt(str.split("").map(function (char) { return char.charCodeAt(0); }).reduce(function (sum, val) { return sum + Math.pow(val, 2); }));
    }
    Chord.distance = distance;
})(Chord || (Chord = {}));
module.exports = Chord;

},{}],12:[function(require,module,exports){
"use strict";
var CanvasRender = require("duxca.lib.canvasrender.js");
var Signal = require("duxca.lib.signal.js");
var RecordBuffer = require("duxca.lib.recordbuffer.js");
function screenshot(cnv) {
    document.body.appendChild(cnv);
}
;
var OSC = (function () {
    function OSC(actx) {
        this.actx = actx;
    }
    OSC.prototype.tone = function (freq, startTime, duration) {
        var osc = this.actx.createOscillator();
        osc.start(startTime);
        osc.stop(startTime + duration);
        var gain = this.actx.createGain();
        gain.gain.value = 0;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(1, startTime + 0.01);
        gain.gain.setValueAtTime(1, startTime + duration - 0.01);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);
        osc.connect(gain);
        return gain;
    };
    OSC.prototype.createAudioBufferFromArrayBuffer = function (arr, sampleRate) {
        var abuf = this.actx.createBuffer(1, arr.length, sampleRate);
        var buf = abuf.getChannelData(0);
        buf.set(arr);
        return abuf;
    };
    OSC.prototype.createAudioNodeFromAudioBuffer = function (abuf) {
        var asrc = this.actx.createBufferSource();
        asrc.buffer = abuf;
        return asrc;
    };
    OSC.prototype.createBarkerCodedChirp = function (barkerCodeN, powN, powL) {
        if (powL === void 0) { powL = 14; }
        var actx = this.actx;
        var osc = this;
        var code = Signal.createBarkerCode(barkerCodeN);
        var chirp = Signal.createCodedChirp(code, powN);
        return this.resampling(chirp, powL);
    };
    // todo: https://developer.mozilla.org/ja/docs/Web/API/AudioBuffer
    // sync resampling
    OSC.prototype.createAudioBufferFromURL = function (url) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';
            xhr.addEventListener("load", function () {
                var buf = xhr.response;
                _this.actx.decodeAudioData(buf, function (abuf) { return resolve(Promise.resolve(abuf)); }, function () { return console.error("decode error"); });
            });
            xhr.send();
        });
    };
    OSC.prototype.resampling = function (sig, pow, sampleRate) {
        var _this = this;
        if (pow === void 0) { pow = 14; }
        if (sampleRate === void 0) { sampleRate = 44100; }
        return new Promise(function (resolve, reject) {
            var abuf = _this.createAudioBufferFromArrayBuffer(sig, sampleRate); // fix rate
            var anode = _this.createAudioNodeFromAudioBuffer(abuf);
            var processor = _this.actx.createScriptProcessor(Math.pow(2, pow), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
            var recbuf = new RecordBuffer(_this.actx.sampleRate, processor.bufferSize, processor.channelCount);
            anode.start(_this.actx.currentTime);
            anode.connect(processor);
            processor.connect(_this.actx.destination);
            var actx = _this.actx;
            processor.addEventListener("audioprocess", function handler(ev) {
                recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                if (recbuf.count * recbuf.bufferSize > sig.length) {
                    processor.removeEventListener("audioprocess", handler);
                    processor.disconnect();
                    next();
                }
            });
            function next() {
                var rawdata = recbuf.merge();
                recbuf.clear();
                resolve(Promise.resolve(rawdata));
            }
        });
    };
    OSC.prototype.inpulseResponce = function (TEST_INPUT_MYSELF) {
        var _this = this;
        if (TEST_INPUT_MYSELF === void 0) { TEST_INPUT_MYSELF = false; }
        var up = Signal.createChirpSignal(Math.pow(2, 17), false);
        var down = Signal.createChirpSignal(Math.pow(2, 17), true);
        //up = up.subarray(up.length*1/4|0, up.length*3/4|0);
        //down = up.subarray(up.length*1/4|0, up.length*3/4|0);
        new Promise(function (resolbe, reject) { return navigator.getUserMedia({ video: false, audio: true }, resolbe, reject); })
            .then(function (stream) {
            var source = _this.actx.createMediaStreamSource(stream);
            var processor = _this.actx.createScriptProcessor(Math.pow(2, 14), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
            var abuf = _this.createAudioBufferFromArrayBuffer(up, _this.actx.sampleRate); // fix rate
            var anode = _this.createAudioNodeFromAudioBuffer(abuf);
            anode.start(_this.actx.currentTime + 0);
            anode.connect(TEST_INPUT_MYSELF ? processor : _this.actx.destination);
            !TEST_INPUT_MYSELF && source.connect(processor);
            processor.connect(_this.actx.destination);
            var recbuf = new RecordBuffer(_this.actx.sampleRate, processor.bufferSize, 1);
            var actx = _this.actx;
            processor.addEventListener("audioprocess", function handler(ev) {
                recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                console.log(recbuf.count);
                if (recbuf.count * recbuf.bufferSize > up.length * 2) {
                    console.log("done");
                    processor.removeEventListener("audioprocess", handler);
                    processor.disconnect();
                    stream.stop();
                    next();
                }
            });
            function next() {
                var rawdata = recbuf.merge();
                var corr = Signal.overwarpCorr(down, rawdata);
                var render = new CanvasRender(128, 128);
                console.log("raw", rawdata.length);
                render.cnv.width = rawdata.length / 256;
                render.drawSignal(rawdata, true, true);
                screenshot(render.element);
                console.log("corr", corr.length);
                render.cnv.width = corr.length / 256;
                render.drawSignal(corr, true, true);
                screenshot(render.element);
                console.log("up", up.length);
                render.cnv.width = up.length / 256;
                render.drawSignal(up, true, true);
                screenshot(render.element);
                render._drawSpectrogram(rawdata, recbuf.sampleRate);
                screenshot(render.cnv);
            }
        });
    };
    return OSC;
}());
module.exports = OSC;

},{"duxca.lib.canvasrender.js":10,"duxca.lib.recordbuffer.js":16,"duxca.lib.signal.js":18}],13:[function(require,module,exports){
// oriinal: https://github.com/arian/pngjs
// modified by legokichi.
// chenge:
//   rewrite in typescript
//   chenge zlib library stream.js to jszip(pako)
//   support bitdepth 1
"use strict";
function uInt8ToBitArray(uint8) {
    return (uint8 + 256).toString(2).split("").slice(1).map(Number);
}
function uInt8ArrayToBits(arr) {
    var result = [];
    for (var i = 0; arr.length > i; i++) {
        result = result.concat(uInt8ToBitArray(arr[i]));
    }
    return result;
}
function bitsToNum(bits) {
    //return bits.slice().reverse().reduce(function(sum,n,i){return sum+Math.pow(2,i)*n},0);
    return parseInt(bits.join(""), 2);
}
function readBits(buffer, bitOffset, bitLength) {
    var _byteOffset = bitOffset / 8 | 0;
    var _bitOffset = bitOffset % 8;
    var _byteLength = bitLength / 8 | 0;
    var _bitLength = bitLength % 8;
    var _buf = buffer.subarray(_byteOffset, _byteOffset + _byteLength + 1);
    return uInt8ArrayToBits(_buf).slice(_bitOffset, _bitOffset + bitLength);
}
var PNG = (function () {
    function PNG() {
        this.width = 0;
        this.height = 0;
        this.bitDepth = 0;
        this.colorType = 0;
        this.compressionMethod = 0;
        this.filterMethod = 0;
        this.interlaceMethod = 0;
        this.colors = 0;
        this.alpha = false;
        this.pixelBits = 0;
        this.palette = null;
        this.pixels = null;
    }
    PNG.prototype.getWidth = function () {
        return this.width;
    };
    PNG.prototype.setWidth = function (width) {
        this.width = width;
    };
    PNG.prototype.getHeight = function () {
        return this.height;
    };
    PNG.prototype.setHeight = function (height) {
        this.height = height;
    };
    PNG.prototype.getBitDepth = function () {
        return this.bitDepth;
    };
    PNG.prototype.setBitDepth = function (bitDepth) {
        if ([1, 2, 4, 8, 16].indexOf(bitDepth) === -1) {
            throw new Error("invalid bith depth " + bitDepth);
        }
        this.bitDepth = bitDepth;
    };
    PNG.prototype.getColorType = function () {
        return this.colorType;
    };
    PNG.prototype.setColorType = function (colorType) {
        //   Color    Allowed    Interpretation
        //   Type    Bit Depths
        //
        //   0       1,2,4,8,16  Each pixel is a grayscale sample.
        //
        //   2       8,16        Each pixel is an R,G,B triple.
        //
        //   3       1,2,4,8     Each pixel is a palette index;
        //                       a PLTE chunk must appear.
        //
        //   4       8,16        Each pixel is a grayscale sample,
        //                       followed by an alpha sample.
        //
        //   6       8,16        Each pixel is an R,G,B triple,
        //                       followed by an alpha sample.
        var colors = 0, alpha = false;
        switch (colorType) {
            case 0:
                colors = 1;
                break;
            case 2:
                colors = 3;
                break;
            case 3:
                colors = 1;
                break;
            case 4:
                colors = 2;
                alpha = true;
                break;
            case 6:
                colors = 4;
                alpha = true;
                break;
            default: throw new Error("invalid color type");
        }
        this.colors = colors;
        this.alpha = alpha;
        this.colorType = colorType;
    };
    PNG.prototype.getCompressionMethod = function () {
        return this.compressionMethod;
    };
    PNG.prototype.setCompressionMethod = function (compressionMethod) {
        if (compressionMethod !== 0) {
            throw new Error("invalid compression method " + compressionMethod);
        }
        this.compressionMethod = compressionMethod;
    };
    PNG.prototype.getFilterMethod = function () {
        return this.filterMethod;
    };
    PNG.prototype.setFilterMethod = function (filterMethod) {
        if (filterMethod !== 0) {
            throw new Error("invalid filter method " + filterMethod);
        }
        this.filterMethod = filterMethod;
    };
    PNG.prototype.getInterlaceMethod = function () {
        return this.interlaceMethod;
    };
    PNG.prototype.setInterlaceMethod = function (interlaceMethod) {
        if (interlaceMethod !== 0 && interlaceMethod !== 1) {
            throw new Error("invalid interlace method " + interlaceMethod);
        }
        this.interlaceMethod = interlaceMethod;
    };
    PNG.prototype.setPalette = function (palette) {
        if (palette.length % 3 !== 0) {
            throw new Error("incorrect PLTE chunk length");
        }
        if (palette.length > (Math.pow(2, this.bitDepth) * 3)) {
            throw new Error("palette has more colors than 2^bitdepth");
        }
        this.palette = palette;
    };
    PNG.prototype.getPalette = function () {
        return this.palette;
    };
    /**
     * get the pixel color on a certain location in a normalized way
     * result is an array: [red, green, blue, alpha]
     */
    PNG.prototype.getPixel = function (x, y) {
        if (!this.pixels)
            throw new Error("pixel data is empty");
        if (x >= this.width || y >= this.height) {
            throw new Error("x,y position out of bound");
        }
        var pixels = this.pixels;
        if (this.bitDepth < 8) {
            //console.info(this.colors, this.bitDepth, pixels.length, this.width, this.height)
            var bitspp = this.colors * this.bitDepth; // bit
            var _scanlineLength = pixels.length / this.height; // byte
            var diff = _scanlineLength * 8 - this.width * bitspp; // bit
            var idbit = (y * (bitspp * this.width + diff) + bitspp * x); // x, y is zero origin
            switch (this.colorType) {
                case 0:
                    var tmp = bitsToNum(readBits(pixels, idbit, this.bitDepth));
                    return [
                        tmp,
                        tmp,
                        tmp,
                        255];
                case 2: return [
                    bitsToNum(readBits(pixels, idbit, this.bitDepth)),
                    bitsToNum(readBits(pixels, idbit + 1, this.bitDepth)),
                    bitsToNum(readBits(pixels, idbit + 2, this.bitDepth)),
                    255];
                case 3:
                    var tmp = bitsToNum(readBits(pixels, idbit, this.bitDepth)) * 3;
                    return [
                        this.palette[tmp + 0],
                        this.palette[tmp + 1],
                        this.palette[tmp + 2],
                        255];
                case 4:
                    var tmp = bitsToNum(readBits(pixels, idbit, this.bitDepth));
                    return [
                        tmp,
                        tmp,
                        tmp,
                        bitsToNum(readBits(pixels, idbit + 1, this.bitDepth))];
                case 6: return [
                    bitsToNum(readBits(pixels, idbit, this.bitDepth)),
                    bitsToNum(readBits(pixels, idbit + 1, this.bitDepth)),
                    bitsToNum(readBits(pixels, idbit + 2, this.bitDepth)),
                    bitsToNum(readBits(pixels, idbit + 3, this.bitDepth))
                ];
                default: throw new Error("invalid color type: " + this.colorType);
            }
        }
        else {
            var i = this.colors * this.bitDepth / 8 * (y * this.width + x);
            switch (this.colorType) {
                case 0: return [pixels[i], pixels[i], pixels[i], 255];
                case 2: return [pixels[i], pixels[i + 1], pixels[i + 2], 255];
                case 3: return [
                    this.palette[pixels[i] * 3 + 0],
                    this.palette[pixels[i] * 3 + 1],
                    this.palette[pixels[i] * 3 + 2],
                    255];
                case 4: return [pixels[i], pixels[i], pixels[i], pixels[i + 1]];
                case 6: return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
                default: throw new Error("invalid color type: " + this.colorType);
            }
        }
    };
    PNG.prototype.getUint8ClampedArray = function () {
        var width = this.width;
        var height = this.height;
        var arr = new Uint8ClampedArray(width * height * 4);
        var i = 0;
        for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
                var colors = this.getPixel(x, y);
                arr[i++] = colors[0];
                arr[i++] = colors[1];
                arr[i++] = colors[2];
                arr[i++] = colors[3];
            }
        }
        return arr;
    };
    return PNG;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PNG;

},{}],14:[function(require,module,exports){
// oriinal: https://github.com/arian/pngjs
// modified by legokichi.
// chenge:
//   typescriptnize
//   chenge zlib library stream.js to jszip(pako)
//   support bitdepth 1
"use strict";
/// <reference path="./PNG"/>
var PNG_1 = require("./PNG");
function equalBytes(a, b) {
    if (a.length != b.length)
        return false;
    for (var l = a.length; l--;)
        if (a[l] != b[l])
            return false;
    return true;
}
function readUInt32(buffer, offset) {
    return (buffer[offset] << 24) +
        (buffer[offset + 1] << 16) +
        (buffer[offset + 2] << 8) +
        (buffer[offset + 3] << 0);
}
function readUInt16(buffer, offset) {
    return (buffer[offset + 1] << 8) + (buffer[offset] << 0);
}
function readUInt8(buffer, offset) {
    return buffer[offset] << 0;
}
function bufferToString(buffer) {
    var str = '';
    for (var i = 0; i < buffer.length; i++) {
        str += String.fromCharCode(buffer[i]);
    }
    return str;
}
var PNGReader = (function () {
    function PNGReader(data) {
        // bytes buffer
        this.bytes = new Uint8Array(data);
        // current pointer
        this.i = 0;
        this.dataChunks = [];
        // Output object
        this.png = new PNG_1.default();
    }
    PNGReader.prototype.readBytes = function (length) {
        var end = this.i + length;
        if (end > this.bytes.length) {
            throw new Error('Unexpectedly reached end of file');
        }
        var bytes = this.bytes.subarray(this.i, end);
        this.i = end;
        return bytes;
    };
    /**
     * http://www.w3.org/TR/2003/REC-PNG-20031110/#5PNG-file-signature
     */
    PNGReader.prototype.decodeHeader = function () {
        if (this.i !== 0) {
            throw new Error('file pointer should be at 0 to read the header');
        }
        var header = this.readBytes(8);
        if (!equalBytes(header, new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
            throw new Error('invalid PNGReader file (bad signature)');
        }
        this.header = header;
    };
    /**
     * http://www.w3.org/TR/2003/REC-PNG-20031110/#5Chunk-layout
     *
     * length =  4      bytes
     * type   =  4      bytes (IHDR, PLTE, IDAT, IEND or others)
     * chunk  =  length bytes
     * crc    =  4      bytes
     */
    PNGReader.prototype.decodeChunk = function () {
        var length = readUInt32(this.readBytes(4), 0);
        if (length < 0) {
            throw new Error('Bad chunk length ' + (0xFFFFFFFF & length));
        }
        var type = bufferToString(this.readBytes(4));
        var chunk = this.readBytes(length);
        var crc = this.readBytes(4);
        switch (type) {
            case 'IHDR':
                this.decodeIHDR(chunk);
                break;
            case 'PLTE':
                this.decodePLTE(chunk);
                break;
            case 'IDAT':
                this.decodeIDAT(chunk);
                break;
            case 'IEND':
                this.decodeIEND(chunk);
                break;
            default:
                console.warn("PNGReader: ", type, " is not support chunk type.");
                break;
        }
        return type;
    };
    /**
     * http://www.w3.org/TR/2003/REC-PNG-20031110/#11IHDR
     * http://www.libpng.org/pub/png/spec/1.2/png-1.2-pdg.html#C.IHDR
     *
     * Width               4 bytes
     * Height              4 bytes
     * Bit depth           1 byte
     * Colour type         1 byte
     * Compression method  1 byte
     * Filter method       1 byte
     * Interlace method    1 byte
     */
    PNGReader.prototype.decodeIHDR = function (chunk) {
        var png = this.png;
        png.setWidth(readUInt32(chunk, 0));
        png.setHeight(readUInt32(chunk, 4));
        png.setBitDepth(readUInt8(chunk, 8));
        png.setColorType(readUInt8(chunk, 9));
        png.setCompressionMethod(readUInt8(chunk, 10));
        png.setFilterMethod(readUInt8(chunk, 11));
        png.setInterlaceMethod(readUInt8(chunk, 12));
    };
    /**
     *
     * http://www.w3.org/TR/PNG/#11PLTE
     */
    PNGReader.prototype.decodePLTE = function (chunk) {
        this.png.setPalette(chunk);
    };
    /**
     * http://www.w3.org/TR/2003/REC-PNG-20031110/#11IDAT
     */
    PNGReader.prototype.decodeIDAT = function (chunk) {
        // multiple IDAT chunks will concatenated
        this.dataChunks.push(chunk);
    };
    /**
     * http://www.w3.org/TR/2003/REC-PNG-20031110/#11IEND
     */
    PNGReader.prototype.decodeIEND = function (chunk) {
    };
    /**
     * Uncompress IDAT chunks
     */
    PNGReader.prototype.decodePixels = function () {
        var png = this.png;
        var length = 0;
        var i = 0;
        var j = 0;
        var k = 0;
        var l = 0;
        for (l = this.dataChunks.length; l--;)
            length += this.dataChunks[l].length;
        var data = new Uint8Array(new ArrayBuffer(length));
        for (i = 0, k = 0, l = this.dataChunks.length; i < l; i++) {
            var chunk = this.dataChunks[i];
            for (j = 0; j < chunk.length; j++)
                data[k++] = chunk[j];
        }
        // http://www.fileformat.info/format/png/corion.htm
        // Deflate-compressed datastreams within PNG are stored in the "zlib"
        // format, which has the structure:
        // Compression method/flags code: 1 byte
        // Additional flags/check bits:   1 byte
        // Compressed data blocks:        n bytes
        // Checksum:                      4 bytes
        var rawdata = data.subarray(2, data.length - 4);
        try {
            var _data = this.deflate(rawdata);
        }
        catch (err) {
            throw new Error(err || "pako: zlib inflate error");
        }
        if (png.getInterlaceMethod() === 0) {
            this.interlaceNone(_data);
        }
        else {
            this.interlaceAdam7(_data);
        }
    };
    // Different interlace methods
    PNGReader.prototype.interlaceNone = function (data) {
        var png = this.png;
        if (png.bitDepth < 8) {
            // bits per pixel
            var bitspp = png.colors * png.bitDepth;
            var scanlineLength = data.length / png.height;
            var pixels = new Uint8Array(new ArrayBuffer((scanlineLength - 1) * png.height));
            //console.info(png.bitDepth, png.colors, png.colorType, scanlineLength, bitspp * png.width, png.width, png.height, data.length);
            var offset = 0;
            for (var i = 0; i < data.length; i += scanlineLength) {
                var scanline = data.subarray(i, i + scanlineLength);
                var filtertype = readUInt8(scanline, i);
                var _scanline = scanline.subarray(1, scanline.length);
                switch (filtertype) {
                    case 0:
                        pixels.set(_scanline, offset);
                        break;
                    default: throw new Error("unsupport filtered scanline: " + filtertype + ":" + offset + ":" + i);
                }
                offset += scanlineLength - 1;
            }
        }
        else {
            // bytes per pixel
            var bpp = Math.max(1, png.colors * png.bitDepth / 8);
            // color bytes per row
            var cpr = bpp * png.width;
            var pixels = new Uint8Array(new ArrayBuffer(bpp * png.width * png.height));
            var offset = 0;
            for (var i = 0; i < data.length; i += cpr + 1) {
                var scanline = data.subarray(i + 1, i + cpr + 1);
                var filtertype = readUInt8(data, i);
                switch (filtertype) {
                    case 0:
                        this.unFilterNone(scanline, pixels, bpp, offset, cpr);
                        break;
                    case 1:
                        this.unFilterSub(scanline, pixels, bpp, offset, cpr);
                        break;
                    case 2:
                        this.unFilterUp(scanline, pixels, bpp, offset, cpr);
                        break;
                    case 3:
                        this.unFilterAverage(scanline, pixels, bpp, offset, cpr);
                        break;
                    case 4:
                        this.unFilterPaeth(scanline, pixels, bpp, offset, cpr);
                        break;
                    default: throw new Error("unkown filtered scanline: " + filtertype + ":" + bpp + ":" + offset + ":" + cpr + ":" + i);
                }
                offset += cpr;
            }
        }
        png.pixels = pixels;
    };
    PNGReader.prototype.interlaceAdam7 = function (data) {
        throw new Error("Adam7 interlacing is not implemented yet");
    };
    // Unfiltering
    /**
     * No filtering, direct copy
     */
    PNGReader.prototype.unFilterNone = function (scanline, pixels, bpp, offset, length) {
        for (var i = 0, to = length; i < to; i++) {
            pixels[offset + i] = scanline[i];
        }
    };
    /**
     * The Sub() filter transmits the difference between each byte and the value
     * of the corresponding byte of the prior pixel.
     * Sub(x) = Raw(x) + Raw(x - bpp)
     */
    PNGReader.prototype.unFilterSub = function (scanline, pixels, bpp, offset, length) {
        var i = 0;
        for (; i < bpp; i++)
            pixels[offset + i] = scanline[i];
        for (; i < length; i++) {
            // Raw(x) + Raw(x - bpp)
            pixels[offset + i] = (scanline[i] + pixels[offset + i - bpp]) & 0xFF;
        }
    };
    /**
     * The Up() filter is just like the Sub() filter except that the pixel
     * immediately above the current pixel, rather than just to its left, is used
     * as the predictor.
     * Up(x) = Raw(x) + Prior(x)
     */
    PNGReader.prototype.unFilterUp = function (scanline, pixels, bpp, offset, length) {
        var i = 0;
        var byte;
        var prev;
        // Prior(x) is 0 for all x on the first scanline
        if ((offset - length) < 0)
            for (; i < length; i++) {
                pixels[offset + i] = scanline[i];
            }
        else
            for (; i < length; i++) {
                // Raw(x)
                byte = scanline[i];
                // Prior(x)
                prev = pixels[offset + i - length];
                pixels[offset + i] = (byte + prev) & 0xFF;
            }
    };
    /**
     * The Average() filter uses the average of the two neighboring pixels (left
     * and above) to predict the value of a pixel.
     * Average(x) = Raw(x) + floor((Raw(x-bpp)+Prior(x))/2)
     */
    PNGReader.prototype.unFilterAverage = function (scanline, pixels, bpp, offset, length) {
        var i = 0;
        var byte;
        var prev;
        var prior;
        if ((offset - length) < 0) {
            // Prior(x) == 0 && Raw(x - bpp) == 0
            for (; i < bpp; i++) {
                pixels[offset + i] = scanline[i];
            }
            // Prior(x) == 0 && Raw(x - bpp) != 0 (right shift, prevent doubles)
            for (; i < length; i++) {
                pixels[offset + i] = (scanline[i] + (pixels[offset + i - bpp] >> 1)) & 0xFF;
            }
        }
        else {
            // Prior(x) != 0 && Raw(x - bpp) == 0
            for (; i < bpp; i++) {
                pixels[offset + i] = (scanline[i] + (pixels[offset - length + i] >> 1)) & 0xFF;
            }
            // Prior(x) != 0 && Raw(x - bpp) != 0
            for (; i < length; i++) {
                byte = scanline[i];
                prev = pixels[offset + i - bpp];
                prior = pixels[offset + i - length];
                pixels[offset + i] = (byte + (prev + prior >> 1)) & 0xFF;
            }
        }
    };
    /**
     * The Paeth() filter computes a simple linear function of the three
     * neighboring pixels (left, above, upper left), then chooses as predictor
     * the neighboring pixel closest to the computed value. This technique is due
     * to Alan W. Paeth.
     * Paeth(x) = Raw(x) +
     *            PaethPredictor(Raw(x-bpp), Prior(x), Prior(x-bpp))
     *  function PaethPredictor (a, b, c)
     *  begin
     *       ; a = left, b = above, c = upper left
     *       p := a + b - c        ; initial estimate
     *       pa := abs(p - a)      ; distances to a, b, c
     *       pb := abs(p - b)
     *       pc := abs(p - c)
     *       ; return nearest of a,b,c,
     *       ; breaking ties in order a,b,c.
     *       if pa <= pb AND pa <= pc then return a
     *       else if pb <= pc then return b
     *       else return c
     *  end
     */
    PNGReader.prototype.unFilterPaeth = function (scanline, pixels, bpp, offset, length) {
        var i = 0;
        var raw;
        var a;
        var b;
        var c;
        var p;
        var pa;
        var pb;
        var pc;
        var pr;
        if ((offset - length) < 0) {
            // Prior(x) == 0 && Raw(x - bpp) == 0
            for (; i < bpp; i++) {
                pixels[offset + i] = scanline[i];
            }
            // Prior(x) == 0 && Raw(x - bpp) != 0
            // paethPredictor(x, 0, 0) is always x
            for (; i < length; i++) {
                pixels[offset + i] = (scanline[i] + pixels[offset + i - bpp]) & 0xFF;
            }
        }
        else {
            // Prior(x) != 0 && Raw(x - bpp) == 0
            // paethPredictor(x, 0, 0) is always x
            for (; i < bpp; i++) {
                pixels[offset + i] = (scanline[i] + pixels[offset + i - length]) & 0xFF;
            }
            // Prior(x) != 0 && Raw(x - bpp) != 0
            for (; i < length; i++) {
                raw = scanline[i];
                a = pixels[offset + i - bpp];
                b = pixels[offset + i - length];
                c = pixels[offset + i - length - bpp];
                p = a + b - c;
                pa = Math.abs(p - a);
                pb = Math.abs(p - b);
                pc = Math.abs(p - c);
                if (pa <= pb && pa <= pc)
                    pr = a;
                else if (pb <= pc)
                    pr = b;
                else
                    pr = c;
                pixels[offset + i] = (raw + pr) & 0xFF;
            }
        }
    };
    PNGReader.prototype.parse = function (options) {
        options = options || { data: true };
        this.decodeHeader();
        while (this.i < this.bytes.length) {
            var type = this.decodeChunk();
            // stop after IHDR chunk, or after IEND
            if (type == 'IHDR' && options.data === false || type == 'IEND')
                break;
        }
        var png = this.png;
        this.decodePixels();
        return this.png;
    };
    return PNGReader;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PNGReader;

},{"./PNG":13}],15:[function(require,module,exports){
"use strict";
var PNGReader_1 = require("./PNGReader");
exports.PNGReader = PNGReader_1.default;
var PNG_1 = require("./PNG");
exports.PNG = PNG_1.default;

},{"./PNG":13,"./PNGReader":14}],16:[function(require,module,exports){
"use strict";
var RecordBuffer = (function () {
    function RecordBuffer(sampleRate, bufferSize, channel, maximamRecordSize) {
        if (maximamRecordSize === void 0) { maximamRecordSize = Infinity; }
        this.sampleRate = sampleRate;
        this.bufferSize = bufferSize;
        this.channel = channel;
        this.maximamRecordSize = typeof maximamRecordSize === "number" ? maximamRecordSize : Infinity;
        this.chsBuffers = [];
        this.sampleTimes = [];
        for (var i = 0; i < this.channel; i++) {
            this.chsBuffers.push([]);
        }
        this.count = 0;
    }
    RecordBuffer.prototype.clear = function () {
        this.chsBuffers = [];
        for (var i = 0; i < this.channel; i++) {
            this.chsBuffers.push([]);
        }
        this.sampleTimes = [];
        this.count = 0;
    };
    RecordBuffer.prototype.add = function (chsBuffer, currentTime) {
        this.sampleTimes.push(currentTime);
        this.count++;
        for (var i = 0; i < chsBuffer.length; i++) {
            this.chsBuffers[i].push(chsBuffer[i]);
        }
        if (this.chsBuffers[0].length >= this.maximamRecordSize) {
            for (var i = 0; i < this.chsBuffers.length; i++) {
                this.chsBuffers[i].shift();
            }
        }
    };
    RecordBuffer.prototype.toPCM = function () {
        var results = [];
        for (var i = 0; i < this.chsBuffers.length; i++) {
            results.push(RecordBuffer.mergeBuffers(this.chsBuffers[i]));
        }
        return RecordBuffer.float32ArrayToInt16Array(RecordBuffer.interleave(results));
    };
    RecordBuffer.prototype.merge = function (ch) {
        if (ch === void 0) { ch = 0; }
        return RecordBuffer.mergeBuffers(this.chsBuffers[ch]);
    };
    RecordBuffer.prototype.getChannelData = function (n) {
        return RecordBuffer.mergeBuffers(this.chsBuffers[n]);
    };
    return RecordBuffer;
}());
var RecordBuffer;
(function (RecordBuffer) {
    function mergeBuffers(chBuffer) {
        var bufferSize = chBuffer[0].length;
        var f32arr = new Float32Array(chBuffer.length * bufferSize);
        for (var i = 0; i < chBuffer.length; i++) {
            f32arr.set(chBuffer[i], i * bufferSize);
        }
        return f32arr;
    }
    RecordBuffer.mergeBuffers = mergeBuffers;
    function interleave(chs) {
        var length = chs.length * chs[0].length;
        var f32arr = new Float32Array(length);
        var inputIndex = 0;
        var index = 0;
        while (index < length) {
            for (var i = 0; i < chs.length; i++) {
                var ch = chs[i];
                f32arr[index++] = ch[inputIndex];
            }
            inputIndex++;
        }
        return f32arr;
    }
    RecordBuffer.interleave = interleave;
    function float32ArrayToInt16Array(arr) {
        var int16arr = new Int16Array(arr.length);
        for (var i = 0; i < arr.length; i++) {
            int16arr[i] = arr[i] * 0x7FFF * 0.8; // 32bit -> 16bit
        }
        return int16arr;
    }
    RecordBuffer.float32ArrayToInt16Array = float32ArrayToInt16Array;
})(RecordBuffer || (RecordBuffer = {}));
module.exports = RecordBuffer;

},{}],17:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
// Fourier Transform Module used by DFT, FFT, RFFT
var FourierTransform = (function () {
    function FourierTransform(bufferSize, sampleRate) {
        this.bufferSize = bufferSize;
        this.sampleRate = sampleRate;
        this.bandwidth = 2 / bufferSize * sampleRate / 2;
        this.spectrum = new Float32Array(bufferSize / 2);
        this.real = new Float32Array(bufferSize);
        this.imag = new Float32Array(bufferSize);
        this.peakBand = 0;
        this.peak = 0;
    }
    /**
     * Calculates the *middle* frequency of an FFT band.
     *
     * @param {Number} index The index of the FFT band.
     *
     * @returns The middle frequency in Hz.
     */
    FourierTransform.prototype.getBandFrequency = function (index) {
        return this.bandwidth * index + this.bandwidth / 2;
    };
    ;
    FourierTransform.prototype.calculateSpectrum = function () {
        var spectrum = this.spectrum, real = this.real, imag = this.imag, bSi = 2 / this.bufferSize, sqrt = Math.sqrt, rval, ival, mag;
        for (var i = 0, N = this.bufferSize / 2; i < N; i++) {
            rval = real[i];
            ival = imag[i];
            mag = bSi * sqrt(rval * rval + ival * ival);
            if (mag > this.peak) {
                this.peakBand = i;
                this.peak = mag;
            }
            spectrum[i] = mag;
        }
        return this.spectrum;
    };
    return FourierTransform;
}());
exports.FourierTransform = FourierTransform;
/**
 * DFT is a class for calculating the Discrete Fourier Transform of a signal.
 *
 * @param {Number} bufferSize The size of the sample buffer to be computed
 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 *
 * @constructor
 */
var DFT = (function (_super) {
    __extends(DFT, _super);
    function DFT(bufferSize, sampleRate) {
        _super.call(this, bufferSize, sampleRate);
        var N = bufferSize / 2 * bufferSize;
        var TWO_PI = 2 * Math.PI;
        this.sinTable = new Float32Array(N);
        this.cosTable = new Float32Array(N);
        for (var i = 0; i < N; i++) {
            this.sinTable[i] = Math.sin(i * TWO_PI / bufferSize);
            this.cosTable[i] = Math.cos(i * TWO_PI / bufferSize);
        }
    }
    /**
     * Performs a forward transform on the sample buffer.
     * Converts a time domain signal to frequency domain spectra.
     *
     * @param {Array} buffer The sample buffer
     *
     * @returns The frequency spectrum array
     */
    DFT.prototype.forward = function (buffer) {
        var real = this.real, imag = this.imag, rval, ival;
        for (var k = 0; k < this.bufferSize / 2; k++) {
            rval = 0.0;
            ival = 0.0;
            for (var n = 0; n < buffer.length; n++) {
                rval += this.cosTable[k * n] * buffer[n];
                ival += this.sinTable[k * n] * buffer[n];
            }
            real[k] = rval;
            imag[k] = ival;
        }
        return this.calculateSpectrum();
    };
    return DFT;
}(FourierTransform));
exports.DFT = DFT;
/**
 * FFT is a class for calculating the Discrete Fourier Transform of a signal
 * with the Fast Fourier Transform algorithm.
 *
 * @param {Number} bufferSize The size of the sample buffer to be computed. Must be power of 2
 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 *
 * @constructor
 */
var FFT = (function (_super) {
    __extends(FFT, _super);
    function FFT(bufferSize, sampleRate) {
        _super.call(this, bufferSize, sampleRate);
        this.reverseTable = new Uint32Array(bufferSize);
        var limit = 1;
        var bit = bufferSize >> 1;
        var i;
        while (limit < bufferSize) {
            for (i = 0; i < limit; i++) {
                this.reverseTable[i + limit] = this.reverseTable[i] + bit;
            }
            limit = limit << 1;
            bit = bit >> 1;
        }
        this.sinTable = new Float32Array(bufferSize);
        this.cosTable = new Float32Array(bufferSize);
        for (i = 0; i < bufferSize; i++) {
            this.sinTable[i] = Math.sin(-Math.PI / i);
            this.cosTable[i] = Math.cos(-Math.PI / i);
        }
    }
    /**
     * Performs a forward transform on the sample buffer.
     * Converts a time domain signal to frequency domain spectra.
     *
     * @param {Array} buffer The sample buffer. Buffer Length must be power of 2
     *
     * @returns The frequency spectrum array
     */
    FFT.prototype.forward = function (buffer) {
        // Locally scope variables for speed up
        var bufferSize = this.bufferSize, cosTable = this.cosTable, sinTable = this.sinTable, reverseTable = this.reverseTable, real = this.real, imag = this.imag, spectrum = this.spectrum;
        var k = Math.floor(Math.log(bufferSize) / Math.LN2);
        if (Math.pow(2, k) !== bufferSize) {
            throw "Invalid buffer size, must be a power of 2.";
        }
        if (bufferSize !== buffer.length) {
            throw "Supplied buffer is not the same size as defined FFT. FFT Size: " + bufferSize + " Buffer Size: " + buffer.length;
        }
        var halfSize = 1, phaseShiftStepReal, phaseShiftStepImag, currentPhaseShiftReal, currentPhaseShiftImag, off, tr, ti, tmpReal, i;
        for (i = 0; i < bufferSize; i++) {
            real[i] = buffer[reverseTable[i]];
            imag[i] = 0;
        }
        while (halfSize < bufferSize) {
            //phaseShiftStepReal = Math.cos(-Math.PI/halfSize);
            //phaseShiftStepImag = Math.sin(-Math.PI/halfSize);
            phaseShiftStepReal = cosTable[halfSize];
            phaseShiftStepImag = sinTable[halfSize];
            currentPhaseShiftReal = 1;
            currentPhaseShiftImag = 0;
            for (var fftStep = 0; fftStep < halfSize; fftStep++) {
                i = fftStep;
                while (i < bufferSize) {
                    off = i + halfSize;
                    tr = (currentPhaseShiftReal * real[off]) - (currentPhaseShiftImag * imag[off]);
                    ti = (currentPhaseShiftReal * imag[off]) + (currentPhaseShiftImag * real[off]);
                    real[off] = real[i] - tr;
                    imag[off] = imag[i] - ti;
                    real[i] += tr;
                    imag[i] += ti;
                    i += halfSize << 1;
                }
                tmpReal = currentPhaseShiftReal;
                currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) - (currentPhaseShiftImag * phaseShiftStepImag);
                currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) + (currentPhaseShiftImag * phaseShiftStepReal);
            }
            halfSize = halfSize << 1;
        }
        return this.calculateSpectrum();
    };
    FFT.prototype.inverse = function (real, imag) {
        // Locally scope variables for speed up
        var bufferSize = this.bufferSize, cosTable = this.cosTable, sinTable = this.sinTable, reverseTable = this.reverseTable, spectrum = this.spectrum;
        real = real || this.real;
        imag = imag || this.imag;
        var halfSize = 1, phaseShiftStepReal, phaseShiftStepImag, currentPhaseShiftReal, currentPhaseShiftImag, off, tr, ti, tmpReal, i;
        for (i = 0; i < bufferSize; i++) {
            imag[i] *= -1;
        }
        var revReal = new Float32Array(bufferSize);
        var revImag = new Float32Array(bufferSize);
        for (i = 0; i < real.length; i++) {
            revReal[i] = real[reverseTable[i]];
            revImag[i] = imag[reverseTable[i]];
        }
        real = revReal;
        imag = revImag;
        while (halfSize < bufferSize) {
            phaseShiftStepReal = cosTable[halfSize];
            phaseShiftStepImag = sinTable[halfSize];
            currentPhaseShiftReal = 1;
            currentPhaseShiftImag = 0;
            for (var fftStep = 0; fftStep < halfSize; fftStep++) {
                i = fftStep;
                while (i < bufferSize) {
                    off = i + halfSize;
                    tr = (currentPhaseShiftReal * real[off]) - (currentPhaseShiftImag * imag[off]);
                    ti = (currentPhaseShiftReal * imag[off]) + (currentPhaseShiftImag * real[off]);
                    real[off] = real[i] - tr;
                    imag[off] = imag[i] - ti;
                    real[i] += tr;
                    imag[i] += ti;
                    i += halfSize << 1;
                }
                tmpReal = currentPhaseShiftReal;
                currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) - (currentPhaseShiftImag * phaseShiftStepImag);
                currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) + (currentPhaseShiftImag * phaseShiftStepReal);
            }
            halfSize = halfSize << 1;
        }
        var buffer = new Float32Array(bufferSize); // this should be reused instead
        for (i = 0; i < bufferSize; i++) {
            buffer[i] = real[i] / bufferSize;
        }
        return buffer;
    };
    return FFT;
}(FourierTransform));
exports.FFT = FFT;
/**
 * RFFT is a class for calculating the Discrete Fourier Transform of a signal
 * with the Fast Fourier Transform algorithm.
 *
 * This method currently only contains a forward transform but is highly optimized.
 *
 * @param {Number} bufferSize The size of the sample buffer to be computed. Must be power of 2
 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 *
 * @constructor
 */
// lookup tables don't really gain us any speed, but they do increase
// cache footprint, so don't use them in here
// also we don't use sepearate arrays for real/imaginary parts
// this one a little more than twice as fast as the one in FFT
// however I only did the forward transform
// the rest of this was translated from C, see http://www.jjj.de/fxt/
// this is the real split radix FFT
var RFFT = (function (_super) {
    __extends(RFFT, _super);
    function RFFT(bufferSize, sampleRate) {
        _super.call(this, bufferSize, sampleRate);
        this.trans = new Float32Array(bufferSize);
        this.reverseTable = new Uint32Array(bufferSize);
        this.generateReverseTable();
    }
    // don't use a lookup table to do the permute, use this instead
    RFFT.prototype.reverseBinPermute = function (dest, source) {
        var bufferSize = this.bufferSize, halfSize = bufferSize >>> 1, nm1 = bufferSize - 1, i = 1, r = 0, h;
        dest[0] = source[0];
        do {
            r += halfSize;
            dest[i] = source[r];
            dest[r] = source[i];
            i++;
            h = halfSize << 1;
            while (h = h >> 1, !((r ^= h) & h))
                ;
            if (r >= i) {
                dest[i] = source[r];
                dest[r] = source[i];
                dest[nm1 - i] = source[nm1 - r];
                dest[nm1 - r] = source[nm1 - i];
            }
            i++;
        } while (i < halfSize);
        dest[nm1] = source[nm1];
    };
    RFFT.prototype.generateReverseTable = function () {
        var bufferSize = this.bufferSize, halfSize = bufferSize >>> 1, nm1 = bufferSize - 1, i = 1, r = 0, h;
        this.reverseTable[0] = 0;
        do {
            r += halfSize;
            this.reverseTable[i] = r;
            this.reverseTable[r] = i;
            i++;
            h = halfSize << 1;
            while (h = h >> 1, !((r ^= h) & h))
                ;
            if (r >= i) {
                this.reverseTable[i] = r;
                this.reverseTable[r] = i;
                this.reverseTable[nm1 - i] = nm1 - r;
                this.reverseTable[nm1 - r] = nm1 - i;
            }
            i++;
        } while (i < halfSize);
        this.reverseTable[nm1] = nm1;
    };
    // Ordering of output:
    //
    // trans[0]     = re[0] (==zero frequency, purely real)
    // trans[1]     = re[1]
    //             ...
    // trans[n/2-1] = re[n/2-1]
    // trans[n/2]   = re[n/2]    (==nyquist frequency, purely real)
    //
    // trans[n/2+1] = im[n/2-1]
    // trans[n/2+2] = im[n/2-2]
    //             ...
    // trans[n-1]   = im[1]
    RFFT.prototype.forward = function (buffer) {
        var n = this.bufferSize, spectrum = this.spectrum, x = this.trans, TWO_PI = 2 * Math.PI, sqrt = Math.sqrt, i = n >>> 1, bSi = 2 / n, n2, n4, n8, nn, t1, t2, t3, t4, i1, i2, i3, i4, i5, i6, i7, i8, st1, cc1, ss1, cc3, ss3, e, a, rval, ival, mag;
        this.reverseBinPermute(x, buffer);
        /*
        var reverseTable = this.reverseTable;
    
        for (var k = 0, len = reverseTable.length; k < len; k++) {
          x[k] = buffer[reverseTable[k]];
        }
        */
        for (var ix = 0, id = 4; ix < n; id *= 4) {
            for (var i0 = ix; i0 < n; i0 += id) {
                //sumdiff(x[i0], x[i0+1]); // {a, b}  <--| {a+b, a-b}
                st1 = x[i0] - x[i0 + 1];
                x[i0] += x[i0 + 1];
                x[i0 + 1] = st1;
            }
            ix = 2 * (id - 1);
        }
        n2 = 2;
        nn = n >>> 1;
        while ((nn = nn >>> 1)) {
            ix = 0;
            n2 = n2 << 1;
            id = n2 << 1;
            n4 = n2 >>> 2;
            n8 = n2 >>> 3;
            do {
                if (n4 !== 1) {
                    for (i0 = ix; i0 < n; i0 += id) {
                        i1 = i0;
                        i2 = i1 + n4;
                        i3 = i2 + n4;
                        i4 = i3 + n4;
                        //diffsum3_r(x[i3], x[i4], t1); // {a, b, s} <--| {a, b-a, a+b}
                        t1 = x[i3] + x[i4];
                        x[i4] -= x[i3];
                        //sumdiff3(x[i1], t1, x[i3]);   // {a, b, d} <--| {a+b, b, a-b}
                        x[i3] = x[i1] - t1;
                        x[i1] += t1;
                        i1 += n8;
                        i2 += n8;
                        i3 += n8;
                        i4 += n8;
                        //sumdiff(x[i3], x[i4], t1, t2); // {s, d}  <--| {a+b, a-b}
                        t1 = x[i3] + x[i4];
                        t2 = x[i3] - x[i4];
                        t1 = -t1 * Math.SQRT1_2;
                        t2 *= Math.SQRT1_2;
                        // sumdiff(t1, x[i2], x[i4], x[i3]); // {s, d}  <--| {a+b, a-b}
                        st1 = x[i2];
                        x[i4] = t1 + st1;
                        x[i3] = t1 - st1;
                        //sumdiff3(x[i1], t2, x[i2]); // {a, b, d} <--| {a+b, b, a-b}
                        x[i2] = x[i1] - t2;
                        x[i1] += t2;
                    }
                }
                else {
                    for (i0 = ix; i0 < n; i0 += id) {
                        i1 = i0;
                        i2 = i1 + n4;
                        i3 = i2 + n4;
                        i4 = i3 + n4;
                        //diffsum3_r(x[i3], x[i4], t1); // {a, b, s} <--| {a, b-a, a+b}
                        t1 = x[i3] + x[i4];
                        x[i4] -= x[i3];
                        //sumdiff3(x[i1], t1, x[i3]);   // {a, b, d} <--| {a+b, b, a-b}
                        x[i3] = x[i1] - t1;
                        x[i1] += t1;
                    }
                }
                ix = (id << 1) - n2;
                id = id << 2;
            } while (ix < n);
            e = TWO_PI / n2;
            for (var j = 1; j < n8; j++) {
                a = j * e;
                ss1 = Math.sin(a);
                cc1 = Math.cos(a);
                //ss3 = sin(3*a); cc3 = cos(3*a);
                cc3 = 4 * cc1 * (cc1 * cc1 - 0.75);
                ss3 = 4 * ss1 * (0.75 - ss1 * ss1);
                ix = 0;
                id = n2 << 1;
                do {
                    for (i0 = ix; i0 < n; i0 += id) {
                        i1 = i0 + j;
                        i2 = i1 + n4;
                        i3 = i2 + n4;
                        i4 = i3 + n4;
                        i5 = i0 + n4 - j;
                        i6 = i5 + n4;
                        i7 = i6 + n4;
                        i8 = i7 + n4;
                        //cmult(c, s, x, y, &u, &v)
                        //cmult(cc1, ss1, x[i7], x[i3], t2, t1); // {u,v} <--| {x*c-y*s, x*s+y*c}
                        t2 = x[i7] * cc1 - x[i3] * ss1;
                        t1 = x[i7] * ss1 + x[i3] * cc1;
                        //cmult(cc3, ss3, x[i8], x[i4], t4, t3);
                        t4 = x[i8] * cc3 - x[i4] * ss3;
                        t3 = x[i8] * ss3 + x[i4] * cc3;
                        //sumdiff(t2, t4);   // {a, b} <--| {a+b, a-b}
                        st1 = t2 - t4;
                        t2 += t4;
                        t4 = st1;
                        //sumdiff(t2, x[i6], x[i8], x[i3]); // {s, d}  <--| {a+b, a-b}
                        //st1 = x[i6]; x[i8] = t2 + st1; x[i3] = t2 - st1;
                        x[i8] = t2 + x[i6];
                        x[i3] = t2 - x[i6];
                        //sumdiff_r(t1, t3); // {a, b} <--| {a+b, b-a}
                        st1 = t3 - t1;
                        t1 += t3;
                        t3 = st1;
                        //sumdiff(t3, x[i2], x[i4], x[i7]); // {s, d}  <--| {a+b, a-b}
                        //st1 = x[i2]; x[i4] = t3 + st1; x[i7] = t3 - st1;
                        x[i4] = t3 + x[i2];
                        x[i7] = t3 - x[i2];
                        //sumdiff3(x[i1], t1, x[i6]);   // {a, b, d} <--| {a+b, b, a-b}
                        x[i6] = x[i1] - t1;
                        x[i1] += t1;
                        //diffsum3_r(t4, x[i5], x[i2]); // {a, b, s} <--| {a, b-a, a+b}
                        x[i2] = t4 + x[i5];
                        x[i5] -= t4;
                    }
                    ix = (id << 1) - n2;
                    id = id << 2;
                } while (ix < n);
            }
        }
        while (--i) {
            rval = x[i];
            ival = x[n - i - 1];
            mag = bSi * sqrt(rval * rval + ival * ival);
            if (mag > this.peak) {
                this.peakBand = i;
                this.peak = mag;
            }
            spectrum[i] = mag;
        }
        spectrum[0] = bSi * x[0];
        return spectrum;
    };
    return RFFT;
}(FourierTransform));
exports.RFFT = RFFT;

},{}],18:[function(require,module,exports){
"use strict";
var FourierTransform_1 = require("./FourierTransform");
var Statistics = require("duxca.lib.statistics.js");
function normalize(arr, max_val) {
    if (max_val === void 0) { max_val = 1; }
    var min = Statistics.findMin(arr)[0];
    var max = Statistics.findMax(arr)[0];
    var _arr = new Float32Array(arr.length);
    for (var j = 0; j < arr.length; j++) {
        _arr[j] = (arr[j] - min) / (max - min) * max_val;
    }
    return _arr;
}
exports.normalize = normalize;
function correlation(signalA, signalB, sampleRate) {
    if (signalA.length !== signalB.length)
        throw new Error("unmatch signal length A and B as " + signalA.length + " and " + signalB.length);
    var _fft = new FourierTransform_1.FFT(signalA.length, sampleRate);
    _fft.forward(signalA);
    //var a_spectrum = new Float32Array(fft.spectrum);
    var a_real = new Float32Array(_fft.real);
    var a_imag = new Float32Array(_fft.imag);
    _fft.forward(signalB);
    //var b_spectrum = new Float32Array(_fft.spectrum);
    var b_real = _fft.real; //new Float32Array(_fft.real);
    var b_imag = _fft.imag; //new Float32Array(_fft.imag);
    var cross_real = b_real; //new Float32Array(b_real.length);
    var cross_imag = b_imag; //new Float32Array(b_imag.length);
    for (var i = 0; i < cross_real.length; i++) {
        cross_real[i] = a_real[i] * b_real[i] / cross_real.length;
        cross_imag[i] = a_imag[i] * b_imag[i] / cross_imag.length;
    }
    var inv_real = _fft.inverse(cross_real, cross_imag);
    for (var i = 0; i < inv_real.length; i++) {
        inv_real[i] = inv_real[i] / inv_real.length;
    }
    return inv_real;
}
exports.correlation = correlation;
function smartCorrelation(short, long, sampleRate) {
    for (var pow = 8; short.length + long.length > Math.pow(2, pow); pow++)
        ;
    var tmpA = new Float32Array(Math.pow(2, pow));
    var tmpB = new Float32Array(Math.pow(2, pow));
    tmpA.set(short, 0);
    tmpB.set(long, 0);
    var corrsec = correlation(tmpA, tmpB, sampleRate);
    return corrsec.subarray(0, long.length > short.length ? long.length : short.length);
}
exports.smartCorrelation = smartCorrelation;
function overwarpCorr(short, long) {
    for (var pow = 8; short.length > Math.pow(2, pow); pow++)
        ; // ajasting power of two for FFT
    var resized_short = new Float32Array(Math.pow(2, pow)); // for overwrap adding way correlation
    resized_short.set(short, 0);
    var buffer = new Float32Array(Math.pow(2, pow)); // for overwrap adding way correlation
    var _correlation = new Float32Array(long.length);
    var windowsize = Math.pow(2, pow - 1);
    //console.log(long.length, windowsize, resized_short.length, buffer.length, correlation.length)
    for (var i = 0; long.length - (i + windowsize) >= resized_short.length; i += windowsize) {
        buffer.set(long.subarray(i, i + windowsize), 0);
        var corr = correlation(buffer, resized_short);
        for (var j = 0; j < corr.length; j++) {
            _correlation[i + j] = corr[j];
        }
    }
    return _correlation;
}
exports.overwarpCorr = overwarpCorr;
function autocorr(arr) {
    return crosscorr(arr, arr);
}
exports.autocorr = autocorr;
function crosscorr(arrA, arrB) {
    function _autocorr(j) {
        var sum = 0;
        for (var i = 0; i < arrA.length - j; i++)
            sum += arrA[i] * arrB[i + j];
        return sum;
    }
    return arrA.map(function (v, j) { return _autocorr(j); });
}
exports.crosscorr = crosscorr;
function fft(signal, sampleRate) {
    if (sampleRate === void 0) { sampleRate = 44100; }
    var _fft = new FourierTransform_1.FFT(signal.length, sampleRate);
    _fft.forward(signal);
    return { real: _fft.real, imag: _fft.imag, spectrum: _fft.spectrum };
}
exports.fft = fft;
function ifft(pulse_real, pulse_imag, sampleRate) {
    if (sampleRate === void 0) { sampleRate = 44100; }
    var _fft = new FourierTransform_1.FFT(pulse_real.length, sampleRate);
    var inv_real = _fft.inverse(pulse_real, pulse_imag);
    return inv_real;
}
exports.ifft = ifft;
function createChirpSignal(pulse_length, downchirp) {
    if (downchirp === void 0) { downchirp = false; }
    var flag = downchirp ? 1 : -1;
    var pulse_real = new Float32Array(pulse_length);
    var pulse_imag = new Float32Array(pulse_length);
    for (var i = 0; i < pulse_length / 2; i++) {
        pulse_real[i] = Math.cos(Math.PI * i * (i / pulse_length + 1 / 2));
        pulse_imag[i] = flag * Math.sin(Math.PI * i * (i / pulse_length + 1 / 2));
    }
    for (var i = pulse_length / 2 + 1; i < pulse_length; i++) {
        pulse_real[i] = pulse_real[pulse_length - i];
        pulse_imag[i] = -pulse_imag[pulse_length - i];
    }
    var _fft = new FourierTransform_1.FFT(pulse_length, 44100);
    var inv_real = _fft.inverse(pulse_real, pulse_imag);
    return inv_real;
}
exports.createChirpSignal = createChirpSignal;
function createBarkerCode(n) {
    switch (n) {
        case 1: return [1];
        case 2: return [1, -1];
        case 3: return [1, 1, -1];
        case 4: return [1, 1, -1, 1];
        case 5: return [1, 1, 1, -1, 1];
        case 7: return [1, 1, 1, -1, -1, 1, -1];
        case 11: return [1, 1, 1, -1, -1, -1, 1, -1, -1, 1, -1];
        case 13: return [1, 1, 1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1];
        default: throw new Error("cannot make barker code excludes 2, 3, 4, 5, 7, 11, 13");
    }
}
exports.createBarkerCode = createBarkerCode;
function createComplementaryCode(pow2) {
    var a = [1, 1];
    var b = [1, -1];
    function compress(a, b) {
        return [a.concat(b), a.concat(b.map(function (x) { return -x; }))];
    }
    while (pow2--) {
        _a = compress(a, b), a = _a[0], b = _a[1];
    }
    return [a, b];
    var _a;
}
exports.createComplementaryCode = createComplementaryCode;
function createCodedChirp(code, bitWithBinaryPower) {
    if (bitWithBinaryPower === void 0) { bitWithBinaryPower = 10; }
    var bitwidth = Math.pow(2, bitWithBinaryPower);
    var up_chirp = createChirpSignal(bitwidth);
    var down_chirp = new Float32Array(up_chirp);
    for (var i = 0; i < down_chirp.length; i++) {
        down_chirp[i] *= -1;
    }
    var pulse = new Float32Array(bitwidth / 2 * code.length + bitwidth / 2);
    for (var i = 0; i < code.length; i++) {
        var tmp = (code[i] === 1) ? up_chirp : down_chirp;
        for (var j = 0; j < tmp.length; j++) {
            pulse[i * bitwidth / 2 + j] += tmp[j];
        }
    }
    return pulse;
}
exports.createCodedChirp = createCodedChirp;
function createBarkerCodedChirp(barkerCodeN, bitWithBinaryPower) {
    if (bitWithBinaryPower === void 0) { bitWithBinaryPower = 10; }
    return createCodedChirp(createBarkerCode(barkerCodeN), bitWithBinaryPower);
}
exports.createBarkerCodedChirp = createBarkerCodedChirp;
// Signal.createM([3, 1], 7, [0,0,1])
// = [0, 0, 1, 1, 1, 0, 1, 0, 0, 1]
// Signal.createM([4, 1], 15, [1,0,0,0])
// = [1, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0]
function createM(polynomial, shiftN, seed) {
    if (!Array.isArray(seed)) {
        seed = [];
        for (var i = 0; i < polynomial[0]; i++)
            seed[i] = Math.round(Math.random());
    }
    else if (seed.length !== polynomial[0]) {
        throw new Error("polynomial[0] !== seed.length");
    }
    var arr = seed.slice(0);
    for (var i = 0; i < shiftN; i++) {
        var tmp = arr[arr.length - polynomial[0]];
        for (var j = 1; j < polynomial.length; j++) {
            tmp = tmp ^ arr[arr.length - polynomial[j]];
        }
        arr.push(tmp);
    }
    return arr;
}
exports.createM = createM;
function mseqGen(MSEQ_POL_LEN, MSEQ_POL_COEFF) {
    //const MSEQ_POL_LEN = 4; // M系列を生成する多項式の次数
    //const MSEQ_POL_COEFF = [1, 0, 0, 1]; // M系列を生成する多項式の係数
    var L_MSEQ = Math.pow(2, MSEQ_POL_LEN) - 1; // M系列の長さ
    var tap = new Uint8Array(MSEQ_POL_LEN);
    var mseqPol = new Uint8Array(MSEQ_POL_COEFF);
    var mseq = new Int8Array(L_MSEQ);
    tap[0] = 1;
    for (var i = 0; i < mseq.length; i++) {
        mseq[i] = tap[MSEQ_POL_LEN - 1];
        var tmp = 0;
        // 重み係数とタップの内容との積和演算
        for (var j = 0; j < MSEQ_POL_LEN; j++) {
            tmp += tap[j] * mseqPol[j];
            tmp = tmp % 2;
        }
        // タップの中身の右巡回シフト
        for (var k = MSEQ_POL_LEN - 1; k > 0; k--) {
            tap[k] = tap[k - 1];
        }
        tap[0] = tmp;
    }
    for (var i = 0; i < mseq.length; i++) {
        mseq[i] = mseq[i] <= 0 ? -1 : 1;
    }
    return mseq;
}
exports.mseqGen = mseqGen;
function goldSeqGen(MSEQ_POL_LEN, MSEQ_POL_COEFF_A, MSEQ_POL_COEFF_B, shift) {
    shift = shift % MSEQ_POL_COEFF_B.length;
    var seq_a = mseqGen(MSEQ_POL_LEN, MSEQ_POL_COEFF_A);
    var seq_b = mseqGen(MSEQ_POL_LEN, MSEQ_POL_COEFF_B);
    var gold = new Int8Array(seq_a.length);
    for (var i = 0; i < gold.length; i++) {
        gold[i] = seq_a[i] ^ seq_b[(i + shift) % seq_b.length];
    }
    return gold;
}
exports.goldSeqGen = goldSeqGen;
function encode_chipcode(bits, PNSeq) {
    // bits: {-1, 1}
    // return: {-1, 1}
    var _PNSeq = new Int8Array(PNSeq);
    for (var i = 0; i < _PNSeq.length; i++) {
        _PNSeq[i] *= -1;
    }
    var zeros = new Int8Array(PNSeq.length);
    var seq = new Int8Array(PNSeq.length * bits.length);
    for (var i = 0; i < bits.length; i++) {
        var pt = i * PNSeq.length;
        var bit = bits[i];
        seq.set((bit === 0 ? zeros : bit > 0 ? PNSeq : _PNSeq), pt);
    }
    return seq;
}
exports.encode_chipcode = encode_chipcode;
function encode_chipcode_separated_zero(bits, PNSeq) {
    // bits: {-1, 1}
    // return: {-1, 0, 1}
    // inverse phase pn sequence
    var _PNSeq = new Int8Array(PNSeq);
    for (var i = 0; i < _PNSeq.length; i++) {
        _PNSeq[i] *= -1;
    }
    var seq = new Int8Array(PNSeq.length * bits.length * 2 - 1);
    for (var i = 0; i < bits.length; i++) {
        var pt = i * PNSeq.length /* zero space -> */ * 2;
        var bit = bits[i];
        seq.set((bit > 0 ? PNSeq : _PNSeq), pt);
    }
    return seq;
}
exports.encode_chipcode_separated_zero = encode_chipcode_separated_zero;
function carrierGen(freq, sampleRate, currentTime, length) {
    var result = new Float32Array(length);
    var phaseSec = 1 / freq;
    var one_phase_sample = sampleRate / freq;
    var startId = currentTime * sampleRate;
    for (var i = 0; i < result.length; i++) {
        result[i] = Math.sin(2 * Math.PI / one_phase_sample * (startId + i));
    }
    return result;
}
exports.carrierGen = carrierGen;
function BPSK(bits, carrierFreq, sampleRate, currentTime, length) {
    // bits: {-1, 1}
    var one_phase_sample = sampleRate / carrierFreq;
    if (length == null) {
        length = bits.length * one_phase_sample;
    }
    var result = carrierGen(carrierFreq, sampleRate, currentTime, length);
    var startId = currentTime * sampleRate;
    for (var i = 0; i < result.length; i++) {
        result[i] *= bits[((startId + i) / one_phase_sample | 0) % bits.length];
    }
    return result;
}
exports.BPSK = BPSK;
function fft_smart_correlation(signalA, signalB) {
    var short;
    var long;
    if (signalA.length > signalB.length) {
        short = signalB;
        long = signalA;
    }
    else {
        short = signalA;
        long = signalB;
    }
    var pow = 0;
    for (pow = 1; long.length > Math.pow(2, pow); pow++)
        ;
    var resized_long = new Float32Array(Math.pow(2, pow));
    resized_long.set(long, 0);
    var resized_short = new Float32Array(Math.pow(2, pow));
    resized_short.set(short, 0);
    var corr = fft_correlation(resized_short, resized_long);
    return corr;
}
exports.fft_smart_correlation = fft_smart_correlation;
function fft_smart_overwrap_correlation(signalA, signalB, pof) {
    if (pof === void 0) { pof = true; }
    var short;
    var long;
    if (signalA.length > signalB.length) {
        short = signalB;
        long = signalA;
    }
    else {
        short = signalA;
        long = signalB;
    }
    // ajasting power of two for FFT for overwrap adding way correlation
    var pow = 0;
    for (pow = 1; short.length > Math.pow(2, pow); pow++)
        ;
    var resized_short = new Float32Array(Math.pow(2, pow + 1));
    resized_short.set(short, 0); //resized_short.length/4);
    // short = [1,-1,1,-1,1] // length = 5
    // resized_short = [1,-1,1,-1,1,0,0,0] ++ [0,0,0,0,0,0,0,0] // length = 2^3 * 2 = 8 * 2 = 16
    var windowSize = resized_short.length / 2;
    var slideWidth = short.length;
    var _correlation = new Float32Array(long.length);
    var filter = pof ? phase_only_filter : fft_correlation;
    for (var i = 0; (long.length - (i + slideWidth)) >= 0; i += slideWidth) {
        var resized_long = new Float32Array(resized_short.length);
        resized_long.set(long.subarray(i, i + windowSize), 0); //resized_short.length/4);
        var corr = filter(resized_short, resized_long);
        for (var j = 0; j < corr.length / 2; j++) {
            _correlation[i + j] += corr[j];
        }
        for (var j = 0; j < corr.length / 2; j++) {
            _correlation[i - j] += corr[corr.length - 1 - j];
        }
    }
    return _correlation;
}
exports.fft_smart_overwrap_correlation = fft_smart_overwrap_correlation;
function fft_smart_overwrap_convolution(signalA, signalB) {
    var short;
    var long;
    if (signalA.length > signalB.length) {
        short = signalB;
        long = signalA;
    }
    else {
        short = signalA;
        long = signalB;
    }
    // ajasting power of two for FFT for overwrap adding way correlation
    var pow = 0;
    for (pow = 1; short.length > Math.pow(2, pow); pow++)
        ;
    var resized_short = new Float32Array(Math.pow(2, pow + 1));
    resized_short.set(short, 0); //resized_short.length/4);
    // short = [1,-1,1,-1,1] // length = 5
    // resized_short = [1,-1,1,-1,1,0,0,0] ++ [0,0,0,0,0,0,0,0] // length = 2^3 * 2 = 8 * 2 = 16
    var windowSize = resized_short.length / 2;
    var slideWidth = short.length;
    var _correlation = new Float32Array(long.length);
    var filter = fft_convolution;
    for (var i = 0; (long.length - (i + slideWidth)) >= 0; i += slideWidth) {
        var resized_long = new Float32Array(resized_short.length);
        resized_long.set(long.subarray(i, i + windowSize), 0); //resized_short.length/4);
        var corr = filter(resized_short, resized_long);
        for (var j = 0; j < corr.length / 2; j++) {
            _correlation[i + j] += corr[j];
        }
        for (var j = 0; j < corr.length / 2; j++) {
            _correlation[i - j] += corr[corr.length - 1 - j];
        }
    }
    return _correlation;
}
exports.fft_smart_overwrap_convolution = fft_smart_overwrap_convolution;
function fft_correlation(signalA, signalB) {
    var spectA = fft(signalA);
    var spectB = fft(signalB);
    var cross_real = new Float32Array(spectA.real.length);
    var cross_imag = new Float32Array(spectA.imag.length);
    for (var i = 0; i < spectA.real.length; i++) {
        cross_real[i] = spectA.real[i] * spectB.real[i];
        cross_imag[i] = spectA.imag[i] * -spectB.imag[i];
    }
    var inv_real = ifft(cross_real, cross_imag);
    return inv_real;
}
exports.fft_correlation = fft_correlation;
function fft_convolution(signalA, signalB) {
    var _signalA = new Float32Array(signalA.length * 2);
    _signalA.set(signalA, 0);
    var _signalB = new Float32Array(signalB.length * 2);
    _signalB.set(signalB, 0);
    var spectA = fft(_signalA);
    var spectB = fft(_signalB);
    var cross_real = new Float32Array(spectA.real.length);
    var cross_imag = new Float32Array(spectA.imag.length);
    for (var i = 0; i < spectA.real.length; i++) {
        cross_real[i] = spectA.real[i] * spectB.real[i];
        cross_imag[i] = spectA.imag[i] * spectB.imag[i];
    }
    var inv_real = ifft(cross_real, cross_imag);
    return inv_real.subarray(0, inv_real.length / 2);
}
exports.fft_convolution = fft_convolution;
function naive_correlation(xs, ys) {
    return crosscorr(xs, ys);
}
exports.naive_correlation = naive_correlation;
function naive_convolution(xs, ys) {
    // 引数が逆なのはインパルスレスポンスを畳み込んでみれば分かる
    var arr = [];
    var zs = new Float32Array(ys.length * 2);
    zs.set(ys, 0);
    zs.set(ys, ys.length);
    for (var i = 0; i < xs.length; i++) {
        var sum = 0;
        for (var j = 0; j < ys.length; j++) {
            sum += xs[j] * zs[ys.length + i - j];
        }
        arr[i] = sum;
    }
    return arr;
}
exports.naive_convolution = naive_convolution;
function phase_only_filter(xs, ys) {
    var _a = fft(xs), real = _a.real, imag = _a.imag, spectrum = _a.spectrum;
    var _ys = fft(ys);
    for (var i = 0; i < imag.length; i++) {
        var abs = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
        if (abs === 0) {
            // console.warn("Signal.phase_only_filter", "zero division detected")
            abs = 0.000001;
        }
        real[i] = real[i] / abs;
        imag[i] = -imag[i] / abs;
        real[i] *= _ys.real[i];
        imag[i] *= _ys.imag[i];
    }
    return ifft(real, imag);
}
exports.phase_only_filter = phase_only_filter;
function mean_squared_error(xs, ys) {
    var sum = 0;
    for (var i = 0; i < xs.length; i++) {
        sum += Math.pow(xs[i] - ys[i], 2);
    }
    return sum / xs.length;
}
exports.mean_squared_error = mean_squared_error;
function lowpass(input, sampleRate, freq, q) {
    // float input[]  …入力信号の格納されたバッファ。
    // float sampleRate … サンプリング周波数。
    // float freq … カットオフ周波数。
    // float q    … フィルタのQ値。
    var size = input.length;
    var output = new Float32Array(size);
    // フィルタ係数を計算する
    var omega = 2.0 * Math.PI * freq / sampleRate;
    var alpha = Math.sin(omega) / (2.0 * q);
    var a0 = 1.0 + alpha;
    var a1 = -2.0 * Math.cos(omega);
    var a2 = 1.0 - alpha;
    var b0 = (1.0 - Math.cos(omega)) / 2.0;
    var b1 = 1.0 - Math.cos(omega);
    var b2 = (1.0 - Math.cos(omega)) / 2.0;
    // フィルタ計算用のバッファ変数。
    var in1 = 0.0;
    var in2 = 0.0;
    var out1 = 0.0;
    var out2 = 0.0;
    // フィルタを適用
    for (var i = 0; i < size; i++) {
        // 入力信号にフィルタを適用し、出力信号として書き出す。
        output[i] = b0 / a0 * input[i] + b1 / a0 * in1
            + b2 / a0 * in2
            - a1 / a0 * out1
            - a2 / a0 * out2;
        in2 = in1; // 2つ前の入力信号を更新
        in1 = input[i]; // 1つ前の入力信号を更新
        out2 = out1; // 2つ前の出力信号を更新
        out1 = output[i]; // 1つ前の出力信号を更新
    }
    return output;
}
exports.lowpass = lowpass;
function first_wave_detection(xs) {
    var conv = xs.map(function (_, i) {
        var ys = new Float32Array(xs.length);
        ys.set(xs.subarray(i, xs.length), 0);
        var corr = fft_smart_overwrap_correlation(xs, ys);
        return corr[0];
    });
    var i = 1;
    while (conv[0] / 2 < conv[i])
        i++;
    while (conv[i - 1] - conv[i] > 0)
        i++;
    var _a = Statistics.findMax(conv.subarray(i, conv.length)), _ = _a[0], idx = _a[1];
    return i + idx;
}
exports.first_wave_detection = first_wave_detection;

},{"./FourierTransform":17,"duxca.lib.statistics.js":19}],19:[function(require,module,exports){
"use strict";
function summation(arr) {
    var sum = 0;
    for (var j = 0; j < arr.length; j++) {
        sum += arr[j];
    }
    return sum;
}
exports.summation = summation;
function average(arr) {
    return summation(arr) / arr.length;
}
exports.average = average;
function variance(arr) {
    var ave = average(arr);
    var sum = 0;
    for (var j = 0; j < arr.length; j++) {
        sum += Math.pow(arr[j] - ave, 2);
    }
    return sum / (arr.length - 1);
}
exports.variance = variance;
function stdev(arr) {
    return Math.sqrt(variance(arr));
}
exports.stdev = stdev;
function stdscore(arr, x) {
    return 10 * (x - average(arr)) / variance(arr) + 50;
}
exports.stdscore = stdscore;
function derivative(arr) {
    var results = [0];
    for (var i = 1; i < arr.length; i++) {
        results.push(arr[i] - arr[i - 1]);
    }
    return results;
}
exports.derivative = derivative;
function median(arr) {
    return Array.prototype.slice.call(arr, 0).sort()[arr.length / 2 | 0];
}
exports.median = median;
function KDE(arr, h) {
    // kernel density estimation
    if (typeof h !== "number") {
        h = 0.9 * stdev(arr) * Math.pow(arr.length, -1 / 5) + 0.0000000001;
    }
    function kernel(x) {
        return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
    }
    function estimate(x) {
        var s = 0;
        for (var i = 0; i < arr.length; i++) {
            s += kernel((x - arr[i]) / h);
        }
        return s / (h * arr.length);
    }
    var results = [];
    for (var i = 0; i < arr.length; i++) {
        results.push(estimate(arr[i]));
    }
    return results;
}
exports.KDE = KDE;
function mode(arr) {
    var kde = KDE(arr);
    return arr[findMax(kde)[1]];
}
exports.mode = mode;
function gaussian(x) {
    return 1 / Math.sqrt(2 * Math.PI) * Math.exp(-Math.pow(x, 2) / 2);
}
exports.gaussian = gaussian;
function findMax(arr) {
    var result = -Infinity;
    var index = -1;
    for (var i = 0; i < arr.length; i++) {
        if (!(arr[i] > result)) {
            continue;
        }
        result = arr[i];
        index = i;
    }
    return [result, index];
}
exports.findMax = findMax;
function findMin(arr) {
    var result = Infinity;
    var index = -1;
    for (var i = 0; i < arr.length; i++) {
        if (!(arr[i] < result)) {
            continue;
        }
        result = arr[i];
        index = i;
    }
    return [result, index];
}
exports.findMin = findMin;
function LWMA(arr) {
    // liner weighted moving average
    var a = 0;
    var b = 0;
    var i = 0;
    var j = arr.length - 1;
    while (i < arr.length) {
        a += arr[i] * j;
        b += j;
        i++;
        j--;
    }
    return a / b;
}
exports.LWMA = LWMA;
function all(arr) {
    console.log("len", arr.length, "\n", "min", findMin(arr), "\n", "max", findMax(arr), "\n", "ave", average(arr), "\n", "med", median(arr), "\n", "mode", mode(arr), "\n", "var", variance(arr), "\n", "stdev", stdev(arr));
}
exports.all = all;
function k_means1D(data, k) {
    var klass = [];
    for (var i = 0; i < data.length; i++) {
        klass[i] = (Math.random() * 10000 | 0) % k;
    }
    var count = 0;
    recur: while (true) {
        if (++count > 100000)
            throw new Error("Maximum call stack size exceeded");
        var laststate = klass.slice(0);
        var sums = [];
        for (var j = 0; j < k; j++) {
            sums[j] = [];
        }
        for (var i = 0; i < data.length; i++) {
            sums[klass[i]].push(data[i]);
        }
        var aves = [];
        for (var j = 0; j < k; j++) {
            aves[j] = average(sums[j]);
        }
        for (var i = 0; i < data.length; i++) {
            for (var j = 0; j < aves.length; j++) {
                if (Math.abs(aves[klass[i]] - data[i]) > Math.abs(aves[j] - data[i])) {
                    klass[i] = j;
                }
            }
        }
        for (var i = 0; i < klass.length; i++) {
            if (klass[i] !== laststate[i]) {
                continue recur;
            }
        }
        return klass;
    }
}
exports.k_means1D = k_means1D;

},{}],20:[function(require,module,exports){
"use strict";
var Wave = (function () {
    function Wave(channel, sampleRate, int16arr) {
        //int16arr is 16bit nCh PCM
        var size = int16arr.length * 2; // データサイズ (byte) # 8bit*2 = 16bit
        channel = channel; // チャンネル数 (1:モノラル or 2:ステレオ)
        var bitsPerSample = 16; // サンプルあたりのビット数 (8 or 16) # 16bit PCM
        var offset = 44; // ヘッダ部分のサイズ
        this.view = new DataView(new ArrayBuffer(offset + size)); // バイト配列を作成
        Wave.writeUTFBytes(this.view, 0, "RIFF"); // Chunk ID # RIFF ヘッダ
        this.view.setUint32(4, offset + size - 8, true); // Chunk Size # ファイルサイズ - 8
        Wave.writeUTFBytes(this.view, 8, "WAVE"); // Format # WAVE ヘッダ
        Wave.writeUTFBytes(this.view, 12, "fmt "); // Subchunk 1 ID # fmt チャンク
        this.view.setUint32(16, 16, true); // Subchunk 1 Size # fmt チャンクのバイト数
        this.view.setUint16(20, 1, true); // Audio Format # フォーマットID
        this.view.setUint16(22, channel, true); // Num Channels # チャンネル数
        this.view.setUint32(24, sampleRate, true); // Sample Rate (Hz) # サンプリングレート
        this.view.setUint32(28, sampleRate * (bitsPerSample >>> 3) * channel, true); // Byte Rate (サンプリング周波数 * ブロックサイズ) # データ速度
        this.view.setUint16(32, (bitsPerSample >>> 3) * channel, true); // Block Align (チャンネル数 * 1サンプルあたりのビット数 / 8) # ブロックサイズ
        this.view.setUint16(34, bitsPerSample, true); // Bits Per Sample # サンプルあたりのビット数
        Wave.writeUTFBytes(this.view, 36, 'data'); // Subchunk 2 ID
        this.view.setUint32(40, size, true); // Subchunk 2 Size # 波形データのバイト数
        for (var i = 0; i < int16arr.length; i++) {
            this.view.setInt16(offset + i * 2, int16arr[i], true);
        }
    }
    Wave.prototype.toBlob = function () {
        return new Blob([this.view], {
            type: "audio/wav"
        });
    };
    Wave.prototype.toURL = function () {
        return URL.createObjectURL(this.toBlob());
    };
    Wave.prototype.toAudio = function () {
        var audio = document.createElement("audio");
        audio.src = this.toURL();
        audio.controls = true;
        return audio;
    };
    return Wave;
}());
var Wave;
(function (Wave) {
    function writeUTFBytes(view, offset, str) {
        for (var i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    }
    Wave.writeUTFBytes = writeUTFBytes;
})(Wave || (Wave = {}));
module.exports = Wave;

},{}]},{},[9])(9)
});