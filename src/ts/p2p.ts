/// <reference path="../../tsd/peerjs/peerjs.d.ts"/>
/// <reference path="../../typings/bluebird/bluebird.d.ts"/>

module duxca.lib.P2P {

  export class Chord{
    peer: PeerJs.Peer;
    succesor: PeerJs.DataConnection[];
    predecessor: PeerJs.DataConnection[];

    constructor(){
      this.peer = new Peer({host: location.hostname, port: 9000, debug: 2});
      this.succesor = [];
      this.predecessor = [];
    }

    init():Promise<Chord>{
      return new Promise<Chord>((resolve, reject)=>{
        this.peer.on('open', openHandler.bind(this));
        this.peer.on('error', errorHandler.bind(this));
        this.peer.on('close', closeHandler.bind(this));
        this.peer.on('disconnected', disconnectedHandler.bind(this));
        this.peer.on('connection', connectionHandler.bind(this));

        function openHandler(id: string){
          console.log(this.peer.id, "peer:open", id);
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

        function connectionHandler(conn:PeerJs.DataConnection){
          console.log(this.peer.id, "peer:connection", conn.peer, conn);
          conn.on("data", this.connDataHandlerCreater.call(this, conn));
        }
      });
    }

    create(){
      setInterval(()=> this.stabilize(), 1000);
    }

    join(id: string):Promise<Chord>{
      return new Promise<Chord>((resolve, reject)=>{
        var conn = this.peer.connect(id);
        conn.on('open', openHandler.bind(this));
        conn.on('error', errorHandler.bind(this));
        conn.on("data", this.connDataHandlerCreater.call(this, conn));
        conn.on('close', closeHandler.bind(this));

        function openHandler(){
          console.log(this.peer.id + "conn:open");
          conn.off('open', openHandler);
          conn.off('error', errorHandler.bind(this));
          this.succesor[0] = conn;
          resolve(Promise.resolve(this));
        }

        function errorHandler(err:any){
          console.error(this.peer.id + "conn:error", err);
          conn.close();
          reject(err);
        }

        function closeHandler(){
          console.log(this.peer.id + "conn:close");
        }
      });
    }

    stabilize(){
      this.succesor.length>0&&this.succesor[0].send({msg:"Am I your predecessor?", id:""});
    }

    connDataHandlerCreater(conn: PeerJs.DataConnection): (data:{msg:string; id:string})=> void{
      return dataHandler.bind(this);

      function dataHandler(data:{msg:string, id:string, succesor:string[]}): void{
        var {msg, id} = data;
        switch(<string>msg){
          // response
          case "Yes. You are my predecessor.":
            setInterval(()=> this.stabilize(), 1000);
            break;
          case "No. Your succesor is worng.":
            conn.close();
            this.join(<string>id);
            break;

          // request
          case "Am I your predecessor?":
            if(typeof this.predecessor[0] === "undefined" && typeof this.succesor[0] === "undefined"){ // first join after my create
              this.succesor[0] = conn;
              this.predecessor[0] = conn;
              conn.send({msg: "Yes. You are my predecessor.", id:""});
            }else if(typeof this.predecessor[0] === "undefined"){ // first stabilize after my join
              this.predecessor[0] = conn;
              conn.send({msg: "Yes. You are my predecessor.", id:""});
            }else if(this.predecessor[0].peer === conn.peer){ // right predecessor
              conn.send({msg: "Yes. You are my predecessor.", id:""});
            }else{

              var min = 0;
              var max = Math.pow(36, 17)-1; // "abcdefghijklmnopqrstuvwxyz0123456789".length -> 36
              var myid = parseInt(this.peer.id, 36);
              var succ = parseInt(this.succesor[0].peer, 36);
              var pred = parseInt(this.predecessor[0].peer, 36);
              var newbee = parseInt(conn.peer, 36);

              if((myid > pred && pred > newbee) || (newbee > myid)){ // newbee number is predecessors responsivilty
                conn.send({msg:"No. Your succesor is worng.", data: this.predecessor[0].peer});
              }else if((myid > newbee && newbee > pred) ||
                       (pred > myid && ((myid > newbee && newbee > min) || (max > newbee && newbee > pred)))){ // newbee number is my own responsivilty
                //this.predecessor[0].send("please stabilize now");
                this.predecessor[0] = conn;
                conn.send({msg: "Yes. You are my predecessor.", id:""});
              }else{
                console.warn("something wrong");
                debugger;
              }
            }break;
        }
      }
    }
  }
}
