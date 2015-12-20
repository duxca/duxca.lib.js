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
            line: 36
        }));
        assert.ok(assert._expr(assert._capt(ITERATIONS, 'arguments/0'), {
            content: 'assert.ok(ITERATIONS)',
            filepath: 'test/test.js',
            line: 37
        }));
        assert.ok(assert._expr(assert._capt(assert._capt(totalTime, 'arguments/0/left') / assert._capt(ITERATIONS, 'arguments/0/right'), 'arguments/0'), {
            content: 'assert.ok(totalTime / ITERATIONS)',
            filepath: 'test/test.js',
            line: 38
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
    ref = new Signal.fft(sinWave), real = ref[0], imag = ref[1], spectrum = ref[2];
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
        line: 62
    }));
    assert.ok(assert._expr(assert._capt(assert._capt(totalError, 'arguments/0/left') < assert._capt(assert._capt(Math, 'arguments/0/right/callee/object').pow(2, assert._capt(-10, 'arguments/0/right/arguments/1')), 'arguments/0/right'), 'arguments/0'), {
        content: 'assert.ok(totalError < Math.pow(2, -10))',
        filepath: 'test/test.js',
        line: 63
    }));
    return assert.ok(assert._expr(assert._capt(totalTime, 'arguments/0'), {
        content: 'assert.ok(totalTime)',
        filepath: 'test/test.js',
        line: 64
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
        line: 74
    }));
    expected.forEach(function (v, i) {
        return assert.ok(assert._expr(assert._capt(assert._capt(assert._capt(mseq, 'arguments/0/left/object')[assert._capt(i, 'arguments/0/left/property')], 'arguments/0/left') === assert._capt(assert._capt(expected, 'arguments/0/right/object')[assert._capt(i, 'arguments/0/right/property')], 'arguments/0/right'), 'arguments/0'), {
            content: 'assert.ok(mseq[i] === expected[i])',
            filepath: 'test/test.js',
            line: 76
        }));
    });
    return assert.ok(assert._expr(assert._capt(totalTime, 'arguments/0'), {
        content: 'assert.ok(totalTime)',
        filepath: 'test/test.js',
        line: 78
    }));
});