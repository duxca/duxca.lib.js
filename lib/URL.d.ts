export declare type JSONString = string;
export declare type QueryString = string;
export declare function encodeURIQuery(dic: {
    [key: string]: JSONString;
}): QueryString;
export declare function decodeURIQuery(query: QueryString): {
    [key: string]: JSONString;
};
export declare type DataURI = string;
export declare function encodeDataURI(data: string, mimetype: string): Promise<DataURI>;
export declare function decodeDataURI(dataURI: DataURI): Promise<string>;
