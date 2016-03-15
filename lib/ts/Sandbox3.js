/// <reference path="../../typings/tsd.d.ts"/>
var CanvasRender_1 = require("./CanvasRender");
var Signal_1 = require("./Signal");
var RecordBuffer_1 = require("./RecordBuffer");
var OSC_1 = require("./OSC");
var Statictics_1 = require("./Statictics");
var Chord_1 = require("./Chord");
var Sandbox;
(function (Sandbox) {
    function inpulseResponce() {
        var actx = new AudioContext();
        var osc = new OSC_1.default(actx);
        osc.inpulseResponce();
    }
    Sandbox.inpulseResponce = inpulseResponce;
    function _something() {
        var TEST_INPUT_MYSELF = false;
        var up = Signal_1.default.createChirpSignal(Math.pow(2, 17), false);
        var down = Signal_1.default.createChirpSignal(Math.pow(2, 17), true);
        up = up.subarray(up.length * 1 / 4 | 0, up.length * 3 / 4 | 0);
        down = up.subarray(up.length * 1 / 4 | 0, up.length * 3 / 4 | 0);
        var render = new CanvasRender_1.default(128, 128);
        var actx = new AudioContext();
        var osc = new OSC_1.default(actx);
        Promise.all([
            osc.resampling(up, 12),
            osc.resampling(down, 12),
        ]).then(function (_a) {
            var up = _a[0], down = _a[1];
            console.log("up", up.length, up.length / 44100);
            return new Promise(function (resolbe, reject) { return navigator.getUserMedia({ video: false, audio: true }, resolbe, reject); })
                .then(function (stream) { return { up: up, down: down, stream: stream }; });
        }).then(function (_a) {
            var up = _a.up, down = _a.down, stream = _a.stream;
            var source = actx.createMediaStreamSource(stream);
            var processor = actx.createScriptProcessor(Math.pow(2, 14), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
            var abuf = osc.createAudioBufferFromArrayBuffer(up, actx.sampleRate); // fix rate
            var anode = osc.createAudioNodeFromAudioBuffer(abuf);
            var anode1 = osc.createAudioNodeFromAudioBuffer(abuf);
            var anode2 = osc.createAudioNodeFromAudioBuffer(abuf);
            var anode3 = osc.createAudioNodeFromAudioBuffer(abuf);
            anode.start(actx.currentTime + 0);
            anode1.start(actx.currentTime + 1);
            anode2.start(actx.currentTime + 2);
            anode3.start(actx.currentTime + 3);
            anode.connect(TEST_INPUT_MYSELF ? processor : actx.destination);
            anode1.connect(TEST_INPUT_MYSELF ? processor : actx.destination);
            anode2.connect(TEST_INPUT_MYSELF ? processor : actx.destination);
            anode3.connect(TEST_INPUT_MYSELF ? processor : actx.destination);
            !TEST_INPUT_MYSELF && source.connect(processor);
            processor.connect(actx.destination);
            var recbuf = new RecordBuffer_1.default(actx.sampleRate, processor.bufferSize, 1);
            processor.addEventListener("audioprocess", function handler(ev) {
                recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                console.log(recbuf.count);
                if (recbuf.count * recbuf.bufferSize > up.length * 10) {
                    processor.removeEventListener("audioprocess", handler);
                    processor.disconnect();
                    next();
                }
            });
            function next() {
                var rawdata = recbuf.merge();
                for (var pow = 0; rawdata.length + up.length > Math.pow(2, pow); pow++)
                    ; // ajasting power of two for FFT
                var tmp = new Float32Array(Math.pow(2, pow));
                var tmp2 = new Float32Array(Math.pow(2, pow));
                tmp.set(down, 0);
                tmp2.set(rawdata, 0);
                console.log(rawdata.length, up.length, down.length, tmp2.length);
                var corr = Signal_1.default.overwarpCorr(up, rawdata);
                var render = new CanvasRender_1.default(128, 128);
                console.log("raw", rawdata.length);
                render.cnv.width = rawdata.length / 256;
                render.drawSignal(rawdata, true, true);
                console.screenshot(render.element);
                console.log("corr", corr.length);
                render.cnv.width = corr.length / 256;
                render.drawSignal(corr, true, true);
                console.screenshot(render.element);
                console.log("up", up.length);
                render.cnv.width = up.length / 256;
                render.drawSignal(up, true, true);
                console.screenshot(render.element);
                console.group("show spectrogram");
                console.time("show spectrogram");
                var render = new CanvasRender_1.default(128, 128);
                var windowsize = Math.pow(2, 8); // spectrgram height
                var slidewidth = Math.pow(2, 5); // spectrgram width rate
                var sampleRate = recbuf.sampleRate;
                console.log("sampleRate:", sampleRate, "\n", "windowsize:", windowsize, "\n", "slidewidth:", slidewidth, "\n", "windowsize(ms):", windowsize / sampleRate * 1000, "\n", "slidewidth(ms):", slidewidth / sampleRate * 1000, "\n");
                var spectrums = [];
                for (var ptr = 0; ptr + windowsize < rawdata.length; ptr += slidewidth) {
                    var buffer = rawdata.subarray(ptr, ptr + windowsize);
                    if (buffer.length !== windowsize)
                        break;
                    var spectrum = Signal_1.default.fft(buffer, sampleRate)[2];
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
            }
        });
    }
    Sandbox._something = _something;
    function testDetect4(rootNodeId) {
        var TEST_INPUT_MYSELF = false;
        var actx = new AudioContext;
        var osc = new OSC_1.default(actx);
        var isRecording = false;
        var processor = actx.createScriptProcessor(Math.pow(2, 12), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
        var recbuf = new RecordBuffer_1.default(actx.sampleRate, processor.bufferSize, processor.channelCount);
        osc.createBarkerCodedChirp(13, 6).then(function (pulse) {
            var render = new CanvasRender_1.default(128, 128);
            render.cnv.width = pulse.length;
            render.drawSignal(pulse, true, true);
            console.log("length", pulse.length, "sec", pulse.length / actx.sampleRate);
            console.screenshot(render.element);
            return pulse;
        }).then(function (pulse) {
            var chord = new Chord_1.Chord({ host: "localhost", port: 9000 });
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
                        console.log("__RES__", id1 + "-" + id2, "phaseShift", tmp, "med", Statictics_1.default.mode(results[id1 + "-" + id2]) * 170);
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
            var _correlation = Signal_1.default.normalize(correlation, 100);
            var ave = Statictics_1.default.average(_correlation);
            var vari = Statictics_1.default.variance(_correlation);
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
            var correlation = Signal_1.default.overwarpCorr(pulse, rawdata);
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
            var render = new CanvasRender_1.default(1024, 32);
            Object.keys(pulseStartTime).forEach(function (id) {
                var startTime = pulseStartTime[id];
                var stopTime = pulseStopTime[id];
                var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
                var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
                var section = stdscores.subarray(startPtr, stopPtr);
                console.log(id, "recStartTime", recStartTime, "recStopTime", recStopTime, "startTime", startTime, "stopTime", stopTime, "startPtr", startPtr, "stopPtr", stopPtr, "length", section.length);
                var _a = Statictics_1.default.findMax(section), max_score = _a[0], max_offset = _a[1];
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
            var render1 = new CanvasRender_1.default(1024, 32);
            var render2 = new CanvasRender_1.default(1024, 32);
            var render3 = new CanvasRender_1.default(1024, 32);
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
            var render = new CanvasRender_1.default(128, 128);
            var windowsize = Math.pow(2, 8); // spectrgram height
            var slidewidth = Math.pow(2, 5); // spectrgram width rate
            var sampleRate = recbuf.sampleRate;
            console.log("sampleRate:", sampleRate, "\n", "windowsize:", windowsize, "\n", "slidewidth:", slidewidth, "\n", "windowsize(ms):", windowsize / sampleRate * 1000, "\n", "slidewidth(ms):", slidewidth / sampleRate * 1000, "\n");
            var spectrums = [];
            for (var ptr = 0; ptr + windowsize < rawdata.length; ptr += slidewidth) {
                var buffer = rawdata.subarray(ptr, ptr + windowsize);
                if (buffer.length !== windowsize)
                    break;
                var spectrum = Signal_1.default.fft(buffer, sampleRate)[2];
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
    Sandbox.testDetect4 = testDetect4;
})(Sandbox || (Sandbox = {}));
module.exports = Sandbox;
