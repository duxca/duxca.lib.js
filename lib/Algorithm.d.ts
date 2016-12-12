export declare function choice<T>(arr: T[]): T;
export declare function gensym(): string;
export declare function times(char: string, n: number): string;
export declare function randTimes<T>(fn: () => T, threshold: number): T[];
export declare function randomRange(min: number, max: number): number;
export declare function heredoc(fn: Function): string;
