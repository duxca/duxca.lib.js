/**
 *
 *
 * @param sender - xhr を書き換えつつ open と send を自分で指定します
 * @param useLocal - `file://` などで xhr.status が 0 になるものも resolve する
 * @return 200 なら resolve, その他は reject<XMLHttpRequest>
 * @example
 * ```ts
 * fetch((xhr)=>{
 *   xhr.onprogress = (ev)=>{
 *     if(!ev.lengthComputable){ return; }
 *     console.log(ev.loaded / ev.total);
 *   };
 *   xhr.open("POST", "http://example.com/");
 *   xhr.send("{foo: 0}");
 * });
 * ```
 */
export declare function fetch<T>(sender: (xhr: XMLHttpRequest) => void, useLocal?: boolean): Promise<T>;
export declare function fetchXHR(url: string, responseType: "text", useLocal?: boolean): Promise<string>;
export declare function fetchXHR(url: string, responseType: "blob", useLocal?: boolean): Promise<Blob>;
export declare function fetchXHR(url: string, responseType: "arraybuffer", useLocal?: boolean): Promise<ArrayBuffer>;
export declare function fetchXHR(url: string, responseType: "document", useLocal?: boolean): Promise<Document>;
export declare function fetchXHR<T>(url: string, responseType: "json", useLocal?: boolean): Promise<T>;
export declare function fetchText<T>(url: string): Promise<string>;
export declare function fetchDocument<T>(url: string): Promise<Document>;
export declare function fetchJSON<T>(url: string): Promise<T>;
export declare function fetchArrayBuffer(url: string): Promise<ArrayBuffer>;
export declare function fetchBlob(url: string): Promise<Blob>;
export declare function fetchImage(url: string): Promise<HTMLImageElement>;
export declare function fetchScript(url: string): Promise<Event>;
/**
 * force: URL.revokeObjectURL
 */
export declare function fetchBlobURL<T>(fetch: (url: string) => Promise<T>, blob: Blob): Promise<T>;
export declare function fetchAudio(url: string, try_to_get_duration?: boolean): Promise<HTMLAudioElement>;
export declare function fetchVideo(url: string, try_to_get_duration?: boolean): Promise<HTMLVideoElement>;
