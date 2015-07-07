/// <reference path="../../typings/webrtc/MediaStream.d.ts"/>
/// <reference path="../../typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../tsd/console.snapshot/console.snapshot.d.ts"/>
/// <reference path="../../tsd/MediaStreamAudioSourceNode/MediaStreamAudioSourceNode.d.ts"/>
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Sandbox3;
        (function (Sandbox3) {
            navigator.getUserMedia = (navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia);
            function test(rootNodeId) {
                var TEST_INPUT_MYSELF = false;
                var actx = new AudioContext;
                var osc = new lib.OSC(actx);
                var isRecording = false;
                var processor = actx.createScriptProcessor(Math.pow(2, 12), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
                var recbuf = new lib.RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
                osc.createBarkerCodedChirp(13, 6).then(function (pulse) {
                    var render = new duxca.lib.CanvasRender(128, 128);
                    render.cnv.width = pulse.length;
                    render.drawSignal(pulse, true, true);
                    console.log("length", pulse.length, "sec", pulse.length / actx.sampleRate);
                    console.screenshot(render.element);
                    return pulse;
                }).then(function (pulse) {
                    var chord = new duxca.lib.Chord();
                    chord.debug = false;
                    chord.on("ping", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        cb(token);
                    });
                    chord.on("startRec", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        isRecording = true;
                        cb(token);
                    });
                    var pulseStartTime = {};
                    chord.on("pulseStart", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var id = token.payload.data;
                        pulseStartTime[token.payload.data] = actx.currentTime;
                        cb(token);
                    });
                    var abuf = osc.createAudioBufferFromArrayBuffer(pulse, actx.sampleRate);
                    chord.on("pulseBeep", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var id = token.payload.data;
                        if (chord.peer.id !== id)
                            return cb(token);
                        var anode = osc.createAudioNodeFromAudioBuffer(abuf);
                        anode.connect(TEST_INPUT_MYSELF ? processor : actx.destination);
                        anode.start(actx.currentTime);
                        setTimeout(function () { return cb(token); }, pulse.length / actx.sampleRate * 1000 + 80);
                    });
                    var pulseStopTime = {};
                    chord.on("pulseStop", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var id = token.payload.data;
                        pulseStopTime[token.payload.data] = actx.currentTime;
                        cb(token);
                    });
                    var calcResult = null;
                    chord.on("stopRec", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var tmp = recbuf.count;
                        (function recur() {
                            if (recbuf.count === tmp)
                                return setTimeout(recur, 100);
                            isRecording = false;
                            calcResult = null;
                            setTimeout(function () {
                                calcResult = calc(chord.peer.id, pulse, pulseStartTime, pulseStopTime);
                            }, 0);
                            cb(token);
                        })();
                    });
                    chord.on("collect", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        (function recur() {
                            if (calcResult === null)
                                return setTimeout(recur, 100);
                            token.payload.data[chord.peer.id] = calcResult;
                            cb(token);
                        })();
                    });
                    var results = {};
                    var RESULT_HISTORY_SIZE = 20;
                    chord.on("distribute", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var data = token.payload.data;
                        Object.keys(data).forEach(function (id1) {
                            Object.keys(data).forEach(function (id2) {
                                if (!Array.isArray(results[id1 + "-" + id2]))
                                    results[id1 + "-" + id2] = [];
                                if (results[id1 + "-" + id2].length > RESULT_HISTORY_SIZE)
                                    results[id1 + "-" + id2].shift();
                                var tmp = Math.abs(Math.abs(data[id1][id2]) - Math.abs(data[id2][id1]));
                                if (isFinite(tmp))
                                    results[id1 + "-" + id2].push(tmp);
                                console.log("__RES__", id1 + "-" + id2, "phaseShift", tmp, "med", duxca.lib.Statictics.mode(results[id1 + "-" + id2]) * 170);
                            });
                        });
                        cb(token);
                    });
                    return (typeof rootNodeId === "string") ? chord.join(rootNodeId) : chord.create();
                }).then(function (chord) {
                    console.log(chord.peer.id);
                    return new Promise(function (resolbe, reject) { return navigator.getUserMedia({ video: false, audio: true }, resolbe, reject); })
                        .then(function (stream) {
                        var source = actx.createMediaStreamSource(stream);
                        !TEST_INPUT_MYSELF && source.connect(processor);
                        processor.connect(actx.destination);
                        processor.addEventListener("audioprocess", function handler(ev) {
                            if (isRecording) {
                                recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                            }
                        });
                    }).then(function () { return chord; });
                }).then(typeof rootNodeId === "string" ? function (chord) { return void 0; } : function recur(chord) {
                    chord.request("ping")
                        .then(function (token) { return chord.request("startRec", null, token.route); })
                        .then(function (token) {
                        return token.payload.addressee.reduce(function (prm, id) {
                            return prm
                                .then(function (token) { return chord.request("pulseStart", id, token.payload.addressee); })
                                .then(function (token) { return chord.request("pulseBeep", id, token.payload.addressee); })
                                .then(function (token) { return chord.request("pulseStop", id, token.payload.addressee); });
                        }, Promise.resolve(token));
                    })
                        .then(function (token) { return chord.request("stopRec", null, token.payload.addressee); })
                        .then(function (token) { return chord.request("collect", {}, token.payload.addressee); })
                        .then(function (token) { return chord.request("distribute", token.payload.data, token.payload.addressee); })
                        .then(function (token) {
                        setTimeout(recur.bind(null, chord), 0);
                    });
                    return chord;
                });
                function calcStdscore(correlation) {
                    var _correlation = duxca.lib.Signal.normalize(correlation, 100);
                    var ave = duxca.lib.Statictics.average(_correlation);
                    var vari = duxca.lib.Statictics.variance(_correlation);
                    var stdscores = new Float32Array(_correlation.length);
                    for (var i = 0; i < _correlation.length; i++) {
                        stdscores[i] = 10 * (_correlation[i] - ave) / vari + 50;
                    }
                    return stdscores;
                }
                function calc(myId, pulse, pulseStartTime, pulseStopTime) {
                    var rawdata = recbuf.merge();
                    var sampleTimes = recbuf.sampleTimes;
                    recbuf.clear();
                    console.group("calc correlation");
                    console.time("calc correlation");
                    var correlation = duxca.lib.Signal.overwarpCorr(pulse, rawdata);
                    console.timeEnd("calc correlation");
                    console.groupEnd();
                    console.group("calc stdscore");
                    console.time("calc stdscore");
                    var stdscores = calcStdscore(correlation);
                    console.timeEnd("calc stdscore");
                    console.groupEnd();
                    console.group("calc cycle");
                    console.time("calc cycle");
                    var recStartTime = sampleTimes[0] - recbuf.bufferSize / recbuf.sampleRate;
                    var recStopTime = sampleTimes[sampleTimes.length - 1];
                    var results = {};
                    var render = new duxca.lib.CanvasRender(1024, 32);
                    Object.keys(pulseStartTime).forEach(function (id) {
                        var startTime = pulseStartTime[id];
                        var stopTime = pulseStopTime[id];
                        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
                        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
                        var section = stdscores.subarray(startPtr, stopPtr);
                        console.log(id, "recStartTime", recStartTime, "recStopTime", recStopTime, "startTime", startTime, "stopTime", stopTime, "startPtr", startPtr, "stopPtr", stopPtr, "length", section.length);
                        var _a = duxca.lib.Statictics.findMax(section), max_score = _a[0], max_offset = _a[1];
                        for (var i = 0; i < pulse.length; i++) {
                            if (section[max_offset - pulse.length / 2 + i] > 70) {
                                var offset = max_offset - pulse.length / 2 + i;
                                break;
                            }
                        }
                        results[id] = startPtr + (offset || max_offset);
                        results[id] = results[id] > 0 ? results[id] : 0;
                        console.log(id, "offset", offset, "max_offset", max_offset, "max_score", max_score, "globalOffset", startPtr + offset);
                        render.clear();
                        render.ctx.strokeStyle = "black";
                        render.drawSignal(section, true, true);
                        render.ctx.strokeStyle = "blue";
                        render.drawColLine(offset * 1024 / section.length);
                        render.ctx.strokeStyle = "red";
                        render.drawColLine(max_offset * 1024 / section.length);
                        console.log(id, "section");
                        console.screenshot(render.cnv);
                    });
                    var render1 = new duxca.lib.CanvasRender(1024, 32);
                    var render2 = new duxca.lib.CanvasRender(1024, 32);
                    var render3 = new duxca.lib.CanvasRender(1024, 32);
                    render1.drawSignal(stdscores, true, true);
                    render2.drawSignal(rawdata, true, true);
                    var sim = new Float32Array(rawdata.length);
                    Object.keys(results).forEach(function (id) { sim.set(pulse, results[id]); });
                    render3.drawSignal(sim, true, true);
                    Object.keys(results).forEach(function (id) {
                        var startTime = pulseStartTime[id];
                        var stopTime = pulseStopTime[id];
                        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
                        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
                        render1.ctx.strokeStyle = "blue";
                        render2.ctx.strokeStyle = "blue";
                        render3.ctx.strokeStyle = "blue";
                        render1.drawColLine(startPtr * 1024 / stdscores.length);
                        render1.drawColLine(stopPtr * 1024 / stdscores.length);
                        render2.drawColLine(startPtr * 1024 / rawdata.length);
                        render2.drawColLine(stopPtr * 1024 / rawdata.length);
                        render3.drawColLine(startPtr * 1024 / sim.length);
                        render3.drawColLine(stopPtr * 1024 / sim.length);
                        render1.ctx.strokeStyle = "red";
                        render2.ctx.strokeStyle = "red";
                        render3.ctx.strokeStyle = "red";
                        render1.drawColLine(results[id] * 1024 / stdscores.length);
                        render2.drawColLine(results[id] * 1024 / rawdata.length);
                        render3.drawColLine(results[id] * 1024 / sim.length);
                    });
                    console.log("stdscores");
                    console.screenshot(render1.cnv);
                    console.log("rawdata");
                    console.screenshot(render2.cnv);
                    console.log("sim");
                    console.screenshot(render3.cnv);
                    console.log("results", results);
                    var _results = {};
                    Object.keys(results).forEach(function (id) {
                        _results[id] = (results[id] - results[myId]) / recbuf.sampleRate;
                    });
                    console.log("results", _results);
                    console.timeEnd("calc cycle");
                    console.groupEnd();
                    console.group("show spectrogram");
                    console.time("show spectrogram");
                    var render = new duxca.lib.CanvasRender(128, 128);
                    var windowsize = Math.pow(2, 8); // spectrgram height
                    var slidewidth = Math.pow(2, 5); // spectrgram width rate
                    var sampleRate = recbuf.sampleRate;
                    console.log("sampleRate:", sampleRate, "\n", "windowsize:", windowsize, "\n", "slidewidth:", slidewidth, "\n", "windowsize(ms):", windowsize / sampleRate * 1000, "\n", "slidewidth(ms):", slidewidth / sampleRate * 1000, "\n");
                    var spectrums = [];
                    for (var ptr = 0; ptr + windowsize < rawdata.length; ptr += slidewidth) {
                        var buffer = rawdata.subarray(ptr, ptr + windowsize);
                        if (buffer.length !== windowsize)
                            break;
                        var spectrum = duxca.lib.Signal.fft(buffer, sampleRate)[2];
                        for (var i = 0; i < spectrum.length; i++) {
                            spectrum[i] = spectrum[i] * 20000;
                        }
                        spectrums.push(spectrum);
                    }
                    console.log("ptr", 0 + "-" + (ptr - 1) + "/" + rawdata.length, "ms", 0 / sampleRate * 1000 + "-" + (ptr - 1) / sampleRate * 1000 + "/" + rawdata.length * 1000 / sampleRate, spectrums.length + "x" + spectrums[0].length);
                    render.cnv.width = spectrums.length;
                    render.cnv.height = spectrums[0].length;
                    render.drawSpectrogram(spectrums);
                    console.screenshot(render.cnv);
                    console.timeEnd("show spectrogram");
                    console.groupEnd();
                    return _results;
                }
            }
            Sandbox3.test = test;
        })(Sandbox3 = lib.Sandbox3 || (lib.Sandbox3 = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
