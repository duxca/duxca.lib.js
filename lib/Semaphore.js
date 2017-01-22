"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Event_1 = require("./Event");
/**
 * @example
 * ```ts
 * const sem = new Semaphore(2);
 * sem.addTask(()=> sleep(10) );
 * sem.addTask(()=> sleep(10) );
 * sem.addTask(()=> sleep(10) );
 * sem.addTask(()=> sleep(10) );
 * sem.addEventListener("empty", ()=>{
 *   console.log("20 seconds past");
 * });
 * ```
 */
var Semaphore = (function (_super) {
    __extends(Semaphore, _super);
    function Semaphore(taskLimit) {
        var _this = _super.call(this) || this;
        _this.running = 0;
        _this.limit = taskLimit;
        _this.queue = [];
        return _this;
    }
    Semaphore.prototype.addEventListener = function (event, listener) {
        return _super.prototype.addEventListener.apply(this, arguments);
    };
    Semaphore.prototype.addTask = function (task) {
        this.queue.push(task);
        this.check_task();
    };
    Semaphore.prototype.check_task = function () {
        if (this.queue.length === 0) {
            this.dispatchEvent(new Event("empty"));
            return;
        }
        if (this.running > this.limit) {
            return;
        }
        this.do_task();
    };
    Semaphore.prototype.do_task = function () {
        var _this = this;
        var task = this.queue.shift();
        if (task == null) {
            return;
        }
        this.running++;
        var prm = task();
        prm
            .catch(function (err) { console.warn(err, new Error().stack); })
            .then(function () {
            _this.running--;
            _this.check_task();
        });
    };
    return Semaphore;
}(Event_1.EventTargetLike));
exports.Semaphore = Semaphore;
function runSemaphore(limit, tasks) {
    var sem = new Semaphore(limit);
    var rets = [];
    tasks.forEach(function (task, i) {
        sem.addTask(function () {
            var prm = task();
            return prm.then(function (ret) {
                rets[i] = prm;
                return ret;
            });
        });
    });
    return Event_1.fetchEvent(sem, "empty").then(function () {
        return rets;
    });
}
exports.runSemaphore = runSemaphore;
