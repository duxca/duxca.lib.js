"use strict";
/**
 * @example
 * ```ts
 * (async ()=>{
 *   await sleep(10);
 * })();
 * ```
 */
function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
}
exports.sleep = sleep;
