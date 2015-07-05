/// <reference path="../../typings/webrtc/MediaStream.d.ts"/>
/// <reference path="../../typings/bluebird/bluebird.d.ts"/>
/// <reference path="../../tsd/console.snapshot/console.snapshot.d.ts"/>
/// <reference path="../../tsd/MediaStreamAudioSourceNode/MediaStreamAudioSourceNode.d.ts"/>
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Sandbox2;
        (function (Sandbox2) {
            navigator.getUserMedia = (navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia);
            function testAutoDetect2(id) {
                var PULSE_INTERVAL_SEC = 0.5;
                var PULSE_REFRAIN = 10;
                var CUTOFF_STANDARDSCORE = 100;
                var actx = new AudioContext();
                var codeA = duxca.lib.Signal.createBarkerCode(13);
                var pulseA = createPulse(codeA, 8);
                console.log(actx.sampleRate, pulseA.length, pulseA.length / actx.sampleRate);
                var render = new duxca.lib.CanvasRender(128, 128);
                render.cnv.width = pulseA.length;
                render.drawSignal(pulseA, true, true);
                console.screenshot(render.element);
                var processor = actx.createScriptProcessor(Math.pow(2, 14), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
                var recbuf = new lib.RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
                var isRecording = false;
                var stdscoreResult = null;
                var pulseStart = {};
                var pulseStop = {};
                Promise.resolve()
                    .then(setupRecording)
                    .then(setupChord)
                    .then(function (chd) {
                    console.log(chd.peer.id);
                    if (typeof id !== "string") {
                        // master node
                        setTimeout(function recur() {
                            confirm(id);
                            chd.request("ping")
                                .then(function (token) {
                                console.log(token.payload.event, token.route);
                                return chd.request("startRec");
                            })
                                .then(function (token) {
                                console.log(token.payload.event, token.route);
                                return token.route.reduce(function (prm, id) {
                                    return prm
                                        .then(function (token) { return chd.request("pulseStart", id); })
                                        .then(function (token) { return chd.request("pulseBeep", id); })
                                        .then(function (token) { return chd.request("pulseStop", id); });
                                }, Promise.resolve(token));
                            })
                                .then(function (token) { return chd.request("stopRec"); })
                                .then(function (token) { return chd.request("calc"); })
                                .then(function (token) { return chd.request("collect", []); })
                                .then(function (token) {
                                console.log(token.payload.event, token.route, token.payload.data);
                            })
                                .catch(function (err) { return console.error(err); });
                        }, 20000);
                    }
                    console.log("ready.");
                });
                function setupChord() {
                    var chd = new duxca.lib.Chord();
                    var osc = new duxca.lib.OSC(actx);
                    var abufA = osc.createAudioBufferFromArrayBuffer(pulseA, actx.sampleRate);
                    var gain = actx.createGain();
                    gain.gain.value = 3;
                    gain.connect(actx.destination);
                    chd.debug = false;
                    chd.on("ping", function (token, cb) {
                        console.log(token.payload.event);
                        cb(token);
                    });
                    chd.on("startRec", function (token, cb) {
                        console.log(token.payload.event);
                        isRecording = true;
                        cb(token);
                    });
                    chd.on("pulseStart", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        pulseStart[token.payload.data] = actx.currentTime;
                        cb(token);
                    });
                    chd.on("pulseBeep", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        if (token.payload.data !== chd.peer.id)
                            return cb(token);
                        var offsetTime = actx.currentTime + 0.5;
                        for (var i = 0; i < PULSE_REFRAIN; i++) {
                            var anode = osc.createAudioNodeFromAudioBuffer(abufA);
                            anode.start(offsetTime + PULSE_INTERVAL_SEC * i);
                            anode.connect(gain);
                        }
                        setTimeout(function () { return cb(token); }, PULSE_REFRAIN * PULSE_INTERVAL_SEC * 1000 + 500);
                    });
                    chd.on("pulseStop", function (token, cb) {
                        console.log(token.payload.event, token.payload.data);
                        pulseStop[token.payload.data] = actx.currentTime;
                        cb(token);
                    });
                    chd.on("stopRec", function (token, cb) {
                        console.log(token.payload.event);
                        isRecording = false;
                        cb(token);
                    });
                    chd.on("calc", function (token, cb) {
                        console.log(token.payload.event);
                        cb(token);
                        stdscoreResult = null;
                        setTimeout(function () { return stdscoreResult = calc(); }, 100);
                    });
                    chd.on("collect", function (token, cb) {
                        console.log(token.payload.event);
                        (function recur() {
                            if (stdscoreResult !== null) {
                                token.payload.data.push({ id: chd.peer.id, pulseStart: pulseStart, pulseStop: pulseStop, stdscoreResult: stdscoreResult });
                                cb(token);
                            }
                            else
                                setTimeout(recur, 500);
                        })();
                    });
                    return (typeof id === "string") ? chd.join(id) : chd.create();
                }
                function setupRecording() {
                    return new Promise(function (resolbe, reject) { return navigator.getUserMedia({ video: false, audio: true }, resolbe, reject); })
                        .then(function (stream) {
                        var source = actx.createMediaStreamSource(stream);
                        source.connect(processor);
                        processor.connect(actx.destination);
                        processor.addEventListener("audioprocess", function handler(ev) {
                            if (isRecording) {
                                recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                            }
                        });
                    });
                }
                function createPulse(code, length) {
                    var chirp = duxca.lib.Signal.createCodedChirp(code, length);
                    for (var pow = 0; chirp.length > Math.pow(2, pow); pow++)
                        ; // ajasting power of two for FFT
                    var pulse = new Float32Array(Math.pow(2, pow));
                    pulse.set(chirp, 0);
                    return pulse;
                }
                function calcCorr(pulse, rawdata) {
                    var windowsize = pulse.length;
                    var resized_pulse = new Float32Array(windowsize * 2); // for overwrap adding way correlation
                    resized_pulse.set(pulse, 0);
                    var buffer = new Float32Array(windowsize * 2); // for overwrap adding way correlation
                    var correlation = new Float32Array(rawdata.length);
                    for (var i = 0; rawdata.length - (i + windowsize) >= resized_pulse.length; i += windowsize) {
                        buffer.set(rawdata.subarray(i, i + windowsize), 0);
                        var corr = duxca.lib.Signal.correlation(buffer, resized_pulse);
                        for (var j = 0; j < corr.length; j++) {
                            correlation[i + j] = corr[j];
                        }
                    }
                    return correlation;
                }
                function calcStdscore(correlation) {
                    var _correlation = duxca.lib.Signal.normalize(correlation, 100);
                    var ave = duxca.lib.Statictics.average(_correlation);
                    var vari = duxca.lib.Statictics.variance(_correlation);
                    console.log("ave:", ave, "\n", "med:", duxca.lib.Statictics.median(_correlation), "\n", "var:", vari, "\n");
                    var stdscores = new Float32Array(_correlation.length);
                    for (var i = 0; i < _correlation.length; i++) {
                        stdscores[i] = 10 * (_correlation[i] - ave) / vari + 50;
                    }
                    return stdscores;
                }
                function calc() {
                    var rawdata = recbuf.merge();
                    var sampleTimes = recbuf.sampleTimes;
                    recbuf.clear();
                    console.group("calc correlation");
                    console.time("calc correlation");
                    var correlationA = calcCorr(pulseA, rawdata);
                    var correlation = new Float32Array(correlationA.length);
                    for (var i = 0; i < correlation.length; i++) {
                        correlation[i] = correlationA[i];
                    }
                    console.timeEnd("calc correlation");
                    console.groupEnd();
                    console.group("calc stdscore");
                    console.time("calc stdscore");
                    var stdscores = calcStdscore(correlation);
                    console.timeEnd("calc stdscore");
                    console.groupEnd();
                    console.group("calc cycle");
                    console.time("calc cycle");
                    var results = {};
                    Object.keys(pulseStart).forEach(function (id) {
                        console.log(id);
                        var recStartTime = sampleTimes[0] - recbuf.bufferSize / recbuf.sampleRate;
                        var recStopTime = sampleTimes[sampleTimes.length - 1];
                        var startTime = pulseStart[id];
                        var stopTime = pulseStop[id] + recbuf.bufferSize / recbuf.sampleRate;
                        var startPtr = (startTime - recStartTime) * recbuf.sampleRate;
                        var stopPtr = (stopTime - recStartTime) * recbuf.sampleRate;
                        console.log("startPtr", startPtr, "stopPtr", stopPtr);
                        var section = stdscores.subarray(startPtr, stopPtr);
                        var _section = duxca.lib.Signal.normalize(section, 128); // _** for draw
                        var splitsize = PULSE_INTERVAL_SEC * recbuf.sampleRate;
                        var sumarr = new Float32Array(splitsize);
                        var offsets = [];
                        var render = new duxca.lib.CanvasRender(128, 128);
                        for (var i = 0; i < _section.length; i += splitsize) {
                            var part = section.subarray(i, i + splitsize);
                            var _part = _section.subarray(i, i + splitsize);
                            var _a = duxca.lib.Statictics.findMax(part), max_score = _a[0], offset = _a[1];
                            if (max_score > CUTOFF_STANDARDSCORE) {
                                offsets.push(offset);
                            }
                            console.log("part", "total_offset", i + offset, "local_offset", offset, "stdscore", max_score);
                            render.cnv.width = _part.length;
                            render.ctx.strokeStyle = max_score > CUTOFF_STANDARDSCORE ? "red" : "blue";
                            render.drawColLine(offset);
                            render.ctx.strokeStyle = "black";
                            render.drawSignal(_part);
                            console.screenshot(render.cnv);
                            if (sumarr.length === part.length) {
                                for (var j = 0; j < part.length; j++) {
                                    sumarr[j] += part[j];
                                }
                            }
                        }
                        console.log("phaseshifts", offsets);
                        var ave = duxca.lib.Statictics.average(offsets);
                        var med = duxca.lib.Statictics.median(offsets);
                        var mode = duxca.lib.Statictics.mode(offsets);
                        var _b = duxca.lib.Statictics.findMax(sumarr), max_score = _b[0], offset = _b[1];
                        console.log("min", duxca.lib.Statictics.findMin(offsets)[0], "\n", "max", duxca.lib.Statictics.findMax(offsets)[0], "\n", "ave", ave, "red", "\n", "med", med, "green", "\n", "mode", mode, "blue", "\n", "sum", offset, "yellow", "\n", "stdev", duxca.lib.Statictics.stdev(offsets));
                        console.log("sum", "stdscore", max_score, "global_offset", startPtr + offset);
                        results[id] = startPtr + offset;
                        render.cnv.width = sumarr.length;
                        render.ctx.strokeStyle = "red";
                        render.drawColLine(ave);
                        render.ctx.strokeStyle = "green";
                        render.drawColLine(med);
                        render.ctx.strokeStyle = "blue";
                        render.drawColLine(mode);
                        render.ctx.strokeStyle = "yellow";
                        render.drawColLine(offset);
                        render.ctx.strokeStyle = "gray";
                        render.drawSignal(sumarr, false, true);
                        console.screenshot(render.cnv);
                        console.timeEnd("calc cycle");
                        console.groupEnd();
                    });
                    console.group("show spectrogram");
                    console.time("show spectrogram");
                    var render = new duxca.lib.CanvasRender(128, 128);
                    var windowsize = Math.pow(2, 8); // spectrgram height
                    var slidewidth = Math.pow(2, 6); // spectrgram width rate
                    var sampleRate = recbuf.sampleRate;
                    console.log("sampleRate:", sampleRate, "\n", "windowsize:", windowsize, "\n", "slidewidth:", slidewidth, "\n", "windowsize(ms):", windowsize / sampleRate * 1000, "\n", "slidewidth(ms):", slidewidth / sampleRate * 1000, "\n");
                    var spectrums = [];
                    var ptr = 0;
                    var lstptr = 0;
                    recur();
                    function recur() {
                        if (ptr + windowsize > rawdata.length) {
                            console.timeEnd("show spectrogram");
                            console.groupEnd();
                            return;
                        }
                        for (var j = 0; j < PULSE_INTERVAL_SEC * sampleRate / slidewidth; j++) {
                            var buffer = rawdata.subarray(ptr, ptr + windowsize);
                            if (buffer.length !== windowsize)
                                break;
                            var spectrum = duxca.lib.Signal.fft(buffer, sampleRate)[2];
                            for (var i = 0; i < spectrum.length; i++) {
                                spectrum[i] = spectrum[i] * 20000;
                            }
                            spectrums.push(spectrum);
                            ptr += slidewidth;
                        }
                        draw();
                        setTimeout(recur);
                    }
                    function draw() {
                        console.log("ptr", lstptr + "-" + (ptr - 1) + "/" + rawdata.length, "ms", lstptr / sampleRate * 1000 + "-" + (ptr - 1) / sampleRate * 1000 + "/" + rawdata.length * 1000 / sampleRate, spectrums.length + "x" + spectrums[0].length);
                        render.cnv.width = spectrums.length;
                        render.cnv.height = spectrums[0].length;
                        render.drawSpectrogram(spectrums);
                        console.screenshot(render.cnv);
                        spectrums = [];
                        lstptr = ptr;
                    }
                    return results;
                }
            }
            Sandbox2.testAutoDetect2 = testAutoDetect2;
        })(Sandbox2 = lib.Sandbox2 || (lib.Sandbox2 = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
