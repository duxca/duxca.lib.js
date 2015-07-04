/// <reference path="../../../tsd/peerjs/peerjs.d.ts" />
/// <reference path="../../../typings/bluebird/bluebird.d.ts" />
declare module duxca.lib {
    module Chord2 {
        interface Token {
            event: string;
            route: string[];
            time: number[];
        }
    }
    class Chord2 {
        successor: PeerJs.DataConnection;
        predecessor: PeerJs.DataConnection;
        successors: string[];
        predecessors: string[];
        joined: boolean;
        peer: PeerJs.Peer;
        debug: boolean;
        ontoken: (token: Chord2.Token, cb: (token: Chord2.Token) => void) => void;
        tid: number;
        constructor();
        _init(): Promise<void>;
        create(): Promise<void>;
        join(id: string): Promise<void>;
        stabilize(): void;
        ping(): Promise<Chord2.Token>;
        _connectionHandler(conn: PeerJs.DataConnection): void;
    }
}
