var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var CanvasRender = (function () {
            function CanvasRender(width, height) {
                this.element = this.cnv = document.createElement("canvas");
                this.cnv.width = width;
                this.cnv.height = height;
                this.ctx = this.cnv.getContext("2d");
            }
            CanvasRender.prototype.drawSignal = function (signal, flagX, flagY) {
                if (flagX === void 0) { flagX = false; }
                if (flagY === void 0) { flagY = false; }
                var zoomX = !flagX ? 1 : this.cnv.width / signal.length;
                var zoomY = !flagY ? 1 : this.cnv.height / Math.max.apply(null, signal);
                this.ctx.beginPath();
                this.ctx.moveTo(0, this.cnv.height - signal[0] * zoomY);
                for (var i = 1; i < signal.length; i++) {
                    this.ctx.lineTo(zoomX * i, this.cnv.height - signal[i] * zoomY);
                }
                this.ctx.stroke();
            };
            CanvasRender.prototype.drawColLine = function (x) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.cnv.height);
                this.ctx.stroke();
            };
            CanvasRender.prototype.drawRowLine = function (y) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.cnv.width, y);
                this.ctx.stroke();
            };
            return CanvasRender;
        })();
        lib.CanvasRender = CanvasRender;
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
