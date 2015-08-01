/// <reference path="../../typings/webrtc/MediaStream.d.ts"/>
/// <reference path="../../tsd/console.snapshot/console.snapshot.d.ts"/>
/// <reference path="../../tsd/MediaStreamAudioSourceNode/MediaStreamAudioSourceNode.d.ts"/>
var CanvasRender = require("./CanvasRender");
var Signal = require("./Signal");
var RecordBuffer = require("./RecordBuffer");
var OSC = require("./OSC");
var Statictics = require("./Statictics");
var Chord = require("./Chord");
var Newton = require("./Newton");
var Point = Newton.Point;
var SDM = Newton.SDM;
var Sandbox;
(function (Sandbox) {
    function relpos() {
        var K = 0;
        var pseudoPts = [0, 1, 2].map(function (i) { return new Point(Math.random() * 10, Math.random() * 10); });
        var ds = [
            [0, 1, 1],
            [1, 0, 1],
            [1, 1, 0]
        ];
        var sdm = new SDM(pseudoPts, ds);
        (function recur() {
            if (K++ < 200) {
                sdm.step();
                requestAnimationFrame(recur);
            }
            else {
                console.log("fin", sdm.det(), sdm.points);
            }
        }());
    }
    Sandbox.relpos = relpos;
    function testDetect7(rootNodeId) {
        var TEST_INPUT_MYSELF = false;
        var count = 0;
        var actx = new AudioContext();
        var osc = new OSC(actx);
        var isRecording = false;
        var processor = actx.createScriptProcessor(Math.pow(2, 14), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
        var recbuf = new RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
        var render = new CanvasRender(128, 128);
        osc.createBarkerCodedChirp(13, 8).then(function (pulse) {
            render.cnv.width = 1024;
            render.drawSignal(pulse, true, true);
            console.log("length", pulse.length, "sec", pulse.length / actx.sampleRate);
            console.screenshot(render.element);
            return pulse;
        }).then(function (pulse) {
            var chord = new Chord();
            chord.debug = false;
            chord.on("ping", function (token, cb) {
                console.log(token.payload.event, token.payload.data);
                cb(token);
            });
            chord.on("recStart", function (token, cb) {
                console.log(token.payload.event, token.payload.data);
                isRecording = true;
                cb(token);
            });
            var pulseStartTime = {};
            chord.on("pulseStart", function (token, cb) {
                console.log(token.payload.event, token.payload.data);
                var id = token.payload.data;
                pulseStartTime[id] = actx.currentTime;
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
                setTimeout(function () { return cb(token); }, pulse.length / actx.sampleRate * 1000);
            });
            var pulseStopTime = {};
            chord.on("pulseStop", function (token, cb) {
                console.log(token.payload.event, token.payload.data);
                var id = token.payload.data;
                pulseStopTime[id] = actx.currentTime;
                cb(token);
            });
            var pulseTime = null;
            chord.on("recStop", function (token, cb) {
                console.log(token.payload.event, token.payload.data);
                var tmp = recbuf.count;
                (function recur() {
                    if (recbuf.count === tmp)
                        return setTimeout(recur, 100); // wait audioprocess
                    isRecording = false;
                    pulseTime = null;
                    setTimeout(function () {
                        pulseTime = calc(chord.peer.id, pulse, pulseStartTime, pulseStopTime);
                    }, 0);
                    cb(token);
                })();
            });
            chord.on("collect", function (token, cb) {
                console.log(token.payload.event, token.payload.data);
                (function recur() {
                    if (pulseTime === null)
                        return setTimeout(recur, 100); // wait calc
                    token.payload.data[chord.peer.id] = pulseTime;
                    cb(token);
                })();
            });
            var pulseTimes = null;
            var relDelayTimes = null;
            var delayTimesLog = {};
            chord.on("distribute", function (token, cb) {
                console.log(token.payload.event, token.payload.data);
                pulseTimes = token.payload.data;
                relDelayTimes = {};
                Object.keys(pulseTimes).forEach(function (id1) {
                    Object.keys(pulseTime).forEach(function (id2) {
                        relDelayTimes[id1] = relDelayTimes[id1] || {};
                        relDelayTimes[id1][id2] = pulseTimes[id1][id2] - pulseTimes[id1][id1];
                    });
                });
                console.log("relDelayTimes", relDelayTimes);
                Object.keys(pulseTimes).forEach(function (id1) {
                    delayTimesLog[id1] = delayTimesLog[id1] || {};
                    Object.keys(pulseTime).forEach(function (id2) {
                        delayTimesLog[id2] = delayTimesLog[id2] || {};
                        if (!Array.isArray(delayTimesLog[id1][id2]))
                            delayTimesLog[id1][id2] = [];
                        if (delayTimesLog[id1][id2].length > 10)
                            delayTimesLog[id1][id2].shift();
                        var delayTime = Math.abs(Math.abs(relDelayTimes[id1][id2]) - Math.abs(relDelayTimes[id2][id1]));
                        delayTimesLog[id1][id2].push(delayTime);
                        console.log("__RES__", id1, id2, "delayTime", delayTime, "distance", delayTime / 2 * 340, "ave", Statictics.average(delayTimesLog[id1][id2]), "mode", Statictics.mode(delayTimesLog[id1][id2]), "med", Statictics.median(delayTimesLog[id1][id2]), "stdev", Statictics.stdev(delayTimesLog[id1][id2]));
                    });
                });
                cb(token);
            });
            chord.on("play", function (token, cb) {
                console.log(token.payload.event, token.payload.data);
                var wait = token.payload.data;
                var id1 = token.route[0];
                var id2 = chord.peer.id;
                var delay = Statictics.median(delayTimesLog[id1][id2]);
                var offsetTime = pulseTimes[id2][id1] + wait + delay;
                console.log(id1, id2, "delay", delay, wait, offsetTime, pulseTimes, delayTimesLog);
                osc.createAudioBufferFromURL("./TellYourWorld1min.mp3").then(function (abuf) {
                    var node = osc.createAudioNodeFromAudioBuffer(abuf);
                    node.start(offsetTime);
                    node.loop = true;
                    node.connect(actx.destination);
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
                    if (isRecording)
                        recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                });
                return new Promise(function (resolve, reject) {
                    setTimeout(function () {
                        resolve(Promise.resolve(chord));
                    }, 1000);
                });
            }).then(function () { return chord; });
        }).then(typeof rootNodeId === "string" ? function (chord) { return void 0; } : function recur(chord) {
            chord.request("ping")
                .then(function (token) { return chord.request("recStart", null, token.route); })
                .then(function (token) {
                return token.payload.addressee.reduce(function (prm, id) {
                    return prm
                        .then(function (token) { return chord.request("pulseStart", id, token.payload.addressee); })
                        .then(function (token) { return chord.request("pulseBeep", id, token.payload.addressee); })
                        .then(function (token) { return chord.request("pulseStop", id, token.payload.addressee); });
                }, Promise.resolve(token));
            })
                .then(function (token) { return chord.request("recStop", null, token.payload.addressee); })
                .then(function (token) { return chord.request("collect", {}, token.payload.addressee); })
                .then(function (token) { return chord.request("distribute", token.payload.data, token.payload.addressee); })
                .then(function (token) {
                console.log(count, Date.now());
                if (++count === 2) {
                    chord.request("play", (Date.now() - token.time[0]) * 1.5 / 1000 + 1, token.payload.addressee).then(function (token) {
                        //setTimeout(recur.bind(null, chord), 0);
                    });
                }
                else
                    setTimeout(recur.bind(null, chord), 0);
            });
            return chord;
        });
        function calc(myId, pulse, pulseStartTime, pulseStopTime) {
            var rawdata = recbuf.merge();
            var sampleTimes = recbuf.sampleTimes;
            recbuf.clear();
            var recStartTime = sampleTimes[0] - (recbuf.bufferSize / recbuf.sampleRate);
            var recStopTime = sampleTimes[sampleTimes.length - 1];
            var pulseTime = {};
            var pulseOffset = {};
            Object.keys(pulseStartTime).forEach(function (id) {
                var startTime = pulseStartTime[id];
                var stopTime = pulseStopTime[id];
                var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
                var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
                var section = rawdata.subarray(startPtr, stopPtr);
                var corrsec = Signal.smartCorrelation(pulse, section);
                console.log(corrsec.length, pulse.length, section.length);
                console.log(id, "recStartTime", recStartTime, "recStopTime", recStopTime, "startTime", startTime, "stopTime", stopTime, "startPtr", startPtr, "stopPtr", stopPtr, "length", section.length);
                var _a = Statictics.findMax(corrsec), max_score = _a[0], max_offset = _a[1];
                var offset = -1;
                for (var i = 0; i < corrsec.length; i++) {
                    if (max_score / 2 < corrsec[i]) {
                        offset = i;
                        pulseOffset[id] = startPtr + i;
                        pulseTime[id] = (startPtr + i) / recbuf.sampleRate;
                        break;
                    }
                }
                console.log(id, "offset", offset, "max_offset", max_offset, "max_score", max_score, "globalOffset", startPtr + offset);
                render.cnv.width = 1024;
                render.cnv.height = 32;
                render.ctx.strokeStyle = "black";
                render.drawSignal(corrsec, true, true);
                render.ctx.strokeStyle = "blue";
                render.drawColLine(offset * 1024 / corrsec.length);
                render.ctx.strokeStyle = "red";
                render.drawColLine(max_offset * 1024 / corrsec.length);
                console.log(id, "corrsec");
                console.screenshot(render.cnv);
            });
            var render1 = new CanvasRender(1024, 32);
            var render2 = new CanvasRender(1024, 32);
            var render3 = new CanvasRender(1024, 32);
            render2.drawSignal(rawdata, true, true);
            var sim = new Float32Array(rawdata.length);
            Object.keys(pulseOffset).forEach(function (id) {
                if (sim.length < pulseOffset[id] + pulse.length) {
                    sim.set(pulse.subarray(0, (pulseOffset[id] + pulse.length) - sim.length), pulseTime[id]);
                }
                else
                    sim.set(pulse, pulseOffset[id]);
            });
            render3.drawSignal(sim, true, true);
            var correlation = Signal.smartCorrelation(pulse, rawdata);
            console.log(correlation.length, pulse.length, rawdata.length);
            Object.keys(pulseOffset).forEach(function (id) {
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
                render1.drawColLine(pulseOffset[id] * 1024 / correlation.length);
                render2.drawColLine(pulseOffset[id] * 1024 / rawdata.length);
                render3.drawColLine(pulseOffset[id] * 1024 / sim.length);
            });
            console.log("correlation");
            console.screenshot(render1.cnv);
            console.log("rawdata");
            console.screenshot(render2.cnv);
            console.log("sim");
            console.screenshot(render3.cnv);
            console.log("pulseOffset", pulseOffset);
            console.log("pulseTime", pulseTime);
            render._drawSpectrogram(rawdata, recbuf.sampleRate);
            console.screenshot(render.cnv);
            return pulseTime;
        }
    }
    Sandbox.testDetect7 = testDetect7;
})(Sandbox || (Sandbox = {}));
module.exports = Sandbox;
