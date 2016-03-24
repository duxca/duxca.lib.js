"use strict";
var FPS = (function () {
    function FPS(period) {
        this.period = period;
        this.lastTime = performance.now();
        this.fps = 0;
        this.counter = 0;
    }
    FPS.prototype.step = function () {
        var currentTime = performance.now();
        this.counter += 1;
        if (currentTime - this.lastTime > this.period) {
            this.fps = 1000 * this.counter / (currentTime - this.lastTime);
            this.counter = 0;
            this.lastTime = currentTime;
        }
    };
    FPS.prototype.valueOf = function () {
        return Math.round(this.fps * 1000) / 1000;
    };
    return FPS;
}());
module.exports = FPS;
