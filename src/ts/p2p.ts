/// <reference path="../../tsd/peerjs/peerjs.d.ts"/>
/// <reference path="../../typings/bluebird/bluebird.d.ts"/>

module duxca.lib.P2P {

  function distance(str:string){
    return Math.sqrt(str.split("").map((char)=> char.charCodeAt(0) ).reduce((sum, val)=> sum+Math.pow(val, 2) ));
  }

  export class Chord{
    peer: PeerJs.Peer;
    succesor: PeerJs.DataConnection;
    predecessor: PeerJs.DataConnection;
    succesors: string[];
    predecessors: string[];
    joined: boolean;

    constructor(){
      this.joined = false;
      this.peer = new Peer({host: location.hostname, port: 9000, debug: 2});
      this.succesor = null;
      this.succesors = [];
      this.predecessor = null;
      this.predecessors = [];
      var tid = setInterval(()=>{
        if(this.peer.id) this.stabilize();
      }, 5000);
    }

    init():Promise<Chord>{
      return new Promise<Chord>((resolve, reject)=>{
        this.peer.on('open', openHandler.bind(this));
        this.peer.on('error', errorHandler.bind(this));
        this.peer.on('close', closeHandler.bind(this));
        this.peer.on('disconnected', disconnectedHandler.bind(this));
        this.peer.on('connection', connectionHandler.bind(this));

        function openHandler(id: string){
          console.log(this.peer.id, "peer:open", "my id is", id);
          this.peer.off('open', openHandler);
          this.peer.off('error', errorHandler);
          resolve(Promise.resolve(this));
        }

        function errorHandler(err:any){
          console.error(this.peer.id, "peer:error", err);
          reject(err);
        }

        function closeHandler(){
          console.log(this.peer.id, "peer:close");
        }

        function disconnectedHandler(){
          console.log(this.peer.id, "peer:disconnected");
        }

        function connectionHandler(conn: PeerJs.DataConnection){
          console.log(this.peer.id, "peer:connection", "from", conn.peer);
          conn.on("data", this.connDataHandlerCreater.call(this, conn));
        }
      });
    }

    create(){
      this.stabilize();
    }

    join(id: string):Promise<Chord>{
      console.log(this.peer.id, "try:join", "to", id);
      return new Promise<Chord>((resolve, reject)=>{
        var conn = this.peer.connect(id);
        this.succesor = conn;
        this.joined = true;
        conn.on('open', openHandler.bind(this));
        conn.on('error', errorHandler.bind(this));
        conn.on("data", this.connDataHandlerCreater.call(this, conn));
        conn.on('close', closeHandler.bind(this));

        function openHandler(){
          console.log(this.peer.id, "conn:open");
          conn.off('open', openHandler.bind(this));
          conn.off('error', errorHandler.bind(this));
          this.stabilize();
          resolve(Promise.resolve(this));
        }

        function errorHandler(err:any){
          console.error(this.peer.id, "conn:error", err);
          conn.close();
          reject(err);
        }

        function closeHandler(){
          console.log(this.peer.id, "conn:close", conn.peer);
        }
      });
    }

    stabilize(){
      console.log(this.peer.id, "stabilize:to", !!this.succesor && this.succesor, this.joined);
      if(!!this.succesor && this.succesor.open){
        this.succesor.send({msg:"What are you predecessor?", id:"", succesors: []});
      }
      if(this.joined && !!this.succesor && !this.succesor.open){
        console.log(this.peer.id, "stabilize:succesor", this.succesor, "is died. try", this.succesors[1]);
        this.succesor.close();
        this.succesor = null;
        this.join(this.succesors[1]);
      }
      if(this.joined && !!this.predecessor && !this.predecessor.open){
        console.log(this.peer.id, "stabilize:predecessor", this.predecessor, "is died.");
        this.predecessor.close();
        this.predecessor = null;
      }
    }

    connDataHandlerCreater(conn: PeerJs.DataConnection): (data:{msg:string; id:string})=> void{
      return (data:{msg:string, id:string, succesors:string[]})=>{
        console.log(this.peer.id, "conn:data", data, "from", conn.peer);
        if(!this.succesor){
          this.join(conn.peer);
        }
        if(!this.predecessor){
          this.predecessor = conn;
        }
        var {msg, id, succesors} = data;

        switch(msg){
          // response
          case "Your succesor is worng.":
            conn.close();
            this.join(id);
            break;
          case "You need to stabilize now.":
            this.stabilize();
            break;
          case "This is my predecessor.":
            var min = 0;
            var max =  distance("zzzzzzzzzzzzzzzz");
            var myid = distance(this.peer.id);
            var succ = distance(conn.peer);
            var succ_says_pred = distance(id);
            console.log(this.peer.id, "conn:distance1", {min, max, myid, succ, succ_says_pred});

            if(id === this.peer.id){
              this.succesors = [conn.peer].concat(succesors).slice(0, 3);
            }else if(succ > succ_says_pred && succ_says_pred > myid){
              conn.close();
              this.join(id);
              break;
            }else{
              conn.send({msg: "Check your predecessor", id: "", succesors: []});
            }break;

          // request
          case "What are you predecessor?":
            if(!this.predecessor){
              this.predecessor = conn;
              conn.send({msg: "This is my predecessor.", id: conn.peer, succesors: this.succesors});
            }else{
              conn.send({msg: "This is my predecessor.", id: this.predecessor.peer, succesors: this.succesors});
            }break;
          case "Check your predecessor":
            var min = 0;
            var max =  distance("zzzzzzzzzzzzzzzz");
            var myid = distance(this.peer.id);
            var succ = distance(this.succesor.peer);
            var pred = distance(this.predecessor.peer);
            var newbee = distance(conn.peer);
            console.log(this.peer.id, "conn:distance2", {min, max, myid, succ, pred, newbee});

            if( myid > newbee && newbee > pred ){
              if(this.predecessor.open){
                this.predecessor.send({msg: "You need to stabilize now.", id:"", succesors:[]});
              }
              this.predecessor = conn;
            }else if( myid > pred && pred > newbee ){
              conn.send({msg:"Your succesor is worng.", id: this.predecessor.peer, succesors: []});
            }else if( pred > myid && ((max > newbee && newbee > pred) || (myid > newbee && newbee > min)) ){
              if(this.predecessor.open){
                this.predecessor.send({msg: "You need to stabilize now.", id:"", succesors:[]});
              }
              this.predecessor = conn;
            }else if( newbee > myid ){ // newbee number is predecessors responsivilty
              conn.send({msg:"Your succesor is worng.", id: this.predecessor.peer, succesors:[]});
            }else{
              console.warn("something wrong2");
              debugger;
            }break;
          default:
            console.warn("something wrong2");
            debugger;
        }
      };
    }
  }
}
