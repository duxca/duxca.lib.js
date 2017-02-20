

/**
 * @example
 * ```ts
 * (async ()=>{
 *   await sleep(10);
 * })();
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve)=>{ setTimeout(resolve, ms); });
}


/**
 *  fs APIはコールバックを取るので現代的にPromiseに変換する
 */
export function asynchronous<A, U, V>(fn: (a: A)=> U, ctx: V): (a: A)=> Promise<U>;
export function asynchronous<A, B, U, V>(fn: (a: A, b: B)=> U, ctx: V): (a: A, b: B)=> Promise<U>;
export function asynchronous<A, B, C, U, V>(fn: (a: A, b: B, c: C)=> U, ctx: V): (a: A, b: B, c: C)=> Promise<U>;
export function asynchronous<A, B, C, D, U, V>(fn: (a: A, b: B, c: C, d: D)=> U, ctx: V): (a: A, b: B, c: C, d: D)=> Promise<U>;
export function asynchronous<A, B, C, D, U, E, V>(fn: (a: A, b: B, c: C, d: D, e: E)=> U, ctx: V): (a: A, b: B, c: C, d: D, e: E)=> Promise<U>;
export function asynchronous<U, V>(fn: (...args: any[])=> U, ctx: V): (...args: any[])=> Promise<U> {
  return function _asyncFn(){
    var args = Array.prototype.slice.call(arguments);
    return new Promise(function(resolve, reject){
      fn.apply(ctx, args.concat(function(err, val){
        if(err){
          reject(err);
        }else{
          resolve(val);
        }
      }));
    });
  };
}