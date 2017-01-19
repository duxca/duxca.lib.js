export declare function fetchXHR(url: string, responseType: "text"): Promise<string>;
export declare function fetchXHR(url: string, responseType: "blob"): Promise<Blob>;
export declare function fetchXHR(url: string, responseType: "arraybuffer"): Promise<ArrayBuffer>;
export declare function fetchXHR(url: string, responseType: "document"): Promise<Document>;
export declare function fetchXHR<T>(url: string, responseType: "json"): Promise<T>;
export declare function fetchArrayBuffer(url: string): Promise<ArrayBuffer>;
export declare function fetchBlob(url: string): Promise<Blob>;
export declare function getArrayBuffer(url: string): Promise<ArrayBuffer>;
export declare function fetchImageFromURL(url: string): Promise<HTMLImageElement>;
export declare function loadScript(url: string): Promise<Event>;
