var craetePictureFrame;
craetePictureFrame = function (description, target) {
    var fieldset, legend, style;
    if (target == null) {
        target = document.body;
    }
    fieldset = document.createElement('fieldset');
    style = document.createElement('style');
    style.appendChild(document.createTextNode('canvas,img{border:1px solid black;}'));
    style.setAttribute('scoped', 'scoped');
    fieldset.appendChild(style);
    legend = document.createElement('legend');
    legend.appendChild(document.createTextNode(description));
    fieldset.appendChild(legend);
    fieldset.style.display = 'inline-block';
    target.appendChild(fieldset);
    fieldset.style.backgroundColor = '#D2E0E6';
    return {
        add: function (element, txt) {
            var frame, p, txtNode;
            if (txt != null) {
                frame = craetePictureFrame(txt, fieldset);
                return frame.add(element);
            } else if (typeof element === 'string') {
                txtNode = document.createTextNode(element);
                p = document.createElement('p');
                p.appendChild(txtNode);
                return fieldset.appendChild(p);
            } else {
                return fieldset.appendChild(element);
            }
        }
    };
};
QUnit.module('Signal');
QUnit.test('ServerWorker test', function (assert) {
    var ITERATIONS, WORKERS, done, j, results1, workers;
    done = assert.async();
    WORKERS = 2;
    ITERATIONS = 100;
    workers = function () {
        results1 = [];
        for (var j = 1; 1 <= WORKERS ? j <= WORKERS : j >= WORKERS; 1 <= WORKERS ? j++ : j--) {
            results1.push(j);
        }
        return results1;
    }.apply(this).map(function () {
        return new InlineServerWorker(['../dist/Signal.js'], function (conn) {
            return conn.on('echo', function (data, reply) {
                return reply(data);
            });
        });
    });
    return Promise.all(workers.map(function (worker) {
        return worker.load();
    })).then(function (workers) {
        var k, results2, startTime;
        startTime = performance.now();
        return Promise.all(function () {
            results2 = [];
            for (var k = 1; 1 <= ITERATIONS ? k <= ITERATIONS : k >= ITERATIONS; 1 <= ITERATIONS ? k++ : k--) {
                results2.push(k);
            }
            return results2;
        }.apply(this).map(function (i) {
            return workers[i % workers.length].request('echo', i);
        })).then(function (results) {
            var stopTime, totalTime;
            stopTime = performance.now();
            return totalTime = stopTime - startTime;
        });
    }).then(function (totalTime) {
        assert.ok(assert._expr(assert._capt(WORKERS, 'arguments/0'), {
            content: 'assert.ok(WORKERS)',
            filepath: 'test/test.js',
            line: 72
        }));
        assert.ok(assert._expr(assert._capt(ITERATIONS, 'arguments/0'), {
            content: 'assert.ok(ITERATIONS)',
            filepath: 'test/test.js',
            line: 73
        }));
        assert.ok(assert._expr(assert._capt(assert._capt(totalTime, 'arguments/0/left') / assert._capt(ITERATIONS, 'arguments/0/right'), 'arguments/0'), {
            content: 'assert.ok(totalTime / ITERATIONS)',
            filepath: 'test/test.js',
            line: 74
        }));
        return done();
    });
});
QUnit.test('FFT,IFFT', function (assert) {
    var _, _sinWave, a, i, imag, j, k, len, len1, length, real, ref, sinWave, spectrum, startTime, stopTime, totalError, totalTime;
    startTime = performance.now();
    length = Math.pow(2, 14);
    sinWave = new Float32Array(length);
    for (i = j = 0, len = sinWave.length; j < len; i = ++j) {
        _ = sinWave[i];
        sinWave[i] = Math.sin(i);
    }
    ref = new Signal.fft(sinWave), real = ref.real, imag = ref.imag, spectrum = ref.spectrum;
    _sinWave = new Signal.ifft(real, imag);
    stopTime = performance.now();
    totalTime = stopTime - startTime;
    totalError = 0;
    for (i = k = 0, len1 = sinWave.length; k < len1; i = ++k) {
        _ = sinWave[i];
        a = sinWave[i] - _sinWave[i];
        totalError += a * a;
    }
    assert.ok(assert._expr(assert._capt(length, 'arguments/0'), {
        content: 'assert.ok(length)',
        filepath: 'test/test.js',
        line: 98
    }));
    assert.ok(assert._expr(assert._capt(assert._capt(totalError, 'arguments/0/left') < assert._capt(assert._capt(Math, 'arguments/0/right/callee/object').pow(2, assert._capt(-10, 'arguments/0/right/arguments/1')), 'arguments/0/right'), 'arguments/0'), {
        content: 'assert.ok(totalError < Math.pow(2, -10))',
        filepath: 'test/test.js',
        line: 99
    }));
    return assert.ok(assert._expr(assert._capt(totalTime, 'arguments/0'), {
        content: 'assert.ok(totalTime)',
        filepath: 'test/test.js',
        line: 100
    }));
});
QUnit.test('mseqGen', function (assert) {
    var expected, mseq, startTime, stopTime, totalTime;
    expected = [
        -1,
        -1,
        -1,
        1,
        1,
        1,
        1,
        -1,
        1,
        -1,
        1,
        1,
        -1,
        -1,
        1
    ];
    startTime = performance.now();
    mseq = Signal.mseqGen(4, [
        1,
        0,
        0,
        1
    ]);
    stopTime = performance.now();
    totalTime = stopTime - startTime;
    assert.ok(assert._expr(assert._capt(assert._capt(assert._capt(mseq, 'arguments/0/left/object').length, 'arguments/0/left') === assert._capt(assert._capt(expected, 'arguments/0/right/object').length, 'arguments/0/right'), 'arguments/0'), {
        content: 'assert.ok(mseq.length === expected.length)',
        filepath: 'test/test.js',
        line: 110
    }));
    expected.forEach(function (v, i) {
        return assert.ok(assert._expr(assert._capt(assert._capt(assert._capt(mseq, 'arguments/0/left/object')[assert._capt(i, 'arguments/0/left/property')], 'arguments/0/left') === assert._capt(assert._capt(expected, 'arguments/0/right/object')[assert._capt(i, 'arguments/0/right/property')], 'arguments/0/right'), 'arguments/0'), {
            content: 'assert.ok(mseq[i] === expected[i])',
            filepath: 'test/test.js',
            line: 112
        }));
    });
    return assert.ok(assert._expr(assert._capt(totalTime, 'arguments/0'), {
        content: 'assert.ok(totalTime)',
        filepath: 'test/test.js',
        line: 114
    }));
});
QUnit.test('drawSignal', function (assert) {
    var _, i, j, len, length, render, sinWave;
    length = Math.pow(2, 10);
    sinWave = new Float32Array(length);
    for (i = j = 0, len = sinWave.length; j < len; i = ++j) {
        _ = sinWave[i];
        sinWave[i] = Math.sin(i / 10);
    }
    render = new Signal.Render(sinWave.length, 127);
    render.drawSignal(sinWave, true, true);
    document.body.appendChild(render.element);
    return assert.ok(true);
});
QUnit.test('naive_correlation', function (assert) {
    var correl, frame, i, j, length, ref, render, signal;
    frame = craetePictureFrame('naive_correlation');
    length = Math.pow(2, 8);
    signal = [];
    for (i = j = 0, ref = length - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
        signal[i] = 64 > i && i > 32 ? 1 : 0;
    }
    correl = Signal.naive_correlation(signal, signal);
    render = new Signal.Render(signal.length, 127);
    render.drawSignal(signal, true, true);
    frame.add(render.element, 'sigal');
    render = new Signal.Render(correl.length, 127);
    render.drawSignal(correl, true, true);
    frame.add(render.element, 'auto-correl');
    return assert.ok(assert._expr(assert._capt(assert._capt(assert._capt(correl, 'arguments/0/left/object').length, 'arguments/0/left') === assert._capt(assert._capt(signal, 'arguments/0/right/object').length, 'arguments/0/right'), 'arguments/0'), {
        content: 'assert.ok(correl.length === signal.length)',
        filepath: 'test/test.js',
        line: 146
    }));
});
QUnit.test('naive_convolution', function (assert) {
    var conv, frame, i, j, length, ref, render, signal;
    frame = craetePictureFrame('naive_convolution');
    length = Math.pow(2, 8);
    signal = [];
    for (i = j = 1, ref = length; 1 <= ref ? j <= ref : j >= ref; i = 1 <= ref ? ++j : --j) {
        signal[i] = 64 > i && i > 32 ? 1 : 0;
    }
    conv = Signal.naive_convolution(signal, signal);
    render = new Signal.Render(signal.length, 127);
    render.drawSignal(signal, true, true);
    frame.add(render.element, 'sigal');
    render = new Signal.Render(conv.length, 127);
    render.drawSignal(conv, true, true);
    frame.add(render.element, 'auto-conv');
    return assert.ok(assert._expr(assert._capt(assert._capt(assert._capt(conv, 'arguments/0/left/object').length, 'arguments/0/left') === assert._capt(assert._capt(signal, 'arguments/0/right/object').length, 'arguments/0/right'), 'arguments/0'), {
        content: 'assert.ok(conv.length === signal.length)',
        filepath: 'test/test.js',
        line: 164
    }));
});
QUnit.test('fft_correlation', function (assert) {
    var _, correl, frame, i, j, len, length, render, signal;
    frame = craetePictureFrame('fft_correlation');
    length = Math.pow(2, 8);
    signal = new Float32Array(length);
    for (i = j = 0, len = signal.length; j < len; i = ++j) {
        _ = signal[i];
        signal[i] = 64 > i && i > 32 ? 1 : 0;
    }
    correl = Signal.fft_correlation(signal, signal);
    render = new Signal.Render(signal.length, 127);
    render.drawSignal(signal, true, true);
    frame.add(render.element, 'sigal');
    render = new Signal.Render(correl.length, 127);
    render.drawSignal(correl, true, true);
    frame.add(render.element, 'auto-correl');
    return assert.ok(assert._expr(assert._capt(assert._capt(assert._capt(correl, 'arguments/0/left/object').length, 'arguments/0/left') === assert._capt(assert._capt(signal, 'arguments/0/right/object').length, 'arguments/0/right'), 'arguments/0'), {
        content: 'assert.ok(correl.length === signal.length)',
        filepath: 'test/test.js',
        line: 183
    }));
});
QUnit.test('fft_convolution', function (assert) {
    var _, conv, frame, i, j, len, length, render, signal;
    frame = craetePictureFrame('fft_convolution');
    length = Math.pow(2, 8);
    signal = new Float32Array(length);
    for (i = j = 0, len = signal.length; j < len; i = ++j) {
        _ = signal[i];
        signal[i] = 64 > i && i > 32 ? 1 : 0;
    }
    conv = Signal.fft_convolution(signal, signal);
    render = new Signal.Render(signal.length, 127);
    render.drawSignal(signal, true, true);
    frame.add(render.element, 'sigal');
    render = new Signal.Render(conv.length, 127);
    render.drawSignal(conv, true, true);
    frame.add(render.element, 'auto-conv');
    return assert.ok(assert._expr(assert._capt(assert._capt(assert._capt(conv, 'arguments/0/left/object').length, 'arguments/0/left') === assert._capt(assert._capt(signal, 'arguments/0/right/object').length, 'arguments/0/right'), 'arguments/0'), {
        content: 'assert.ok(conv.length === signal.length)',
        filepath: 'test/test.js',
        line: 202
    }));
});
QUnit.test('mseqGen -> fft_correlation', function (assert) {
    var T, _signal, correl, frame, i, j, length, ref, render, signal;
    frame = craetePictureFrame('mseqGen -> fft_correlation');
    length = Math.pow(2, 8);
    signal = Signal.mseqGen(7, [
        0,
        0,
        1,
        0,
        0,
        0,
        1
    ]);
    T = 16;
    _signal = new Int8Array(signal.length * T);
    for (i = j = 0, ref = T; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
        _signal.set(signal, signal.length * i);
    }
    signal = _signal;
    correl = Signal.smartCorrelation(signal, signal);
    render = new Signal.Render(signal.length, 127);
    render.drawSignal(signal, true, true);
    frame.add(render.element, 'sigal');
    render = new Signal.Render(correl.length, 127);
    render.drawSignal(correl, true, true);
    frame.add(render.element, 'auto-correl');
    return assert.ok(assert._expr(assert._capt(assert._capt(assert._capt(correl, 'arguments/0/left/object').length, 'arguments/0/left') === assert._capt(assert._capt(signal, 'arguments/0/right/object').length, 'arguments/0/right'), 'arguments/0'), {
        content: 'assert.ok(correl.length === signal.length)',
        filepath: 'test/test.js',
        line: 223
    }));
});
QUnit.test('phase_only_filter', function (assert) {
    var _, _correl, correl, frame, i, j, len, length, render, signal, signal_noized;
    frame = craetePictureFrame('phase_only_filter');
    length = Math.pow(2, 10);
    signal = new Float32Array(length);
    signal_noized = new Float32Array(length);
    for (i = j = 0, len = signal.length; j < len; i = ++j) {
        _ = signal[i];
        signal[i] = 256 > i && i > 128 || 64 > i && i > 32 ? 1 : 0;
        signal_noized[i] = signal[i] + Math.random();
    }
    correl = Signal.phase_only_filter(signal, signal_noized);
    _correl = Signal.correlation(signal, signal_noized);
    render = new Signal.Render(signal.length, 127);
    render.drawSignal(signal, true, true);
    frame.add(render.element, 'signal');
    render = new Signal.Render(signal_noized.length, 127);
    render.drawSignal(signal_noized, true, true);
    frame.add(render.element, 'signal_noized');
    render = new Signal.Render(correl.length, 127);
    render.drawSignal(correl, true, true);
    frame.add(render.element, 'pof_correl');
    render = new Signal.Render(_correl.length, 127);
    render.drawSignal(_correl, true, true);
    frame.add(render.element, 'fft_correl');
    render = new Signal.Render(correl.length, 127);
    render.drawSignal(correl, true, true);
    render.drawSignal(_correl, true, true);
    frame.add(render.element, 'pof+fft_correl');
    return assert.ok(assert._expr(assert._capt(assert._capt(assert._capt(signal, 'arguments/0/left/object').length, 'arguments/0/left') === assert._capt(assert._capt(correl, 'arguments/0/right/object').length, 'arguments/0/right'), 'arguments/0'), {
        content: 'assert.ok(signal.length === correl.length)',
        filepath: 'test/test.js',
        line: 255
    }));
});