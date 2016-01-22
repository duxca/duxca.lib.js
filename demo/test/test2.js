var SignalViewer, n, view;
SignalViewer = function () {
    function SignalViewer(width, height) {
        this.cnv = document.createElement('canvas');
        this.cnv.width = width;
        this.cnv.height = height;
        this.ctx = this.cnv.getContext('2d');
        this.offsetX = 0;
        this.offsetY = this.cnv.height / 2;
        this.zoomX = 1;
        this.zoomY = 1;
        this.drawZero = true;
        this.drawAuto = true;
        this.drawStatus = true;
    }
    SignalViewer.prototype.text = function (str, x, y) {
        var fillStyle, font, lineWidth, o, ref, strokeStyle;
        ref = this.ctx, font = ref.font, lineWidth = ref.lineWidth, strokeStyle = ref.strokeStyle, fillStyle = ref.fillStyle;
        this.ctx.font = '35px';
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = 'white';
        this.ctx.strokeText(str, x, y);
        this.ctx.fillStyle = 'black';
        this.ctx.fillText(str, x, y);
        o = {
            font: font,
            lineWidth: lineWidth,
            strokeStyle: strokeStyle,
            fillStyle: fillStyle
        };
        return Object.keys(o).forEach(function (_this) {
            return function (key) {
                return _this.ctx[key] = o[key];
            };
        }(this));
    };
    SignalViewer.prototype.draw = function (_arr) {
        var _, arr, i, max, min, ref, ref1;
        arr = _arr.map(function (v) {
            if (isFinite(v)) {
                return v;
            } else {
                return 0;
            }
        });
        ref = Signal.Statictics.findMax(arr), max = ref[0], _ = ref[1];
        ref1 = Signal.Statictics.findMin(arr), min = ref1[0], _ = ref1[1];
        if (this.drawAuto) {
            this.zoomX = this.cnv.width / arr.length;
            this.zoomY = this.cnv.height / (max - min);
            this.offsetY = -min;
        }
        if (this.drawZero) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, this.cnv.height - this.zoomY * (0 + this.offsetY));
            this.ctx.lineTo(this.cnv.width, this.cnv.height - this.zoomY * (0 + this.offsetY));
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(this.offsetX, this.cnv.height - 0);
            this.ctx.lineTo(this.offsetX, this.cnv.height - this.cnv.height);
            this.ctx.stroke();
        }
        this.ctx.beginPath();
        this.ctx.moveTo(this.zoomX * (0 + this.offsetX), this.cnv.height - this.zoomY * (arr[0] + this.offsetY));
        i = 0;
        while (i++ < arr.length) {
            this.ctx.lineTo(this.zoomX * (i + this.offsetX), this.cnv.height - this.zoomY * (arr[i] + this.offsetY));
        }
        this.ctx.stroke();
        if (this.drawStatus) {
            this.text('min:' + min, 5, 15);
            this.text('max:' + max, 5, 25);
            return this.text('len:' + arr.length, 5, 35);
        }
    };
    return SignalViewer;
}();
view = function (arr, w, h) {
    var _view;
    if (w == null) {
        w = arr.length;
    }
    if (h == null) {
        h = 128;
    }
    _view = new SignalViewer(w, h);
    document.body.appendChild(_view.cnv);
    return _view.draw(arr);
};
n = function (a) {
    return a.split('').map(Number);
};
QUnit.module('Signal');
QUnit.test('naive_convolution, fft_convolution, fft_smart_overwrap_convolution', function (assert) {
    var T, conved, conved2, conved3, inpulseResponse, signal;
    assert.ok(true);
    T = 1024 / 2 / 2;
    signal = new Float32Array(T);
    signal[0] = 1;
    view(signal);
    inpulseResponse = new Float32Array(T);
    inpulseResponse[0] = 1;
    inpulseResponse[10] = 1;
    inpulseResponse[20] = 0.5;
    view(inpulseResponse);
    conved = Signal.fft_smart_overwrap_convolution(signal, inpulseResponse);
    view(conved);
    conved2 = Signal.fft_convolution(signal, inpulseResponse);
    view(conved2);
    conved3 = Signal.naive_convolution(signal, inpulseResponse);
    return view(conved3);
});
QUnit.test('splated echo', function (assert) {
    var _correl, _imag, _real, beta, cepstrum, conved, correl, imag, inpulseResponse, kernel, offset, pn, real, ref, signal;
    assert.ok(true);
    offset = 100;
    beta = 1 / 10;
    pn = new Float32Array(Signal.mseqGen(11, n('01001001001')));
    view(pn);
    pn.forEach(function (_, i) {
        return pn[i] *= beta;
    });
    kernel = new Float32Array(1024 * 4);
    kernel[0] = 1;
    kernel.set(pn, offset);
    view(kernel);
    inpulseResponse = kernel;
    view(Signal.fft_smart_overwrap_correlation(kernel, pn));
    view(signal = Signal.carrierGen(1000, 44100, 0, 1024 * 4));
    view(conved = Signal.fft_smart_overwrap_convolution(signal, inpulseResponse));
    console.log((ref = Signal.fft(conved), real = ref.real, imag = ref.imag, ref));
    view(real);
    view(imag);
    view(_real = real.map(function (v) {
        return Math.log(Math.abs(v));
    }));
    view(_imag = imag.map(function (v, i) {
        return Math.atan2(real[i], imag[i]);
    }));
    view(cepstrum = Signal.ifft(_real, _imag));
    view(correl = Signal.fft_smart_overwrap_correlation(cepstrum, pn));
    view(_correl = correl.map(function (v) {
        return v * v;
    }));
    return console.log(Signal.Statictics.findMax(_correl));
});
n = function (a) {
    return a.split('').map(Number);
};
QUnit.test('Gold', function (assert) {
    var correlAA, correlAB, correlBB, goldA, goldB, signalA, signalB;
    assert.ok(true);
    view(goldA = Signal.goldSeqGen(12, n('111000011001'), n('011110111111'), 3));
    view(goldB = Signal.goldSeqGen(12, n('100101000001'), n('101101010111'), 3));
    view(signalA = Signal.BPSK(goldA, 1000, 44100, 0), 1024 * 4);
    view(signalB = Signal.BPSK(goldB, 1000, 44100, 0), 1024 * 4);
    view(correlAA = Signal.fft_smart_overwrap_correlation(signalA, signalA), 1024 * 4);
    view(correlAB = Signal.fft_smart_overwrap_correlation(signalA, signalB), 1024 * 4);
    return view(correlBB = Signal.fft_smart_overwrap_correlation(signalB, signalB), 1024 * 4);
});