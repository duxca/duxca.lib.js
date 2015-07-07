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
                    if (!_this.successor && !_this.predecessor && _this.listeners[token.payload.event] instanceof Function) {
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
                                || !Array.isArray(data.token.payload.addressee)
                                || data.token.payload.addressee.indexOf(_this.peer.id) < 0) {
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
