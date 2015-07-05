/// <reference path="../../../tsd/peerjs/peerjs.d.ts" />
/// <reference path="../../../typings/bluebird/bluebird.d.ts" />
declare module duxca.lib {
    module Chord {
        interface Token {
            payload: {
                event: string;
                data: any;
            };
            requestId: number;
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
        tid: number;
        listeners: {
            [event: string]: (token: Chord.Token, cb: (token: Chord.Token) => void) => void;
        };
        requests: {
            [requestId: number]: ((token: Chord.Token) => void);
        };
        lastRequestId: number;
        constructor();
        _init(): Promise<void>;
        create(): Promise<void>;
        join(id: string): Promise<void>;
        stabilize(): void;
        request(event: string, data?: any, timeout?: number): Promise<Chord.Token>;
        on(event: string, listener: (token: Chord.Token, cb: (token: Chord.Token) => void) => void): void;
        off(event: string, listener: (token: Chord.Token, cb: (token: Chord.Token) => void) => void): void;
        _connectionHandler(conn: PeerJs.DataConnection): void;
    }
}
