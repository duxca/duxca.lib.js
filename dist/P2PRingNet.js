(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.P2PRingNet = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/// <reference path="../typings/tsd.d.ts"/>
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.distance = distance;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var Chord = (function () {
    function Chord(opt) {
        _classCallCheck(this, Chord);

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

    _createClass(Chord, [{
        key: '_init',
        value: function _init() {
            var _this = this;

            if (!!this.peer) return Promise.resolve();
            this.peer = new Peer({ host: this.host, port: this.port, debug: 2 });
            this.peer.on('open', function (id) {
                if (_this.debug) console.log(_this.peer.id, "peer:open", id);
            });
            // open
            // Emitted when a connection to the PeerServer is established.
            // You may use the peer before this is emitted, but messages to the server will be queued.
            // id is the brokering ID of the peer (which was either provided in the constructor or assigned by the server).
            //   You should not wait for this event before connecting to other peers if connection speed is important.
            this.peer.on('error', function (err) {
                if (_this.debug) console.error(_this.peer.id, "peer:error", err);
            });
            // error
            // Errors on the peer are almost always fatal and will destroy the peer.
            // Errors from the underlying socket and PeerConnections are forwarded here.
            this.peer.on('close', function () {
                if (_this.debug) console.log(_this.peer.id, "peer:close");
                clearInterval(_this.tid);
                _this.joined = false;
            });
            // close
            // Emitted when the peer is destroyed and can no longer accept or create any new connections.
            // At this time, the peer's connections will all be closed.
            //   To be extra certain that peers clean up correctly,
            //   we recommend calling peer.destroy() on a peer when it is no longer needed.
            this.peer.on('disconnected', function () {
                if (_this.debug) console.log(_this.peer.id, "peer:disconnected");
            });
            // disconnected
            // Emitted when the peer is disconnected from the signalling server,
            // either manually or because the connection to the signalling server was lost.
            // When a peer is disconnected, its existing connections will stay alive,
            // but the peer cannot accept or create any new connections.
            // You can reconnect to the server by calling peer.reconnect().
            this.peer.on('connection', function (conn) {
                // Emitted when a new data connection is established from a remote peer.
                if (_this.debug) console.log(_this.peer.id, "peer:connection", "from", conn.peer);
                _this._connectionHandler(conn);
            });
            this.tid = setInterval(function () {
                if (_this.successor) {
                    if (_this.debug) console.log(_this.peer.id, "setInterval");
                    _this.stabilize();
                }
            }, this.STABILIZE_INTERVAL);
            return new Promise(function (resolve, reject) {
                _this.peer.on('error', _error);
                _this.peer.on('open', _open);
                var off = function off() {
                    _this.peer.off('error', _error);
                    _this.peer.off('open', _open);
                };
                function _open(id) {
                    off();resolve(Promise.resolve());
                }
                function _error(err) {
                    off();reject(err);
                }
            });
        }
    }, {
        key: 'create',
        value: function create() {
            var _this2 = this;

            return this._init().then(function () {
                if (_this2.peer.destroyed) return Promise.reject(new Error(_this2.peer.id + " is already destroyed"));
                if (_this2.debug) console.log(_this2.peer.id, "create:done");
                return _this2;
            });
        }
    }, {
        key: 'join',
        value: function join(id) {
            var _this3 = this;

            return this._init().then(function () {
                if (_this3.peer.destroyed) return Promise.reject(new Error(_this3.peer.id + " is already destroyed"));
                if (typeof id !== "string") return Promise.reject(new Error("peer id is not string."));
                var conn = _this3.peer.connect(id);
                _this3._connectionHandler(conn);
                return new Promise(function (resolve, reject) {
                    conn.on('error', _error);
                    conn.on('open', _open);
                    var off = function off() {
                        conn.off('error', _error);
                        conn.off('open', _open);
                    };
                    function _open() {
                        off();resolve(Promise.resolve());
                    }
                    function _error(err) {
                        off();reject(err);
                    }
                }).then(function () {
                    if (_this3.debug) console.log(_this3.peer.id, "join:done", "to", id);
                    _this3.successor = conn;
                    _this3.joined = true;
                    setTimeout(function () {
                        return _this3.stabilize();
                    }, 0);
                    return _this3;
                });
            });
        }
    }, {
        key: 'stabilize',
        value: function stabilize() {
            if (!this.peer) throw new Error("this node does not join yet");
            if (this.peer.destroyed) throw new Error(this.peer.id + " is already destroyed");
            if (this.debug) console.log(this.peer.id, "stabilize:to", this.successor.peer);
            if (!!this.successor && this.successor.open) {
                this.successor.send({ msg: "What is your predecessor?" });
            }
            if (this.joined && !!this.successor && !this.successor.open) {
                if (typeof this.successors[1] !== "string") {
                    if (!!this.predecessor && this.predecessor.open) {
                        // when all successor are died, try predecessor as new successor
                        if (this.debug) console.log(this.peer.id, "stabilize:successor", this.successor.peer, "is died. fail back to predecessor", this.predecessor.peer);
                        //this.successor.close();
                        this.successor = null;
                        this.join(this.predecessor.peer);
                    }
                    if (this.debug) console.log(this.peer.id, "stabilize:all connects are lost. Nothing to do");
                    this.joined = false;
                    clearInterval(this.tid);
                    return;
                }
                if (this.successors[1] !== this.peer.id) {
                    if (this.debug) console.log(this.peer.id, "stabilize:successor", this.successor.peer, "is died. try successor[1]", this.successors[1], this.successors);
                    //this.successor.close();
                    this.successor = null;
                    this.join(this.successors[1]);
                } else {
                    this.successors.shift();
                    this.stabilize();
                    return;
                }
            }
            if (this.joined && !!this.predecessor && !this.predecessor.open) {
                if (this.debug) console.log(this.peer.id, "stabilize:predecessor", this.predecessor.peer, "is died.");
                //this.predecessor.close();
                this.predecessor = null;
            }
        }
    }, {
        key: 'request',
        value: function request(event, data, addressee, timeout) {
            var _this4 = this;

            return new Promise(function (resolve, reject) {
                if (!_this4.peer) throw new Error("this node does not join yet");
                if (_this4.peer.destroyed) reject(new Error(_this4.peer.id + " is already destroyed"));
                if (!_this4.successor && !!_this4.predecessor) throw new Error(_this4.peer.id + " does not have successor.");
                var token = {
                    payload: { event: event, addressee: addressee, data: data },
                    requestId: _this4.lastRequestId++,
                    route: [_this4.peer.id],
                    time: [Date.now()]
                };
                _this4.requests[token.requestId] = function (_token) {
                    delete _this4.requests[token.requestId];
                    resolve(Promise.resolve(_token));
                };
                if (typeof timeout === "number") {
                    setTimeout(function () {
                        return reject(new Error(_this4.peer.id + "request(" + event + "):timeout(" + timeout + ")"));
                    }, timeout);
                }
                if (_this4.listeners[token.payload.event] instanceof Function && (!Array.isArray(token.payload.addressee) // broadcast
                 || token.payload.addressee.indexOf(_this4.peer.id) >= 0)) {
                    if (!_this4.successor && !_this4.predecessor) {
                        setTimeout(function () {
                            _this4.listeners[token.payload.event](token, function (token) {
                                _this4.requests[token.requestId](token);
                            });
                        }, 0);
                    } else {
                        _this4.listeners[token.payload.event](token, function (token) {
                            if (!_this4.successor.open) throw new Error(_this4.peer.id + " has successor, but not open.");
                            _this4.successor.send({ msg: "Token", token: token });
                        });
                    }
                }
            });
        }
    }, {
        key: 'on',
        value: function on(event, listener) {
            this.listeners[event] = listener;
        }
    }, {
        key: 'off',
        value: function off(event, listener) {
            delete this.listeners[event];
        }
    }, {
        key: '_connectionHandler',
        value: function _connectionHandler(conn) {
            var _this5 = this;

            conn.on('open', function () {
                if (_this5.debug) console.log(_this5.peer.id, "conn:open", "to", conn.peer);
            });
            conn.on('close', function () {
                // Emitted when either you or the remote peer closes the data connection.
                //  Firefox does not yet support this event.
                if (_this5.debug) console.log(_this5.peer.id, "conn:close", "to", conn.peer);
            });
            conn.on('error', function (err) {
                if (_this5.debug) console.error(_this5.peer.id, "conn:error", "to", conn.peer, err);
                _this5.stabilize();
            });
            var ondata = null;
            conn.on('data', ondata = function (data) {
                if (!_this5.successor) {
                    _this5.join(conn.peer).then(function () {
                        ondata(data);
                    });
                    return;
                }
                if (!_this5.predecessor) {
                    _this5.predecessor = conn;
                }
                if (_this5.debug) console.log(_this5.peer.id, "conn:data", data, "from", conn.peer);
                switch (data.msg) {
                    // ring network trafic
                    case "Token":
                        if (data.token.route[0] === _this5.peer.id && _this5.requests[data.token.requestId] instanceof Function) {
                            _this5.requests[data.token.requestId](data.token);
                            break;
                        }
                        if (data.token.route.indexOf(_this5.peer.id) !== -1) {
                            if (_this5.debug) console.log(_this5.peer.id, "conn:token", "dead token detected.", data.token);
                            break;
                        }
                        data.token.route.push(_this5.peer.id);
                        data.token.time.push(Date.now());
                        var tokenpassing = function tokenpassing(token) {
                            if (_this5.successor.open) {
                                _this5.successor.send({ msg: "Token", token: token });
                            } else {
                                _this5.stabilize();
                                setTimeout(function () {
                                    return tokenpassing(token);
                                }, 1000);
                            }
                        };
                        if (_this5.listeners[data.token.payload.event] instanceof Function && (!Array.isArray(data.token.payload.addressee) // broadcast
                         || data.token.payload.addressee.indexOf(_this5.peer.id) >= 0)) {
                            _this5.listeners[data.token.payload.event](data.token, tokenpassing);
                        } else {
                            tokenpassing(data.token);
                        }
                        break;
                    // response
                    case "This is my predecessor.":
                        var min = 0;
                        var max = distance("zzzzzzzzzzzzzzzz");
                        var myid = distance(_this5.peer.id);
                        var succ = distance(conn.peer);
                        var succ_says_pred = distance(data.id);
                        if (_this5.debug) console.log(_this5.peer.id, "conn:distance1", { min: min, max: max, myid: myid, succ: succ, succ_says_pred: succ_says_pred });
                        if (data.id === _this5.peer.id) {
                            _this5.successors = [conn.peer].concat(data.successors).slice(0, 4);
                        } else if (succ > succ_says_pred && succ_says_pred > myid) {
                            conn.close();
                            _this5.join(data.id);
                        } else {
                            conn.send({ msg: "Check your predecessor." });
                        }
                        break;
                    case "Your successor is worng.":
                        conn.close();
                        _this5.join(data.id);
                        break;
                    case "You need stabilize now.":
                        _this5.stabilize();
                        break;
                    // request
                    case "What is your predecessor?":
                        conn.send({ msg: "This is my predecessor.", id: _this5.predecessor.peer, successors: _this5.successors });
                        break;
                    case "Check your predecessor.":
                        var min = 0;
                        var max = distance("zzzzzzzzzzzzzzzz");
                        var myid = distance(_this5.peer.id);
                        var succ = distance(_this5.successor.peer);
                        var pred = distance(_this5.predecessor.peer);
                        var newbee = distance(conn.peer);
                        if (_this5.debug) console.log(_this5.peer.id, "conn:distance2", { min: min, max: max, myid: myid, succ: succ, pred: pred, newbee: newbee });
                        if (myid > newbee && newbee > pred) {
                            if (_this5.predecessor.open) {
                                _this5.predecessor.send({ msg: "You need stabilize now." });
                            }
                            _this5.predecessor = conn;
                        } else if (myid > pred && pred > newbee) {
                            conn.send({ msg: "Your successor is worng.", id: _this5.predecessor.peer });
                        } else if (pred > myid && (max > newbee && newbee > pred || myid > newbee && newbee > min)) {
                            if (_this5.predecessor.open) {
                                _this5.predecessor.send({ msg: "You need stabilize now." });
                            }
                            _this5.predecessor = conn;
                        } else if (pred !== newbee && newbee > myid) {
                            conn.send({ msg: "Your successor is worng.", id: _this5.predecessor.peer });
                        } else if (newbee === pred) {} else {
                            console.warn("something wrong2");
                            debugger;
                        }
                        break;
                    default:
                        console.warn("something wrong3", data.msg);
                        debugger;
                }
            });
        }
    }]);

    return Chord;
})();

exports.Chord = Chord;

function distance(str) {
    return Math.sqrt(str.split("").map(function (char) {
        return char.charCodeAt(0);
    }).reduce(function (sum, val) {
        return sum + Math.pow(val, 2);
    }));
}
},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _Chord2 = require('./Chord');

var _Chord = _interopRequireWildcard(_Chord2);

var Chord = _Chord.Chord;
exports.Chord = Chord;
},{"./Chord":1}]},{},[2])(2)
});