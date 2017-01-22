import { EventTargetLike } from "./Event";
export interface IWorker extends EventTarget {
    postMessage(data: any, transferable?: ArrayBuffer[]): any;
    addEventListener(event: "message", listener: (ev: MessageEvent) => void): void;
    removeEventListener(event: "message", listener: (ev: MessageEvent) => void): void;
}
export declare abstract class IServerWorker<T> extends EventTargetLike implements IWorker {
    importScriptsURLs: string[];
    main: () => void;
    private sem;
    constructor(importScriptsURLs: string[], main: () => void);
    abstract createImportScript(url: string): string;
    abstract createMainFunction(): string;
    abstract postMessage(data: any, transferable?: ArrayBuffer[]): any;
    abstract fetchMessageEvent(): Promise<MessageEvent>;
    abstract load(): Promise<void>;
    unload(): Promise<void>;
    addEventListener(event: "message", listener: (ev: MessageEvent) => void): void;
    addEventListener(event: "unload", listener: (ev: Event) => void): void;
    removeEventListener(event: "message", listener: (ev: MessageEvent) => void): void;
    createSourceFileURL(): Promise<string>;
    request<K extends keyof T>(event: K, data: any, transferable: ArrayBuffer[]): Promise<T[K]>;
}
export declare class IFrameWorker<T> extends IServerWorker<T> {
    iframe: HTMLIFrameElement;
    createImportScript(url: string): string;
    createMainFunction(): string;
    postMessage(data: any): void;
    fetchMessageEvent(): Promise<MessageEvent>;
    load(): Promise<void>;
}
export declare class ServerWorker<T> extends IServerWorker<T> {
    worker: Worker;
    createImportScript(url: string): string;
    createMainFunction(): string;
    load(): Promise<void>;
    postMessage(data: any, transferable?: ArrayBuffer[]): void;
    fetchMessageEvent(): Promise<MessageEvent>;
}
