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
                    var _this = this;
                    this.peer = new Peer({ host: location.hostname, port: 9000, debug: 2 });
                    this.succesor = [];
                    this.predecessor = [];
                    setInterval(function () { console.log(_this.peer.id, "setInterval"); _this.stabilize(); }, 5000);
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
                            console.log(this.peer.id, "peer:open", "my id is", id);
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
                            console.log(this.peer.id, "peer:connection", "from", conn.peer);
                            conn.on("data", this.connDataHandlerCreater.call(this, conn));
                        }
                    });
                };
                Chord.prototype.create = function () {
                    this.stabilize();
                };
                Chord.prototype.stabilize = function () {
                    if (this.succesor.length > 0) {
                        this.succesor[0].send({ msg: "Am I your predecessor?", id: "" });
                    }
                };
                Chord.prototype.join = function (id) {
                    var _this = this;
                    console.log(this.peer.id, "try:join", "to", id);
                    return new Promise(function (resolve, reject) {
                        var conn = _this.peer.connect(id);
                        _this.succesor[0] = conn;
                        conn.on('open', openHandler.bind(_this));
                        conn.on('error', errorHandler.bind(_this));
                        conn.on("data", _this.connDataHandlerCreater.call(_this, conn));
                        conn.on('close', closeHandler.bind(_this));
                        function openHandler() {
                            console.log(this.peer.id, "conn:open");
                            conn.off('open', openHandler.bind(this));
                            conn.off('error', errorHandler.bind(this));
                            this.succesor[0] = conn;
                            this.stabilize();
                            resolve(Promise.resolve(this));
                        }
                        function errorHandler(err) {
                            console.error(this.peer.id, "conn:error", err);
                            conn.close();
                            reject(err);
                        }
                        function closeHandler() {
                            console.log(this.peer.id, "conn:close", conn.peer);
                        }
                    });
                };
                Chord.prototype.connDataHandlerCreater = function (conn) {
                    return dataHandler.bind(this);
                    function dataHandler(data) {
                        console.log(this.peer.id, "conn:data", data, "from", conn.peer);
                        var msg = data.msg, id = data.id;
                        switch (msg) {
                            // response
                            case "Yes. You are my predecessor.":
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
                                    function distance(str) {
                                        return str.split("").map(function (char) { return char.charCodeAt(0); }).reduce(function (sum, val) { return sum + val; });
                                    }
                                    var min = 0;
                                    var max = distance("zzzzzzzzzzzzzzzz");
                                    var myid = distance(this.peer.id);
                                    var succ = distance(this.succesor[0].peer);
                                    var pred = distance(this.predecessor[0].peer);
                                    var newbee = distance(conn.peer);
                                    console.log(this.peer.id, "conn:distance", { min: min, max: max, myid: myid, succ: succ, pred: pred, newbee: newbee });
                                    if (myid > newbee && newbee > pred) {
                                        //this.predecessor[0].send("please stabilize now");
                                        this.predecessor[0] = conn;
                                        conn.send({ msg: "Yes. You are my predecessor.", id: "" });
                                    }
                                    else if (myid > pred && pred > newbee) {
                                        conn.send({ msg: "No. Your succesor is worng.", id: this.predecessor[0].peer });
                                    }
                                    else if (pred > myid && ((max > newbee && newbee > pred) || (myid > newbee && newbee > min))) {
                                        //this.predecessor[0].send("please stabilize now");
                                        this.predecessor[0] = conn;
                                        conn.send({ msg: "Yes. You are my predecessor.", id: "" });
                                    }
                                    else if (newbee > myid) {
                                        conn.send({ msg: "No. Your succesor is worng.", id: this.predecessor[0].peer });
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
