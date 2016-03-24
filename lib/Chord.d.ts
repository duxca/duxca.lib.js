export declare class Chord {
    successor: PeerJs.DataConnection;
    predecessor: PeerJs.DataConnection;
    successors: string[];
    predecessors: string[];
    joined: boolean;
    peer: PeerJs.Peer;
    debug: boolean;
    tid: number;
    listeners: {
        [event: string]: (token: Token, cb: (token: Token) => void) => void;
    };
    requests: {
        [requestId: number]: ((token: Token) => void);
    };
    host: string;
    port: number;
    lastRequestId: number;
    STABILIZE_INTERVAL: number;
    constructor(opt: {
        host: string;
        port: number;
    });
    _init(): Promise<void>;
    create(): Promise<Chord>;
    join(id: string): Promise<Chord>;
    stabilize(): void;
    request(event: string, data?: any, addressee?: string[], timeout?: number): Promise<Token>;
    on(event: string, listener: (token: Token, cb: (token: Token) => void) => void): void;
    off(event: string, listener: (token: Token, cb: (token: Token) => void) => void): void;
    _connectionHandler(conn: PeerJs.DataConnection): void;
}
export declare function distance(str: string): number;
export interface Token {
    payload: {
        event: string;
        addressee: string[];
        data: any;
    };
    requestId: number;
    route: string[];
    time: number[];
}
