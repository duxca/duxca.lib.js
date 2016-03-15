/// <reference path="../../typings/tsd.d.ts"/>
var CanvasRender_1 = require("./CanvasRender");
var Signal_1 = require("./Signal");
var Sandbox;
(function (Sandbox) {
    function drawSignal() {
        function draw(signal) {
            var render = new CanvasRender_1.default(signal.length * 2, 100);
            document.body.appendChild(render.cnv);
            render.drawSignal(signal, true, true);
        }
        var signal = new Float32Array(1024);
        for (var i = 0; i < signal.length; i++)
            signal[i] = Math.sin(i) * Math.sin(i / 10) + Math.cos(i / 100);
        draw(signal);
        var _a = Signal_1.default.fft(signal), real = _a[0], imag = _a[1], spec = _a[2];
        draw(real);
        draw(imag);
        var abs = new Float32Array(real.length);
        for (var i = 0; i < real.length; i++)
            abs[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
        draw(abs);
        for (var i = 0; i < real.length; i++) {
            real[i] = real[i] / abs[i];
            imag[i] = imag[i] / abs[i];
        }
        draw(real);
        draw(imag);
        var pos = Signal_1.default.ifft(real, imag);
        draw(pos);
    }
    Sandbox.drawSignal = drawSignal;
})(Sandbox || (Sandbox = {}));
module.exports = Sandbox;
