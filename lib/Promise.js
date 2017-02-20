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
function asynchronous(fn, ctx) {
    return function _asyncFn() {
        var args = Array.prototype.slice.call(arguments);
        return new Promise(function (resolve, reject) {
            fn.apply(ctx, args.concat(function (err, val) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(val);
                }
            }));
        });
    };
}
exports.asynchronous = asynchronous;
