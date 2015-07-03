/// <reference path="../../tsd/peerjs/peerjs.d.ts"/>
/// <reference path="../../typings/bluebird/bluebird.d.ts"/>
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var P2P;
        (function (P2P) {
            var Chord = (function () {
                function Chord() {
                    this.peer = new Peer({ host: location.hostname, port: 9000, debug: 2 });
                    this.succesor = [];
                    this.predecessor = [];
                }
                Chord.prototype.init = function () {
                    var _this = this;
                    return new Promise(function (resolve, reject) {
                        _this.peer.on('open', openHandler.bind(_this));
                        _this.peer.on('error', errorHandler.bind(_this));
                        _this.peer.on('close', closeHandler.bind(_this));
                        _this.peer.on('disconnected', disconnectedHandler.bind(_this));
                        _this.peer.on('connection', connectionHandler.bind(_this));
                        function openHandler(id) {
                            console.log(this.peer.id, "peer:open", id);
                            this.peer.off('open', openHandler);
                            this.peer.off('error', errorHandler);
                            resolve(Promise.resolve(this));
                        }
                        function errorHandler(err) {
                            console.error(this.peer.id, "peer:error", err);
                            reject(err);
                        }
                        function closeHandler() {
                            console.log(this.peer.id, "peer:close");
                        }
                        function disconnectedHandler() {
                            console.log(this.peer.id, "peer:disconnected");
                        }
                        function connectionHandler(conn) {
                            console.log(this.peer.id, "peer:connection", conn.peer, conn);
                            conn.on("data", this.connDataHandlerCreater.call(this, conn));
                        }
                    });
                };
                Chord.prototype.create = function () {
                    var _this = this;
                    setInterval(function () { return _this.stabilize(); }, 1000);
                };
                Chord.prototype.join = function (id) {
                    var _this = this;
                    return new Promise(function (resolve, reject) {
                        var conn = _this.peer.connect(id);
                        conn.on('open', openHandler.bind(_this));
                        conn.on('error', errorHandler.bind(_this));
                        conn.on("data", _this.connDataHandlerCreater.call(_this, conn));
                        conn.on('close', closeHandler.bind(_this));
                        function openHandler() {
                            console.log(this.peer.id + "conn:open");
                            conn.off('open', openHandler);
                            conn.off('error', errorHandler.bind(this));
                            this.succesor[0] = conn;
                            resolve(Promise.resolve(this));
                        }
                        function errorHandler(err) {
                            console.error(this.peer.id + "conn:error", err);
                            conn.close();
                            reject(err);
                        }
                        function closeHandler() {
                            console.log(this.peer.id + "conn:close");
                        }
                    });
                };
                Chord.prototype.stabilize = function () {
                    this.succesor.length > 0 && this.succesor[0].send({ msg: "Am I your predecessor?", id: "" });
                };
                Chord.prototype.connDataHandlerCreater = function (conn) {
                    return dataHandler.bind(this);
                    function dataHandler(data) {
                        var _this = this;
                        var msg = data.msg, id = data.id;
                        switch (msg) {
                            // response
                            case "Yes. You are my predecessor.":
                                setInterval(function () { return _this.stabilize(); }, 1000);
                                break;
                            case "No. Your succesor is worng.":
                                conn.close();
                                this.join(id);
                                break;
                            // request
                            case "Am I your predecessor?":
                                if (typeof this.predecessor[0] === "undefined" && typeof this.succesor[0] === "undefined") {
                                    this.succesor[0] = conn;
                                    this.predecessor[0] = conn;
                                    conn.send({ msg: "Yes. You are my predecessor.", id: "" });
                                }
                                else if (typeof this.predecessor[0] === "undefined") {
                                    this.predecessor[0] = conn;
                                    conn.send({ msg: "Yes. You are my predecessor.", id: "" });
                                }
                                else if (this.predecessor[0].peer === conn.peer) {
                                    conn.send({ msg: "Yes. You are my predecessor.", id: "" });
                                }
                                else {
                                    var min = 0;
                                    var max = Math.pow(36, 17) - 1; // "abcdefghijklmnopqrstuvwxyz0123456789".length -> 36
                                    var myid = parseInt(this.peer.id, 36);
                                    var succ = parseInt(this.succesor[0].peer, 36);
                                    var pred = parseInt(this.predecessor[0].peer, 36);
                                    var newbee = parseInt(conn.peer, 36);
                                    if ((myid > pred && pred > newbee) || (newbee > myid)) {
                                        conn.send({ msg: "No. Your succesor is worng.", data: this.predecessor[0].peer });
                                    }
                                    else if ((myid > newbee && newbee > pred) ||
                                        (pred > myid && ((myid > newbee && newbee > min) || (max > newbee && newbee > pred)))) {
                                        //this.predecessor[0].send("please stabilize now");
                                        this.predecessor[0] = conn;
                                        conn.send({ msg: "Yes. You are my predecessor.", id: "" });
                                    }
                                    else {
                                        console.warn("something wrong");
                                        debugger;
                                    }
                                }
                                break;
                        }
                    }
                };
                return Chord;
            })();
            P2P.Chord = Chord;
        })(P2P = lib.P2P || (lib.P2P = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
