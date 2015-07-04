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
            function Chord() {
                var _this = this;
                this.joined = false;
                this.peer = new Peer({ host: location.hostname, port: 9000, debug: 2 });
                this.succesor = null;
                this.succesors = [];
                this.predecessor = null;
                this.predecessors = [];
                this.ontoken = function (token, cb) { return cb(token); };
                var tid = setInterval(function () {
                    if (!!_this.predecessor && _this.predecessor.open && !!_this.succesor && _this.succesor.open) {
                        _this.joined = true;
                    }
                    if (_this.peer.id)
                        _this.stabilize();
                }, 5000);
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
            Chord.prototype.join = function (id) {
                var _this = this;
                console.log(this.peer.id, "try:join", "to", id);
                return new Promise(function (resolve, reject) {
                    var conn = _this.peer.connect(id);
                    _this.succesor = conn;
                    _this.joined = true;
                    conn.on('open', openHandler.bind(_this));
                    conn.on('error', errorHandler.bind(_this));
                    conn.on("data", _this.connDataHandlerCreater.call(_this, conn));
                    conn.on('close', closeHandler.bind(_this));
                    function openHandler() {
                        console.log(this.peer.id, "conn:open", "to", conn.peer);
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
            Chord.prototype.stabilize = function () {
                console.log(this.peer.id, "stabilize:to", !!this.succesor && this.succesor, this.joined);
                if (!!this.succesor && this.succesor.open) {
                    this.succesor.send({ msg: "What are you predecessor?", id: "", succesors: [] });
                }
                if (this.joined && !!this.succesor && !this.succesor.open) {
                    console.log(this.peer.id, "stabilize:succesor", this.succesor, "is died. try", this.succesors[1]);
                    this.succesor.close();
                    this.succesor = null;
                    this.join(this.succesors[1]);
                }
                if (this.joined && !!this.predecessor && !this.predecessor.open) {
                    console.log(this.peer.id, "stabilize:predecessor", this.predecessor, "is died.");
                    this.predecessor.close();
                    this.predecessor = null;
                }
            };
            Chord.prototype.connDataHandlerCreater = function (conn) {
                var _this = this;
                var callee;
                return callee = function (data) {
                    console.log(_this.peer.id, "conn:data", data, "from", conn.peer);
                    if (!_this.succesor) {
                        _this.join(conn.peer).then(function () {
                            _this.succesor.send({ msg: "Token", token: { sender: _this.peer.id, event: "ping", route: [_this.peer.id], data: null, date: Date.now() } });
                            callee(data);
                        });
                        return;
                    }
                    if (!_this.predecessor) {
                        _this.predecessor = conn;
                    }
                    var msg = data.msg, id = data.id, succesors = data.succesors, token = data.token;
                    switch (msg) {
                        // ring network trafic
                        case "Token":
                            if (token.sender === _this.peer.id) {
                                console.log("TOKEN_RESULT", token);
                                setTimeout(function () {
                                    _this.succesor.send({ msg: "Token", token: { sender: _this.peer.id, event: "ping", route: [_this.peer.id], data: null, date: Date.now() } });
                                }, 1000);
                                break;
                            }
                            if (token.route.indexOf(_this.peer.id) !== -1) {
                                console.log(_this.peer.id, "conn:token", "dead token detected.", token);
                                break;
                            }
                            token.route.push(_this.peer.id);
                            _this.ontoken(token, function (token) {
                                _this.succesor.send({ msg: "Token", token: token });
                            });
                            break;
                        // response
                        case "Your succesor is worng.":
                            conn.close();
                            _this.join(id);
                            break;
                        case "You need to stabilize now.":
                            _this.stabilize();
                            break;
                        case "This is my predecessor.":
                            var min = 0;
                            var max = distance("zzzzzzzzzzzzzzzz");
                            var myid = distance(_this.peer.id);
                            var succ = distance(conn.peer);
                            var succ_says_pred = distance(id);
                            console.log(_this.peer.id, "conn:distance1", { min: min, max: max, myid: myid, succ: succ, succ_says_pred: succ_says_pred });
                            if (id === _this.peer.id) {
                                _this.succesors = [conn.peer].concat(succesors).slice(0, 3);
                            }
                            else if (succ > succ_says_pred && succ_says_pred > myid) {
                                conn.close();
                                _this.join(id);
                                break;
                            }
                            else {
                                conn.send({ msg: "Check your predecessor", id: "", succesors: [] });
                            }
                            break;
                        // request
                        case "What are you predecessor?":
                            if (!_this.predecessor) {
                                _this.predecessor = conn;
                                conn.send({ msg: "This is my predecessor.", id: conn.peer, succesors: _this.succesors });
                            }
                            else {
                                conn.send({ msg: "This is my predecessor.", id: _this.predecessor.peer, succesors: _this.succesors });
                            }
                            break;
                        case "Check your predecessor":
                            var min = 0;
                            var max = distance("zzzzzzzzzzzzzzzz");
                            var myid = distance(_this.peer.id);
                            var succ = distance(_this.succesor.peer);
                            var pred = distance(_this.predecessor.peer);
                            var newbee = distance(conn.peer);
                            console.log(_this.peer.id, "conn:distance2", { min: min, max: max, myid: myid, succ: succ, pred: pred, newbee: newbee });
                            if (myid > newbee && newbee > pred) {
                                if (_this.predecessor.open) {
                                    _this.predecessor.send({ msg: "You need to stabilize now.", id: "", succesors: [] });
                                }
                                _this.predecessor = conn;
                            }
                            else if (myid > pred && pred > newbee) {
                                conn.send({ msg: "Your succesor is worng.", id: _this.predecessor.peer, succesors: [] });
                            }
                            else if (pred > myid && ((max > newbee && newbee > pred) || (myid > newbee && newbee > min))) {
                                if (_this.predecessor.open) {
                                    _this.predecessor.send({ msg: "You need to stabilize now.", id: "", succesors: [] });
                                }
                                _this.predecessor = conn;
                            }
                            else if (newbee > myid) {
                                conn.send({ msg: "Your succesor is worng.", id: _this.predecessor.peer, succesors: [] });
                            }
                            else {
                                console.warn("something wrong2");
                                debugger;
                            }
                            break;
                        default:
                            console.warn("something wrong2");
                            debugger;
                    }
                };
            };
            return Chord;
        })();
        lib.Chord = Chord;
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
