var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
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
                    signal = duxca.lib.Signal.normalize(signal, 1);
                }
                var zoomX = !flagX ? 1 : this.cnv.width / signal.length;
                var zoomY = !flagY ? 1 : this.cnv.height / duxca.lib.Statictics.findMax(signal)[0];
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
                        var _a = hslToRgb(spectrogram[i][j] / max, 0.5, 0.5), r = _a[0], g = _a[1], b = _a[2];
                        var _b = [i, imgdata.height - 1 - j], x = _b[0], y = _b[1];
                        var index = x + y * imgdata.width;
                        imgdata.data[index * 4 + 0] = b | 0;
                        imgdata.data[index * 4 + 1] = g | 0;
                        imgdata.data[index * 4 + 2] = r | 0;
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
                    var spectrum = duxca.lib.Signal.fft(buffer, sampleRate)[2];
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
        })();
        lib.CanvasRender = CanvasRender;
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
/// <reference path="../../tsd/peerjs/peerjs.d.ts"/>
/// <reference path="../../typings/bluebird/bluebird.d.ts"/>
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        function distance(str) {
            return Math.sqrt(str.split("").map(function (char) { return char.charCodeAt(0); }).reduce(function (sum, val) { return sum + Math.pow(val, 2); }));
        }
        var Chord = (function () {
            function Chord(hostname, port) {
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
                    return Promise.resolve();
                this.peer = new Peer({ host: location.hostname, port: 9000, debug: 2 });
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
                    function _open(id) { off(); resolve(Promise.resolve()); }
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
                        function _open() { off(); resolve(Promise.resolve()); }
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
                            var max = distance("zzzzzzzzzzzzzzzz");
                            var myid = distance(_this.peer.id);
                            var succ = distance(conn.peer);
                            var succ_says_pred = distance(data.id);
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
                            var max = distance("zzzzzzzzzzzzzzzz");
                            var myid = distance(_this.peer.id);
                            var succ = distance(_this.successor.peer);
                            var pred = distance(_this.predecessor.peer);
                            var newbee = distance(conn.peer);
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
                    }
                });
            };
            return Chord;
        })();
        lib.Chord = Chord;
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
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
        })();
        lib.FPS = FPS;
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
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
        })();
        lib.Metronome = Metronome;
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
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
                var code = duxca.lib.Signal.createBarkerCode(barkerCodeN);
                var chirp = duxca.lib.Signal.createCodedChirp(code, powN);
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
                    var recbuf = new lib.RecordBuffer(_this.actx.sampleRate, processor.bufferSize, processor.channelCount);
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
                var up = lib.Signal.createChirpSignal(Math.pow(2, 17), false);
                var down = lib.Signal.createChirpSignal(Math.pow(2, 17), true);
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
                    var recbuf = new lib.RecordBuffer(_this.actx.sampleRate, processor.bufferSize, 1);
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
                        var corr = lib.Signal.overwarpCorr(down, rawdata);
                        var render = new duxca.lib.CanvasRender(128, 128);
                        console.log("raw", rawdata.length);
                        render.cnv.width = rawdata.length / 256;
                        render.drawSignal(rawdata, true, true);
                        console.screenshot(render.element);
                        console.log("corr", corr.length);
                        render.cnv.width = corr.length / 256;
                        render.drawSignal(corr, true, true);
                        console.screenshot(render.element);
                        console.log("up", up.length);
                        render.cnv.width = up.length / 256;
                        render.drawSignal(up, true, true);
                        console.screenshot(render.element);
                        render._drawSpectrogram(rawdata, recbuf.sampleRate);
                        console.screenshot(render.cnv);
                    }
                });
            };
            return OSC;
        })();
        lib.OSC = OSC;
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        function mergeBuffers(chBuffer) {
            var bufferSize = chBuffer[0].length;
            var f32arr = new Float32Array(chBuffer.length * bufferSize);
            for (var i = 0; i < chBuffer.length; i++) {
                f32arr.set(chBuffer[i], i * bufferSize);
            }
            return f32arr;
        }
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
        function float32ArrayToInt16Array(arr) {
            var int16arr = new Int16Array(arr.length);
            for (var i = 0; i < arr.length; i++) {
                int16arr[i] = arr[i] * 0x7FFF * 0.8; // 32bit -> 16bit
            }
            return int16arr;
        }
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
                    results.push(mergeBuffers(this.chsBuffers[i]));
                }
                return float32ArrayToInt16Array(interleave(results));
            };
            RecordBuffer.prototype.merge = function (ch) {
                if (ch === void 0) { ch = 0; }
                return mergeBuffers(this.chsBuffers[ch]);
            };
            RecordBuffer.prototype.getChannelData = function (n) {
                return mergeBuffers(this.chsBuffers[n]);
            };
            return RecordBuffer;
        })();
        lib.RecordBuffer = RecordBuffer;
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
/// <reference path="../../typings/webrtc/MediaStream.d.ts"/>
/// <reference path="../../typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../tsd/console.snapshot/console.snapshot.d.ts"/>
/// <reference path="../../tsd/MediaStreamAudioSourceNode/MediaStreamAudioSourceNode.d.ts"/>
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Sandbox;
        (function (Sandbox) {
            navigator.getUserMedia = (navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia);
            function _(id) {
                var data = [
                    { id: "a", data: { a: 0, b: 1, c: 2 } },
                    { id: "b", data: { a: 1, b: 0, c: 1 } },
                    { id: "c", data: { a: 2, b: 1, c: 0 } }
                ];
                for (var i = 0; i < 3; i++)
                    for (var j = i + 1; j < 3; j++)
                        console.log(i, j, i + "[" + i + "~" + j + "]");
            }
            Sandbox._ = _;
            function testAutoDetect3(id) {
                var TEST_INPUT_MYSELF = false;
                var actx = new AudioContext();
                var codeA = duxca.lib.Signal.createBarkerCode(13);
                var pulseA = createPulse(codeA, 6);
                console.log(actx.sampleRate, pulseA.length, pulseA.length / actx.sampleRate);
                var render = new duxca.lib.CanvasRender(128, 128);
                render.cnv.width = pulseA.length;
                render.drawSignal(pulseA, true, true);
                console.screenshot(render.element);
                var processor = actx.createScriptProcessor(Math.pow(2, 12), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
                var recbuf = new lib.RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
                var isRecording = false;
                var stdscoreResult = null;
                var pulseReady = {};
                var pulseFinish = {};
                var results = {};
                Promise.resolve()
                    .then(setupRecording)
                    .then(setupChord)
                    .then(function (chd) {
                    console.log(chd.peer.id);
                    if (typeof id !== "string") {
                        // master node
                        setTimeout(function recur() {
                            chd.request("ping")
                                .then(function (token) {
                                console.log(token.payload.event, token.route);
                                var member = token.route;
                                return chd.request("startRec", { member: member })
                                    .then(function (token) {
                                    return token.route.reduce(function (prm, id) {
                                        return prm
                                            .then(function (token) { return chd.request("pulseStart", { member: member, id: id }); })
                                            .then(function (token) { return chd.request("pulseBeep", { member: member, id: id }); })
                                            .then(function (token) { return chd.request("pulseStop", { member: member, id: id }); });
                                    }, Promise.resolve(token));
                                })
                                    .then(function (token) { return chd.request("stopRec", { member: member, id: id }); })
                                    .then(function (token) { return chd.request("calc", { member: member, id: id }); })
                                    .then(function (token) { return chd.request("collect", { member: member, data: [] }); })
                                    .then(function (token) {
                                    console.log(token.payload.event, token.route, token.payload.data);
                                    var data = token.payload.data.data;
                                    data.forEach(function (_a, i) {
                                        var id1 = _a.id;
                                        data.forEach(function (_a, j) {
                                            var id2 = _a.id;
                                            if (!Array.isArray(results[id1 + "-" + id2]))
                                                results[id1 + "-" + id2] = [];
                                            if (results[id1 + "-" + id2].length > 20)
                                                results[id1 + "-" + id2].shift();
                                            var tmp = Math.abs(Math.abs(data[i].stdscoreResult[id2]) - Math.abs(data[j].stdscoreResult[id1]));
                                            if (isFinite(tmp))
                                                results[id1 + "-" + id2].push(tmp);
                                            console.log("__RES__", id1 + "-" + id2, duxca.lib.Statictics.median(results[id1 + "-" + id2]) * 170);
                                        });
                                    });
                                    setTimeout(function () { return recur(); }, 1000);
                                });
                            })
                                .catch(function (err) { return console.error(err); });
                        }, 1000);
                    }
                    console.log("ready.");
                });
                function setupChord() {
                    var chd = new duxca.lib.Chord();
                    var osc = new duxca.lib.OSC(actx);
                    var abufA = osc.createAudioBufferFromArrayBuffer(pulseA, 44100);
                    chd.debug = false;
                    chd.on("ping", function (token, cb) {
                        console.log(token.payload.event);
                        cb(token);
                    });
                    chd.on("startRec", function (token, cb) {
                        if (token.payload.data.member.indexOf(chd.peer.id) < 0)
                            return cb(token);
                        console.log(token.payload.event);
                        isRecording = true;
                        cb(token);
                    });
                    chd.on("pulseStart", function (token, cb) {
                        if (token.payload.data.member.indexOf(chd.peer.id) < 0)
                            return cb(token);
                        console.log(token.payload.event, token.payload.data);
                        pulseReady[token.payload.data.id] = actx.currentTime;
                        cb(token);
                    });
                    chd.on("pulseBeep", function (token, cb) {
                        if (token.payload.data.member.indexOf(chd.peer.id) < 0)
                            return cb(token);
                        console.log(token.payload.event, token.payload.data);
                        if (token.payload.data.id !== chd.peer.id)
                            return cb(token);
                        var anodeA = osc.createAudioNodeFromAudioBuffer(abufA);
                        anodeA.connect(TEST_INPUT_MYSELF ? processor : actx.destination);
                        anodeA.start(actx.currentTime + 0.05);
                        setTimeout(function () { return cb(token); }, 300);
                    });
                    chd.on("pulseStop", function (token, cb) {
                        console.log(token.payload.data.member, token.payload.data.member.indexOf(chd.peer.id));
                        if (token.payload.data.member.indexOf(chd.peer.id) < 0)
                            return cb(token);
                        console.log(token.payload.event, token.payload.data);
                        pulseFinish[token.payload.data.id] = actx.currentTime;
                        cb(token);
                    });
                    chd.on("stopRec", function (token, cb) {
                        console.log(token.payload.data.member, token.payload.data.member.indexOf(chd.peer.id));
                        if (token.payload.data.member.indexOf(chd.peer.id) < 0)
                            return cb(token);
                        console.log(token.payload.event);
                        isRecording = false;
                        cb(token);
                    });
                    chd.on("calc", function (token, cb) {
                        console.log(token.payload.data.member, token.payload.data.member.indexOf(chd.peer.id));
                        if (token.payload.data.member.indexOf(chd.peer.id) < 0)
                            return cb(token);
                        console.log(token.payload.event);
                        stdscoreResult = null;
                        cb(token);
                        setTimeout(function () { return stdscoreResult = calc(chd.peer.id); }, 100);
                    });
                    chd.on("collect", function (token, cb) {
                        if (token.payload.data.member.indexOf(chd.peer.id) < 0)
                            return cb(token);
                        console.log(token.payload.event, token.payload.data);
                        (function recur() {
                            if (stdscoreResult !== null) {
                                token.payload.data.data.push({ id: chd.peer.id, stdscoreResult: stdscoreResult });
                                cb(token);
                            }
                            else
                                setTimeout(recur, 0);
                        })();
                    });
                    return (typeof id === "string") ? chd.join(id) : chd.create();
                }
                function setupRecording() {
                    return new Promise(function (resolbe, reject) { return navigator.getUserMedia({ video: false, audio: true }, resolbe, reject); })
                        .then(function (stream) {
                        var source = actx.createMediaStreamSource(stream);
                        !TEST_INPUT_MYSELF && source.connect(processor);
                        processor.connect(actx.destination);
                        processor.addEventListener("audioprocess", function handler(ev) {
                            if (isRecording) {
                                recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                            }
                        });
                    });
                }
                function createPulse(code, length) {
                    var chirp = duxca.lib.Signal.createCodedChirp(code, length);
                    for (var pow = 0; chirp.length > Math.pow(2, pow); pow++)
                        ; // ajasting power of two for FFT
                    var pulse = new Float32Array(Math.pow(2, pow));
                    pulse.set(chirp, 0);
                    return pulse;
                }
                function calcCorr(pulse, rawdata) {
                    var windowsize = pulse.length;
                    var resized_pulse = new Float32Array(windowsize * 2); // for overwrap adding way correlation
                    resized_pulse.set(pulse, 0);
                    var buffer = new Float32Array(windowsize * 2); // for overwrap adding way correlation
                    var correlation = new Float32Array(rawdata.length);
                    for (var i = 0; rawdata.length - (i + windowsize) >= resized_pulse.length; i += windowsize) {
                        buffer.set(rawdata.subarray(i, i + windowsize), 0);
                        var corr = duxca.lib.Signal.correlation(buffer, resized_pulse);
                        for (var j = 0; j < corr.length; j++) {
                            correlation[i + j] = corr[j];
                        }
                    }
                    return correlation;
                }
                function calcStdscore(correlation) {
                    var _correlation = duxca.lib.Signal.normalize(correlation, 100);
                    var ave = duxca.lib.Statictics.average(_correlation);
                    var vari = duxca.lib.Statictics.variance(_correlation);
                    var stdscores = new Float32Array(_correlation.length);
                    for (var i = 0; i < _correlation.length; i++) {
                        stdscores[i] = 10 * (_correlation[i] - ave) / vari + 50;
                    }
                    return stdscores;
                }
                function calc(myId) {
                    console.log(recbuf);
                    var rawdata = recbuf.merge();
                    var sampleTimes = recbuf.sampleTimes;
                    recbuf.clear();
                    console.group("calc correlation");
                    console.time("calc correlation");
                    var correlationA = calcCorr(pulseA, rawdata);
                    console.timeEnd("calc correlation");
                    console.groupEnd();
                    console.group("calc stdscore");
                    console.time("calc stdscore");
                    var stdscoresA = calcStdscore(correlationA);
                    console.timeEnd("calc stdscore");
                    console.groupEnd();
                    console.group("calc cycle");
                    console.time("calc cycle");
                    var recStartTime = sampleTimes[0] - recbuf.bufferSize / recbuf.sampleRate;
                    var recStopTime = sampleTimes[sampleTimes.length - 1];
                    var results = {};
                    var render = new duxca.lib.CanvasRender(1024, 32);
                    Object.keys(pulseReady).forEach(function (id) {
                        var startTime = pulseReady[id];
                        var stopTime = pulseFinish[id];
                        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
                        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
                        var sectionA = correlationA.subarray(startPtr, stopPtr);
                        console.log(id, "recStartTime", recStartTime, "recStopTime", recStopTime, "startTime", startTime, "stopTime", stopTime, "startPtr", startPtr, "stopPtr", stopPtr, "length", sectionA.length);
                        var stdsectionA = calcStdscore(sectionA);
                        var _a = duxca.lib.Statictics.findMax(stdsectionA), max_score = _a[0], max_offset = _a[1];
                        for (var i = 0; i < 1024; i++) {
                            if (stdsectionA[max_offset - 2048 / 2 + i] > 70) {
                                var offset = max_offset - 2048 / 2 + i;
                                break;
                            }
                        }
                        console.log(id, "offset", offset, "max_offset", max_offset, "max_score", stdsectionA[offset], "globalOffset", startPtr + offset);
                        results[id] = startPtr + offset;
                        render.clear();
                        render.ctx.strokeStyle = "black";
                        render.drawSignal(sectionA, true, true);
                        render.ctx.strokeStyle = "red";
                        render.drawColLine(offset * 1024 / sectionA.length);
                        console.log(id, "section");
                        console.screenshot(render.cnv);
                    });
                    var render1 = new duxca.lib.CanvasRender(1024, 32);
                    var render2 = new duxca.lib.CanvasRender(1024, 32);
                    var render3 = new duxca.lib.CanvasRender(1024, 32);
                    render1.drawSignal(stdscoresA, true, true);
                    render2.drawSignal(rawdata, true, true);
                    var tmp = new Float32Array(rawdata.length);
                    Object.keys(results).forEach(function (id) { tmp.set(pulseA, results[id]); });
                    render3.drawSignal(tmp, true, true);
                    Object.keys(results).forEach(function (id) {
                        var startTime = pulseReady[id];
                        var stopTime = pulseFinish[id];
                        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
                        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
                        render1.ctx.strokeStyle = "blue";
                        render2.ctx.strokeStyle = "blue";
                        render3.ctx.strokeStyle = "blue";
                        render1.drawColLine(startPtr * 1024 / stdscoresA.length);
                        render1.drawColLine(stopPtr * 1024 / stdscoresA.length);
                        render2.drawColLine(startPtr * 1024 / stdscoresA.length);
                        render2.drawColLine(stopPtr * 1024 / stdscoresA.length);
                        render3.drawColLine(startPtr * 1024 / stdscoresA.length);
                        render3.drawColLine(stopPtr * 1024 / stdscoresA.length);
                        render1.ctx.strokeStyle = "red";
                        render2.ctx.strokeStyle = "red";
                        render3.ctx.strokeStyle = "red";
                        render1.drawColLine(results[id] * 1024 / stdscoresA.length);
                        render2.drawColLine(results[id] * 1024 / stdscoresA.length);
                        render3.drawColLine(results[id] * 1024 / stdscoresA.length);
                    });
                    console.log("stdscores");
                    console.screenshot(render1.cnv);
                    console.log("rawdata");
                    console.screenshot(render2.cnv);
                    console.log("sim");
                    console.screenshot(render3.cnv);
                    console.log("results", results);
                    var _results = {};
                    Object.keys(results).forEach(function (id) {
                        _results[id] = (results[id] - results[myId]) / recbuf.sampleRate;
                    });
                    console.log("results", _results);
                    console.timeEnd("calc cycle");
                    console.groupEnd();
                    console.group("show spectrogram");
                    console.time("show spectrogram");
                    var render = new duxca.lib.CanvasRender(128, 128);
                    var windowsize = Math.pow(2, 8); // spectrgram height
                    var slidewidth = Math.pow(2, 5); // spectrgram width rate
                    var sampleRate = recbuf.sampleRate;
                    console.log("sampleRate:", sampleRate, "\n", "windowsize:", windowsize, "\n", "slidewidth:", slidewidth, "\n", "windowsize(ms):", windowsize / sampleRate * 1000, "\n", "slidewidth(ms):", slidewidth / sampleRate * 1000, "\n");
                    var spectrums = [];
                    for (var ptr = 0; ptr + windowsize < rawdata.length; ptr += slidewidth) {
                        var buffer = rawdata.subarray(ptr, ptr + windowsize);
                        if (buffer.length !== windowsize)
                            break;
                        var spectrum = duxca.lib.Signal.fft(buffer, sampleRate)[2];
                        for (var i = 0; i < spectrum.length; i++) {
                            spectrum[i] = spectrum[i] * 20000;
                        }
                        spectrums.push(spectrum);
                    }
                    console.log("ptr", 0 + "-" + (ptr - 1) + "/" + rawdata.length, "ms", 0 / sampleRate * 1000 + "-" + (ptr - 1) / sampleRate * 1000 + "/" + rawdata.length * 1000 / sampleRate, spectrums.length + "x" + spectrums[0].length);
                    render.cnv.width = spectrums.length;
                    render.cnv.height = spectrums[0].length;
                    render.drawSpectrogram(spectrums);
                    console.screenshot(render.cnv);
                    console.timeEnd("show spectrogram");
                    console.groupEnd();
                    return _results;
                }
            }
            Sandbox.testAutoDetect3 = testAutoDetect3;
            function testAutoDetect2(id) {
                var PULSE_INTERVAL_SEC = 0.5;
                var PULSE_REFRAIN = 1;
                var CUTOFF_STANDARDSCORE = 100;
                var TEST_INPUT_MYSELF = false;
                var actx = new AudioContext();
                var codeA = duxca.lib.Signal.createBarkerCode(1);
                var pulseA = createPulse(codeA, 12);
                console.log(actx.sampleRate, pulseA.length, pulseA.length / actx.sampleRate);
                var render = new duxca.lib.CanvasRender(128, 128);
                render.cnv.width = pulseA.length;
                render.drawSignal(pulseA, true, true);
                console.screenshot(render.element);
                var processor = actx.createScriptProcessor(Math.pow(2, 14), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
                var recbuf = new lib.RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
                var isRecording = false;
                var stdscoreResult = null;
                var pulseReady = {};
                var pulseFinish = {};
                Promise.resolve()
                    .then(setupRecording)
                    .then(setupChord)
                    .then(function (chd) {
                    console.log(chd.peer.id);
                    if (typeof id !== "string") {
                        // master node
                        setTimeout(function recur() {
                            chd.request("ping")
                                .then(function (token) {
                                console.log(token.payload.event, token.route);
                                return chd.request("startRec", { member: token.route });
                            })
                                .then(function (token) {
                                console.log(token.payload.event, token.route);
                                return token.route.reduce(function (prm, id) {
                                    return prm
                                        .then(function (token) { return chd.request("pulseStart", { member: token.route, id: id }); })
                                        .then(function (token) { return chd.request("pulseBeep", { member: token.route, id: id }); })
                                        .then(function (token) { return chd.request("pulseStop", { member: token.route, id: id }); });
                                }, Promise.resolve(token));
                            })
                                .then(function (token) { return chd.request("stopRec", { member: token.route, id: id }); })
                                .then(function (token) { return chd.request("calc", { member: token.route, id: id }); })
                                .then(function (token) { return chd.request("collect", { member: token.route, data: [] }); })
                                .then(function (token) {
                                console.log(token.payload.event, token.route, token.payload.data);
                                var data = token.payload.data.data;
                                data.forEach(function (_a, i) {
                                    var id1 = _a.id;
                                    data.forEach(function (_a, j) {
                                        var id2 = _a.id;
                                        console.log(id1, id2, Math.abs(Math.abs(data[i].stdscoreResult[id2]) - Math.abs(data[j].stdscoreResult[id1])));
                                    });
                                });
                                setTimeout(function () { return recur(); }, 1000);
                            })
                                .catch(function (err) { return console.error(err); });
                        }, 1000);
                    }
                    console.log("ready.");
                });
                function setupChord() {
                    var chd = new duxca.lib.Chord();
                    var osc = new duxca.lib.OSC(actx);
                    var abufA = osc.createAudioBufferFromArrayBuffer(pulseA, actx.sampleRate);
                    chd.debug = false;
                    chd.on("ping", function (token, cb) {
                        console.log(token.payload.event);
                        cb(token);
                    });
                    chd.on("startRec", function (token, cb) {
                        if (token.payload.data.member.indexOf(chd.peer.id) < 0)
                            return cb(token);
                        console.log(token.payload.event);
                        isRecording = true;
                        cb(token);
                    });
                    chd.on("pulseStart", function (token, cb) {
                        if (token.payload.data.member.indexOf(chd.peer.id) < 0)
                            return cb(token);
                        console.log(token.payload.event, token.payload.data);
                        pulseReady[token.payload.data.id] = actx.currentTime;
                        setTimeout(function () { return cb(token); }, 0);
                    });
                    chd.on("pulseBeep", function (token, cb) {
                        if (token.payload.data.member.indexOf(chd.peer.id) < 0)
                            return cb(token);
                        console.log(token.payload.event, token.payload.data);
                        if (token.payload.data.id !== chd.peer.id)
                            return cb(token);
                        var offsetTime = actx.currentTime + 0.1;
                        for (var i = 0; i < PULSE_REFRAIN; i++) {
                            var anode = osc.createAudioNodeFromAudioBuffer(abufA);
                            anode.connect(TEST_INPUT_MYSELF ? processor : actx.destination);
                            anode.start(offsetTime + PULSE_INTERVAL_SEC * i);
                        }
                        setTimeout(function () { return cb(token); }, PULSE_REFRAIN * PULSE_INTERVAL_SEC * 1000 + 100);
                    });
                    chd.on("pulseStop", function (token, cb) {
                        if (token.payload.data.member.indexOf(chd.peer.id) < 0)
                            return cb(token);
                        console.log(token.payload.event, token.payload.data);
                        pulseFinish[token.payload.data.id] = actx.currentTime;
                        setTimeout(function () { return cb(token); }, 0);
                    });
                    chd.on("stopRec", function (token, cb) {
                        if (token.payload.data.member.indexOf(chd.peer.id) < 0)
                            return cb(token);
                        console.log(token.payload.event);
                        isRecording = false;
                        cb(token);
                    });
                    chd.on("calc", function (token, cb) {
                        if (token.payload.data.member.indexOf(chd.peer.id) < 0)
                            return cb(token);
                        console.log(token.payload.event);
                        cb(token);
                        stdscoreResult = null;
                        setTimeout(function () { return stdscoreResult = calc(chd.peer.id); }, 100);
                    });
                    chd.on("collect", function (token, cb) {
                        if (token.payload.data.member.indexOf(chd.peer.id) < 0)
                            return cb(token);
                        console.log(token.payload.event, token.payload.data);
                        (function recur() {
                            if (stdscoreResult !== null) {
                                token.payload.data.data.push({ id: chd.peer.id, stdscoreResult: stdscoreResult });
                                cb(token);
                            }
                            else
                                setTimeout(recur, 500);
                        })();
                    });
                    return (typeof id === "string") ? chd.join(id) : chd.create();
                }
                function setupRecording() {
                    return new Promise(function (resolbe, reject) { return navigator.getUserMedia({ video: false, audio: true }, resolbe, reject); })
                        .then(function (stream) {
                        var source = actx.createMediaStreamSource(stream);
                        !TEST_INPUT_MYSELF && source.connect(processor);
                        processor.connect(actx.destination);
                        processor.addEventListener("audioprocess", function handler(ev) {
                            if (isRecording) {
                                recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                            }
                        });
                    });
                }
                function createPulse(code, length) {
                    var chirp = duxca.lib.Signal.createCodedChirp(code, length);
                    for (var pow = 0; chirp.length > Math.pow(2, pow); pow++)
                        ; // ajasting power of two for FFT
                    var pulse = new Float32Array(Math.pow(2, pow));
                    pulse.set(chirp, 0);
                    return pulse;
                }
                function calcCorr(pulse, rawdata) {
                    var windowsize = pulse.length;
                    var resized_pulse = new Float32Array(windowsize * 2); // for overwrap adding way correlation
                    resized_pulse.set(pulse, 0);
                    var buffer = new Float32Array(windowsize * 2); // for overwrap adding way correlation
                    var correlation = new Float32Array(rawdata.length);
                    for (var i = 0; rawdata.length - (i + windowsize) >= resized_pulse.length; i += windowsize) {
                        buffer.set(rawdata.subarray(i, i + windowsize), 0);
                        var corr = duxca.lib.Signal.correlation(buffer, resized_pulse);
                        for (var j = 0; j < corr.length; j++) {
                            correlation[i + j] = corr[j];
                        }
                    }
                    return correlation;
                }
                function calcStdscore(correlation) {
                    var _correlation = duxca.lib.Signal.normalize(correlation, 100);
                    var ave = duxca.lib.Statictics.average(_correlation);
                    var vari = duxca.lib.Statictics.variance(_correlation);
                    console.log("ave:", ave, "\n", "med:", duxca.lib.Statictics.median(_correlation), "\n", "var:", vari, "\n");
                    var stdscores = new Float32Array(_correlation.length);
                    for (var i = 0; i < _correlation.length; i++) {
                        stdscores[i] = 10 * (_correlation[i] - ave) / vari + 50;
                    }
                    return stdscores;
                }
                function calc(myId) {
                    var rawdata = recbuf.merge();
                    var sampleTimes = recbuf.sampleTimes;
                    recbuf.clear();
                    console.group("calc correlation");
                    console.time("calc correlation");
                    var correlationA = calcCorr(pulseA, rawdata);
                    var correlation = new Float32Array(correlationA.length);
                    for (var i = 0; i < correlation.length; i++) {
                        correlation[i] = correlationA[i];
                    }
                    console.timeEnd("calc correlation");
                    console.groupEnd();
                    console.group("calc stdscore");
                    console.time("calc stdscore");
                    var stdscores = calcStdscore(correlation);
                    console.timeEnd("calc stdscore");
                    console.groupEnd();
                    console.group("calc cycle");
                    console.time("calc cycle");
                    var results = {};
                    Object.keys(pulseReady).forEach(function (id) {
                        console.log(id);
                        console.log(recbuf.bufferSize / recbuf.sampleRate);
                        var recStartTime = sampleTimes[0] - recbuf.bufferSize / recbuf.sampleRate;
                        var recStopTime = sampleTimes[sampleTimes.length - 1];
                        var startTime = pulseReady[id];
                        var stopTime = pulseFinish[id];
                        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
                        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
                        console.log("startPtr", startPtr, "stopPtr", stopPtr);
                        var section = stdscores.subarray(startPtr, stopPtr);
                        var _section = duxca.lib.Signal.normalize(section, 128); // _** for draw
                        var splitsize = PULSE_INTERVAL_SEC * recbuf.sampleRate;
                        console.log("splitsize", splitsize);
                        var sumarr = new Float32Array(splitsize);
                        var offsets = [];
                        var render = new duxca.lib.CanvasRender(128, 128);
                        for (var i = 0; i < _section.length; i += splitsize) {
                            var part = section.subarray(i, i + splitsize);
                            var _part = _section.subarray(i, i + splitsize);
                            var _a = duxca.lib.Statictics.findMax(part), max_score = _a[0], offset = _a[1];
                            if (max_score > CUTOFF_STANDARDSCORE) {
                                offsets.push(offset);
                            }
                            console.log("part", "total_offset", i + offset, "local_offset", offset, "stdscore", max_score);
                            render.cnv.width = 1024; //_part.length;
                            render.ctx.strokeStyle = "black";
                            render.drawSignal(_part, true, false);
                            render.ctx.strokeStyle = max_score > CUTOFF_STANDARDSCORE ? "red" : "blue";
                            render.drawColLine(offset * 1024 / sumarr.length);
                            console.screenshot(render.cnv);
                            if (sumarr.length === part.length) {
                                for (var j = 0; j < part.length; j++) {
                                    sumarr[j] += part[j];
                                }
                            }
                        }
                        console.log("phaseshifts", offsets);
                        var ave = duxca.lib.Statictics.average(offsets);
                        var med = duxca.lib.Statictics.median(offsets);
                        var mode = duxca.lib.Statictics.mode(offsets);
                        var _b = duxca.lib.Statictics.findMax(sumarr), max_score = _b[0], offset = _b[1];
                        console.log("min", duxca.lib.Statictics.findMin(offsets)[0], "\n", "max", duxca.lib.Statictics.findMax(offsets)[0], "\n", "ave", ave, "red", "\n", "med", med, "green", "\n", "mode", mode, "blue", "\n", "sum", offset, "yellow", "\n", "stdev", duxca.lib.Statictics.stdev(offsets));
                        console.log("sum", "stdscore", max_score, "global_offset", startPtr + offset);
                        // global_offset this is bad. because startPtr is time of pulseStart event.
                        // i need pulseBeep event time. so this program does not work.
                        results[id] = startPtr + offset;
                        render.cnv.width = 1024; //sumarr.length;
                        render.ctx.strokeStyle = "gray";
                        render.drawSignal(sumarr, true, true);
                        render.ctx.strokeStyle = "red";
                        render.drawColLine(ave * 1024 / sumarr.length);
                        render.ctx.strokeStyle = "green";
                        render.drawColLine(med * 1024 / sumarr.length);
                        render.ctx.strokeStyle = "blue";
                        render.drawColLine(mode * 1024 / sumarr.length);
                        render.ctx.strokeStyle = "yellow";
                        render.drawColLine(offset * 1024 / sumarr.length);
                        console.screenshot(render.cnv);
                        console.timeEnd("calc cycle");
                        console.groupEnd();
                    });
                    console.group("show spectrogram");
                    console.time("show spectrogram");
                    var render = new duxca.lib.CanvasRender(128, 128);
                    var windowsize = Math.pow(2, 8); // spectrgram height
                    var slidewidth = Math.pow(2, 5); // spectrgram width rate
                    var sampleRate = recbuf.sampleRate;
                    console.log("sampleRate:", sampleRate, "\n", "windowsize:", windowsize, "\n", "slidewidth:", slidewidth, "\n", "windowsize(ms):", windowsize / sampleRate * 1000, "\n", "slidewidth(ms):", slidewidth / sampleRate * 1000, "\n");
                    var spectrums = [];
                    var ptr = 0;
                    var lstptr = 0;
                    recur();
                    function recur() {
                        if (ptr + windowsize > rawdata.length) {
                            console.timeEnd("show spectrogram");
                            console.groupEnd();
                            return;
                        }
                        for (var j = 0; j < PULSE_INTERVAL_SEC * sampleRate / slidewidth; j++) {
                            var buffer = rawdata.subarray(ptr, ptr + windowsize);
                            if (buffer.length !== windowsize)
                                break;
                            var spectrum = duxca.lib.Signal.fft(buffer, sampleRate)[2];
                            for (var i = 0; i < spectrum.length; i++) {
                                spectrum[i] = spectrum[i] * 20000;
                            }
                            spectrums.push(spectrum);
                            ptr += slidewidth;
                        }
                        draw();
                        setTimeout(recur);
                    }
                    function draw() {
                        console.log("ptr", lstptr + "-" + (ptr - 1) + "/" + rawdata.length, "ms", lstptr / sampleRate * 1000 + "-" + (ptr - 1) / sampleRate * 1000 + "/" + rawdata.length * 1000 / sampleRate, spectrums.length + "x" + spectrums[0].length);
                        render.cnv.width = spectrums.length;
                        render.cnv.height = spectrums[0].length;
                        render.drawSpectrogram(spectrums);
                        console.screenshot(render.cnv);
                        spectrums = [];
                        lstptr = ptr;
                    }
                    var _results = results;
                    Object.keys(results).forEach(function (id) {
                        _results[id] = results[myId] - results[id];
                    });
                    return _results;
                }
            }
            Sandbox.testAutoDetect2 = testAutoDetect2;
        })(Sandbox = lib.Sandbox || (lib.Sandbox = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
/// <reference path="../../typings/webrtc/MediaStream.d.ts"/>
/// <reference path="../../typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../tsd/console.snapshot/console.snapshot.d.ts"/>
/// <reference path="../../tsd/MediaStreamAudioSourceNode/MediaStreamAudioSourceNode.d.ts"/>
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Sandbox;
        (function (Sandbox) {
            navigator.getUserMedia = (navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia);
            function inpulseResponce() {
                var actx = new AudioContext();
                var osc = new lib.OSC(actx);
                osc.inpulseResponce();
            }
            Sandbox.inpulseResponce = inpulseResponce;
            function _something() {
                var TEST_INPUT_MYSELF = false;
                var up = lib.Signal.createChirpSignal(Math.pow(2, 17), false);
                var down = lib.Signal.createChirpSignal(Math.pow(2, 17), true);
                up = up.subarray(up.length * 1 / 4 | 0, up.length * 3 / 4 | 0);
                down = up.subarray(up.length * 1 / 4 | 0, up.length * 3 / 4 | 0);
                var render = new duxca.lib.CanvasRender(128, 128);
                var actx = new AudioContext();
                var osc = new lib.OSC(actx);
                Promise.all([
                    osc.resampling(up, 12),
                    osc.resampling(down, 12),
                ]).then(function (_a) {
                    var up = _a[0], down = _a[1];
                    console.log("up", up.length, up.length / 44100);
                    return new Promise(function (resolbe, reject) { return navigator.getUserMedia({ video: false, audio: true }, resolbe, reject); })
                        .then(function (stream) { return { up: up, down: down, stream: stream }; });
                }).then(function (_a) {
                    var up = _a.up, down = _a.down, stream = _a.stream;
                    var source = actx.createMediaStreamSource(stream);
                    var processor = actx.createScriptProcessor(Math.pow(2, 14), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
                    var abuf = osc.createAudioBufferFromArrayBuffer(up, actx.sampleRate); // fix rate
                    var anode = osc.createAudioNodeFromAudioBuffer(abuf);
                    var anode1 = osc.createAudioNodeFromAudioBuffer(abuf);
                    var anode2 = osc.createAudioNodeFromAudioBuffer(abuf);
                    var anode3 = osc.createAudioNodeFromAudioBuffer(abuf);
                    anode.start(actx.currentTime + 0);
                    anode1.start(actx.currentTime + 1);
                    anode2.start(actx.currentTime + 2);
                    anode3.start(actx.currentTime + 3);
                    anode.connect(TEST_INPUT_MYSELF ? processor : actx.destination);
                    anode1.connect(TEST_INPUT_MYSELF ? processor : actx.destination);
                    anode2.connect(TEST_INPUT_MYSELF ? processor : actx.destination);
                    anode3.connect(TEST_INPUT_MYSELF ? processor : actx.destination);
                    !TEST_INPUT_MYSELF && source.connect(processor);
                    processor.connect(actx.destination);
                    var recbuf = new lib.RecordBuffer(actx.sampleRate, processor.bufferSize, 1);
                    processor.addEventListener("audioprocess", function handler(ev) {
                        recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                        console.log(recbuf.count);
                        if (recbuf.count * recbuf.bufferSize > up.length * 10) {
                            processor.removeEventListener("audioprocess", handler);
                            processor.disconnect();
                            next();
                        }
                    });
                    function next() {
                        var rawdata = recbuf.merge();
                        for (var pow = 0; rawdata.length + up.length > Math.pow(2, pow); pow++)
                            ; // ajasting power of two for FFT
                        var tmp = new Float32Array(Math.pow(2, pow));
                        var tmp2 = new Float32Array(Math.pow(2, pow));
                        tmp.set(down, 0);
                        tmp2.set(rawdata, 0);
                        console.log(rawdata.length, up.length, down.length, tmp2.length);
                        var corr = lib.Signal.overwarpCorr(up, rawdata);
                        var render = new duxca.lib.CanvasRender(128, 128);
                        console.log("raw", rawdata.length);
                        render.cnv.width = rawdata.length / 256;
                        render.drawSignal(rawdata, true, true);
                        console.screenshot(render.element);
                        console.log("corr", corr.length);
                        render.cnv.width = corr.length / 256;
                        render.drawSignal(corr, true, true);
                        console.screenshot(render.element);
                        console.log("up", up.length);
                        render.cnv.width = up.length / 256;
                        render.drawSignal(up, true, true);
                        console.screenshot(render.element);
                        console.group("show spectrogram");
                        console.time("show spectrogram");
                        var render = new duxca.lib.CanvasRender(128, 128);
                        var windowsize = Math.pow(2, 8); // spectrgram height
                        var slidewidth = Math.pow(2, 5); // spectrgram width rate
                        var sampleRate = recbuf.sampleRate;
                        console.log("sampleRate:", sampleRate, "\n", "windowsize:", windowsize, "\n", "slidewidth:", slidewidth, "\n", "windowsize(ms):", windowsize / sampleRate * 1000, "\n", "slidewidth(ms):", slidewidth / sampleRate * 1000, "\n");
                        var spectrums = [];
                        for (var ptr = 0; ptr + windowsize < rawdata.length; ptr += slidewidth) {
                            var buffer = rawdata.subarray(ptr, ptr + windowsize);
                            if (buffer.length !== windowsize)
                                break;
                            var spectrum = duxca.lib.Signal.fft(buffer, sampleRate)[2];
                            for (var i = 0; i < spectrum.length; i++) {
                                spectrum[i] = spectrum[i] * 20000;
                            }
                            spectrums.push(spectrum);
                        }
                        console.log("ptr", 0 + "-" + (ptr - 1) + "/" + rawdata.length, "ms", 0 / sampleRate * 1000 + "-" + (ptr - 1) / sampleRate * 1000 + "/" + rawdata.length * 1000 / sampleRate, spectrums.length + "x" + spectrums[0].length);
                        render.cnv.width = spectrums.length;
                        render.cnv.height = spectrums[0].length;
                        render.drawSpectrogram(spectrums);
                        console.screenshot(render.cnv);
                        console.timeEnd("show spectrogram");
                        console.groupEnd();
                    }
                });
            }
            Sandbox._something = _something;
            function testDetect4(rootNodeId) {
                var TEST_INPUT_MYSELF = false;
                var actx = new AudioContext;
                var osc = new lib.OSC(actx);
                var isRecording = false;
                var processor = actx.createScriptProcessor(Math.pow(2, 12), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
                var recbuf = new lib.RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
                osc.createBarkerCodedChirp(13, 6).then(function (pulse) {
                    var render = new duxca.lib.CanvasRender(128, 128);
                    render.cnv.width = pulse.length;
                    render.drawSignal(pulse, true, true);
                    console.log("length", pulse.length, "sec", pulse.length / actx.sampleRate);
                    console.screenshot(render.element);
                    return pulse;
                }).then(function (pulse) {
                    var chord = new duxca.lib.Chord();
                    chord.debug = false;
                    chord.on("ping", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        cb(token);
                    });
                    chord.on("startRec", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        isRecording = true;
                        cb(token);
                    });
                    var pulseStartTime = {};
                    chord.on("pulseStart", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var id = token.payload.data;
                        pulseStartTime[token.payload.data] = actx.currentTime;
                        cb(token);
                    });
                    var abuf = osc.createAudioBufferFromArrayBuffer(pulse, actx.sampleRate);
                    chord.on("pulseBeep", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var id = token.payload.data;
                        if (chord.peer.id !== id)
                            return cb(token);
                        var anode = osc.createAudioNodeFromAudioBuffer(abuf);
                        anode.connect(TEST_INPUT_MYSELF ? processor : actx.destination);
                        anode.start(actx.currentTime);
                        setTimeout(function () { return cb(token); }, pulse.length / actx.sampleRate * 1000 + 80);
                    });
                    var pulseStopTime = {};
                    chord.on("pulseStop", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var id = token.payload.data;
                        pulseStopTime[token.payload.data] = actx.currentTime;
                        cb(token);
                    });
                    var calcResult = null;
                    chord.on("stopRec", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var tmp = recbuf.count;
                        (function recur() {
                            if (recbuf.count === tmp)
                                return setTimeout(recur, 100);
                            isRecording = false;
                            calcResult = null;
                            setTimeout(function () {
                                calcResult = calc(chord.peer.id, pulse, pulseStartTime, pulseStopTime);
                            }, 0);
                            cb(token);
                        })();
                    });
                    chord.on("collect", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        (function recur() {
                            if (calcResult === null)
                                return setTimeout(recur, 100);
                            token.payload.data[chord.peer.id] = calcResult;
                            cb(token);
                        })();
                    });
                    var results = {};
                    var RESULT_HISTORY_SIZE = 20;
                    chord.on("distribute", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var data = token.payload.data;
                        Object.keys(data).forEach(function (id1) {
                            Object.keys(data).forEach(function (id2) {
                                if (!Array.isArray(results[id1 + "-" + id2]))
                                    results[id1 + "-" + id2] = [];
                                if (results[id1 + "-" + id2].length > RESULT_HISTORY_SIZE)
                                    results[id1 + "-" + id2].shift();
                                var tmp = Math.abs(Math.abs(data[id1][id2]) - Math.abs(data[id2][id1]));
                                if (isFinite(tmp))
                                    results[id1 + "-" + id2].push(tmp);
                                console.log("__RES__", id1 + "-" + id2, "phaseShift", tmp, "med", duxca.lib.Statictics.mode(results[id1 + "-" + id2]) * 170);
                            });
                        });
                        cb(token);
                    });
                    return (typeof rootNodeId === "string") ? chord.join(rootNodeId) : chord.create();
                }).then(function (chord) {
                    console.log(chord.peer.id);
                    return new Promise(function (resolbe, reject) { return navigator.getUserMedia({ video: false, audio: true }, resolbe, reject); })
                        .then(function (stream) {
                        var source = actx.createMediaStreamSource(stream);
                        !TEST_INPUT_MYSELF && source.connect(processor);
                        processor.connect(actx.destination);
                        processor.addEventListener("audioprocess", function handler(ev) {
                            if (isRecording) {
                                recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                            }
                        });
                    }).then(function () { return chord; });
                }).then(typeof rootNodeId === "string" ? function (chord) { return void 0; } : function recur(chord) {
                    chord.request("ping")
                        .then(function (token) { return chord.request("startRec", null, token.route); })
                        .then(function (token) {
                        return token.payload.addressee.reduce(function (prm, id) {
                            return prm
                                .then(function (token) { return chord.request("pulseStart", id, token.payload.addressee); })
                                .then(function (token) { return chord.request("pulseBeep", id, token.payload.addressee); })
                                .then(function (token) { return chord.request("pulseStop", id, token.payload.addressee); });
                        }, Promise.resolve(token));
                    })
                        .then(function (token) { return chord.request("stopRec", null, token.payload.addressee); })
                        .then(function (token) { return chord.request("collect", {}, token.payload.addressee); })
                        .then(function (token) { return chord.request("distribute", token.payload.data, token.payload.addressee); })
                        .then(function (token) {
                        setTimeout(recur.bind(null, chord), 0);
                    });
                    return chord;
                });
                function calcStdscore(correlation) {
                    var _correlation = duxca.lib.Signal.normalize(correlation, 100);
                    var ave = duxca.lib.Statictics.average(_correlation);
                    var vari = duxca.lib.Statictics.variance(_correlation);
                    var stdscores = new Float32Array(_correlation.length);
                    for (var i = 0; i < _correlation.length; i++) {
                        stdscores[i] = 10 * (_correlation[i] - ave) / vari + 50;
                    }
                    return stdscores;
                }
                function calc(myId, pulse, pulseStartTime, pulseStopTime) {
                    var rawdata = recbuf.merge();
                    var sampleTimes = recbuf.sampleTimes;
                    recbuf.clear();
                    console.group("calc correlation");
                    console.time("calc correlation");
                    var correlation = duxca.lib.Signal.overwarpCorr(pulse, rawdata);
                    console.timeEnd("calc correlation");
                    console.groupEnd();
                    console.group("calc stdscore");
                    console.time("calc stdscore");
                    var stdscores = calcStdscore(correlation);
                    console.timeEnd("calc stdscore");
                    console.groupEnd();
                    console.group("calc cycle");
                    console.time("calc cycle");
                    var recStartTime = sampleTimes[0] - recbuf.bufferSize / recbuf.sampleRate;
                    var recStopTime = sampleTimes[sampleTimes.length - 1];
                    var results = {};
                    var render = new duxca.lib.CanvasRender(1024, 32);
                    Object.keys(pulseStartTime).forEach(function (id) {
                        var startTime = pulseStartTime[id];
                        var stopTime = pulseStopTime[id];
                        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
                        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
                        var section = stdscores.subarray(startPtr, stopPtr);
                        console.log(id, "recStartTime", recStartTime, "recStopTime", recStopTime, "startTime", startTime, "stopTime", stopTime, "startPtr", startPtr, "stopPtr", stopPtr, "length", section.length);
                        var _a = duxca.lib.Statictics.findMax(section), max_score = _a[0], max_offset = _a[1];
                        for (var i = 0; i < pulse.length; i++) {
                            if (section[max_offset - pulse.length / 2 + i] > 70) {
                                var offset = max_offset - pulse.length / 2 + i;
                                break;
                            }
                        }
                        results[id] = startPtr + (offset || max_offset);
                        results[id] = results[id] > 0 ? results[id] : 0;
                        console.log(id, "offset", offset, "max_offset", max_offset, "max_score", max_score, "globalOffset", startPtr + offset);
                        render.clear();
                        render.ctx.strokeStyle = "black";
                        render.drawSignal(section, true, true);
                        render.ctx.strokeStyle = "blue";
                        render.drawColLine(offset * 1024 / section.length);
                        render.ctx.strokeStyle = "red";
                        render.drawColLine(max_offset * 1024 / section.length);
                        console.log(id, "section");
                        console.screenshot(render.cnv);
                    });
                    var render1 = new duxca.lib.CanvasRender(1024, 32);
                    var render2 = new duxca.lib.CanvasRender(1024, 32);
                    var render3 = new duxca.lib.CanvasRender(1024, 32);
                    render1.drawSignal(stdscores, true, true);
                    render2.drawSignal(rawdata, true, true);
                    var sim = new Float32Array(rawdata.length);
                    Object.keys(results).forEach(function (id) { sim.set(pulse, results[id]); });
                    render3.drawSignal(sim, true, true);
                    Object.keys(results).forEach(function (id) {
                        var startTime = pulseStartTime[id];
                        var stopTime = pulseStopTime[id];
                        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
                        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
                        render1.ctx.strokeStyle = "blue";
                        render2.ctx.strokeStyle = "blue";
                        render3.ctx.strokeStyle = "blue";
                        render1.drawColLine(startPtr * 1024 / stdscores.length);
                        render1.drawColLine(stopPtr * 1024 / stdscores.length);
                        render2.drawColLine(startPtr * 1024 / rawdata.length);
                        render2.drawColLine(stopPtr * 1024 / rawdata.length);
                        render3.drawColLine(startPtr * 1024 / sim.length);
                        render3.drawColLine(stopPtr * 1024 / sim.length);
                        render1.ctx.strokeStyle = "red";
                        render2.ctx.strokeStyle = "red";
                        render3.ctx.strokeStyle = "red";
                        render1.drawColLine(results[id] * 1024 / stdscores.length);
                        render2.drawColLine(results[id] * 1024 / rawdata.length);
                        render3.drawColLine(results[id] * 1024 / sim.length);
                    });
                    console.log("stdscores");
                    console.screenshot(render1.cnv);
                    console.log("rawdata");
                    console.screenshot(render2.cnv);
                    console.log("sim");
                    console.screenshot(render3.cnv);
                    console.log("results", results);
                    var _results = {};
                    Object.keys(results).forEach(function (id) {
                        _results[id] = (results[id] - results[myId]) / recbuf.sampleRate;
                    });
                    console.log("results", _results);
                    console.timeEnd("calc cycle");
                    console.groupEnd();
                    console.group("show spectrogram");
                    console.time("show spectrogram");
                    var render = new duxca.lib.CanvasRender(128, 128);
                    var windowsize = Math.pow(2, 8); // spectrgram height
                    var slidewidth = Math.pow(2, 5); // spectrgram width rate
                    var sampleRate = recbuf.sampleRate;
                    console.log("sampleRate:", sampleRate, "\n", "windowsize:", windowsize, "\n", "slidewidth:", slidewidth, "\n", "windowsize(ms):", windowsize / sampleRate * 1000, "\n", "slidewidth(ms):", slidewidth / sampleRate * 1000, "\n");
                    var spectrums = [];
                    for (var ptr = 0; ptr + windowsize < rawdata.length; ptr += slidewidth) {
                        var buffer = rawdata.subarray(ptr, ptr + windowsize);
                        if (buffer.length !== windowsize)
                            break;
                        var spectrum = duxca.lib.Signal.fft(buffer, sampleRate)[2];
                        for (var i = 0; i < spectrum.length; i++) {
                            spectrum[i] = spectrum[i] * 20000;
                        }
                        spectrums.push(spectrum);
                    }
                    console.log("ptr", 0 + "-" + (ptr - 1) + "/" + rawdata.length, "ms", 0 / sampleRate * 1000 + "-" + (ptr - 1) / sampleRate * 1000 + "/" + rawdata.length * 1000 / sampleRate, spectrums.length + "x" + spectrums[0].length);
                    render.cnv.width = spectrums.length;
                    render.cnv.height = spectrums[0].length;
                    render.drawSpectrogram(spectrums);
                    console.screenshot(render.cnv);
                    console.timeEnd("show spectrogram");
                    console.groupEnd();
                    return _results;
                }
            }
            Sandbox.testDetect4 = testDetect4;
        })(Sandbox = lib.Sandbox || (lib.Sandbox = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
/// <reference path="../../typings/webrtc/MediaStream.d.ts"/>
/// <reference path="../../typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../tsd/console.snapshot/console.snapshot.d.ts"/>
/// <reference path="../../tsd/MediaStreamAudioSourceNode/MediaStreamAudioSourceNode.d.ts"/>
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Sandbox;
        (function (Sandbox) {
            navigator.getUserMedia = (navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia);
            function gnuplot() {
                var up = lib.Signal.createChirpSignal(Math.pow(2, 17), false);
                var text = "";
                for (var i = 0; i < up.length; i++) {
                    text += i / 44100 + "\t" + up[i] + "\n";
                }
                console.log(text);
            }
            Sandbox.gnuplot = gnuplot;
            function testDetect5(rootNodeId) {
                var TEST_INPUT_MYSELF = false;
                var actx = new AudioContext;
                var osc = new lib.OSC(actx);
                var isRecording = false;
                var processor = actx.createScriptProcessor(Math.pow(2, 14), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
                var recbuf = new lib.RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
                var render = new duxca.lib.CanvasRender(128, 128);
                var up = lib.Signal.createChirpSignal(Math.pow(2, 20), false);
                up = up.subarray(up.length * 1 / 6 | 0, up.length * 5 / 6 | 0);
                osc.resampling(up, 12).then(function (pulse) {
                    render.cnv.width = 1024;
                    render.drawSignal(pulse, true, true);
                    console.log("length", pulse.length, "sec", pulse.length / actx.sampleRate);
                    console.screenshot(render.element);
                    return pulse;
                }).then(function (pulse) {
                    var chord = new duxca.lib.Chord();
                    chord.debug = false;
                    chord.on("ping", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        cb(token);
                    });
                    chord.on("startRec", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        isRecording = true;
                        cb(token);
                    });
                    var pulseStartTime = {};
                    chord.on("pulseStart", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var id = token.payload.data;
                        pulseStartTime[token.payload.data] = actx.currentTime;
                        cb(token);
                    });
                    var abuf = osc.createAudioBufferFromArrayBuffer(pulse, actx.sampleRate);
                    chord.on("pulseBeep", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var id = token.payload.data;
                        if (chord.peer.id !== id)
                            return cb(token);
                        var anode = osc.createAudioNodeFromAudioBuffer(abuf);
                        var anode1 = osc.createAudioNodeFromAudioBuffer(abuf);
                        anode.connect(TEST_INPUT_MYSELF ? processor : actx.destination);
                        anode.start(actx.currentTime);
                        setTimeout(function () { return cb(token); }, pulse.length / actx.sampleRate * 1000);
                    });
                    var pulseStopTime = {};
                    chord.on("pulseStop", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var id = token.payload.data;
                        pulseStopTime[token.payload.data] = actx.currentTime;
                        cb(token);
                    });
                    var calcResult = null;
                    chord.on("stopRec", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var tmp = recbuf.count;
                        (function recur() {
                            if (recbuf.count === tmp)
                                return setTimeout(recur, 100);
                            isRecording = false;
                            calcResult = null;
                            setTimeout(function () {
                                calcResult = calc(chord.peer.id, pulse, pulseStartTime, pulseStopTime);
                            }, 0);
                            cb(token);
                        })();
                    });
                    chord.on("collect", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        (function recur() {
                            if (calcResult === null)
                                return setTimeout(recur, 100);
                            token.payload.data[chord.peer.id] = calcResult;
                            cb(token);
                        })();
                    });
                    var results = {};
                    var RESULT_HISTORY_SIZE = 10;
                    chord.on("distribute", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var data = token.payload.data;
                        Object.keys(data).forEach(function (id1) {
                            Object.keys(data).forEach(function (id2) {
                                if (!Array.isArray(results[id1 + "-" + id2]))
                                    results[id1 + "-" + id2] = [];
                                if (results[id1 + "-" + id2].length > RESULT_HISTORY_SIZE)
                                    results[id1 + "-" + id2].shift();
                                var tmp = Math.abs(Math.abs(data[id1][id2]) - Math.abs(data[id2][id1]));
                                if (isFinite(tmp))
                                    results[id1 + "-" + id2].push(tmp);
                                console.log("__RES__", id1 + "-" + id2, "phaseShift", tmp, "ave", duxca.lib.Statictics.average(results[id1 + "-" + id2]), "mode", duxca.lib.Statictics.mode(results[id1 + "-" + id2]), "med", duxca.lib.Statictics.median(results[id1 + "-" + id2]), "stdev", duxca.lib.Statictics.stdev(results[id1 + "-" + id2]));
                            });
                        });
                        cb(token);
                    });
                    return (typeof rootNodeId === "string") ? chord.join(rootNodeId) : chord.create();
                }).then(function (chord) {
                    console.log(chord.peer.id);
                    return new Promise(function (resolbe, reject) { return navigator.getUserMedia({ video: false, audio: true }, resolbe, reject); })
                        .then(function (stream) {
                        var source = actx.createMediaStreamSource(stream);
                        !TEST_INPUT_MYSELF && source.connect(processor);
                        processor.connect(actx.destination);
                        processor.addEventListener("audioprocess", function handler(ev) {
                            if (isRecording) {
                                recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                            }
                        });
                    }).then(function () { return chord; });
                }).then(typeof rootNodeId === "string" ? function (chord) { return void 0; } : function recur(chord) {
                    chord.request("ping")
                        .then(function (token) { return chord.request("startRec", null, token.route); })
                        .then(function (token) {
                        return token.payload.addressee.reduce(function (prm, id) {
                            return prm
                                .then(function (token) { return chord.request("pulseStart", id, token.payload.addressee); })
                                .then(function (token) { return chord.request("pulseBeep", id, token.payload.addressee); })
                                .then(function (token) { return chord.request("pulseStop", id, token.payload.addressee); });
                        }, Promise.resolve(token));
                    })
                        .then(function (token) { return chord.request("stopRec", null, token.payload.addressee); })
                        .then(function (token) { return chord.request("collect", {}, token.payload.addressee); })
                        .then(function (token) { return chord.request("distribute", token.payload.data, token.payload.addressee); })
                        .then(function (token) {
                        setTimeout(recur.bind(null, chord), 0);
                    });
                    return chord;
                });
                function calcStdscore(correlation) {
                    var _correlation = duxca.lib.Signal.normalize(correlation, 100);
                    var ave = duxca.lib.Statictics.average(_correlation);
                    var vari = duxca.lib.Statictics.variance(_correlation);
                    var stdscores = new Float32Array(_correlation.length);
                    for (var i = 0; i < _correlation.length; i++) {
                        stdscores[i] = 10 * (_correlation[i] - ave) / vari + 50;
                    }
                    return stdscores;
                }
                function calc(myId, pulse, pulseStartTime, pulseStopTime) {
                    var rawdata = recbuf.merge();
                    var sampleTimes = recbuf.sampleTimes;
                    recbuf.clear();
                    var correlation = duxca.lib.Signal.smartCorrelation(pulse, rawdata);
                    console.log(rawdata.length, pulse.length, correlation.length);
                    correlation = correlation.subarray(0, rawdata.length);
                    var stdscores = calcStdscore(correlation);
                    var recStartTime = sampleTimes[0] - (recbuf.bufferSize / recbuf.sampleRate);
                    var recStopTime = sampleTimes[sampleTimes.length - 1];
                    var results = {};
                    var render = new duxca.lib.CanvasRender(1024, 32);
                    Object.keys(pulseStartTime).forEach(function (id) {
                        var startTime = pulseStartTime[id];
                        var stopTime = pulseStopTime[id];
                        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
                        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
                        var section = stdscores.subarray(startPtr, stopPtr);
                        console.log(id, "recStartTime", recStartTime, "recStopTime", recStopTime, "startTime", startTime, "stopTime", stopTime, "startPtr", startPtr, "stopPtr", stopPtr, "length", section.length);
                        var _a = duxca.lib.Statictics.findMax(section), max_score = _a[0], max_offset = _a[1];
                        /*for(var i=0; i<pulse.length; i++){
                          if(section[max_offset - pulse.length/2 + i]>70){
                            var offset = max_offset - pulse.length/2 + i;
                            break;
                          }
                        }*/ var offset = max_offset;
                        results[id] = startPtr + (offset || max_offset);
                        results[id] = results[id] > 0 ? results[id] : 0;
                        console.log(id, "offset", offset, "max_offset", max_offset, "max_score", max_score, "globalOffset", startPtr + offset);
                        render.cnv.width = render.cnv.width;
                        render.ctx.strokeStyle = "black";
                        render.drawSignal(section, true, true);
                        render.ctx.strokeStyle = "blue";
                        render.drawColLine(offset * 1024 / section.length);
                        render.ctx.strokeStyle = "red";
                        render.drawColLine(max_offset * 1024 / section.length);
                        console.log(id, "section");
                        console.screenshot(render.cnv);
                    });
                    var render1 = new duxca.lib.CanvasRender(1024, 32);
                    var render2 = new duxca.lib.CanvasRender(1024, 32);
                    //var render3 = new duxca.lib.CanvasRender(1024, 32);
                    render1.drawSignal(stdscores, true, true);
                    render2.drawSignal(rawdata, true, true);
                    //var sim = new Float32Array(rawdata.length);
                    //Object.keys(results).forEach((id)=>{ sim.set(pulse, results[id]); });
                    //render3.drawSignal(sim, true, true);
                    Object.keys(results).forEach(function (id) {
                        var startTime = pulseStartTime[id];
                        var stopTime = pulseStopTime[id];
                        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
                        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
                        render1.ctx.strokeStyle = "blue";
                        render2.ctx.strokeStyle = "blue";
                        //render3.ctx.strokeStyle = "blue";
                        render1.drawColLine(startPtr * 1024 / stdscores.length);
                        render1.drawColLine(stopPtr * 1024 / stdscores.length);
                        render2.drawColLine(startPtr * 1024 / rawdata.length);
                        render2.drawColLine(stopPtr * 1024 / rawdata.length);
                        //render3.drawColLine(startPtr*1024/sim.length);
                        //render3.drawColLine(stopPtr*1024/sim.length);
                        render1.ctx.strokeStyle = "red";
                        render2.ctx.strokeStyle = "red";
                        //render3.ctx.strokeStyle = "red";
                        render1.drawColLine(results[id] * 1024 / stdscores.length);
                        render2.drawColLine(results[id] * 1024 / rawdata.length);
                        //render3.drawColLine(results[id]*1024/sim.length);
                    });
                    console.log("stdscores");
                    console.screenshot(render1.cnv);
                    console.log("rawdata");
                    console.screenshot(render2.cnv);
                    //console.log("sim");
                    //console.screenshot(render3.cnv);
                    console.log("results", results);
                    var _results = {};
                    Object.keys(results).forEach(function (id) {
                        _results[id] = (results[id] - results[myId]) / recbuf.sampleRate;
                    });
                    console.log("results", _results);
                    render._drawSpectrogram(rawdata, recbuf.sampleRate);
                    console.screenshot(render.cnv);
                    return _results;
                }
            }
            Sandbox.testDetect5 = testDetect5;
        })(Sandbox = lib.Sandbox || (lib.Sandbox = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
/// <reference path="../../typings/webrtc/MediaStream.d.ts"/>
/// <reference path="../../typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../tsd/console.snapshot/console.snapshot.d.ts"/>
/// <reference path="../../tsd/MediaStreamAudioSourceNode/MediaStreamAudioSourceNode.d.ts"/>
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Sandbox;
        (function (Sandbox) {
            navigator.getUserMedia = (navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia);
            function testAudioDownload() {
                var actx = new AudioContext();
                var osc = new lib.OSC(actx);
                osc.createAudioBufferFromURL("./TellYourWorld1min.mp3").then(function (abuf) {
                    var node = osc.createAudioNodeFromAudioBuffer(abuf);
                    node.start(actx.currentTime);
                    node.connect(actx.destination);
                });
            }
            Sandbox.testAudioDownload = testAudioDownload;
            function testDetect6(rootNodeId) {
                var TEST_INPUT_MYSELF = false;
                var lastTime = 0;
                var count = 0;
                var actx = new AudioContext();
                var osc = new lib.OSC(actx);
                var isRecording = false;
                var processor = actx.createScriptProcessor(Math.pow(2, 14), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
                var recbuf = new lib.RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
                var render = new duxca.lib.CanvasRender(128, 128);
                osc.createBarkerCodedChirp(13, 8).then(function (pulse) {
                    render.cnv.width = 1024;
                    render.drawSignal(pulse, true, true);
                    console.log("length", pulse.length, "sec", pulse.length / actx.sampleRate);
                    console.screenshot(render.element);
                    return pulse;
                }).then(function (pulse) {
                    var chord = new duxca.lib.Chord();
                    chord.debug = false;
                    chord.on("ping", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        cb(token);
                    });
                    chord.on("startRec", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        isRecording = true;
                        cb(token);
                    });
                    var pulseStartTime = {};
                    chord.on("pulseStart", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var id = token.payload.data;
                        pulseStartTime[token.payload.data] = actx.currentTime;
                        cb(token);
                    });
                    var abuf = osc.createAudioBufferFromArrayBuffer(pulse, actx.sampleRate);
                    chord.on("pulseBeep", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var id = token.payload.data;
                        if (chord.peer.id !== id)
                            return cb(token);
                        var anode = osc.createAudioNodeFromAudioBuffer(abuf);
                        var anode1 = osc.createAudioNodeFromAudioBuffer(abuf);
                        anode.connect(TEST_INPUT_MYSELF ? processor : actx.destination);
                        lastTime = actx.currentTime;
                        anode.start(actx.currentTime);
                        setTimeout(function () { return cb(token); }, pulse.length / actx.sampleRate * 1000);
                    });
                    var pulseStopTime = {};
                    chord.on("pulseStop", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var id = token.payload.data;
                        pulseStopTime[token.payload.data] = actx.currentTime;
                        cb(token);
                    });
                    var calcResult = null;
                    chord.on("stopRec", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var tmp = recbuf.count;
                        (function recur() {
                            if (recbuf.count === tmp)
                                return setTimeout(recur, 100);
                            isRecording = false;
                            calcResult = null;
                            setTimeout(function () {
                                calcResult = calc(chord.peer.id, pulse, pulseStartTime, pulseStopTime);
                            }, 0);
                            cb(token);
                        })();
                    });
                    chord.on("collect", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        (function recur() {
                            if (calcResult === null)
                                return setTimeout(recur, 100);
                            token.payload.data[chord.peer.id] = calcResult;
                            cb(token);
                        })();
                    });
                    var results = {};
                    var RESULT_HISTORY_SIZE = 10;
                    chord.on("distribute", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var data = token.payload.data;
                        Object.keys(data).forEach(function (id1) {
                            Object.keys(data).forEach(function (id2) {
                                if (Array.isArray(results[id2 + "-" + id1])) {
                                    results[id1 + "-" + id2] = results[id2 + "-" + id1];
                                    return;
                                }
                                if (!Array.isArray(results[id1 + "-" + id2]))
                                    results[id1 + "-" + id2] = [];
                                if (results[id1 + "-" + id2].length > RESULT_HISTORY_SIZE)
                                    results[id1 + "-" + id2].shift();
                                var tmp = Math.abs(Math.abs(data[id1][id2]) - Math.abs(data[id2][id1]));
                                if (isFinite(tmp))
                                    results[id1 + "-" + id2].push(tmp);
                                console.log("__RES__", id1 + "-" + id2, "phaseShift", tmp, "ave", duxca.lib.Statictics.average(results[id1 + "-" + id2]), "mode", duxca.lib.Statictics.mode(results[id1 + "-" + id2]), "med", duxca.lib.Statictics.median(results[id1 + "-" + id2]), "stdev", duxca.lib.Statictics.stdev(results[id1 + "-" + id2]));
                            });
                        });
                        cb(token);
                    });
                    chord.on("play", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var masterNodeLastTime = token.payload.data;
                        var id1 = token.route[0];
                        var id2 = chord.peer.id;
                        var delay = results[id1 + "-" + id2].pop();
                        console.log(id1, id2, "delay", delay);
                        cb(token);
                    });
                    return (typeof rootNodeId === "string") ? chord.join(rootNodeId) : chord.create();
                }).then(function (chord) {
                    console.log(chord.peer.id);
                    return new Promise(function (resolbe, reject) { return navigator.getUserMedia({ video: false, audio: true }, resolbe, reject); })
                        .then(function (stream) {
                        var source = actx.createMediaStreamSource(stream);
                        !TEST_INPUT_MYSELF && source.connect(processor);
                        processor.connect(actx.destination);
                        processor.addEventListener("audioprocess", function handler(ev) {
                            if (isRecording) {
                                recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                            }
                        });
                    }).then(function () { return chord; });
                }).then(typeof rootNodeId === "string" ? function (chord) { return void 0; } : function recur(chord) {
                    chord.request("ping")
                        .then(function (token) { return chord.request("startRec", null, token.route); })
                        .then(function (token) {
                        return token.payload.addressee.reduce(function (prm, id) {
                            return prm
                                .then(function (token) { return chord.request("pulseStart", id, token.payload.addressee); })
                                .then(function (token) { return chord.request("pulseBeep", id, token.payload.addressee); })
                                .then(function (token) { return chord.request("pulseStop", id, token.payload.addressee); });
                        }, Promise.resolve(token));
                    })
                        .then(function (token) { return chord.request("stopRec", null, token.payload.addressee); })
                        .then(function (token) { return chord.request("collect", {}, token.payload.addressee); })
                        .then(function (token) { return chord.request("distribute", token.payload.data, token.payload.addressee); })
                        .then(function (token) {
                        if (count++ > 10) {
                            console.log("play", token.payload.data, token.payload.addressee);
                            chord.request("play", lastTime, token.payload.addressee);
                        }
                        else
                            setTimeout(recur.bind(null, chord), 0);
                    });
                    return chord;
                });
                function calcStdscore(correlation) {
                    var _correlation = duxca.lib.Signal.normalize(correlation, 100);
                    var ave = duxca.lib.Statictics.average(_correlation);
                    var vari = duxca.lib.Statictics.variance(_correlation);
                    var stdscores = new Float32Array(_correlation.length);
                    for (var i = 0; i < _correlation.length; i++) {
                        stdscores[i] = 10 * (_correlation[i] - ave) / vari + 50;
                    }
                    return stdscores;
                }
                function calc(myId, pulse, pulseStartTime, pulseStopTime) {
                    var rawdata = recbuf.merge();
                    var sampleTimes = recbuf.sampleTimes;
                    recbuf.clear();
                    var recStartTime = sampleTimes[0] - (recbuf.bufferSize / recbuf.sampleRate);
                    var recStopTime = sampleTimes[sampleTimes.length - 1];
                    var results = {};
                    render.cnv.width = 1024;
                    render.cnv.height = 32;
                    Object.keys(pulseStartTime).forEach(function (id) {
                        var startTime = pulseStartTime[id];
                        var stopTime = pulseStopTime[id];
                        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
                        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
                        var section = rawdata.subarray(startPtr, stopPtr);
                        var corrsec = lib.Signal.smartCorrelation(pulse, section);
                        corrsec = corrsec.subarray(0, section.length);
                        console.log(id, "recStartTime", recStartTime, "recStopTime", recStopTime, "startTime", startTime, "stopTime", stopTime, "startPtr", startPtr, "stopPtr", stopPtr, "length", section.length);
                        var _a = duxca.lib.Statictics.findMax(corrsec), max_score = _a[0], max_offset = _a[1];
                        for (var i = 0; i < corrsec.length; i++) {
                            if (max_score / 2 < corrsec[i]) {
                                var offset = i;
                                break;
                            }
                        }
                        results[id] = startPtr + (offset || max_offset);
                        results[id] = results[id] > 0 ? results[id] : 0;
                        console.log(id, "offset", offset, "max_offset", max_offset, "max_score", max_score, "globalOffset", startPtr + offset);
                        render.clear();
                        render.ctx.strokeStyle = "black";
                        render.drawSignal(corrsec, true, true);
                        render.ctx.strokeStyle = "blue";
                        render.drawColLine(offset * 1024 / corrsec.length);
                        render.ctx.strokeStyle = "red";
                        render.drawColLine(max_offset * 1024 / corrsec.length);
                        console.log(id, "corrsec");
                        console.screenshot(render.cnv);
                    });
                    var render1 = new duxca.lib.CanvasRender(1024, 32);
                    var render2 = new duxca.lib.CanvasRender(1024, 32);
                    var render3 = new duxca.lib.CanvasRender(1024, 32);
                    render2.drawSignal(rawdata, true, true);
                    var sim = new Float32Array(rawdata.length);
                    Object.keys(results).forEach(function (id) {
                        if (sim.length < results[id] + pulse.length) {
                            sim.set(pulse.subarray(0, (results[id] + pulse.length) - sim.length));
                        }
                        else {
                            sim.set(pulse, results[id]);
                        }
                    });
                    render3.drawSignal(sim, true, true);
                    var correlation = duxca.lib.Signal.smartCorrelation(pulse, rawdata);
                    correlation = correlation.subarray(0, rawdata.length);
                    Object.keys(results).forEach(function (id) {
                        var startTime = pulseStartTime[id];
                        var stopTime = pulseStopTime[id];
                        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
                        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
                        render1.ctx.strokeStyle = "blue";
                        render2.ctx.strokeStyle = "blue";
                        render3.ctx.strokeStyle = "blue";
                        render1.drawColLine(startPtr * 1024 / correlation.length);
                        render1.drawColLine(stopPtr * 1024 / correlation.length);
                        render2.drawColLine(startPtr * 1024 / rawdata.length);
                        render2.drawColLine(stopPtr * 1024 / rawdata.length);
                        render3.drawColLine(startPtr * 1024 / sim.length);
                        render3.drawColLine(stopPtr * 1024 / sim.length);
                        render1.ctx.strokeStyle = "red";
                        render2.ctx.strokeStyle = "red";
                        render3.ctx.strokeStyle = "red";
                        render1.drawColLine(results[id] * 1024 / correlation.length);
                        render2.drawColLine(results[id] * 1024 / rawdata.length);
                        render3.drawColLine(results[id] * 1024 / sim.length);
                    });
                    console.log("correlation");
                    console.screenshot(render1.cnv);
                    console.log("rawdata");
                    console.screenshot(render2.cnv);
                    console.log("sim");
                    console.screenshot(render3.cnv);
                    console.log("results", results);
                    var _results = {};
                    Object.keys(results).forEach(function (id) {
                        _results[id] = (results[id] - results[myId]) / recbuf.sampleRate;
                    });
                    console.log("results", _results);
                    render._drawSpectrogram(rawdata, recbuf.sampleRate);
                    console.screenshot(render.cnv);
                    return _results;
                }
            }
            Sandbox.testDetect6 = testDetect6;
        })(Sandbox = lib.Sandbox || (lib.Sandbox = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
/// <reference path="../../typings/webrtc/MediaStream.d.ts"/>
/// <reference path="../../typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../tsd/console.snapshot/console.snapshot.d.ts"/>
/// <reference path="../../tsd/MediaStreamAudioSourceNode/MediaStreamAudioSourceNode.d.ts"/>
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Sandbox;
        (function (Sandbox) {
            navigator.getUserMedia = (navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia);
            function relpos() {
                var K = 0;
                var pseudoPts = [0, 1, 2].map(function (i) { return new lib.Point(Math.random() * 10, Math.random() * 10); });
                var ds = [
                    [0, 1, 1],
                    [1, 0, 1],
                    [1, 1, 0]
                ];
                var sdm = new lib.SDM(pseudoPts, ds);
                (function recur() {
                    if (K++ < 200) {
                        sdm.step();
                        requestAnimationFrame(recur);
                    }
                    else {
                        console.log("fin", sdm.det(), sdm.points);
                    }
                }());
            }
            Sandbox.relpos = relpos;
            function testDetect7(rootNodeId) {
                var TEST_INPUT_MYSELF = false;
                var count = 0;
                var actx = new AudioContext();
                var osc = new lib.OSC(actx);
                var isRecording = false;
                var processor = actx.createScriptProcessor(Math.pow(2, 14), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
                var recbuf = new lib.RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
                var render = new duxca.lib.CanvasRender(128, 128);
                osc.createBarkerCodedChirp(13, 8).then(function (pulse) {
                    render.cnv.width = 1024;
                    render.drawSignal(pulse, true, true);
                    console.log("length", pulse.length, "sec", pulse.length / actx.sampleRate);
                    console.screenshot(render.element);
                    return pulse;
                }).then(function (pulse) {
                    var chord = new duxca.lib.Chord();
                    chord.debug = false;
                    chord.on("ping", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        cb(token);
                    });
                    chord.on("recStart", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        isRecording = true;
                        cb(token);
                    });
                    var pulseStartTime = {};
                    chord.on("pulseStart", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var id = token.payload.data;
                        pulseStartTime[id] = actx.currentTime;
                        cb(token);
                    });
                    var abuf = osc.createAudioBufferFromArrayBuffer(pulse, actx.sampleRate);
                    chord.on("pulseBeep", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var id = token.payload.data;
                        if (chord.peer.id !== id)
                            return cb(token);
                        var anode = osc.createAudioNodeFromAudioBuffer(abuf);
                        anode.connect(TEST_INPUT_MYSELF ? processor : actx.destination);
                        anode.start(actx.currentTime);
                        setTimeout(function () { return cb(token); }, pulse.length / actx.sampleRate * 1000);
                    });
                    var pulseStopTime = {};
                    chord.on("pulseStop", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var id = token.payload.data;
                        pulseStopTime[id] = actx.currentTime;
                        cb(token);
                    });
                    var pulseTime = null;
                    chord.on("recStop", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var tmp = recbuf.count;
                        (function recur() {
                            if (recbuf.count === tmp)
                                return setTimeout(recur, 100); // wait audioprocess
                            isRecording = false;
                            pulseTime = null;
                            setTimeout(function () {
                                pulseTime = calc(chord.peer.id, pulse, pulseStartTime, pulseStopTime);
                            }, 0);
                            cb(token);
                        })();
                    });
                    chord.on("collect", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        (function recur() {
                            if (pulseTime === null)
                                return setTimeout(recur, 100); // wait calc
                            token.payload.data[chord.peer.id] = pulseTime;
                            cb(token);
                        })();
                    });
                    var pulseTimes = null;
                    var relDelayTimes = null;
                    var delayTimesLog = {};
                    chord.on("distribute", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        pulseTimes = token.payload.data;
                        relDelayTimes = {};
                        Object.keys(pulseTimes).forEach(function (id1) {
                            Object.keys(pulseTime).forEach(function (id2) {
                                relDelayTimes[id1] = relDelayTimes[id1] || {};
                                relDelayTimes[id1][id2] = pulseTimes[id1][id2] - pulseTimes[id1][id1];
                            });
                        });
                        console.log("relDelayTimes", relDelayTimes);
                        Object.keys(pulseTimes).forEach(function (id1) {
                            delayTimesLog[id1] = delayTimesLog[id1] || {};
                            Object.keys(pulseTime).forEach(function (id2) {
                                delayTimesLog[id2] = delayTimesLog[id2] || {};
                                if (!Array.isArray(delayTimesLog[id1][id2]))
                                    delayTimesLog[id1][id2] = [];
                                if (delayTimesLog[id1][id2].length > 10)
                                    delayTimesLog[id1][id2].shift();
                                var delayTime = Math.abs(Math.abs(relDelayTimes[id1][id2]) - Math.abs(relDelayTimes[id2][id1]));
                                delayTimesLog[id1][id2].push(delayTime);
                                console.log("__RES__", id1, id2, "delayTime", delayTime, "distance", delayTime / 2 * 340, "ave", duxca.lib.Statictics.average(delayTimesLog[id1][id2]), "mode", duxca.lib.Statictics.mode(delayTimesLog[id1][id2]), "med", duxca.lib.Statictics.median(delayTimesLog[id1][id2]), "stdev", duxca.lib.Statictics.stdev(delayTimesLog[id1][id2]));
                            });
                        });
                        cb(token);
                    });
                    chord.on("play", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var wait = token.payload.data;
                        var id1 = token.route[0];
                        var id2 = chord.peer.id;
                        var delay = duxca.lib.Statictics.median(delayTimesLog[id1][id2]);
                        var offsetTime = pulseTimes[id2][id1] + wait + delay;
                        console.log(id1, id2, "delay", delay, wait, offsetTime, pulseTimes, delayTimesLog);
                        osc.createAudioBufferFromURL("./TellYourWorld1min.mp3").then(function (abuf) {
                            var node = osc.createAudioNodeFromAudioBuffer(abuf);
                            node.start(offsetTime);
                            node.loop = true;
                            node.connect(actx.destination);
                        });
                        cb(token);
                    });
                    return (typeof rootNodeId === "string") ? chord.join(rootNodeId) : chord.create();
                }).then(function (chord) {
                    console.log(chord.peer.id);
                    return new Promise(function (resolbe, reject) { return navigator.getUserMedia({ video: false, audio: true }, resolbe, reject); })
                        .then(function (stream) {
                        var source = actx.createMediaStreamSource(stream);
                        !TEST_INPUT_MYSELF && source.connect(processor);
                        processor.connect(actx.destination);
                        processor.addEventListener("audioprocess", function handler(ev) {
                            if (isRecording)
                                recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                        });
                        return new Promise(function (resolve, reject) {
                            setTimeout(function () {
                                resolve(Promise.resolve(chord));
                            }, 1000);
                        });
                    }).then(function () { return chord; });
                }).then(typeof rootNodeId === "string" ? function (chord) { return void 0; } : function recur(chord) {
                    chord.request("ping")
                        .then(function (token) { return chord.request("recStart", null, token.route); })
                        .then(function (token) {
                        return token.payload.addressee.reduce(function (prm, id) {
                            return prm
                                .then(function (token) { return chord.request("pulseStart", id, token.payload.addressee); })
                                .then(function (token) { return chord.request("pulseBeep", id, token.payload.addressee); })
                                .then(function (token) { return chord.request("pulseStop", id, token.payload.addressee); });
                        }, Promise.resolve(token));
                    })
                        .then(function (token) { return chord.request("recStop", null, token.payload.addressee); })
                        .then(function (token) { return chord.request("collect", {}, token.payload.addressee); })
                        .then(function (token) { return chord.request("distribute", token.payload.data, token.payload.addressee); })
                        .then(function (token) {
                        console.log(count, Date.now());
                        if (++count === 2) {
                            chord.request("play", (Date.now() - token.time[0]) * 1.5 / 1000 + 1, token.payload.addressee).then(function (token) {
                                //setTimeout(recur.bind(null, chord), 0);
                            });
                        }
                        else
                            setTimeout(recur.bind(null, chord), 0);
                    });
                    return chord;
                });
                function calc(myId, pulse, pulseStartTime, pulseStopTime) {
                    var rawdata = recbuf.merge();
                    var sampleTimes = recbuf.sampleTimes;
                    recbuf.clear();
                    var recStartTime = sampleTimes[0] - (recbuf.bufferSize / recbuf.sampleRate);
                    var recStopTime = sampleTimes[sampleTimes.length - 1];
                    var pulseTime = {};
                    var pulseOffset = {};
                    Object.keys(pulseStartTime).forEach(function (id) {
                        var startTime = pulseStartTime[id];
                        var stopTime = pulseStopTime[id];
                        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
                        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
                        var section = rawdata.subarray(startPtr, stopPtr);
                        var corrsec = lib.Signal.smartCorrelation(pulse, section);
                        console.log(corrsec.length, pulse.length, section.length);
                        console.log(id, "recStartTime", recStartTime, "recStopTime", recStopTime, "startTime", startTime, "stopTime", stopTime, "startPtr", startPtr, "stopPtr", stopPtr, "length", section.length);
                        var _a = duxca.lib.Statictics.findMax(corrsec), max_score = _a[0], max_offset = _a[1];
                        var offset = -1;
                        for (var i = 0; i < corrsec.length; i++) {
                            if (max_score / 2 < corrsec[i]) {
                                offset = i;
                                pulseOffset[id] = startPtr + i;
                                pulseTime[id] = (startPtr + i) / recbuf.sampleRate;
                                break;
                            }
                        }
                        console.log(id, "offset", offset, "max_offset", max_offset, "max_score", max_score, "globalOffset", startPtr + offset);
                        render.cnv.width = 1024;
                        render.cnv.height = 32;
                        render.ctx.strokeStyle = "black";
                        render.drawSignal(corrsec, true, true);
                        render.ctx.strokeStyle = "blue";
                        render.drawColLine(offset * 1024 / corrsec.length);
                        render.ctx.strokeStyle = "red";
                        render.drawColLine(max_offset * 1024 / corrsec.length);
                        console.log(id, "corrsec");
                        console.screenshot(render.cnv);
                    });
                    var render1 = new duxca.lib.CanvasRender(1024, 32);
                    var render2 = new duxca.lib.CanvasRender(1024, 32);
                    var render3 = new duxca.lib.CanvasRender(1024, 32);
                    render2.drawSignal(rawdata, true, true);
                    var sim = new Float32Array(rawdata.length);
                    Object.keys(pulseOffset).forEach(function (id) {
                        if (sim.length < pulseOffset[id] + pulse.length) {
                            sim.set(pulse.subarray(0, (pulseOffset[id] + pulse.length) - sim.length), pulseTime[id]);
                        }
                        else
                            sim.set(pulse, pulseOffset[id]);
                    });
                    render3.drawSignal(sim, true, true);
                    var correlation = duxca.lib.Signal.smartCorrelation(pulse, rawdata);
                    console.log(correlation.length, pulse.length, rawdata.length);
                    Object.keys(pulseOffset).forEach(function (id) {
                        var startTime = pulseStartTime[id];
                        var stopTime = pulseStopTime[id];
                        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
                        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
                        render1.ctx.strokeStyle = "blue";
                        render2.ctx.strokeStyle = "blue";
                        render3.ctx.strokeStyle = "blue";
                        render1.drawColLine(startPtr * 1024 / correlation.length);
                        render1.drawColLine(stopPtr * 1024 / correlation.length);
                        render2.drawColLine(startPtr * 1024 / rawdata.length);
                        render2.drawColLine(stopPtr * 1024 / rawdata.length);
                        render3.drawColLine(startPtr * 1024 / sim.length);
                        render3.drawColLine(stopPtr * 1024 / sim.length);
                        render1.ctx.strokeStyle = "red";
                        render2.ctx.strokeStyle = "red";
                        render3.ctx.strokeStyle = "red";
                        render1.drawColLine(pulseOffset[id] * 1024 / correlation.length);
                        render2.drawColLine(pulseOffset[id] * 1024 / rawdata.length);
                        render3.drawColLine(pulseOffset[id] * 1024 / sim.length);
                    });
                    console.log("correlation");
                    console.screenshot(render1.cnv);
                    console.log("rawdata");
                    console.screenshot(render2.cnv);
                    console.log("sim");
                    console.screenshot(render3.cnv);
                    console.log("pulseOffset", pulseOffset);
                    console.log("pulseTime", pulseTime);
                    render._drawSpectrogram(rawdata, recbuf.sampleRate);
                    console.screenshot(render.cnv);
                    return pulseTime;
                }
            }
            Sandbox.testDetect7 = testDetect7;
        })(Sandbox = lib.Sandbox || (lib.Sandbox = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
/// <reference path="../../typings/webrtc/MediaStream.d.ts"/>
/// <reference path="../../typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../tsd/console.snapshot/console.snapshot.d.ts"/>
/// <reference path="../../tsd/MediaStreamAudioSourceNode/MediaStreamAudioSourceNode.d.ts"/>
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Sandbox;
        (function (Sandbox) {
            navigator.getUserMedia = (navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia);
            function testDetect8(rootNodeId) {
                var TEST_INPUT_MYSELF = false;
                var count = 0;
                var actx = new AudioContext();
                var osc = new lib.OSC(actx);
                var isRecording = false;
                var processor = actx.createScriptProcessor(Math.pow(2, 14), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
                var recbuf = new lib.RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
                var render = new duxca.lib.CanvasRender(128, 128);
                osc.createBarkerCodedChirp(13, 8).then(function (pulse) {
                    render.cnv.width = 1024;
                    render.drawSignal(pulse, true, true);
                    console.log("length", pulse.length, "sec", pulse.length / actx.sampleRate);
                    console.screenshot(render.element);
                    return pulse;
                }).then(function (pulse) {
                    var chord = new duxca.lib.Chord();
                    chord.debug = false;
                    chord.on("ping", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        cb(token);
                    });
                    chord.on("recStart", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        isRecording = true;
                        cb(token);
                    });
                    var pulseStartTime = {};
                    chord.on("pulseStart", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var id = token.payload.data;
                        pulseStartTime[id] = actx.currentTime;
                        cb(token);
                    });
                    var abuf = osc.createAudioBufferFromArrayBuffer(pulse, actx.sampleRate);
                    chord.on("pulseBeep", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var id = token.payload.data;
                        if (chord.peer.id !== id)
                            return cb(token);
                        var anode = osc.createAudioNodeFromAudioBuffer(abuf);
                        anode.connect(TEST_INPUT_MYSELF ? processor : actx.destination);
                        anode.start(actx.currentTime);
                        setTimeout(function () { return cb(token); }, pulse.length / actx.sampleRate * 1000);
                    });
                    var pulseStopTime = {};
                    chord.on("pulseStop", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var id = token.payload.data;
                        pulseStopTime[id] = actx.currentTime;
                        cb(token);
                    });
                    var pulseTime = null;
                    chord.on("recStop", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var tmp = recbuf.count;
                        (function recur() {
                            if (recbuf.count === tmp)
                                return setTimeout(recur, 100); // wait audioprocess
                            isRecording = false;
                            pulseTime = null;
                            setTimeout(function () {
                                pulseTime = calc(chord.peer.id, pulse, pulseStartTime, pulseStopTime);
                            }, 0);
                            cb(token);
                        })();
                    });
                    chord.on("collect", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        (function recur() {
                            if (pulseTime === null)
                                return setTimeout(recur, 100); // wait calc
                            token.payload.data[chord.peer.id] = pulseTime;
                            cb(token);
                        })();
                    });
                    var pulseTimes = null;
                    var relDelayTimes = null;
                    var delayTimesLog = {};
                    chord.on("distribute", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        pulseTimes = token.payload.data;
                        relDelayTimes = {};
                        Object.keys(pulseTimes).forEach(function (id1) {
                            Object.keys(pulseTime).forEach(function (id2) {
                                relDelayTimes[id1] = relDelayTimes[id1] || {};
                                relDelayTimes[id1][id2] = pulseTimes[id1][id2] - pulseTimes[id1][id1];
                            });
                        });
                        console.log("relDelayTimes", relDelayTimes);
                        Object.keys(pulseTimes).forEach(function (id1) {
                            delayTimesLog[id1] = delayTimesLog[id1] || {};
                            Object.keys(pulseTime).forEach(function (id2) {
                                delayTimesLog[id2] = delayTimesLog[id2] || {};
                                if (!Array.isArray(delayTimesLog[id1][id2]))
                                    delayTimesLog[id1][id2] = [];
                                if (delayTimesLog[id1][id2].length > 10)
                                    delayTimesLog[id1][id2].shift();
                                var delayTime = Math.abs(Math.abs(relDelayTimes[id1][id2]) - Math.abs(relDelayTimes[id2][id1]));
                                delayTimesLog[id1][id2].push(delayTime);
                                console.log("__RES__", id1, id2, "delayTime", delayTime, "distance", delayTime / 2 * 340, "ave", duxca.lib.Statictics.average(delayTimesLog[id1][id2]), "mode", duxca.lib.Statictics.mode(delayTimesLog[id1][id2]), "med", duxca.lib.Statictics.median(delayTimesLog[id1][id2]), "stdev", duxca.lib.Statictics.stdev(delayTimesLog[id1][id2]));
                            });
                        });
                        relpos(relDelayTimes);
                        cb(token);
                    });
                    chord.on("play", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var wait = token.payload.data;
                        var id1 = token.route[0];
                        var id2 = chord.peer.id;
                        var delay = duxca.lib.Statictics.median(delayTimesLog[id1][id2]);
                        var offsetTime = pulseTimes[id2][id1] + wait + delay;
                        console.log(id1, id2, "delay", delay, wait, offsetTime, pulseTimes, delayTimesLog);
                        osc.createAudioBufferFromURL("./TellYourWorld1min.mp3").then(function (abuf) {
                            var node = osc.createAudioNodeFromAudioBuffer(abuf);
                            node.start(offsetTime);
                            node.loop = true;
                            node.connect(actx.destination);
                        });
                        cb(token);
                    });
                    return (typeof rootNodeId === "string") ? chord.join(rootNodeId) : chord.create();
                }).then(function (chord) {
                    console.log(chord.peer.id);
                    return new Promise(function (resolbe, reject) { return navigator.getUserMedia({ video: false, audio: true }, resolbe, reject); })
                        .then(function (stream) {
                        var source = actx.createMediaStreamSource(stream);
                        !TEST_INPUT_MYSELF && source.connect(processor);
                        processor.connect(actx.destination);
                        processor.addEventListener("audioprocess", function handler(ev) {
                            if (isRecording)
                                recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                        });
                        return new Promise(function (resolve, reject) {
                            setTimeout(function () {
                                resolve(Promise.resolve(chord));
                            }, 1000);
                        });
                    }).then(function () { return chord; });
                }).then(typeof rootNodeId === "string" ? function (chord) { return void 0; } : function recur(chord) {
                    chord.request("ping")
                        .then(function (token) { return chord.request("recStart", null, token.route); })
                        .then(function (token) {
                        return token.payload.addressee.reduce(function (prm, id) {
                            return prm
                                .then(function (token) { return chord.request("pulseStart", id, token.payload.addressee); })
                                .then(function (token) { return chord.request("pulseBeep", id, token.payload.addressee); })
                                .then(function (token) { return chord.request("pulseStop", id, token.payload.addressee); });
                        }, Promise.resolve(token));
                    })
                        .then(function (token) { return chord.request("recStop", null, token.payload.addressee); })
                        .then(function (token) { return chord.request("collect", {}, token.payload.addressee); })
                        .then(function (token) { return chord.request("distribute", token.payload.data, token.payload.addressee); })
                        .then(function (token) {
                        console.log(count, Date.now());
                        if (++count === 2) {
                            chord.request("play", (Date.now() - token.time[0]) * 1.5 / 1000 + 1, token.payload.addressee).then(function (token) {
                                //setTimeout(recur.bind(null, chord), 0);
                            });
                        }
                        else
                            setTimeout(recur.bind(null, chord), 0);
                    });
                    return chord;
                });
                function calc(myId, pulse, pulseStartTime, pulseStopTime) {
                    var rawdata = recbuf.merge();
                    var sampleTimes = recbuf.sampleTimes;
                    recbuf.clear();
                    var recStartTime = sampleTimes[0] - (recbuf.bufferSize / recbuf.sampleRate);
                    var recStopTime = sampleTimes[sampleTimes.length - 1];
                    var pulseTime = {};
                    var pulseOffset = {};
                    Object.keys(pulseStartTime).forEach(function (id) {
                        var startTime = pulseStartTime[id];
                        var stopTime = pulseStopTime[id];
                        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
                        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
                        var section = rawdata.subarray(startPtr, stopPtr);
                        var corrsec = lib.Signal.smartCorrelation(pulse, section);
                        console.log(corrsec.length, pulse.length, section.length);
                        console.log(id, "recStartTime", recStartTime, "recStopTime", recStopTime, "startTime", startTime, "stopTime", stopTime, "startPtr", startPtr, "stopPtr", stopPtr, "length", section.length);
                        var _a = duxca.lib.Statictics.findMax(corrsec), max_score = _a[0], max_offset = _a[1];
                        var offset = -1;
                        for (var i = 0; i < corrsec.length; i++) {
                            if (max_score / 2 < corrsec[i]) {
                                offset = i;
                                pulseOffset[id] = startPtr + i;
                                pulseTime[id] = (startPtr + i) / recbuf.sampleRate;
                                break;
                            }
                        }
                        console.log(id, "offset", offset, "max_offset", max_offset, "max_score", max_score, "globalOffset", startPtr + offset);
                        render.cnv.width = 1024;
                        render.cnv.height = 32;
                        render.ctx.strokeStyle = "black";
                        render.drawSignal(corrsec, true, true);
                        render.ctx.strokeStyle = "blue";
                        render.drawColLine(offset * 1024 / corrsec.length);
                        render.ctx.strokeStyle = "red";
                        render.drawColLine(max_offset * 1024 / corrsec.length);
                        console.log(id, "corrsec");
                        console.screenshot(render.cnv);
                    });
                    var render1 = new duxca.lib.CanvasRender(1024, 32);
                    var render2 = new duxca.lib.CanvasRender(1024, 32);
                    var render3 = new duxca.lib.CanvasRender(1024, 32);
                    render2.drawSignal(rawdata, true, true);
                    var sim = new Float32Array(rawdata.length);
                    Object.keys(pulseOffset).forEach(function (id) {
                        if (sim.length < pulseOffset[id] + pulse.length) {
                            sim.set(pulse.subarray(0, (pulseOffset[id] + pulse.length) - sim.length), pulseTime[id]);
                        }
                        else
                            sim.set(pulse, pulseOffset[id]);
                    });
                    render3.drawSignal(sim, true, true);
                    var correlation = duxca.lib.Signal.smartCorrelation(pulse, rawdata);
                    console.log(correlation.length, pulse.length, rawdata.length);
                    Object.keys(pulseOffset).forEach(function (id) {
                        var startTime = pulseStartTime[id];
                        var stopTime = pulseStopTime[id];
                        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
                        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
                        render1.ctx.strokeStyle = "blue";
                        render2.ctx.strokeStyle = "blue";
                        render3.ctx.strokeStyle = "blue";
                        render1.drawColLine(startPtr * 1024 / correlation.length);
                        render1.drawColLine(stopPtr * 1024 / correlation.length);
                        render2.drawColLine(startPtr * 1024 / rawdata.length);
                        render2.drawColLine(stopPtr * 1024 / rawdata.length);
                        render3.drawColLine(startPtr * 1024 / sim.length);
                        render3.drawColLine(stopPtr * 1024 / sim.length);
                        render1.ctx.strokeStyle = "red";
                        render2.ctx.strokeStyle = "red";
                        render3.ctx.strokeStyle = "red";
                        render1.drawColLine(pulseOffset[id] * 1024 / correlation.length);
                        render2.drawColLine(pulseOffset[id] * 1024 / rawdata.length);
                        render3.drawColLine(pulseOffset[id] * 1024 / sim.length);
                    });
                    console.log("correlation");
                    console.screenshot(render1.cnv);
                    console.log("rawdata");
                    console.screenshot(render2.cnv);
                    console.log("sim");
                    console.screenshot(render3.cnv);
                    console.log("pulseOffset", pulseOffset);
                    console.log("pulseTime", pulseTime);
                    render._drawSpectrogram(rawdata, recbuf.sampleRate);
                    console.screenshot(render.cnv);
                    return pulseTime;
                }
                function relpos(relDelayTimes) {
                    var K = 0;
                    var names = [];
                    var ds = [];
                    // new Point(Math.random()*10, Math.random()*10));
                    Object.keys(relDelayTimes).forEach(function (id1, i) {
                        names[i] = id1;
                        ds[i] = [];
                        Object.keys(relDelayTimes).forEach(function (id2, j) {
                            ds[i][j] = Math.abs(Math.abs(relDelayTimes[id1][id2]) - Math.abs(relDelayTimes[id2][id1])) * 170;
                        });
                    });
                    var pseudoPts = names.map(function (id1, i) { return new lib.Point(Math.random() * 10, Math.random() * 10); });
                    var sdm = new lib.SDM(pseudoPts, ds);
                    while (K++ < 200) {
                        sdm.step();
                    }
                    render.cnv.width = 128;
                    render.cnv.height = 128;
                    render.ctx.strokeStyle = "blue";
                    render.arc(64, 64, 16);
                    sdm.points.forEach(function (pt) {
                        render.cross(pt.x * 10 + 10, pt.y * 10 + 10, 16);
                    });
                    console.log("relpos", sdm.det(), sdm.points);
                    console.screenshot(render.cnv);
                }
            }
            Sandbox.testDetect8 = testDetect8;
        })(Sandbox = lib.Sandbox || (lib.Sandbox = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
/// <reference path="../../typings/webrtc/MediaStream.d.ts"/>
/// <reference path="../../typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../tsd/console.snapshot/console.snapshot.d.ts"/>
/// <reference path="../../tsd/MediaStreamAudioSourceNode/MediaStreamAudioSourceNode.d.ts"/>
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Sandbox;
        (function (Sandbox) {
            navigator.getUserMedia = (navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia);
            /*console.screenshot = (cnv)=>{
              var img = new Image();
              img.src = cnv.toDataURL("image/png");
              document.body.appendChild(img);
              document.body.appendChild(document.createElement("br"));
            };*/
            function testDetect3() {
                var PULSE_BOOST_COUNT = 1;
                var PULSE_INTERVAL_SEC = 0.5;
                var RECORD_SEC = 11;
                var CUTOFF_STANDARDSCORE = 100;
                var TEST_INPUT_MYSELF = false;
                console.group("testDetect3");
                console.time("testDetect3");
                var maybeStream = new Promise(function (resolbe, reject) {
                    return navigator.getUserMedia({ video: false, audio: true }, resolbe, reject);
                });
                maybeStream.then(function (stream) {
                    var actx = new AudioContext();
                    var source = actx.createMediaStreamSource(stream);
                    var processor = actx.createScriptProcessor(Math.pow(2, 14), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
                    !TEST_INPUT_MYSELF && source.connect(processor);
                    processor.connect(actx.destination);
                    console.group("create barker coded chirp signal");
                    console.time("create barker coded chirp signal");
                    var _c = duxca.lib.Signal.createComplementaryCode(5), a = _c[0], b = _c[1];
                    console.log(a.length);
                    var pulse = duxca.lib.Signal.createCodedChirp(a, 6); //var pulse = duxca.lib.Signal.createBarkerCodedChirp(11, 8);
                    for (var pow = 0; pulse.length * PULSE_BOOST_COUNT > Math.pow(2, pow); pow++)
                        ; //for(var pow=0; pulse.length > Math.pow(2, pow); pow++); // ajasting power of two for FFT
                    var barkerChirp = new Float32Array(Math.pow(2, pow));
                    for (var i = 0; i < PULSE_BOOST_COUNT; i++) {
                        barkerChirp.set(pulse, pulse.length * i);
                    }
                    console.log(pulse.length, barkerChirp.length);
                    console.timeEnd("create barker coded chirp signal");
                    console.groupEnd();
                    console.group("show chirp");
                    console.time("show chirp");
                    var render = new duxca.lib.CanvasRender(128, 128);
                    var _pulse = duxca.lib.Signal.normalize(pulse, 128);
                    var splitsize = Math.pow(2, 10);
                    var lastptr = 0;
                    for (var i = 0; i < _pulse.length; i += splitsize) {
                        var part = _pulse.subarray(i, i + splitsize);
                        render.cnv.width = part.length;
                        render.drawSignal(part, false, false);
                        console.log(lastptr + "-" + (i + splitsize) + "/" + _pulse.length, (i - lastptr) / actx.sampleRate * 1000 + "ms", render.cnv.width + "x" + render.cnv.height);
                        console.screenshot(render.element);
                        lastptr = i;
                    }
                    console.timeEnd("show chirp");
                    console.groupEnd();
                    console.group("requestAnimationFrame, audioprocess, metronome");
                    console.time("requestAnimationFrame, audioprocess, metronome");
                    return new Promise(function (resolve, reject) {
                        var osc = new duxca.lib.OSC(actx);
                        var abuf = osc.createAudioBufferFromArrayBuffer(barkerChirp, 44100);
                        var recbuf = new lib.RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
                        var met = new lib.Metronome(actx, PULSE_INTERVAL_SEC);
                        var rfps = new lib.FPS(1000);
                        var pfps = new lib.FPS(1000);
                        met.nextTick = nextTick;
                        processor.addEventListener("audioprocess", handler);
                        nextTick();
                        recur();
                        function handler(ev) {
                            pfps.step();
                            recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                        }
                        function nextTick() {
                            var anode = osc.createAudioNodeFromAudioBuffer(abuf);
                            anode.connect(TEST_INPUT_MYSELF ? processor : actx.destination);
                            anode.start(met.nextTime);
                        }
                        function recur() {
                            console.log(rfps + "/60", pfps + "/" + (actx.sampleRate / processor.bufferSize * 1000 | 0) / 1000);
                            rfps.step();
                            if (actx.currentTime > RECORD_SEC) {
                                setTimeout(function () {
                                    stream.stop();
                                    processor.removeEventListener("audioprocess", handler);
                                    console.timeEnd("requestAnimationFrame, audioprocess, metronome");
                                    console.groupEnd();
                                    resolve(Promise.resolve([recbuf, barkerChirp]));
                                }, met.interval * 1.5 * 1000); // wait beep
                                return;
                            }
                            met.step();
                            requestAnimationFrame(recur);
                        }
                    });
                }).then(function (_c) {
                    var recbuf = _c[0], barkerChirp = _c[1];
                    console.group("show record");
                    console.time("show record");
                    var pcm = recbuf.toPCM();
                    var wav = new duxca.lib.Wave(recbuf.channel, recbuf.sampleRate, pcm);
                    var audio = wav.toAudio();
                    //audio.autoplay = true;
                    document.body.appendChild(audio);
                    console.timeEnd("show record");
                    console.groupEnd();
                    console.group("calc correlation");
                    console.time("calc correlation");
                    var rawdata = recbuf.merge();
                    recbuf.clear();
                    var windowsize = barkerChirp.length;
                    var resized_charp = new Float32Array(windowsize * 2); // for overwrap adding way correlation
                    resized_charp.set(barkerChirp, 0);
                    var buffer = new Float32Array(windowsize * 2); // for overwrap adding way correlation
                    var correlation = new Float32Array(rawdata.length);
                    for (var i = 0; rawdata.length - (i + windowsize) >= resized_charp.length; i += windowsize) {
                        buffer.set(rawdata.subarray(i, i + windowsize), 0);
                        var corr = duxca.lib.Signal.correlation(buffer, resized_charp);
                        for (var j = 0; j < corr.length; j++) {
                            correlation[i + j] = corr[j];
                        }
                    }
                    console.timeEnd("calc correlation");
                    console.groupEnd();
                    console.group("calc stdscores");
                    console.time("calc stdscores");
                    var _correlation = duxca.lib.Signal.normalize(correlation, 100);
                    var ave = duxca.lib.Statictics.average(_correlation);
                    var vari = duxca.lib.Statictics.variance(_correlation);
                    console.log("ave:", ave, "\n", "med:", duxca.lib.Statictics.median(_correlation), "\n", "var:", vari, "\n");
                    var stdscores = new Float32Array(_correlation.length);
                    for (var i = 0; i < _correlation.length; i++) {
                        stdscores[i] = 10 * (_correlation[i] - ave) / vari + 50;
                    }
                    console.timeEnd("calc stdscores");
                    console.groupEnd();
                    console.group("show correlation and stdscores");
                    console.time("show correlation and stdscores");
                    var render = new duxca.lib.CanvasRender(128, 128);
                    var splitsize = Math.pow(2, 10);
                    var _correlation = duxca.lib.Signal.normalize(correlation, 128);
                    var _stdscores = duxca.lib.Signal.normalize(stdscores, 128);
                    var min = duxca.lib.Statictics.findMin(stdscores)[0];
                    var max = duxca.lib.Statictics.findMax(stdscores)[0];
                    var stdscoreline = new Float32Array(splitsize);
                    for (var i = 0; i < stdscoreline.length; i++) {
                        stdscoreline[i] = (CUTOFF_STANDARDSCORE - min) / (max - min) * 128;
                    }
                    var lastptr = 0;
                    var count = 0;
                    for (var i = 0; i < _correlation.length; i += splitsize) {
                        var corpart = _correlation.subarray(i, i + splitsize);
                        var stdpart = _stdscores.subarray(i, i + splitsize);
                        render.cnv.width = corpart.length;
                        render.ctx.strokeStyle = "gray";
                        render.drawSignal(stdpart);
                        render.ctx.strokeStyle = "gray";
                        render.drawSignal(stdscoreline);
                        if (i % (PULSE_INTERVAL_SEC * recbuf.sampleRate) > (i + splitsize) % (PULSE_INTERVAL_SEC * recbuf.sampleRate)) {
                            var intvlptr = ((i / (PULSE_INTERVAL_SEC * recbuf.sampleRate) | 0) + 1) * PULSE_INTERVAL_SEC * recbuf.sampleRate;
                            render.ctx.strokeStyle = "red";
                            render.drawColLine(intvlptr - i);
                            count++;
                        }
                        console.log("" + count, lastptr + "-" + (i - 1) + "/" + _correlation.length, (i - lastptr) / recbuf.sampleRate * 1000 + "ms", render.cnv.width + "x" + render.cnv.height);
                        for (var j = i; j < i + splitsize; j++) {
                            if (stdscores[j] > CUTOFF_STANDARDSCORE) {
                                console.log("stdscore", stdscores[j], j);
                            }
                        }
                        render.ctx.strokeStyle = "black";
                        render.drawSignal(corpart);
                        console.screenshot(render.cnv);
                        lastptr = i;
                    }
                    console.timeEnd("show correlation and stdscores");
                    console.groupEnd();
                    console.group("calc cycle");
                    console.time("calc cycle");
                    var splitsize = PULSE_INTERVAL_SEC * recbuf.sampleRate;
                    var results = [];
                    var count = 0;
                    var lastptr = 0;
                    for (var i = splitsize; i < stdscores.length; i += splitsize) {
                        var stdpart = stdscores.subarray(i, i + splitsize);
                        var _d = duxca.lib.Statictics.findMax(stdpart), max_score = _d[0], offset = _d[1];
                        console.log(count++, i + offset, offset, i + offset - lastptr, max_score);
                        results.push(offset);
                        lastptr = i + offset;
                    }
                    results.shift();
                    results.pop();
                    console.log(results);
                    console.log("min", duxca.lib.Statictics.findMin(results)[0], "\n", "max", duxca.lib.Statictics.findMax(results)[0], "\n", "ave", duxca.lib.Statictics.average(results), "\n", "med", duxca.lib.Statictics.median(results), "\n", "mode", duxca.lib.Statictics.mode(results), "\n", "stdev", duxca.lib.Statictics.stdev(results));
                    console.timeEnd("calc cycle");
                    console.groupEnd();
                    console.group("show spectrogram");
                    console.time("show spectrogram");
                    return new Promise(function (resolve, reject) {
                        var windowsize = Math.pow(2, 8); // spectrgram height
                        var slidewidth = Math.pow(2, 6); // spectrgram width rate
                        var sampleRate = recbuf.sampleRate;
                        console.log("sampleRate:", sampleRate, "\n", "windowsize:", windowsize, "\n", "slidewidth:", slidewidth, "\n", "windowsize(ms):", windowsize / sampleRate * 1000, "\n", "slidewidth(ms):", slidewidth / sampleRate * 1000, "\n");
                        var spectrums = [];
                        var ptr = 0;
                        var lstptr = 0;
                        var count = 0;
                        recur();
                        function recur() {
                            if (ptr + windowsize > rawdata.length) {
                                draw();
                                console.timeEnd("show spectrogram");
                                console.groupEnd();
                                return resolve(Promise.resolve([rawdata, barkerChirp]));
                            }
                            var spectrum = duxca.lib.Signal.fft(rawdata.subarray(ptr, ptr + windowsize), sampleRate)[2];
                            for (var i = 0; i < spectrum.length; i++) {
                                spectrum[i] = spectrum[i] * 20000;
                            }
                            spectrums.push(spectrum);
                            if (count % 512 === 511) {
                                draw();
                            }
                            ptr += slidewidth;
                            count++;
                            setTimeout(recur);
                        }
                        function draw() {
                            console.log("ptr", lstptr + "-" + (ptr - 1) + "/" + rawdata.length, "ms", lstptr / sampleRate * 1000 + "-" + (ptr - 1) / sampleRate * 1000 + "/" + rawdata.length * 1000 / sampleRate, spectrums.length + "x" + spectrums[0].length);
                            render.cnv.width = spectrums.length;
                            render.cnv.height = spectrums[0].length;
                            render.drawSpectrogram(spectrums);
                            console.screenshot(render.cnv);
                            spectrums = [];
                            lstptr = ptr;
                        }
                    });
                }).catch(function end(err) {
                    console.error(err);
                    err instanceof Error && console.error(err.stack);
                }).then(function () {
                    console.timeEnd("testDetect2");
                    console.groupEnd();
                });
            }
            Sandbox.testDetect3 = testDetect3;
            function testAutoDetect(id) {
                var chd = new duxca.lib.Chord();
                var actx = new AudioContext();
                chd.on("tone", function (token, cb) {
                    console.log("tone");
                    (new duxca.lib.OSC(actx)).tone(100, actx.currentTime, 1).connect(actx.destination);
                    setTimeout(function () {
                        cb(token);
                    }, 1000);
                });
                if (typeof id === "string") {
                    chd.join(id);
                }
                else {
                    chd.create().then(function () {
                        setInterval(function () {
                            chd.request("tone").then(function (token) { console.log(token.payload.event, token); });
                        }, 15000);
                    });
                }
            }
            Sandbox.testAutoDetect = testAutoDetect;
            function testChord(id) {
                var chd0 = new duxca.lib.Chord();
                var a = function (token, cb) { cb(token); };
                var chd1 = new duxca.lib.Chord();
                var chd2 = new duxca.lib.Chord();
                var chd3 = new duxca.lib.Chord();
                var chd4 = new duxca.lib.Chord();
                chd0.create().then(function () {
                    return chd1.join(chd0.peer.id).then(function () {
                        return chd2.join(chd0.peer.id).then(function () {
                            return chd3.join(chd2.peer.id).then(function () {
                                return chd4.join(chd3.peer.id).then(function () {
                                    setInterval(function () {
                                        chd1.request("ping").then(function (token) { console.log("PING", token); });
                                        [chd0, chd1, chd2, chd3, chd4].forEach(function (chd, i) {
                                            console.info(i, chd.predecessor && chd.predecessor.open, chd.predecessor && chd.predecessor.peer, chd.peer.id, chd.successor && chd.successor.peer, chd.successor && chd.successor.open, chd.successors);
                                        });
                                    }, 2000);
                                    setTimeout(function () {
                                        console.warn("chd4 destroied");
                                        chd4.peer.destroy();
                                    }, 20000);
                                    setTimeout(function () {
                                        console.warn("chd0 destroied");
                                        chd0.peer.destroy();
                                    }, 40000);
                                });
                            });
                        });
                    });
                }).catch(function (err) { console.error(err); });
            }
            Sandbox.testChord = testChord;
            function testDetect2() {
                console.group("testDetect2");
                console.time("testDetect2");
                var maybeStream = new Promise(function (resolbe, reject) {
                    return navigator.getUserMedia({ video: false, audio: true }, resolbe, reject);
                });
                maybeStream.then(function (stream) {
                    var actx = new AudioContext();
                    var source = actx.createMediaStreamSource(stream);
                    var processor = actx.createScriptProcessor(Math.pow(2, 14), 1, 1);
                    //source.connect(processor);
                    processor.connect(actx.destination);
                    var pulse = duxca.lib.Signal.createBarkerCodedChirp(13, 12);
                    for (var pow = 0; pulse.length > Math.pow(2, pow); pow++)
                        ;
                    var cliped_chirp = new Float32Array(Math.pow(2, pow));
                    cliped_chirp.set(pulse, 0);
                    console.log(pulse.length, cliped_chirp.length);
                    var osc = new duxca.lib.OSC(actx);
                    var abuf = osc.createAudioBufferFromArrayBuffer(cliped_chirp, 44100);
                    var met = new lib.Metronome(actx, 1);
                    var rfps = new lib.FPS(1000);
                    var pfps = new lib.FPS(1000);
                    var recbuf = new lib.RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
                    return new Promise(function (resolve, reject) {
                        console.group("fps\trequestAnimationFrame\taudioprocess");
                        recur();
                        nextTick();
                        met.nextTick = nextTick;
                        processor.addEventListener("audioprocess", handler);
                        function nextTick() {
                            var anode = osc.createAudioNodeFromAudioBuffer(abuf);
                            anode.connect(processor); //actx.destination);
                            anode.start(met.nextTime);
                        }
                        function recur() {
                            console.log(rfps + "/60\t" + pfps + "/" + (actx.sampleRate / processor.bufferSize * 1000 | 0) / 1000);
                            rfps.step();
                            if (actx.currentTime > 10) {
                                setTimeout(function () {
                                    stream.stop();
                                    processor.removeEventListener("audioprocess", handler);
                                    console.groupEnd();
                                    resolve(Promise.resolve([recbuf, cliped_chirp]));
                                }, met.interval * 1000);
                                return;
                            }
                            met.step();
                            setTimeout(recur, 0);
                        }
                        function handler(ev) {
                            pfps.step();
                            recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                        }
                    });
                }).then(function (_c) {
                    var recbuf = _c[0], cliped_chirp = _c[1];
                    var render = new duxca.lib.CanvasRender(128, 128);
                    console.group("cliped_chirp:" + cliped_chirp.length);
                    var min = duxca.lib.Statictics.findMin(cliped_chirp)[0];
                    for (var i = 0; i < cliped_chirp.length; i++) {
                        cliped_chirp[i] = cliped_chirp[i] + Math.abs(min);
                    }
                    render.cnv.width = cliped_chirp.length;
                    render.drawSignal(cliped_chirp, false, true);
                    console.screenshot(render.cnv);
                    console.groupEnd();
                    var pcm = recbuf.toPCM();
                    var wav = new duxca.lib.Wave(recbuf.channel, recbuf.sampleRate, pcm);
                    var audio = wav.toAudio();
                    //audio.autoplay = true;
                    document.body.appendChild(audio);
                    var rawdata = recbuf.merge(0);
                    console.group("rawdata:" + rawdata.length);
                    return new Promise(function (resolve, reject) {
                        var windowsize = Math.pow(2, 8);
                        var slidewidth = Math.pow(2, 6);
                        var sampleRate = recbuf.sampleRate;
                        console.log("sampleRate:", sampleRate, "\n", "windowsize:", windowsize, "\n", "slidewidth:", slidewidth, "\n", "windowsize(ms):", windowsize / sampleRate * 1000, "\n", "slidewidth(ms):", slidewidth / sampleRate * 1000, "\n");
                        var spectrums = [];
                        var ptr = 0;
                        var lstptr = 0;
                        var count = 0;
                        recur();
                        function recur() {
                            if (ptr + windowsize > rawdata.length) {
                                draw();
                                console.groupEnd();
                                return resolve(Promise.resolve([rawdata, cliped_chirp]));
                            }
                            var spectrum = duxca.lib.Signal.fft(rawdata.subarray(ptr, ptr + windowsize), recbuf.sampleRate)[2];
                            for (var i = 0; i < spectrum.length; i++) {
                                spectrum[i] = spectrum[i] * 20000;
                            }
                            spectrums.push(spectrum);
                            if (count % 512 === 511) {
                                draw();
                            }
                            ptr += slidewidth;
                            count++;
                            setTimeout(recur);
                        }
                        function draw() {
                            console.log(lstptr + "-" + (ptr - 1) + "/" + rawdata.length, (ptr - lstptr) / sampleRate * 1000 + "ms", spectrums.length + "x" + spectrums[0].length);
                            render.cnv.width = spectrums.length;
                            render.cnv.height = spectrums[0].length;
                            render.drawSpectrogram(spectrums);
                            console.screenshot(render.cnv);
                            spectrums = [];
                            lstptr = ptr;
                        }
                    });
                }).then(function (_c) {
                    var rawdata = _c[0], cliped_chirp = _c[1];
                    console.group("correlation");
                    console.time("correlation");
                    console.log(rawdata.length, cliped_chirp.length);
                    var windowsize = cliped_chirp.length;
                    var resized_charp = new Float32Array(windowsize * 2);
                    resized_charp.set(cliped_chirp, 0);
                    var tmp = new Float32Array(windowsize * 2);
                    var concat_corr = new Float32Array(rawdata.length);
                    for (var i = 0; rawdata.length - (i + windowsize) >= resized_charp.length; i += windowsize) {
                        var sig = rawdata.subarray(i, i + windowsize);
                        tmp.set(sig, 0);
                        var corr = duxca.lib.Signal.correlation(tmp, resized_charp);
                        for (var j = 0; j < corr.length; j++) {
                            concat_corr[i + j] = corr[j];
                        }
                    }
                    console.timeEnd("correlation");
                    console.groupEnd();
                    console.group("show correlation");
                    console.time("show correlation");
                    var concat_corr = duxca.lib.Signal.normalize(concat_corr, 100);
                    var ave = duxca.lib.Statictics.average(concat_corr);
                    var vari = duxca.lib.Statictics.variance(concat_corr);
                    console.log("ave:", ave, "\n", "med:", duxca.lib.Statictics.median(concat_corr), "\n", "var:", vari, "\n");
                    var stdscores = [];
                    for (var i = 0; i < concat_corr.length; i++) {
                        var stdscore = 10 * (concat_corr[i] - ave) / vari + 50;
                        stdscores.push(stdscore);
                    }
                    var render = new duxca.lib.CanvasRender(128, 128);
                    var goodscoreIds = [];
                    var splitsize = Math.pow(2, 10);
                    for (var i = 0; i < concat_corr.length; i += splitsize) {
                        var _corr = concat_corr.subarray(i, i + splitsize);
                        var __corr = concat_corr.subarray(i, i + splitsize * 2);
                        console.log("ptr:", i);
                        render.cnv.width = _corr.length;
                        render.drawSignal(_corr);
                        for (var j = i; j < i + splitsize; j++) {
                            if (stdscores[j] > 200) {
                                var localscore = duxca.lib.Statictics.stdscore(__corr, __corr[j - i]);
                                if (localscore > 60) {
                                    goodscoreIds.push(j);
                                    console.log("stdscore", stdscores[j], localscore, "index", j);
                                    render.drawColLine(j - i);
                                }
                            }
                        }
                        console.screenshot(render.cnv);
                    }
                    console.timeEnd("correlation show");
                    console.groupEnd();
                    console.group("clustering");
                    console.time("clustering");
                    console.log(goodscoreIds);
                    var clusterN = 10;
                    var clusterized = duxca.lib.Statictics.k_means1D(goodscoreIds, clusterN);
                    console.log(clusterized);
                    var clusterIds = [];
                    for (var j = 0; j < clusterN; j++) {
                        clusterIds[j] = [];
                    }
                    for (var i = 0; i < clusterized.length; i++) {
                        clusterIds[clusterized[i]].push(goodscoreIds[i]);
                    }
                    console.log(clusterIds);
                    var results = [];
                    for (var i = 0; i < clusterIds.length; i++) {
                        var _d = duxca.lib.Statictics.findMax(clusterIds[i].map(function (id) { return stdscores[id]; })), stdscore = _d[0], _id = _d[1];
                        var id = clusterIds[i][_id];
                        var val = concat_corr[id];
                        console.log("index", id, "val", val, "stdscore", stdscore);
                        results.push(id);
                    }
                    console.log(results.sort(function (a, b) { return a - b; }));
                    var _interval = [];
                    for (var i = 1; i < results.length; i++) {
                        _interval[i - 1] = results[i] - results[i - 1];
                    }
                    console.log(_interval);
                    console.timeEnd("clustering");
                    console.groupEnd();
                }).catch(function end(err) {
                    console.error(err);
                }).then(function () {
                    console.timeEnd("testDetect2");
                    console.groupEnd();
                });
            }
            Sandbox.testDetect2 = testDetect2;
            function testKmeans() {
                var arr = [1, 2, 3, 4, 5, 30, 435, 46, 3, 436, 63];
                console.log(arr);
                console.log(duxca.lib.Statictics.k_means1D(arr, 3));
            }
            Sandbox.testKmeans = testKmeans;
            function testComplementaryCode(n) {
                if (n === void 0) { n = 0; }
                var _c = duxca.lib.Signal.createComplementaryCode(n), a = _c[0], b = _c[1];
                console.log(0, a, b);
                var _a = duxca.lib.Signal.autocorr(a);
                var _b = duxca.lib.Signal.autocorr(b);
                console.log(_a);
                console.log(_b);
                console.log(_a.map(function (x, i) { return x + _b[i]; }));
            }
            Sandbox.testComplementaryCode = testComplementaryCode;
            function showChirp() {
                var bitwidth = Math.pow(2, 10);
                var up_chirp = duxca.lib.Signal.createChirpSignal(bitwidth);
                var down_chirp = new Float32Array(up_chirp);
                for (var i = 0; i < down_chirp.length; i++) {
                    down_chirp[i] *= -1;
                }
                var render = new duxca.lib.CanvasRender(128, 128);
                render.cnv.width = up_chirp.length;
                render.drawSignal(up_chirp, true, true);
                console.screenshot(render.element);
                render.cnv.width = up_chirp.length;
                render.drawSignal(down_chirp, true, true);
                console.screenshot(render.element);
                /*
                var pulse = new Float32Array(bitwidth/2*5);
                var code = duxca.lib.Signal.createBarkerCode(4);
                for(var i=0; i<code.length; i++){
                  for(var j=0; j<bitwidth; j++){
                    pulse[i*bitwidth/2+j] += (code[i] === 1) ? up_chirp[j] : down_chirp[j];
                  }
                }*/
                var pulse = duxca.lib.Signal.createBarkerCodedChirp(13);
                render.cnv.width = pulse.length;
                render.drawSignal(pulse, true, true);
                console.screenshot(render.element);
            }
            Sandbox.showChirp = showChirp;
            function testDetect() {
                console.group("testDetect");
                console.time("testDetect");
                navigator.getUserMedia({ video: false, audio: true }, function (stream) {
                    var actx = new AudioContext();
                    var source = actx.createMediaStreamSource(stream);
                    var processor = actx.createScriptProcessor(Math.pow(2, 12), 1, 1);
                    source.connect(processor);
                    processor.connect(actx.destination);
                    var render_corr = new duxca.lib.CanvasRender(128, 128);
                    var raw_chirp = duxca.lib.Signal.createChirpSignal(Math.pow(2, 10));
                    var cliped_chirp = raw_chirp.subarray(0, raw_chirp.length / 2);
                    var resized_chirp = new Float32Array(processor.bufferSize * 2);
                    resized_chirp.set(cliped_chirp, 0);
                    var cacheBuffer = new Float32Array(processor.bufferSize * 2);
                    var osc = new duxca.lib.OSC(actx);
                    var abuf = osc.createAudioBufferFromArrayBuffer(cliped_chirp, 44100);
                    var count = 0;
                    processor.addEventListener("audioprocess", handler);
                    function handler(ev) {
                        if (count > 100) {
                            processor.removeEventListener("audioprocess", handler);
                            stream.stop();
                            return end();
                        }
                        if (count % 2 === 0) {
                            var anode = osc.createAudioNodeFromAudioBuffer(abuf);
                            anode.connect(actx.destination);
                            anode.start(actx.currentTime);
                        }
                        cacheBuffer.set(ev.inputBuffer.getChannelData(0), (processor.bufferSize % 2) * processor.bufferSize);
                        var corr = duxca.lib.Signal.correlation(resized_chirp, cacheBuffer);
                        var cliped_corr = corr.subarray(0, corr.length / 2);
                        console.log("min", duxca.lib.Statictics.findMin(cliped_corr), "\n", "max", duxca.lib.Statictics.findMax(cliped_corr), "\n", "ave", duxca.lib.Statictics.average(cliped_corr), "\n", "med", duxca.lib.Statictics.median(cliped_corr), "\n", "var", duxca.lib.Statictics.variance(cliped_corr), "\n");
                        render_corr.cnv.width = cliped_corr.length;
                        render_corr.drawSignal(cliped_corr, false, true);
                        console.screenshot(render_corr.cnv);
                        count++;
                    }
                }, function (err) { console.error(err); end(); });
                function end() {
                    console.timeEnd("testDetect");
                    console.groupEnd();
                }
            }
            Sandbox.testDetect = testDetect;
            function testRecord() {
                console.group("testRecord");
                console.time("testRecord");
                navigator.getUserMedia({ video: false, audio: true }, function (stream) {
                    var actx = new AudioContext();
                    var source = actx.createMediaStreamSource(stream);
                    var processor = actx.createScriptProcessor(Math.pow(2, 12), 1, 1);
                    source.connect(processor);
                    processor.connect(actx.destination);
                    var recbuf = new lib.RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
                    var count = 0;
                    processor.addEventListener("audioprocess", handler);
                    function handler(ev) {
                        if (++count > 100) {
                            processor.removeEventListener("audioprocess", handler);
                            stream.stop();
                            var pcm = recbuf.toPCM();
                            //recbuf.clear();
                            var wav = new duxca.lib.Wave(recbuf.channel, actx.sampleRate, pcm);
                            var audio = wav.toAudio();
                            audio.loop = true;
                            audio.play();
                            console.log(recbuf, wav, audio);
                            return end();
                        }
                        if (count % 10 === 0)
                            console.log(count);
                        recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                    }
                }, function (err) { console.error(err); end(); });
                function end() {
                    console.timeEnd("testRecord");
                    console.groupEnd();
                }
            }
            Sandbox.testRecord = testRecord;
            function testScriptProcessor() {
                console.group("testScriptProcessor");
                console.time("testScriptProcessor");
                navigator.getUserMedia({ video: false, audio: true }, function (stream) {
                    var actx = new AudioContext();
                    var source = actx.createMediaStreamSource(stream);
                    var processor = actx.createScriptProcessor(Math.pow(2, 9), 1, 1);
                    source.connect(processor);
                    processor.connect(actx.destination);
                    var spectrums = [];
                    var count = 0;
                    processor.addEventListener("audioprocess", handler);
                    function handler(ev) {
                        if (count > 1000) {
                            processor.removeEventListener("audioprocess", handler);
                            stream.stop();
                            return end();
                        }
                        var buf = new Float32Array(ev.inputBuffer.getChannelData(0));
                        var _c = duxca.lib.Signal.fft(buf, actx.sampleRate), real = _c[0], imag = _c[1], spectrum = _c[2];
                        for (var i = 0; i < spectrum.length; i++) {
                            spectrum[i] = spectrum[i] * 20000;
                        }
                        if (spectrums.length > 200)
                            spectrums.shift();
                        spectrums.push(spectrum);
                        if (++count % 200 === 0)
                            draw();
                    }
                    function draw() {
                        var render = new duxca.lib.CanvasRender(spectrums.length, spectrums[0].length);
                        render.drawSpectrogram(spectrums);
                        console.screenshot(render.cnv);
                    }
                }, function (err) { console.error(err); end(); });
                function end() {
                    console.timeEnd("testScriptProcessor");
                    console.groupEnd();
                }
            }
            Sandbox.testScriptProcessor = testScriptProcessor;
            function testSpectrum() {
                console.group("testSpectrum");
                console.time("testSpectrum");
                navigator.getUserMedia({ video: false, audio: true }, function (stream) {
                    var actx = new AudioContext();
                    var analyser = actx.createAnalyser();
                    var source = actx.createMediaStreamSource(stream);
                    source.connect(analyser);
                    analyser.smoothingTimeConstant = 0;
                    analyser.fftSize = 512;
                    var fftdata = new Uint8Array(analyser.frequencyBinCount);
                    var spectrums = [];
                    var count = 0;
                    console.log("make noise and wait few sec");
                    recur();
                    function recur() {
                        if (count++ > 1000) {
                            stream.stop();
                            return end();
                        }
                        if (count % 100 === 0)
                            draw();
                        analyser.getByteFrequencyData(fftdata);
                        spectrums.push(new Uint8Array(fftdata));
                        requestAnimationFrame(recur);
                    }
                    function draw() {
                        console.log(count);
                        var render = new duxca.lib.CanvasRender(spectrums.length, spectrums[0].length);
                        render.drawSpectrogram(spectrums);
                        console.screenshot(render.cnv);
                    }
                }, function (err) { console.error(err); end(); });
                function end() {
                    console.timeEnd("testSpectrum");
                    console.groupEnd();
                }
            }
            Sandbox.testSpectrum = testSpectrum;
            function testOSC() {
                console.group("testOSC");
                console.time("testOSC");
                // raw cliped
                var raw_chirp = duxca.lib.Signal.createChirpSignal(Math.pow(2, 10));
                var cliped_chirp = raw_chirp.subarray(0, raw_chirp.length / 2);
                var actx = new AudioContext();
                var osc = new duxca.lib.OSC(actx);
                var abuf = osc.createAudioBufferFromArrayBuffer(cliped_chirp, 44100);
                var anode = osc.createAudioNodeFromAudioBuffer(abuf);
                anode.connect(actx.destination);
                anode.start(0);
                console.timeEnd("testOSC");
                console.groupEnd();
            }
            Sandbox.testOSC = testOSC;
            function testChirp() {
                console.group("testChirp");
                console.time("testChirp");
                // raw cliped
                var raw_chirp = duxca.lib.Signal.createChirpSignal(Math.pow(2, 10));
                var cliped_chirp = raw_chirp.subarray(0, raw_chirp.length / 2);
                // noised
                var noised_chirp = new Float32Array(cliped_chirp);
                for (var i = 0; i < noised_chirp.length; i++) {
                    noised_chirp[i] = cliped_chirp[i] + (Math.random() - 1 / 2) * 0.5;
                }
                // noised_corr
                console.time("noised_corr");
                var corr = duxca.lib.Signal.correlation(cliped_chirp, noised_chirp);
                console.timeEnd("noised_corr");
                // draw
                var render_cliped = new duxca.lib.CanvasRender(cliped_chirp.length, 128);
                var render_noised = new duxca.lib.CanvasRender(noised_chirp.length, 128);
                var render_corr = new duxca.lib.CanvasRender(corr.length, 128);
                var _cliped_chirp = new Float32Array(noised_chirp.length);
                var _noised_chirp = new Float32Array(cliped_chirp.length);
                for (var i = 0; i < cliped_chirp.length; i++) {
                    _cliped_chirp[i] = 1000 * cliped_chirp[i] + 64;
                    _noised_chirp[i] = 1000 * noised_chirp[i] + 64;
                }
                render_cliped.drawSignal(_cliped_chirp, true);
                render_noised.drawSignal(_noised_chirp, true);
                render_corr.drawSignal(corr, true, true);
                console.screenshot(render_cliped.cnv);
                duxca.lib.Statictics.all(cliped_chirp);
                console.screenshot(render_noised.cnv);
                duxca.lib.Statictics.all(noised_chirp);
                console.screenshot(render_corr.cnv);
                duxca.lib.Statictics.all(corr);
                console.timeEnd("testChirp");
                console.groupEnd();
            }
            Sandbox.testChirp = testChirp;
        })(Sandbox = lib.Sandbox || (lib.Sandbox = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
/// <reference path="../../tsd/dsp/dsp.d.ts" />
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Signal;
        (function (Signal) {
            function normalize(arr, max_val) {
                if (max_val === void 0) { max_val = 1; }
                var min = duxca.lib.Statictics.findMin(arr)[0];
                var max = duxca.lib.Statictics.findMax(arr)[0];
                var _arr = new Float32Array(arr.length);
                for (var j = 0; j < arr.length; j++) {
                    _arr[j] = (arr[j] - min) / (max - min) * max_val;
                }
                return _arr;
            }
            Signal.normalize = normalize;
            function correlation(signalA, signalB, sampleRate) {
                if (signalA.length !== signalB.length)
                    throw new Error("unmatch signal length A and B as " + signalA.length + " and " + signalB.length);
                var _fft = new FFT(signalA.length, sampleRate);
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
            Signal.correlation = correlation;
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
            Signal.smartCorrelation = smartCorrelation;
            function overwarpCorr(short, long) {
                for (var pow = 8; short.length > Math.pow(2, pow); pow++)
                    ; // ajasting power of two for FFT
                var resized_short = new Float32Array(Math.pow(2, pow)); // for overwrap adding way correlation
                resized_short.set(short, 0);
                var buffer = new Float32Array(Math.pow(2, pow)); // for overwrap adding way correlation
                var correlation = new Float32Array(long.length);
                var windowsize = Math.pow(2, pow - 1);
                //console.log(long.length, windowsize, resized_short.length, buffer.length, correlation.length)
                for (var i = 0; long.length - (i + windowsize) >= resized_short.length; i += windowsize) {
                    buffer.set(long.subarray(i, i + windowsize), 0);
                    var corr = Signal.correlation(buffer, resized_short);
                    for (var j = 0; j < corr.length; j++) {
                        correlation[i + j] = corr[j];
                    }
                }
                return correlation;
            }
            Signal.overwarpCorr = overwarpCorr;
            function autocorr(arr) {
                return crosscorr(arr, arr);
            }
            Signal.autocorr = autocorr;
            function crosscorr(arrA, arrB) {
                function _autocorr(j) {
                    var sum = 0;
                    for (var i = 0; i < arrA.length - j; i++)
                        sum += arrA[i] * arrB[i + j];
                    return sum;
                }
                return arrA.map(function (v, j) { return _autocorr(j); });
            }
            Signal.crosscorr = crosscorr;
            function fft(signal, sampleRate) {
                if (sampleRate === void 0) { sampleRate = 44100; }
                var _fft = new FFT(signal.length, sampleRate);
                _fft.forward(signal);
                return [_fft.real, _fft.imag, _fft.spectrum];
            }
            Signal.fft = fft;
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
                var _fft = new FFT(pulse_length, 44100);
                var inv_real = _fft.inverse(pulse_real, pulse_imag);
                return inv_real;
            }
            Signal.createChirpSignal = createChirpSignal;
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
                    default: throw new Error("cannot make barker code outer 2, 3, 4, 5, 7, 11, 13");
                }
            }
            Signal.createBarkerCode = createBarkerCode;
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
            Signal.createComplementaryCode = createComplementaryCode;
            function createCodedChirp(code, bitWithBinaryPower) {
                if (bitWithBinaryPower === void 0) { bitWithBinaryPower = 10; }
                var bitwidth = Math.pow(2, bitWithBinaryPower);
                var up_chirp = duxca.lib.Signal.createChirpSignal(bitwidth);
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
            Signal.createCodedChirp = createCodedChirp;
            function createBarkerCodedChirp(barkerCodeN, bitWithBinaryPower) {
                if (bitWithBinaryPower === void 0) { bitWithBinaryPower = 10; }
                return createCodedChirp(createBarkerCode(barkerCodeN));
            }
            Signal.createBarkerCodedChirp = createBarkerCodedChirp;
        })(Signal = lib.Signal || (lib.Signal = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Statictics;
        (function (Statictics) {
            function summation(arr) {
                var sum = 0;
                for (var j = 0; j < arr.length; j++) {
                    sum += arr[j];
                }
                return sum;
            }
            Statictics.summation = summation;
            function average(arr) {
                return summation(arr) / arr.length;
            }
            Statictics.average = average;
            function variance(arr) {
                var ave = average(arr);
                var sum = 0;
                for (var j = 0; j < arr.length; j++) {
                    sum += Math.pow(arr[j] - ave, 2);
                }
                return sum / (arr.length - 1);
            }
            Statictics.variance = variance;
            function stdev(arr) {
                return Math.sqrt(variance(arr));
            }
            Statictics.stdev = stdev;
            function stdscore(arr, x) {
                return 10 * (x - average(arr)) / variance(arr) + 50;
            }
            Statictics.stdscore = stdscore;
            function derivative(arr) {
                var results = [0];
                for (var i = 1; 0 < arr.length; i++) {
                    results.push(arr[i] - arr[i - 1]);
                }
                return results;
            }
            Statictics.derivative = derivative;
            function median(arr) {
                return Array.prototype.slice.call(arr, 0).sort()[arr.length / 2 | 0];
            }
            Statictics.median = median;
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
            Statictics.KDE = KDE;
            function mode(arr) {
                var kde = KDE(arr);
                return arr[findMax(kde)[1]];
            }
            Statictics.mode = mode;
            function gaussian(x) {
                return 1 / Math.sqrt(2 * Math.PI) * Math.exp(-Math.pow(x, 2) / 2);
            }
            Statictics.gaussian = gaussian;
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
            Statictics.findMax = findMax;
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
            Statictics.findMin = findMin;
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
            Statictics.LWMA = LWMA;
            function all(arr) {
                console.log("len", arr.length, "\n", "min", findMin(arr), "\n", "max", findMax(arr), "\n", "ave", average(arr), "\n", "med", median(arr), "\n", "mode", mode(arr), "\n", "var", variance(arr), "\n", "stdev", stdev(arr));
            }
            Statictics.all = all;
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
                        aves[j] = duxca.lib.Statictics.average(sums[j]);
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
            Statictics.k_means1D = k_means1D;
        })(Statictics = lib.Statictics || (lib.Statictics = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Util;
        (function (Util) {
            function importObject(hash) {
                new Function("hash", "Object.keys(hash).forEach(function(key){self[key]=hash[key];});").call(self, hash);
                console.log("some global variables appended: ", Object.keys(hash));
            }
            Util.importObject = importObject;
        })(Util = lib.Util || (lib.Util = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
/// <reference path="../../tsd/DataView/DataView.d.ts"/>
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Wave = (function () {
            function Wave(channel, sampleRate, int16arr) {
                //int16arr is 16bit nCh PCM
                var size = int16arr.length * 2; // データサイズ (byte) # 8bit*2 = 16bit
                channel = channel; // チャンネル数 (1:モノラル or 2:ステレオ)
                var bitsPerSample = 16; // サンプルあたりのビット数 (8 or 16) # 16bit PCM
                var offset = 44; // ヘッダ部分のサイズ
                this.view = new DataView(new ArrayBuffer(offset + size)); // バイト配列を作成
                writeUTFBytes(this.view, 0, "RIFF"); // Chunk ID # RIFF ヘッダ
                this.view.setUint32(4, offset + size - 8, true); // Chunk Size # ファイルサイズ - 8
                writeUTFBytes(this.view, 8, "WAVE"); // Format # WAVE ヘッダ
                writeUTFBytes(this.view, 12, "fmt "); // Subchunk 1 ID # fmt チャンク
                this.view.setUint32(16, 16, true); // Subchunk 1 Size # fmt チャンクのバイト数
                this.view.setUint16(20, 1, true); // Audio Format # フォーマットID
                this.view.setUint16(22, channel, true); // Num Channels # チャンネル数
                this.view.setUint32(24, sampleRate, true); // Sample Rate (Hz) # サンプリングレート
                this.view.setUint32(28, sampleRate * (bitsPerSample >>> 3) * channel, true); // Byte Rate (サンプリング周波数 * ブロックサイズ) # データ速度
                this.view.setUint16(32, (bitsPerSample >>> 3) * channel, true); // Block Align (チャンネル数 * 1サンプルあたりのビット数 / 8) # ブロックサイズ
                this.view.setUint16(34, bitsPerSample, true); // Bits Per Sample # サンプルあたりのビット数
                writeUTFBytes(this.view, 36, 'data'); // Subchunk 2 ID
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
        })();
        lib.Wave = Wave;
        function writeUTFBytes(view, offset, str) {
            for (var i = 0; i < str.length; i++) {
                view.setUint8(offset + i, str.charCodeAt(i));
            }
        }
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
