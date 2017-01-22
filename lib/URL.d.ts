export declare type KV<T> = {
    [key: string]: T;
};
/**
 * @param T - JSONObject
 * @return location.search
 */
export declare function encodeURIQuery<T extends {
    [key: string]: string;
}>(json: T): string;
/**
 * @param search - location.search
 * @return T - JSONObject
 */
export declare function decodeURIQuery<T extends {
    [key: string]: string;
}>(search: string): T;
