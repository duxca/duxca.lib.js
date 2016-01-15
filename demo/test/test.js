window.craetePictureFrame = function (description, target) {
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
            line: 70
        }));
        assert.ok(assert._expr(assert._capt(ITERATIONS, 'arguments/0'), {
            content: 'assert.ok(ITERATIONS)',
            filepath: 'test/test.js',
            line: 71
        }));
        assert.ok(assert._expr(assert._capt(assert._capt(totalTime, 'arguments/0/left') / assert._capt(ITERATIONS, 'arguments/0/right'), 'arguments/0'), {
            content: 'assert.ok(totalTime / ITERATIONS)',
            filepath: 'test/test.js',
            line: 72
        }));
        return done();
    });
});
QUnit.test('FFT,IFFT', function (assert) {
    var _, _sinWave, a, i, imag, j, k, len1, len2, length, real, ref, sinWave, spectrum, startTime, stopTime, totalError, totalTime;
    startTime = performance.now();
    length = Math.pow(2, 14);
    sinWave = new Float32Array(length);
    for (i = j = 0, len1 = sinWave.length; j < len1; i = ++j) {
        _ = sinWave[i];
        sinWave[i] = Math.sin(i);
    }
    ref = new Signal.fft(sinWave), real = ref.real, imag = ref.imag, spectrum = ref.spectrum;
    _sinWave = new Signal.ifft(real, imag);
    stopTime = performance.now();
    totalTime = stopTime - startTime;
    totalError = 0;
    for (i = k = 0, len2 = sinWave.length; k < len2; i = ++k) {
        _ = sinWave[i];
        a = sinWave[i] - _sinWave[i];
        totalError += a * a;
    }
    assert.ok(assert._expr(assert._capt(length, 'arguments/0'), {
        content: 'assert.ok(length)',
        filepath: 'test/test.js',
        line: 96
    }));
    assert.ok(assert._expr(assert._capt(assert._capt(totalError, 'arguments/0/left') < assert._capt(assert._capt(Math, 'arguments/0/right/callee/object').pow(2, assert._capt(-10, 'arguments/0/right/arguments/1')), 'arguments/0/right'), 'arguments/0'), {
        content: 'assert.ok(totalError < Math.pow(2, -10))',
        filepath: 'test/test.js',
        line: 97
    }));
    return assert.ok(assert._expr(assert._capt(totalTime, 'arguments/0'), {
        content: 'assert.ok(totalTime)',
        filepath: 'test/test.js',
        line: 98
    }));
});
QUnit.test('mseqGen', function (assert) {
    var expLen, expected, mseq, mseqLen, startTime, stopTime, totalTime;
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
    mseqLen = mseq.length;
    expLen = expected.length;
    assert.ok(assert._expr(assert._capt(assert._capt(mseqLen, 'arguments/0/left') === assert._capt(expLen, 'arguments/0/right'), 'arguments/0'), {
        content: 'assert.ok(mseqLen === expLen)',
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
    var _, i, j, len1, length, render, sinWave;
    length = Math.pow(2, 10);
    sinWave = new Float32Array(length);
    for (i = j = 0, len1 = sinWave.length; j < len1; i = ++j) {
        _ = sinWave[i];
        sinWave[i] = Math.sin(i / 10);
    }
    render = new Signal.Render(sinWave.length, 127);
    render.drawSignal(sinWave, true, true);
    document.body.appendChild(render.element);
    return assert.ok(true);
});
QUnit.test('naive_correlation', function (assert) {
    var correl, correlLen, frame, i, j, length, ref, render, sigLen, signal;
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
    correlLen = correl.length;
    sigLen = signal.length;
    return assert.ok(assert._expr(assert._capt(assert._capt(correlLen, 'arguments/0/left') === assert._capt(sigLen, 'arguments/0/right'), 'arguments/0'), {
        content: 'assert.ok(correlLen === sigLen)',
        filepath: 'test/test.js',
        line: 148
    }));
});
QUnit.test('naive_convolution', function (assert) {
    var conv, convLen, frame, i, j, length, ref, render, sigLen, signal;
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
    convLen = conv.length;
    sigLen = signal.length;
    return assert.ok(assert._expr(assert._capt(assert._capt(convLen, 'arguments/0/left') === assert._capt(sigLen, 'arguments/0/right'), 'arguments/0'), {
        content: 'assert.ok(convLen === sigLen)',
        filepath: 'test/test.js',
        line: 168
    }));
});
QUnit.test('fft_correlation', function (assert) {
    var _, correl, correlLen, frame, i, j, len1, length, render, sigLen, signal;
    frame = craetePictureFrame('fft_correlation');
    length = Math.pow(2, 8);
    signal = new Float32Array(length);
    for (i = j = 0, len1 = signal.length; j < len1; i = ++j) {
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
    correlLen = correl.length;
    sigLen = signal.length;
    return assert.ok(assert._expr(assert._capt(assert._capt(correlLen, 'arguments/0/left') === assert._capt(sigLen, 'arguments/0/right'), 'arguments/0'), {
        content: 'assert.ok(correlLen === sigLen)',
        filepath: 'test/test.js',
        line: 189
    }));
});
QUnit.test('fft_convolution', function (assert) {
    var _, conv, convLen, frame, i, j, len1, length, render, sigLen, signal;
    frame = craetePictureFrame('fft_convolution');
    length = Math.pow(2, 8);
    signal = new Float32Array(length);
    for (i = j = 0, len1 = signal.length; j < len1; i = ++j) {
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
    convLen = conv.length;
    sigLen = signal.length;
    return assert.ok(assert._expr(assert._capt(assert._capt(convLen, 'arguments/0/left') === assert._capt(sigLen, 'arguments/0/right'), 'arguments/0'), {
        content: 'assert.ok(convLen === sigLen)',
        filepath: 'test/test.js',
        line: 210
    }));
});
QUnit.test('mseqGen -> fft_correlation', function (assert) {
    var T, _signal, correl, correl2, correlLen, frame, i, j, length, ref, render, sigLen, signal;
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
    correl = Signal.smartCorrelation(_signal, signal);
    correl2 = Signal.fft_smart_overwrap_correlation(_signal, signal);
    render = new Signal.Render(signal.length, 127);
    render.drawSignal(signal, true, true);
    frame.add(render.element, 'sigal');
    render = new Signal.Render(_signal.length, 127);
    render.drawSignal(_signal, true, true);
    frame.add(render.element, 'sigal');
    render = new Signal.Render(correl.length, 127);
    render.drawSignal(correl, true, true);
    frame.add(render.element, 'auto-correl');
    render = new Signal.Render(correl2.length, 127);
    render.drawSignal(correl2, true, true);
    frame.add(render.element, 'auto-correl2(POF)');
    correlLen = correl.length;
    sigLen = _signal.length;
    return assert.ok(assert._expr(assert._capt(assert._capt(correlLen, 'arguments/0/left') === assert._capt(sigLen, 'arguments/0/right'), 'arguments/0'), {
        content: 'assert.ok(correlLen === sigLen)',
        filepath: 'test/test.js',
        line: 239
    }));
});
QUnit.test('phase_only_filter', function (assert) {
    var _, _correl, correl, correlLen, frame, i, j, len1, length, render, sigLen, signal, signal_noized;
    frame = craetePictureFrame('phase_only_filter');
    length = Math.pow(2, 10);
    signal = new Float32Array(length);
    signal_noized = new Float32Array(length);
    for (i = j = 0, len1 = signal.length; j < len1; i = ++j) {
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
    correlLen = correl.length;
    sigLen = signal.length;
    return assert.ok(assert._expr(assert._capt(assert._capt(correlLen, 'arguments/0/left') === assert._capt(sigLen, 'arguments/0/right'), 'arguments/0'), {
        content: 'assert.ok(correlLen === sigLen)',
        filepath: 'test/test.js',
        line: 273
    }));
});
QUnit.test('encode_chipcode, fft_smart_overwrap_correlation', function (assert) {
    var bits, bitsLen, correl, correlLen, frame, mseq, mseqLen, peaks, render, seq, seqLen, threshold;
    frame = craetePictureFrame('encode_chipcode, fft_smart_overwrap_correlation');
    mseq = Signal.mseqGen(10, [
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        0,
        0,
        1
    ]);
    bits = [
        1,
        0,
        0,
        0,
        1,
        0,
        0,
        1,
        0
    ];
    seq = Signal.encode_chipcode(bits, mseq);
    mseqLen = mseq.length;
    bitsLen = bits.length;
    seqLen = seq.length;
    render = new Signal.Render(seq.length, 127);
    render.drawSignal(seq, true, true);
    frame.add(render.element, 'encode_chipcode');
    assert.ok(assert._expr(assert._capt(assert._capt(seqLen, 'arguments/0/left') === assert._capt(assert._capt(mseqLen, 'arguments/0/right/left') * assert._capt(bitsLen, 'arguments/0/right/right'), 'arguments/0/right'), 'arguments/0'), {
        content: 'assert.ok(seqLen === mseqLen * bitsLen)',
        filepath: 'test/test.js',
        line: 288
    }));
    correl = Signal.fft_smart_overwrap_correlation(seq, mseq);
    correlLen = correl.length;
    assert.ok(assert._expr(assert._capt(assert._capt(correlLen, 'arguments/0/left') === assert._capt(seqLen, 'arguments/0/right'), 'arguments/0'), {
        content: 'assert.ok(correlLen === seqLen)',
        filepath: 'test/test.js',
        line: 291
    }));
    threshold = bits.length / 2;
    peaks = correl.reduce(function (lst, v, i) {
        if (Math.abs(v) > threshold) {
            return lst.concat(i);
        } else {
            return lst;
        }
    }, []);
    assert.ok(assert._expr(assert._capt(assert._capt(assert._capt(peaks, 'arguments/0/left/object').length, 'arguments/0/left') === assert._capt(bitsLen, 'arguments/0/right'), 'arguments/0'), {
        content: 'assert.ok(peaks.length === bitsLen)',
        filepath: 'test/test.js',
        line: 300
    }));
    if (peaks.length > bitsLen) {
        throw 'escape';
        return;
    }
    peaks.forEach(function (i) {
        var peak;
        peak = correl[i];
        return assert.ok(assert._expr(assert._capt(assert._capt(assert._capt(assert._capt(i, 'arguments/0/left/left/left') % assert._capt(mseqLen, 'arguments/0/left/left/right'), 'arguments/0/left/left') === 0, 'arguments/0/left') && assert._capt(assert._capt(assert._capt(Math, 'arguments/0/right/left/callee/object').abs(assert._capt(peak, 'arguments/0/right/left/arguments/0')), 'arguments/0/right/left') > assert._capt(threshold, 'arguments/0/right/right'), 'arguments/0/right'), 'arguments/0'), {
            content: 'assert.ok(i % mseqLen === 0 && Math.abs(peak) > threshold)',
            filepath: 'test/test.js',
            line: 308
        }));
    });
    render = new Signal.Render(correl.length, 127);
    render.drawSignal(correl, true, true);
    return frame.add(render.element, 'fft_smart_overwrap_correlation');
});
QUnit.test('carrierGen, BPSK', function (assert) {
    var frame, len, render, sig, sig2, sig2Len, sigLen;
    frame = craetePictureFrame('carrierGen, BPSK');
    len = 103;
    sig = Signal.BPSK([
        -1,
        1,
        1
    ], 1000, 44100, 0, len);
    sig2 = Signal.BPSK([
        -1,
        1,
        1
    ], 1000, 44100, len / 44100, 1024);
    sigLen = sig.length;
    sig2Len = sig2.length;
    assert.ok(assert._expr(assert._capt(assert._capt(sigLen, 'arguments/0/left') === assert._capt(len, 'arguments/0/right'), 'arguments/0'), {
        content: 'assert.ok(sigLen === len)',
        filepath: 'test/test.js',
        line: 323
    }));
    assert.ok(assert._expr(assert._capt(assert._capt(sig2Len, 'arguments/0/left') === 1024, 'arguments/0'), {
        content: 'assert.ok(sig2Len === 1024)',
        filepath: 'test/test.js',
        line: 324
    }));
    assert.ok(assert._expr(assert._capt(assert._capt(assert._capt(assert._capt(sig, 'arguments/0/left/left/object')[assert._capt(assert._capt(sigLen, 'arguments/0/left/left/property/left') - 1, 'arguments/0/left/left/property')], 'arguments/0/left/left') - assert._capt(assert._capt(sig2, 'arguments/0/left/right/object')[0], 'arguments/0/left/right'), 'arguments/0/left') < 0.1, 'arguments/0'), {
        content: 'assert.ok(sig[sigLen - 1] - sig2[0] < 0.1)',
        filepath: 'test/test.js',
        line: 325
    }));
    render = new Signal.Render(sig.length, 127);
    render.drawSignal(sig, true, true);
    frame.add(render.element, 'sig');
    render = new Signal.Render(sig2.length, 127);
    render.drawSignal(sig2, true, true);
    return frame.add(render.element, 'sig2');
});
QUnit.test('encode_chipcode, fft_smart_overwrap_correlation, carrierGen, BPSK', function (assert) {
    var bits, code, correl, frame, freq, matched, mseq, render, sampleRate, sig, sig_long, sig_noized;
    frame = craetePictureFrame('encode_chipcode, fft_smart_overwrap_correlation, carrierGen, BPSK');
    mseq = Signal.mseqGen(7, [
        0,
        0,
        1,
        0,
        0,
        0,
        1
    ]);
    bits = [
        1,
        0
    ];
    freq = 4000;
    sampleRate = 44100;
    code = Signal.encode_chipcode(bits, mseq);
    matched = Signal.BPSK(mseq, freq, sampleRate, 0);
    sig = Signal.BPSK(code, freq, sampleRate, 0);
    sig_long = Signal.BPSK(code, freq, sampleRate, 0, Math.pow(2, 14));
    sig_noized = sig_long.map(function (a) {
        return a + 2 * (Math.random() - 0.5);
    });
    console.log(correl = Signal.fft_smart_overwrap_correlation(sig_long, matched));
    console.log(bits.length);
    console.log(mseq.length);
    console.log(code.length);
    console.log(matched.length);
    console.log(sig.length);
    console.log(sig_long.length);
    console.log(correl.length);
    render = new Signal.Render(matched.length, 127);
    render.drawSignal(mseq, true, true);
    frame.add(render.element, 'mseq');
    frame.add(document.createElement('br'));
    render = new Signal.Render(matched.length, 127);
    render.drawSignal(matched, true, true);
    frame.add(render.element, 'matched');
    frame.add(document.createElement('br'));
    render = new Signal.Render(sig.length, 127);
    render.drawSignal(bits, true, true);
    frame.add(render.element, 'bits');
    frame.add(document.createElement('br'));
    render = new Signal.Render(sig.length, 127);
    render.drawSignal(code, true, true);
    frame.add(render.element, 'code');
    frame.add(document.createElement('br'));
    render = new Signal.Render(sig.length, 127);
    render.drawSignal(sig, true, true);
    frame.add(render.element, 'sig');
    frame.add(document.createElement('br'));
    render = new Signal.Render(sig_long.length, 127);
    render.drawSignal(sig_long, true, true);
    frame.add(render.element, 'sig_long');
    render = new Signal.Render(sig_noized.length, 127);
    render.drawSignal(sig_noized, true, true);
    frame.add(render.element, 'sig_noized');
    render = new Signal.Render(correl.length, 127);
    render.drawSignal(correl, true, true);
    frame.add(render.element, 'correl');
    return assert.ok(true);
});
QUnit.test('goldSeqGen', function (assert) {
    var T, _, correlAA, correlAB, correlBB, correlLen, correl_longMA, correl_longMB, frame, idA, idB, length, mixed, ref, ref1, render, sigLen, sig_longA, sig_longB, signalA, signalB;
    frame = craetePictureFrame('goldSeqGen');
    length = Math.pow(2, 8);
    signalA = Signal.goldSeqGen(7, [
        0,
        0,
        1,
        0,
        0,
        0,
        1
    ], [
        1,
        1,
        0,
        1,
        1,
        1,
        1
    ], 3);
    signalB = Signal.goldSeqGen(7, [
        0,
        0,
        1,
        0,
        0,
        0,
        1
    ], [
        1,
        0,
        0,
        0,
        0,
        0,
        1
    ], 4);
    T = 16;
    correlAA = Signal.fft_smart_overwrap_correlation(signalA, signalA);
    render = new Signal.Render(signalA.length, 127);
    render.drawSignal(signalA, true, true);
    frame.add(render.element, 'sigalA');
    render = new Signal.Render(correlAA.length, 127);
    render.drawSignal(correlAA, true, true);
    frame.add(render.element, 'correlAA');
    correlBB = Signal.fft_smart_overwrap_correlation(signalB, signalB);
    render = new Signal.Render(signalB.length, 127);
    render.drawSignal(signalB, true, true);
    frame.add(render.element, 'sigalA');
    render = new Signal.Render(correlBB.length, 127);
    render.drawSignal(correlBB, true, true);
    frame.add(render.element, 'correlBB');
    correlAB = Signal.fft_smart_overwrap_correlation(signalA, signalB);
    render = new Signal.Render(correlAB.length, 127);
    render.drawSignal(correlAB, true, true);
    frame.add(render.element, 'correlAB');
    correlLen = correlAA.length;
    sigLen = signalA.length;
    assert.ok(assert._expr(assert._capt(assert._capt(correlLen, 'arguments/0/left') === assert._capt(sigLen, 'arguments/0/right'), 'arguments/0'), {
        content: 'assert.ok(correlLen === sigLen)',
        filepath: 'test/test.js',
        line: 415
    }));
    sig_longA = Signal.BPSK(signalA, 1000, 44100, 0);
    sig_longB = Signal.BPSK(signalB, 1000, 44100, 0);
    mixed = sig_longA.map(function (v, i) {
        return sig_longA[(i + 149) % sig_longA.length] + sig_longB[(i + 133) % sig_longB.length];
    });
    correl_longMB = Signal.fft_smart_overwrap_correlation(mixed, sig_longB);
    correl_longMA = Signal.fft_smart_overwrap_correlation(mixed, sig_longA);
    ref = Signal.Statictics.findMax(correl_longMA), _ = ref[0], idA = ref[1];
    ref1 = Signal.Statictics.findMax(correl_longMB), _ = ref1[0], idB = ref1[1];
    assert.ok(assert._expr(assert._capt(assert._capt(idA, 'arguments/0/left') === 149, 'arguments/0'), {
        content: 'assert.ok(idA === 149)',
        filepath: 'test/test.js',
        line: 425
    }));
    assert.ok(assert._expr(assert._capt(assert._capt(idB, 'arguments/0/left') === 133, 'arguments/0'), {
        content: 'assert.ok(idB === 133)',
        filepath: 'test/test.js',
        line: 426
    }));
    render = new Signal.Render(correl_longMA.length, 127);
    render.drawSignal(correl_longMA, true, true);
    frame.add(render.element, 'correl_longAB');
    render = new Signal.Render(correl_longMB.length, 127);
    render.drawSignal(correl_longMB, true, true);
    return frame.add(render.element, 'correl_longAB');
});