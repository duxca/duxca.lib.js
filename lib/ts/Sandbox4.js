/// <reference path="../../typings/tsd.d.ts"/>
var CanvasRender_1 = require("./CanvasRender");
var Signal_1 = require("./Signal");
var RecordBuffer_1 = require("./RecordBuffer");
var OSC_1 = require("./OSC");
var Statictics_1 = require("./Statictics");
var Chord_1 = require("./Chord");
var Sandbox;
(function (Sandbox) {
    function gnuplot() {
        var up = Signal_1.default.createChirpSignal(Math.pow(2, 17), false);
        var text = "";
        for (var i = 0; i < up.length; i++) {
            text += i / 44100 + "\t" + up[i] + "\n";
        }
        console.log(text);
    }
    Sandbox.gnuplot = gnuplot;
    function testDetect5(rootNodeId) {
        var TEST_INPUT_MYSELF = false;
        var actx = new AudioContext;
        var osc = new OSC_1.default(actx);
        var isRecording = false;
        var processor = actx.createScriptProcessor(Math.pow(2, 14), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
        var recbuf = new RecordBuffer_1.default(actx.sampleRate, processor.bufferSize, processor.channelCount);
        var render = new CanvasRender_1.default(128, 128);
        var up = Signal_1.default.createChirpSignal(Math.pow(2, 20), false);
        up = up.subarray(up.length * 1 / 6 | 0, up.length * 5 / 6 | 0);
        osc.resampling(up, 12).then(function (pulse) {
            render.cnv.width = 1024;
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
                        if (!Array.isArray(results[id1 + "-" + id2]))
                            results[id1 + "-" + id2] = [];
                        if (results[id1 + "-" + id2].length > RESULT_HISTORY_SIZE)
                            results[id1 + "-" + id2].shift();
                        var tmp = Math.abs(Math.abs(data[id1][id2]) - Math.abs(data[id2][id1]));
                        if (isFinite(tmp))
                            results[id1 + "-" + id2].push(tmp);
                        console.log("__RES__", id1 + "-" + id2, "phaseShift", tmp, "ave", Statictics_1.default.average(results[id1 + "-" + id2]), "mode", Statictics_1.default.mode(results[id1 + "-" + id2]), "med", Statictics_1.default.median(results[id1 + "-" + id2]), "stdev", Statictics_1.default.stdev(results[id1 + "-" + id2]));
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
            var correlation = Signal_1.default.smartCorrelation(pulse, rawdata);
            console.log(rawdata.length, pulse.length, correlation.length);
            correlation = correlation.subarray(0, rawdata.length);
            var stdscores = calcStdscore(correlation);
            var recStartTime = sampleTimes[0] - (recbuf.bufferSize / recbuf.sampleRate);
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
                /*for(var i=0; i<pulse.length; i++){
                  if(section[max_offset - pulse.length/2 + i]>70){
                    var offset = max_offset - pulse.length/2 + i;
                    break;
                  }
                }*/ var offset = max_offset;
                results[id] = startPtr + (offset || max_offset);
                results[id] = results[id] > 0 ? results[id] : 0;
                console.log(id, "offset", offset, "max_offset", max_offset, "max_score", max_score, "globalOffset", startPtr + offset);
                render.cnv.width = render.cnv.width;
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
            //var render3 = new CanvasRender(1024, 32);
            render1.drawSignal(stdscores, true, true);
            render2.drawSignal(rawdata, true, true);
            //var sim = new Float32Array(rawdata.length);
            //Object.keys(results).forEach((id)=>{ sim.set(pulse, results[id]); });
            //render3.drawSignal(sim, true, true);
            Object.keys(results).forEach(function (id) {
                var startTime = pulseStartTime[id];
                var stopTime = pulseStopTime[id];
                var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
                var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
                render1.ctx.strokeStyle = "blue";
                render2.ctx.strokeStyle = "blue";
                //render3.ctx.strokeStyle = "blue";
                render1.drawColLine(startPtr * 1024 / stdscores.length);
                render1.drawColLine(stopPtr * 1024 / stdscores.length);
                render2.drawColLine(startPtr * 1024 / rawdata.length);
                render2.drawColLine(stopPtr * 1024 / rawdata.length);
                //render3.drawColLine(startPtr*1024/sim.length);
                //render3.drawColLine(stopPtr*1024/sim.length);
                render1.ctx.strokeStyle = "red";
                render2.ctx.strokeStyle = "red";
                //render3.ctx.strokeStyle = "red";
                render1.drawColLine(results[id] * 1024 / stdscores.length);
                render2.drawColLine(results[id] * 1024 / rawdata.length);
                //render3.drawColLine(results[id]*1024/sim.length);
            });
            console.log("stdscores");
            console.screenshot(render1.cnv);
            console.log("rawdata");
            console.screenshot(render2.cnv);
            //console.log("sim");
            //console.screenshot(render3.cnv);
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
    Sandbox.testDetect5 = testDetect5;
})(Sandbox || (Sandbox = {}));
module.exports = Sandbox;
