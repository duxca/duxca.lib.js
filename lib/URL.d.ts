export declare type JSONString = string;
export declare type QueryString = string;
export declare type KV<T> = {
    [key: string]: T;
};
export declare function encodeKVJSON<T extends KV<any>>(data: T): KV<JSONString>;
export declare function decodeKVJSON<T extends KV<any>>(kv: KV<JSONString>): T;
export declare function encodeURIQuery(dic: KV<JSONString>): QueryString;
export declare function decodeURIQuery<T extends KV<JSONString>>(query: QueryString): T;
export declare type DataURI = string;
export declare function encodeDataURI(data: string, mimetype: string): Promise<DataURI>;
export declare function decodeDataURI(dataURI: DataURI): Promise<string>;
