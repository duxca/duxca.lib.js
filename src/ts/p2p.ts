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
      setInterval(()=>{ console.log(this.peer.id, "setInterval"); this.stabilize(); }, 5000);
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

    stabilize(){
      if(this.succesor.length>0){
        this.succesor[0].send({msg:"Am I your predecessor?", id:""});
      }
    }

    join(id: string):Promise<Chord>{
      console.log(this.peer.id, "try:join", "to", id);
      return new Promise<Chord>((resolve, reject)=>{
        var conn = this.peer.connect(id);
        this.succesor[0] = conn;
        conn.on('open', openHandler.bind(this));
        conn.on('error', errorHandler.bind(this));
        conn.on("data", this.connDataHandlerCreater.call(this, conn));
        conn.on('close', closeHandler.bind(this));

        function openHandler(){
          console.log(this.peer.id, "conn:open");
          conn.off('open', openHandler.bind(this));
          conn.off('error', errorHandler.bind(this));
          this.succesor[0] = conn;
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

    connDataHandlerCreater(conn: PeerJs.DataConnection): (data:{msg:string; id:string})=> void{
      return dataHandler.bind(this);

      function dataHandler(data:{msg:string, id:string, succesor:string[]}): void{
        console.log(this.peer.id, "conn:data", data, "from", conn.peer);
        var {msg, id} = data;
        switch(<string>msg){
          // response
          case "Yes. You are my predecessor.":
            break;
          case "No. Your succesor is worng.":
            conn.close();
            this.join(id);
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
              function distance(str:string){
                return str.split("").map((char)=> char.charCodeAt(0) ).reduce((sum, val)=> sum+val );
              }

              var min = 0;
              var max =  distance("zzzzzzzzzzzzzzzz");
              var myid = distance(this.peer.id);
              var succ = distance(this.succesor[0].peer);
              var pred = distance(this.predecessor[0].peer);
              var newbee = distance(conn.peer);
              console.log(this.peer.id, "conn:distance", {min, max, myid, succ, pred, newbee});

              if( myid > newbee && newbee > pred ){
                //this.predecessor[0].send("please stabilize now");
                this.predecessor[0] = conn;
                conn.send({msg: "Yes. You are my predecessor.", id:""});
              }else if( myid > pred && pred > newbee ){
                conn.send({msg:"No. Your succesor is worng.", id: this.predecessor[0].peer});
              }else if( pred > myid && ((max > newbee && newbee > pred) || (myid > newbee && newbee > min)) ){ // newbee number is my own responsivilty
                //this.predecessor[0].send("please stabilize now");
                this.predecessor[0] = conn;
                conn.send({msg: "Yes. You are my predecessor.", id:""});
              }else if( newbee > myid ){ // newbee number is predecessors responsivilty
                conn.send({msg:"No. Your succesor is worng.", id: this.predecessor[0].peer});
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
