/**
 * @example
 * ```ts
 * (async ()=>{
 *   await sleep(10);
 * })();
 * ```
 */
export declare function sleep(ms: number): Promise<void>;
/**
 *  fs APIはコールバックを取るので現代的にPromiseに変換する
 */
export declare function asynchronous<A, U, V>(fn: (a: A) => U, ctx: V): (a: A) => Promise<U>;
export declare function asynchronous<A, B, U, V>(fn: (a: A, b: B) => U, ctx: V): (a: A, b: B) => Promise<U>;
export declare function asynchronous<A, B, C, U, V>(fn: (a: A, b: B, c: C) => U, ctx: V): (a: A, b: B, c: C) => Promise<U>;
export declare function asynchronous<A, B, C, D, U, V>(fn: (a: A, b: B, c: C, d: D) => U, ctx: V): (a: A, b: B, c: C, d: D) => Promise<U>;
export declare function asynchronous<A, B, C, D, U, E, V>(fn: (a: A, b: B, c: C, d: D, e: E) => U, ctx: V): (a: A, b: B, c: C, d: D, e: E) => Promise<U>;
