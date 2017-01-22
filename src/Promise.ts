

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

