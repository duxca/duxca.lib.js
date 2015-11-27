/// <reference path="../typings/tsd.d.ts"/>
class Chord {
    constructor(opt) {
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
    _init() {
        if (!!this.peer)
            return Promise.resolve();
        this.peer = new Peer({ host: this.host, port: this.port, debug: 2 });
        this.peer.on('open', (id) => { if (this.debug)
            console.log(this.peer.id, "peer:open", id); });
        // open
        // Emitted when a connection to the PeerServer is established.
        // You may use the peer before this is emitted, but messages to the server will be queued.
        // id is the brokering ID of the peer (which was either provided in the constructor or assigned by the server).
        //   You should not wait for this event before connecting to other peers if connection speed is important.
        this.peer.on('error', (err) => { if (this.debug)
            console.error(this.peer.id, "peer:error", err); });
        // error
        // Errors on the peer are almost always fatal and will destroy the peer.
        // Errors from the underlying socket and PeerConnections are forwarded here.
        this.peer.on('close', () => {
            if (this.debug)
                console.log(this.peer.id, "peer:close");
            clearInterval(this.tid);
            this.joined = false;
        });
        // close
        // Emitted when the peer is destroyed and can no longer accept or create any new connections.
        // At this time, the peer's connections will all be closed.
        //   To be extra certain that peers clean up correctly,
        //   we recommend calling peer.destroy() on a peer when it is no longer needed.
        this.peer.on('disconnected', () => { if (this.debug)
            console.log(this.peer.id, "peer:disconnected"); });
        // disconnected
        // Emitted when the peer is disconnected from the signalling server,
        // either manually or because the connection to the signalling server was lost.
        // When a peer is disconnected, its existing connections will stay alive,
        // but the peer cannot accept or create any new connections.
        // You can reconnect to the server by calling peer.reconnect().
        this.peer.on('connection', (conn) => {
            // Emitted when a new data connection is established from a remote peer.
            if (this.debug)
                console.log(this.peer.id, "peer:connection", "from", conn.peer);
            this._connectionHandler(conn);
        });
        this.tid = setInterval(() => {
            if (this.successor) {
                if (this.debug)
                    console.log(this.peer.id, "setInterval");
                this.stabilize();
            }
        }, this.STABILIZE_INTERVAL);
        return new Promise((resolve, reject) => {
            this.peer.on('error', _error);
            this.peer.on('open', _open);
            var off = () => {
                this.peer.off('error', _error);
                this.peer.off('open', _open);
            };
            function _open(id) { off(); resolve(Promise.resolve()); }
            function _error(err) { off(); reject(err); }
        });
    }
    create() {
        return this._init().then(() => {
            if (this.peer.destroyed)
                return Promise.reject(new Error(this.peer.id + " is already destroyed"));
            if (this.debug)
                console.log(this.peer.id, "create:done");
            return this;
        });
    }
    join(id) {
        return this._init().then(() => {
            if (this.peer.destroyed)
                return Promise.reject(new Error(this.peer.id + " is already destroyed"));
            if (typeof id !== "string")
                return Promise.reject(new Error("peer id is not string."));
            var conn = this.peer.connect(id);
            this._connectionHandler(conn);
            return new Promise((resolve, reject) => {
                conn.on('error', _error);
                conn.on('open', _open);
                var off = () => {
                    conn.off('error', _error);
                    conn.off('open', _open);
                };
                function _open() { off(); resolve(Promise.resolve()); }
                function _error(err) { off(); reject(err); }
            }).then(() => {
                if (this.debug)
                    console.log(this.peer.id, "join:done", "to", id);
                this.successor = conn;
                this.joined = true;
                setTimeout(() => this.stabilize(), 0);
                return this;
            });
        });
    }
    stabilize() {
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
    }
    request(event, data, addressee, timeout) {
        return new Promise((resolve, reject) => {
            if (!this.peer)
                throw new Error("this node does not join yet");
            if (this.peer.destroyed)
                reject(new Error(this.peer.id + " is already destroyed"));
            if (!this.successor && !!this.predecessor)
                throw new Error(this.peer.id + " does not have successor.");
            var token = {
                payload: { event: event, addressee: addressee, data: data },
                requestId: this.lastRequestId++,
                route: [this.peer.id],
                time: [Date.now()]
            };
            this.requests[token.requestId] = (_token) => {
                delete this.requests[token.requestId];
                resolve(Promise.resolve(_token));
            };
            if (typeof timeout === "number") {
                setTimeout(() => reject(new Error(this.peer.id + "request(" + event + "):timeout(" + timeout + ")")), timeout);
            }
            if (this.listeners[token.payload.event] instanceof Function
                && (!Array.isArray(token.payload.addressee) // broadcast
                    || token.payload.addressee.indexOf(this.peer.id) >= 0)) {
                if (!this.successor && !this.predecessor) {
                    setTimeout(() => {
                        this.listeners[token.payload.event](token, (token) => {
                            this.requests[token.requestId](token);
                        });
                    }, 0);
                }
                else {
                    this.listeners[token.payload.event](token, (token) => {
                        if (!this.successor.open)
                            throw new Error(this.peer.id + " has successor, but not open.");
                        this.successor.send({ msg: "Token", token: token });
                    });
                }
            }
        });
    }
    on(event, listener) {
        this.listeners[event] = listener;
    }
    off(event, listener) {
        delete this.listeners[event];
    }
    _connectionHandler(conn) {
        conn.on('open', () => { if (this.debug)
            console.log(this.peer.id, "conn:open", "to", conn.peer); });
        conn.on('close', () => {
            // Emitted when either you or the remote peer closes the data connection.
            //  Firefox does not yet support this event.
            if (this.debug)
                console.log(this.peer.id, "conn:close", "to", conn.peer);
        });
        conn.on('error', (err) => {
            if (this.debug)
                console.error(this.peer.id, "conn:error", "to", conn.peer, err);
            this.stabilize();
        });
        var ondata = null;
        conn.on('data', ondata = (data) => {
            if (!this.successor) {
                this.join(conn.peer).then(() => {
                    ondata(data);
                });
                return;
            }
            if (!this.predecessor) {
                this.predecessor = conn;
            }
            if (this.debug)
                console.log(this.peer.id, "conn:data", data, "from", conn.peer);
            switch (data.msg) {
                // ring network trafic
                case "Token":
                    if (data.token.route[0] === this.peer.id && this.requests[data.token.requestId] instanceof Function) {
                        this.requests[data.token.requestId](data.token);
                        break;
                    }
                    if (data.token.route.indexOf(this.peer.id) !== -1) {
                        if (this.debug)
                            console.log(this.peer.id, "conn:token", "dead token detected.", data.token);
                        break;
                    }
                    data.token.route.push(this.peer.id);
                    data.token.time.push(Date.now());
                    var tokenpassing = (token) => {
                        if (this.successor.open) {
                            this.successor.send({ msg: "Token", token: token });
                        }
                        else {
                            this.stabilize();
                            setTimeout(() => tokenpassing(token), 1000);
                        }
                    };
                    if (this.listeners[data.token.payload.event] instanceof Function
                        && (!Array.isArray(data.token.payload.addressee) // broadcast
                            || data.token.payload.addressee.indexOf(this.peer.id) >= 0)) {
                        this.listeners[data.token.payload.event](data.token, tokenpassing);
                    }
                    else {
                        tokenpassing(data.token);
                    }
                    break;
                // response
                case "This is my predecessor.":
                    var min = 0;
                    var max = distance("zzzzzzzzzzzzzzzz");
                    var myid = distance(this.peer.id);
                    var succ = distance(conn.peer);
                    var succ_says_pred = distance(data.id);
                    if (this.debug)
                        console.log(this.peer.id, "conn:distance1", { min: min, max: max, myid: myid, succ: succ, succ_says_pred: succ_says_pred });
                    if (data.id === this.peer.id) {
                        this.successors = [conn.peer].concat(data.successors).slice(0, 4);
                    }
                    else if (succ > succ_says_pred && succ_says_pred > myid) {
                        conn.close();
                        this.join(data.id);
                    }
                    else {
                        conn.send({ msg: "Check your predecessor." });
                    }
                    break;
                case "Your successor is worng.":
                    conn.close();
                    this.join(data.id);
                    break;
                case "You need stabilize now.":
                    this.stabilize();
                    break;
                // request
                case "What is your predecessor?":
                    conn.send({ msg: "This is my predecessor.", id: this.predecessor.peer, successors: this.successors });
                    break;
                case "Check your predecessor.":
                    var min = 0;
                    var max = distance("zzzzzzzzzzzzzzzz");
                    var myid = distance(this.peer.id);
                    var succ = distance(this.successor.peer);
                    var pred = distance(this.predecessor.peer);
                    var newbee = distance(conn.peer);
                    if (this.debug)
                        console.log(this.peer.id, "conn:distance2", { min: min, max: max, myid: myid, succ: succ, pred: pred, newbee: newbee });
                    if ((myid > newbee && newbee > pred)) {
                        if (this.predecessor.open) {
                            this.predecessor.send({ msg: "You need stabilize now." });
                        }
                        this.predecessor = conn;
                    }
                    else if ((myid > pred && pred > newbee)) {
                        conn.send({ msg: "Your successor is worng.", id: this.predecessor.peer });
                    }
                    else if ((pred > myid && ((max > newbee && newbee > pred) || (myid > newbee && newbee > min)))) {
                        if (this.predecessor.open) {
                            this.predecessor.send({ msg: "You need stabilize now." });
                        }
                        this.predecessor = conn;
                    }
                    else if (pred !== newbee && newbee > myid) {
                        conn.send({ msg: "Your successor is worng.", id: this.predecessor.peer });
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
    }
}
exports.Chord = Chord;
function distance(str) {
    return Math.sqrt(str.split("").map((char) => char.charCodeAt(0)).reduce((sum, val) => sum + Math.pow(val, 2)));
}
exports.distance = distance;
