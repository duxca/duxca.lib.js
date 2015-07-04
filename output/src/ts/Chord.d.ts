/// <reference path="../../../tsd/peerjs/peerjs.d.ts" />
/// <reference path="../../../typings/bluebird/bluebird.d.ts" />
declare module duxca.lib {
    module Chord {
        interface Token {
            event: string;
            route: string[];
            time: number[];
        }
    }
    class Chord {
        successor: PeerJs.DataConnection;
        predecessor: PeerJs.DataConnection;
        successors: string[];
        predecessors: string[];
        joined: boolean;
        peer: PeerJs.Peer;
        debug: boolean;
        ontoken: (token: Chord.Token, cb: (token: Chord.Token) => void) => void;
        tid: number;
        constructor();
        _init(): Promise<void>;
        create(): Promise<void>;
        join(id: string): Promise<void>;
        stabilize(): void;
        ping(): Promise<Chord.Token>;
        _connectionHandler(conn: PeerJs.DataConnection): void;
    }
}
