import {EventEmitter} from "events";
import {fetchBlob} from "./Ajax";
import {Semaphore} from "./Semaphore";
import {fetchEvent, EventTargetLike} from "./Event";

export interface IWorker extends EventTarget {
  postMessage(data: any, transferable?: ArrayBuffer[]);
  addEventListener(event: "message", listener: (ev: MessageEvent)=> void ): void;
  removeEventListener(event: "message", listener: (ev: MessageEvent)=> void ): void;
}

export abstract class IServerWorker<T> extends EventTargetLike implements IWorker {
  private sem: Semaphore;
  constructor(
    public importScriptsURLs: string[],
    public main: ()=> void
  ){
    super();
    this.sem = new Semaphore(1);
  }
  abstract createImportScript(url: string): string;
  abstract createMainFunction(): string;  
  abstract postMessage(data: any, transferable?: ArrayBuffer[]);
  abstract fetchMessageEvent(): Promise<MessageEvent>;
  abstract load(): Promise<void>;
  unload(): Promise<void>{
    this.dispatchEvent(new Event("unload"));
    return Promise.resolve(void 0);
  }
  addEventListener(event: "message", listener: (ev: MessageEvent)=> void ): void;
  addEventListener(event: "unload", listener: (ev: Event)=> void ): void;
  addEventListener(event: string, listener: (ev: Event)=> void ): void {
    return super.addEventListener.apply(this, arguments);
  };
  removeEventListener(event: "message", listener: (ev: MessageEvent)=> void ): void {
    return super.addEventListener.apply(this, arguments);
  }
  async createSourceFileURL(): Promise<string> {
    const blobURLs = await Promise.all(
      this.importScriptsURLs.map((url)=>
      fetchBlob(url).then(URL.createObjectURL) ));
    this.addEventListener("unload", ()=>{ blobURLs.forEach(URL.revokeObjectURL); });
    const importScriptText = blobURLs.map((url)=> this.createImportScript(url) ).join("\n");
    const mainScriptText = this.createMainFunction();
    const scriptText = [importScriptText, mainScriptText].join("\n");
    const mainScriptBlob = new Blob([scriptText], {type: "text/javascript"});
    const workerURL = URL.createObjectURL(mainScriptBlob);
    blobURLs.push(workerURL);
    return workerURL;
  }
  request<K extends keyof T>(event: K, data: any, transferable: ArrayBuffer[]): Promise<T[K]>{
    const msg = {event, data};
    let _resolve: (ev: MessageEvent)=> void;
    const prm = new Promise<MessageEvent>((resolve)=> _resolve = resolve);
    this.sem.addTask(()=> this.fetchMessageEvent().then(_resolve) );
    this.postMessage(msg, transferable);
    return prm.then(({data})=> data);
  }
}


export class IFrameWorker<T> extends IServerWorker<T> {
  iframe: HTMLIFrameElement;
  createImportScript(url: string): string {
    return `<script src='${url}'>\x3c/script>`;
  }
  createMainFunction(): string {
    return `(${this.main})();`;
  }
  postMessage(data: any): void {
    this.iframe.contentWindow.postMessage(data, "*");
  }
  fetchMessageEvent(): Promise<MessageEvent>{
    return fetchEvent<MessageEvent>(this.iframe.contentWindow, "message", "error");
  }
  async load(): Promise<void> {
    this.iframe = document.createElement("iframe");
    this.iframe.setAttribute("style", `
      position: absolute;
      top: 0px;
      left: 0px;
      width: 0px;
      height: 0px;
      border: 0px;
      margin: 0px;
      padding: 0px;
    `);
    document.body.appendChild(this.iframe);
    const url = await this.createSourceFileURL();
    this.iframe.src = url;
    //iframe.contentDocument.open();
    //iframe.contentDocument.write();
    //iframe.contentDocument.close();
    this.addEventListener("unload", ()=>{
      this.iframe.removeAttribute("src");
      this.iframe.removeAttribute("srcdoc");
      document.body.removeChild(this.iframe);
      this.iframe = <any>null;
    });
    await fetchEvent(this.iframe, "load", "error");
  }
}

export class ServerWorker<T> extends IServerWorker<T> {
  worker: Worker;
  createImportScript(url: string): string {
    return `self.importScripts('${url}');`;
  }
  createMainFunction(): string {
    return `(${this.main})();`;
  }
  async load(): Promise<void> {
    const url = await this.createSourceFileURL();
    this.worker = new Worker(url);
    this.addEventListener("unload", ()=>{
      this.worker.terminate();
      this.worker = <any>null;
    });
  }
  postMessage(data: any, transferable?: ArrayBuffer[]): void {
    this.worker.postMessage(data, transferable);
  }
  fetchMessageEvent(): Promise<MessageEvent>{
    return fetchEvent<MessageEvent>(this.worker, "message", "error");
  }
}

