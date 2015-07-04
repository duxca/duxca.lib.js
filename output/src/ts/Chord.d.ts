/// <reference path="../../../tsd/peerjs/peerjs.d.ts" />
/// <reference path="../../../typings/bluebird/bluebird.d.ts" />
declare module duxca.lib {
    module Chord {
        interface Token {
            sender: string;
            event: string;
            route: string[];
            data: any;
            date: number;
        }
    }
    class Chord {
        peer: PeerJs.Peer;
        succesor: PeerJs.DataConnection;
        predecessor: PeerJs.DataConnection;
        succesors: string[];
        predecessors: string[];
        joined: boolean;
        ontoken: (token: Chord.Token, cb: (token: Chord.Token) => void) => void;
        constructor();
        init(): Promise<Chord>;
        create(): void;
        join(id: string): Promise<Chord>;
        stabilize(): void;
        connDataHandlerCreater(conn: PeerJs.DataConnection): (data: {
            msg: string;
            id: string;
            succesors: string[];
            token: Chord.Token;
        }) => void;
    }
}
