/// <reference path="../../typings/webrtc/MediaStream.d.ts"/>
/// <reference path="../../typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../tsd/console.snapshot/console.snapshot.d.ts"/>
/// <reference path="../../tsd/MediaStreamAudioSourceNode/MediaStreamAudioSourceNode.d.ts"/>
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Sandbox;
        (function (Sandbox) {
            navigator.getUserMedia = (navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia);
            function testDetect6(rootNodeId) {
                var TEST_INPUT_MYSELF = false;
                var actx = new AudioContext();
                var osc = new lib.OSC(actx);
                var isRecording = false;
                var processor = actx.createScriptProcessor(Math.pow(2, 14), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
                var recbuf = new lib.RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
                var render = new duxca.lib.CanvasRender(128, 128);
                osc.createBarkerCodedChirp(13, 8).then(function (pulse) {
                    render.cnv.width = 1024;
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
                        var anode1 = osc.createAudioNodeFromAudioBuffer(abuf);
                        anode.connect(TEST_INPUT_MYSELF ? processor : actx.destination);
                        anode.start(actx.currentTime);
                        setTimeout(function () { return cb(token); }, pulse.length / actx.sampleRate * 1000);
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
                    var RESULT_HISTORY_SIZE = 10;
                    chord.on("distribute", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        var data = token.payload.data;
                        Object.keys(data).forEach(function (id1) {
                            Object.keys(data).forEach(function (id2) {
                                if (Array.isArray(results[id2 + "-" + id1]))
                                    return;
                                if (!Array.isArray(results[id1 + "-" + id2]))
                                    results[id1 + "-" + id2] = [];
                                if (results[id1 + "-" + id2].length > RESULT_HISTORY_SIZE)
                                    results[id1 + "-" + id2].shift();
                                var tmp = Math.abs(Math.abs(data[id1][id2]) - Math.abs(data[id2][id1]));
                                if (isFinite(tmp))
                                    results[id1 + "-" + id2].push(tmp);
                                console.log("__RES__", id1 + "-" + id2, "phaseShift", tmp, "ave", duxca.lib.Statictics.average(results[id1 + "-" + id2]), "mode", duxca.lib.Statictics.mode(results[id1 + "-" + id2]), "med", duxca.lib.Statictics.median(results[id1 + "-" + id2]), "stdev", duxca.lib.Statictics.stdev(results[id1 + "-" + id2]));
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
                    var recStartTime = sampleTimes[0] - (recbuf.bufferSize / recbuf.sampleRate);
                    var recStopTime = sampleTimes[sampleTimes.length - 1];
                    var results = {};
                    render.cnv.width = 1024;
                    render.cnv.height = 32;
                    Object.keys(pulseStartTime).forEach(function (id) {
                        var startTime = pulseStartTime[id];
                        var stopTime = pulseStopTime[id];
                        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
                        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
                        var section = rawdata.subarray(startPtr, stopPtr);
                        var corrsec = lib.Signal.smartCorrelation(pulse, section);
                        corrsec = corrsec.subarray(0, section.length);
                        console.log(id, "recStartTime", recStartTime, "recStopTime", recStopTime, "startTime", startTime, "stopTime", stopTime, "startPtr", startPtr, "stopPtr", stopPtr, "length", section.length);
                        var _a = duxca.lib.Statictics.findMax(corrsec), max_score = _a[0], max_offset = _a[1];
                        for (var i = 0; i < corrsec.length; i++) {
                            if (max_score / 2 < corrsec[i]) {
                                var offset = i;
                                break;
                            }
                        }
                        results[id] = startPtr + (offset || max_offset);
                        results[id] = results[id] > 0 ? results[id] : 0;
                        console.log(id, "offset", offset, "max_offset", max_offset, "max_score", max_score, "globalOffset", startPtr + offset);
                        render.clear();
                        render.ctx.strokeStyle = "black";
                        render.drawSignal(corrsec, true, true);
                        render.ctx.strokeStyle = "blue";
                        render.drawColLine(offset * 1024 / corrsec.length);
                        render.ctx.strokeStyle = "red";
                        render.drawColLine(max_offset * 1024 / corrsec.length);
                        console.log(id, "corrsec");
                        console.screenshot(render.cnv);
                    });
                    var render1 = new duxca.lib.CanvasRender(1024, 32);
                    var render2 = new duxca.lib.CanvasRender(1024, 32);
                    var render3 = new duxca.lib.CanvasRender(1024, 32);
                    render2.drawSignal(rawdata, true, true);
                    var sim = new Float32Array(rawdata.length);
                    Object.keys(results).forEach(function (id) {
                        if (sim.length < results[id] + pulse.length) {
                            sim.set(pulse.subarray(0, (results[id] + pulse.length) - sim.length));
                        }
                        else {
                            sim.set(pulse, results[id]);
                        }
                    });
                    render3.drawSignal(sim, true, true);
                    var correlation = duxca.lib.Signal.smartCorrelation(pulse, rawdata);
                    correlation = correlation.subarray(0, rawdata.length);
                    Object.keys(results).forEach(function (id) {
                        var startTime = pulseStartTime[id];
                        var stopTime = pulseStopTime[id];
                        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
                        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
                        render1.ctx.strokeStyle = "blue";
                        render2.ctx.strokeStyle = "blue";
                        render3.ctx.strokeStyle = "blue";
                        render1.drawColLine(startPtr * 1024 / correlation.length);
                        render1.drawColLine(stopPtr * 1024 / correlation.length);
                        render2.drawColLine(startPtr * 1024 / rawdata.length);
                        render2.drawColLine(stopPtr * 1024 / rawdata.length);
                        render3.drawColLine(startPtr * 1024 / sim.length);
                        render3.drawColLine(stopPtr * 1024 / sim.length);
                        render1.ctx.strokeStyle = "red";
                        render2.ctx.strokeStyle = "red";
                        render3.ctx.strokeStyle = "red";
                        render1.drawColLine(results[id] * 1024 / correlation.length);
                        render2.drawColLine(results[id] * 1024 / rawdata.length);
                        render3.drawColLine(results[id] * 1024 / sim.length);
                    });
                    console.log("correlation");
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
                    render._drawSpectrogram(rawdata, recbuf.sampleRate);
                    console.screenshot(render.cnv);
                    return _results;
                }
            }
            Sandbox.testDetect6 = testDetect6;
        })(Sandbox = lib.Sandbox || (lib.Sandbox = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
