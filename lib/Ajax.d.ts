export declare function fetchXHR<T>(url: string, responseType: string): Promise<T>;
export declare function fetchArrayBuffer(url: string): Promise<ArrayBuffer>;
export declare function fetchBlob(url: string): Promise<Blob>;
export declare function getArrayBuffer(url: string): Promise<ArrayBuffer>;
export declare function fetchImageFromURL(url: string): Promise<HTMLImageElement>;
export declare function loadScript(url: string): Promise<Event>;
