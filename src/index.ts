
class Chord {

  successor: PeerJs.DataConnection;
  predecessor: PeerJs.DataConnection;
  successors: string[];
  predecessors: string[];
  joined: boolean;
  peer: PeerJs.Peer;
  debug: boolean;
  tid: number;
  listeners: {[event:string]: (token:Token, cb:(token:Token)=> void)=> void};
  requests: {[requestId:number]: ((token:Token)=> void)};
  host: string;
  port: number;
  lastRequestId: number;
  STABILIZE_INTERVAL: number;

  constructor(opt: {host: string, port: number}){
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

  _init(): Promise<void>{
    if(!!this.peer) return Promise.resolve();
    this.peer = new Peer({host: this.host, port: this.port, debug: 2});
    this.peer.on('open', (id)=>{ if(this.debug) console.log(this.peer.id, "peer:open", id); });
    // open
    // Emitted when a connection to the PeerServer is established.
    // You may use the peer before this is emitted, but messages to the server will be queued.
    // id is the brokering ID of the peer (which was either provided in the constructor or assigned by the server).
    //   You should not wait for this event before connecting to other peers if connection speed is important.
    this.peer.on('error', (err)=>{ if(this.debug) console.error(this.peer.id, "peer:error", err); });
    // error
    // Errors on the peer are almost always fatal and will destroy the peer.
    // Errors from the underlying socket and PeerConnections are forwarded here.
    this.peer.on('close', ()=>{
      if(this.debug) console.log(this.peer.id, "peer:close");
      clearInterval(this.tid);
      this.joined = false;
    });
    // close
    // Emitted when the peer is destroyed and can no longer accept or create any new connections.
    // At this time, the peer's connections will all be closed.
    //   To be extra certain that peers clean up correctly,
    //   we recommend calling peer.destroy() on a peer when it is no longer needed.
    this.peer.on('disconnected', ()=>{ if(this.debug) console.log(this.peer.id, "peer:disconnected"); });
    // disconnected
    // Emitted when the peer is disconnected from the signalling server,
    // either manually or because the connection to the signalling server was lost.
    // When a peer is disconnected, its existing connections will stay alive,
    // but the peer cannot accept or create any new connections.
    // You can reconnect to the server by calling peer.reconnect().
    this.peer.on('connection', (conn: PeerJs.DataConnection)=>{
      // Emitted when a new data connection is established from a remote peer.
      if(this.debug) console.log(this.peer.id, "peer:connection", "from", conn.peer);
      this._connectionHandler(conn);
    });
    this.tid = setInterval(()=>{
      if(this.successor){
        if(this.debug) console.log(this.peer.id, "setInterval");
        this.stabilize();
      }
    }, this.STABILIZE_INTERVAL);
    return new Promise<void>((resolve, reject)=>{
      this.peer.on('error', _error);
      this.peer.on('open', _open);
      var off = ()=>{
        this.peer.off('error', _error);
        this.peer.off('open', _open);
      };
      function _open(id:string){ off(); resolve(Promise.resolve()); }
      function _error(err:any){ off(); reject(err); }
    });
  }

  create(): Promise<Chord>{
    return this._init().then(()=>{
      if(this.peer.destroyed) return Promise.reject<Chord>(new Error(this.peer.id+" is already destroyed"));
      if(this.debug) console.log(this.peer.id, "create:done");
      return this;
    });
  }

  join(id: string): Promise<Chord>{
    return this._init().then(()=>{
      if(this.peer.destroyed) return Promise.reject<Chord>(new Error(this.peer.id+" is already destroyed"));
      if(typeof id !== "string") return Promise.reject<Chord>(new Error("peer id is not string."));
      var conn = this.peer.connect(id);
      this._connectionHandler(conn);
      return new Promise<void>((resolve, reject)=>{
        conn.on('error', _error);
        conn.on('open', _open);
        var off = ()=>{
          conn.off('error', _error);
          conn.off('open', _open);
        };
        function _open(){ off(); resolve(Promise.resolve()); }
        function _error(err:any){ off(); reject(err); }
      }).then(()=>{
        if(this.debug) console.log(this.peer.id, "join:done", "to", id);
        this.successor = conn;
        this.joined = true;
        setTimeout(()=>this.stabilize(), 0);
        return this;
      });
    });
  }

  stabilize(){
    if(!this.peer) throw new Error("this node does not join yet");
    if(this.peer.destroyed) throw new Error(this.peer.id+" is already destroyed");
    if(this.debug) console.log(this.peer.id, "stabilize:to", this.successor.peer);
    if(!!this.successor && this.successor.open){
      this.successor.send({msg:"What is your predecessor?"});
    }
    if(this.joined && !!this.successor && !this.successor.open){
      if(typeof this.successors[1] !== "string"){
        if(!!this.predecessor && this.predecessor.open){
          // when all successor are died, try predecessor as new successor
          if(this.debug) console.log(this.peer.id, "stabilize:successor", this.successor.peer, "is died. fail back to predecessor", this.predecessor.peer);
          //this.successor.close();
          this.successor = null;
          this.join(this.predecessor.peer);
        }
        if(this.debug) console.log(this.peer.id, "stabilize:all connects are lost. Nothing to do");
        this.joined = false;
        clearInterval(this.tid);
        return;
      }
      if(this.successors[1] !== this.peer.id){
        if(this.debug) console.log(this.peer.id, "stabilize:successor", this.successor.peer, "is died. try successor[1]", this.successors[1], this.successors);
        //this.successor.close();
        this.successor = null;
        this.join(this.successors[1]);
      }else{
        this.successors.shift();
        this.stabilize();
        return;
      }
    }
    if(this.joined && !!this.predecessor && !this.predecessor.open){
      if(this.debug) console.log(this.peer.id, "stabilize:predecessor", this.predecessor.peer, "is died.");
      //this.predecessor.close();
      this.predecessor = null;
    }
  }

  request(event: string, data?: any, addressee?: string[], timeout?:number): Promise<Token>{
    return new Promise<Token>((resolve, reject)=>{
      if(!this.peer) throw new Error("this node does not join yet");
      if(this.peer.destroyed) reject(new Error(this.peer.id+" is already destroyed"));
      if(!this.successor && !!this.predecessor) throw new Error(this.peer.id+" does not have successor.");
      var token = {
        payload: {event, addressee, data},
        requestId: this.lastRequestId++,
        route: [this.peer.id],
        time: [Date.now()]
      };
      this.requests[token.requestId] = (_token)=>{
        delete this.requests[token.requestId];
        resolve(Promise.resolve(_token));
      };
      if(typeof timeout === "number"){
        setTimeout(()=> reject(new Error(this.peer.id + "request(" + event + "):timeout("+timeout+")")), timeout);
      }
      if(this.listeners[token.payload.event] instanceof Function
        && (!Array.isArray(token.payload.addressee) // broadcast
        || token.payload.addressee.indexOf(this.peer.id) >= 0)
      ){
        if(!this.successor && !this.predecessor){ // emulator
          setTimeout(()=>{
            this.listeners[token.payload.event](token, (token)=>{
              this.requests[token.requestId](token);
            });
          }, 0)
        }else{
          this.listeners[token.payload.event](token, (token)=>{
            if(!this.successor.open) throw new Error(this.peer.id+" has successor, but not open.");
            this.successor.send({msg: "Token", token: token});
          });
        }
      }
    });
  }

  on(event: string, listener:(token:Token, cb:(token:Token)=> void)=> void): void{
    this.listeners[event] = listener;
  }

  off(event: string, listener:(token:Token, cb:(token:Token)=> void)=> void): void{
    delete this.listeners[event];
  }

  _connectionHandler(conn: PeerJs.DataConnection): void{
    conn.on('open', ()=>{ if(this.debug) console.log(this.peer.id, "conn:open", "to", conn.peer); });
    conn.on('close', ()=>{
      // Emitted when either you or the remote peer closes the data connection.
      //  Firefox does not yet support this event.
      if(this.debug) console.log(this.peer.id, "conn:close", "to", conn.peer);
    });
    conn.on('error', (err)=>{
      if(this.debug) console.error(this.peer.id, "conn:error", "to", conn.peer, err);
      this.stabilize();
    });

    var ondata: (data:{msg:string, id:string, successors:string[], token:Token})=>void = null;
    conn.on('data', ondata = (data)=>{
      if(!this.successor){
        this.join(conn.peer).then(()=>{
          ondata(data);
        });
        return;
      }
      if(!this.predecessor){
        this.predecessor = conn;
      }

      if(this.debug) console.log(this.peer.id, "conn:data", data, "from", conn.peer);

      switch(data.msg){
        // ring network trafic
        case "Token":
          if(data.token.route[0] === this.peer.id && this.requests[data.token.requestId] instanceof Function){
            this.requests[data.token.requestId](data.token);
            break;
          }
          if(data.token.route.indexOf(this.peer.id) !== -1){
            if(this.debug) console.log(this.peer.id, "conn:token", "dead token detected.", data.token);
            break;
          }
          data.token.route.push(this.peer.id);
          data.token.time.push(Date.now());
          var tokenpassing = (token: Token)=>{
            if(this.successor.open){
              this.successor.send({msg: "Token", token: token});
            }else{
              this.stabilize();
              setTimeout(()=> tokenpassing(token), 1000);
            }
          };
          if(this.listeners[data.token.payload.event] instanceof Function
            && (!Array.isArray(data.token.payload.addressee) // broadcast
            || data.token.payload.addressee.indexOf(this.peer.id) >= 0)){ //
            this.listeners[data.token.payload.event](data.token, tokenpassing);
          }else{
            tokenpassing(data.token);
          }
          break;

        // response
        case "This is my predecessor.":
          var min = 0;
          var max =  distance("zzzzzzzzzzzzzzzz");
          var myid = distance(this.peer.id);
          var succ = distance(conn.peer);
          var succ_says_pred = distance(data.id);
          if(this.debug) console.log(this.peer.id, "conn:distance1", {min, max, myid, succ, succ_says_pred});

          if(data.id === this.peer.id){ // no probrem
            this.successors = [conn.peer].concat(data.successors).slice(0, 4);
          }else if(succ > succ_says_pred && succ_says_pred > myid){ // chenge my successor
            conn.close();
            this.join(data.id);
          }else{ // successor's right predecessor is me
            conn.send({msg: "Check your predecessor."});
          }
          break;
        case "Your successor is worng.": // routing right address
          conn.close();
          this.join(data.id);
          break;
        case "You need stabilize now.": // successor's predecessor is chenged
          this.stabilize();
          break;

        // request
        case "What is your predecessor?":
          conn.send({msg: "This is my predecessor.", id: this.predecessor.peer, successors: this.successors});
          break;
        case "Check your predecessor.":
          var min = 0;
          var max =  distance("zzzzzzzzzzzzzzzz");
          var myid = distance(this.peer.id);
          var succ = distance(this.successor.peer);
          var pred = distance(this.predecessor.peer);
          var newbee = distance(conn.peer);
          if(this.debug) console.log(this.peer.id, "conn:distance2", {min, max, myid, succ, pred, newbee});

          if( (myid > newbee && newbee > pred) ){ // change my predecessor
            if(this.predecessor.open){
              this.predecessor.send({msg: "You need stabilize now."});
            }
            this.predecessor = conn;
          }else if( (myid > pred && pred > newbee) ){ // newbee number is predecessors responsivilty
            conn.send({msg:"Your successor is worng.", id: this.predecessor.peer});
          }else if( (pred > myid && ((max > newbee && newbee > pred) || (myid > newbee && newbee > min))) ){ // change my predecesso
            if(this.predecessor.open){
              this.predecessor.send({msg: "You need stabilize now."});
            }
            this.predecessor = conn;
          }else if( pred !== newbee && newbee > myid ){ // newbee number is predecessors responsivilty
            conn.send({msg:"Your successor is worng.", id: this.predecessor.peer});
          }else if(newbee === pred){
            // ok. all right.
          }else{
            console.warn("something wrong2");
            debugger;
          }break;
        default:
          console.warn("something wrong3", data.msg);
          debugger;
      }
    });
  }
}
namespace Chord {
  export function distance(str:string){
    return Math.sqrt(str.split("").map((char)=> char.charCodeAt(0) ).reduce((sum, val)=> sum+Math.pow(val, 2) ));
  }
  export interface Token {
    payload: {event: string, addressee :string[], data: any};
    requestId: number;
    route: string[];
    time: number[];
  }
}


export = Chord;
