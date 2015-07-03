/// <reference path="../../../typings/peerjs/peerjs.d.ts" />
declare module duxca.lib.P2P {
    class Chord {
        peer: PeerJs.Peer;
        succesor: PeerJs.DataConnection[];
        predecessor: PeerJs.DataConnection[];
        amIRoot: boolean;
        callbacks: {
            onopen: () => void;
            onconnection: () => void;
        };
        constructor();
        create(): void;
        join(id: string): void;
        stabilize(): void;
    }
}
