/// <reference path="../../../tsd/peerjs/peerjs.d.ts" />
/// <reference path="../../../typings/bluebird/bluebird.d.ts" />
declare module duxca.lib.P2P {
    class Chord {
        peer: PeerJs.Peer;
        succesor: PeerJs.DataConnection[];
        predecessor: PeerJs.DataConnection[];
        constructor();
        init(): Promise<Chord>;
        create(): void;
        join(id: string): Promise<Chord>;
        stabilize(): void;
        connDataHandlerCreater(conn: PeerJs.DataConnection): (data: {
            msg: string;
            id: string;
        }) => void;
    }
}
