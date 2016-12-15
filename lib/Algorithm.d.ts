export declare function choice<T>(arr: T[]): T;
export declare function gensym(): string;
export declare function times(char: string, n: number): string;
export declare function randTimes<T>(fn: () => T, threshold: number): T[];
export declare function randomRange(min: number, max: number): number;
export declare function heredoc(fn: Function): string;
export declare function space(i: number): string;
export declare function getPropertys(o: {
    [key: string]: any;
}): string[];
export declare function suggest(env: {
    [key: string]: any;
}, keyword: string): string[];
export declare function autocomplete(code: string): {
    tokens: [string, string, string];
    results: string[];
};
export declare function type(o: any): string;
export declare function dump(o: any, depth?: number): string;
