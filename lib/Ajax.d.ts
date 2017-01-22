export declare function fetchXHR(url: string, responseType: "text"): Promise<string>;
export declare function fetchXHR(url: string, responseType: "blob"): Promise<Blob>;
export declare function fetchXHR(url: string, responseType: "arraybuffer"): Promise<ArrayBuffer>;
export declare function fetchXHR(url: string, responseType: "document"): Promise<Document>;
export declare function fetchXHR<T>(url: string, responseType: "json"): Promise<T>;
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
