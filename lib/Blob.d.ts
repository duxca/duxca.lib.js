export declare function readAsDataURL(blob: Blob): Promise<string>;
/**
 * utf-8 などの charset つき text を data uri にして xhr すると文字化けするので文字コードを指定する
 */
export declare function readAsDataURLText(blob: Blob, charset?: string): Promise<string>;
export declare function readAsArrayBuffer(blob: Blob): Promise<ArrayBuffer>;
export declare function readAsText(blob: Blob): Promise<string>;
export declare function readAsBinaryString(blob: Blob): Promise<string>;
export declare function readAsBase64(blob: Blob): Promise<string>;
export declare function base64ToBase64URL(base64: string): string;
export declare function base64URLToBase64(base64url: string): string;