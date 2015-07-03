/// <reference path="../../typings/peerjs/peerjs.d.ts"/>
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var P2P;
        (function (P2P) {
            var Chord = (function () {
                function Chord() {
                    var _this = this;
                    this.peer = new Peer({ host: location.hostname, port: 9000, debug: 2 });
                    this.peer.on('open', function (id) {
                        _this.callbacks.onopen();
                    });
                    this.peer.on('connection', function (conn) {
                        console.log("offer connection:", conn.peer, conn);
                        conn.on("data", function (_a) {
                            var msg = _a.msg, data = _a.data;
                            switch (msg) {
                                case "Am I your predecessor?":
                                    if (typeof _this.predecessor[0] === "undefined" && typeof _this.succesor[0] === "undefined") {
                                        _this.succesor[0] = conn;
                                        _this.predecessor[0] = conn;
                                        conn.send("Yes. You are my predecessor.");
                                    }
                                    else if (typeof _this.predecessor[0] === "undefined") {
                                        _this.predecessor[0] = conn;
                                        conn.send("Yes. You are my predecessor.");
                                    }
                                    else if (_this.predecessor[0].peer === conn.peer) {
                                        conn.send("Yes. You are my predecessor.");
                                    }
                                    else {
                                        var pred = parseInt(_this.predecessor[0].peer, 36); // "abcdefghijklmnopqrstuvwxyz0123456789".length -> 36
                                        var newbee = parseInt(conn.peer, 36);
                                        var myid = parseInt(_this.peer.id, 36);
                                        if (myid > newbee && newbee > pred) {
                                            _this.predecessor[0] = conn;
                                            conn.send("Yes. You are my predecessor.");
                                        }
                                        else if (myid > pred && pred > newbee) {
                                            conn.send({ msg: "No. Your succesor is worng.", data: _this.predecessor[0].peer });
                                        }
                                        else if (newbee > myid) {
                                            if (_this.amIRoot) {
                                                conn.send({ msg: "No. Your succesor is worng.", data: _this.succesor[0].peer });
                                            }
                                            else {
                                                conn.send({ msg: "No. Your succesor is worng.", data: _this.succesor[0].peer });
                                            }
                                        }
                                    }
                                    break;
                            }
                        });
                    });
                    this.peer.on('close', function () { console.log("closed"); });
                    this.peer.on('disconnected', function () { console.log("disconnected"); });
                    this.peer.on('error', function (err) { console.error(err); });
                    this.callbacks = {
                        onopen: function () { },
                        onconnection: function () { }
                    };
                }
                Chord.prototype.create = function () {
                    this.amIRoot = true;
                };
                Chord.prototype.join = function (id) {
                    var _this = this;
                    this.amIRoot = false;
                    var conn = this.peer.connect(id);
                    conn.on('open', function () {
                        _this.succesor[0] = conn;
                        _this.stabilize();
                        conn.on("data", function (_a) {
                            var msg = _a.msg, data = _a.data;
                            switch (msg) {
                                case "Yes. You are my predecessor.":
                                    setTimeout(function () { return _this.stabilize(); }, 5000);
                                    break;
                                case "No. Your succesor is worng.":
                                    conn.close();
                                    _this.join(data);
                                    break;
                            }
                        });
                    });
                    conn.on('data', function (data) { console.log(data); });
                    conn.on('close', function () { console.log("close"); });
                    conn.on('error', function (err) { console.error(err); });
                };
                Chord.prototype.stabilize = function () {
                    this.succesor[0].send({ msg: "Am I your predecessor?", data: "" });
                };
                return Chord;
            })();
            P2P.Chord = Chord;
        })(P2P = lib.P2P || (lib.P2P = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
