/// <reference path="../../typings/peerjs/peerjs.d.ts"/>

module duxca.lib.P2P {

  export class Chord{
    peer: PeerJs.Peer;
    succesor: PeerJs.DataConnection[];
    predecessor: PeerJs.DataConnection[];
    amIRoot: boolean;
    callbacks:{
      onopen: ()=>void;
      onconnection: ()=>void;
    }

    constructor(){
      this.peer = new Peer({host: location.hostname, port: 9000, debug: 2});
      this.peer.on('open', (id)=>{
        this.callbacks.onopen();
      });
      this.peer.on('connection', (conn)=>{
        console.log("offer connection:", conn.peer, conn);
        conn.on("data", ({msg, data})=>{
          switch(<string>msg){
            case "Am I your predecessor?":
              if(typeof this.predecessor[0] === "undefined" && typeof this.succesor[0] === "undefined"){
                this.succesor[0] = conn;
                this.predecessor[0] = conn;
                conn.send("Yes. You are my predecessor.");
              }else if(typeof this.predecessor[0] === "undefined"){
                this.predecessor[0] = conn;
                conn.send("Yes. You are my predecessor.");
              }else if(this.predecessor[0].peer === conn.peer){
                conn.send("Yes. You are my predecessor.");
              }else{
                var pred = parseInt(this.predecessor[0].peer, 36); // "abcdefghijklmnopqrstuvwxyz0123456789".length -> 36
                var newbee = parseInt(conn.peer, 36);
                var myid = parseInt(this.peer.id, 36);
                if(myid > newbee && newbee > pred){
                  this.predecessor[0] = conn;
                  conn.send("Yes. You are my predecessor.");
                }else if(myid > pred && pred > newbee){
                  conn.send({msg:"No. Your succesor is worng.", data: this.predecessor[0].peer});
                }else if(newbee > myid){
                  if(this.amIRoot){
                    conn.send({msg:"No. Your succesor is worng.", data: this.succesor[0].peer});
                  }else{
                    conn.send({msg:"No. Your succesor is worng.", data: this.succesor[0].peer});
                  }
                }
              }break;
          }
        });
      });
      this.peer.on('close', ()=>{ console.log("closed"); });
      this.peer.on('disconnected', ()=>{ console.log("disconnected"); });
      this.peer.on('error', (err)=>{ console.error(err); });
      this.callbacks = {
        onopen(){},
        onconnection(){}
      };
    }
    create(){
      this.amIRoot = true;
    }

    join(id: string){
      this.amIRoot = false;
      var conn = this.peer.connect(id);
      conn.on('open', ()=>{
        this.succesor[0] = conn;
        this.stabilize();
        conn.on("data", ({msg, data})=>{
          switch(<string>msg){
            case "Yes. You are my predecessor.":
              setTimeout(()=> this.stabilize(), 5000);
              break;
            case "No. Your succesor is worng.":
              conn.close();
              this.join(<string>data);
              break;
          }
        });
      });
      conn.on('data', (data)=>{ console.log(data); });
      conn.on('close', ()=>{ console.log("close"); });
      conn.on('error', (err)=>{ console.error(err); });
    }

    stabilize(){
      this.succesor[0].send({msg:"Am I your predecessor?", data:""});
    }
  }

}
