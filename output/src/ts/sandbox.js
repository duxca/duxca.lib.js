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
            /*console.screenshot = (cnv)=>{
              var img = new Image();
              img.src = cnv.toDataURL("image/png");
              document.body.appendChild(img);
              document.body.appendChild(document.createElement("br"));
            };*/
            function testChord(id) {
                var chd0 = new duxca.lib.Chord2();
                var chd1 = new duxca.lib.Chord2();
                var chd2 = new duxca.lib.Chord2();
                var chd3 = new duxca.lib.Chord2();
                var chd4 = new duxca.lib.Chord2();
                chd0.create().then(function () {
                    return chd1.join(chd0.peer.id).then(function () {
                        return chd2.join(chd0.peer.id).then(function () {
                            return chd3.join(chd2.peer.id).then(function () {
                                return chd4.join(chd3.peer.id).then(function () {
                                    setInterval(function () {
                                        chd0.ping().then(function (token) { return console.log("__TOKEN__", token.route); });
                                        [chd0, chd1, chd2, chd3, chd4].forEach(function (chd, i) {
                                            console.info(i, chd.predecessor && chd.predecessor.open, chd.predecessor && chd.predecessor.peer, chd.peer.id, chd.successor && chd.successor.peer, chd.successor && chd.successor.open, chd.successors);
                                        });
                                    }, 2000);
                                    setTimeout(function () {
                                        console.warn("chd4 destroied");
                                        chd4.peer.destroy();
                                    }, 20000);
                                    setTimeout(function () {
                                        console.warn("chd0 destroied");
                                        chd0.peer.destroy();
                                    }, 40000);
                                });
                            });
                        });
                    });
                }).catch(function (err) { console.error(err); });
            }
            Sandbox.testChord = testChord;
            function testDetect3() {
                var PULSE_BOOST_COUNT = 1;
                var PULSE_INTERVAL_SEC = 0.5;
                var RECORD_SEC = 11;
                var CUTOFF_STANDARDSCORE = 100;
                var TEST_INPUT_MYSELF = false;
                console.group("testDetect3");
                console.time("testDetect3");
                var maybeStream = new Promise(function (resolbe, reject) {
                    return navigator.getUserMedia({ video: false, audio: true }, resolbe, reject);
                });
                maybeStream.then(function (stream) {
                    var actx = new AudioContext();
                    var source = actx.createMediaStreamSource(stream);
                    var processor = actx.createScriptProcessor(Math.pow(2, 14), 1, 1); // between Math.pow(2,8) and Math.pow(2,14).
                    !TEST_INPUT_MYSELF && source.connect(processor);
                    processor.connect(actx.destination);
                    console.group("create barker coded chirp signal");
                    console.time("create barker coded chirp signal");
                    var _c = duxca.lib.Signal.createComplementaryCode(5), a = _c[0], b = _c[1];
                    console.log(a.length);
                    var pulse = duxca.lib.Signal.createCodedChirp(a, 6); //var pulse = duxca.lib.Signal.createBarkerCodedChirp(11, 8);
                    for (var pow = 0; pulse.length * PULSE_BOOST_COUNT > Math.pow(2, pow); pow++)
                        ; //for(var pow=0; pulse.length > Math.pow(2, pow); pow++); // ajasting power of two for FFT
                    var barkerChirp = new Float32Array(Math.pow(2, pow));
                    for (var i = 0; i < PULSE_BOOST_COUNT; i++) {
                        barkerChirp.set(pulse, pulse.length * i);
                    }
                    console.log(pulse.length, barkerChirp.length);
                    console.timeEnd("create barker coded chirp signal");
                    console.groupEnd();
                    console.group("show chirp");
                    console.time("show chirp");
                    var render = new duxca.lib.CanvasRender(128, 128);
                    var _pulse = duxca.lib.Signal.normalize(pulse, 128);
                    var splitsize = Math.pow(2, 10);
                    var lastptr = 0;
                    for (var i = 0; i < _pulse.length; i += splitsize) {
                        var part = _pulse.subarray(i, i + splitsize);
                        render.cnv.width = part.length;
                        render.drawSignal(part, false, false);
                        console.log(lastptr + "-" + (i + splitsize) + "/" + _pulse.length, (i - lastptr) / actx.sampleRate * 1000 + "ms", render.cnv.width + "x" + render.cnv.height);
                        console.screenshot(render.element);
                        lastptr = i;
                    }
                    console.timeEnd("show chirp");
                    console.groupEnd();
                    console.group("requestAnimationFrame, audioprocess, metronome");
                    console.time("requestAnimationFrame, audioprocess, metronome");
                    return new Promise(function (resolve, reject) {
                        var osc = new duxca.lib.OSC(actx);
                        var abuf = osc.createAudioBufferFromArrayBuffer(barkerChirp, 44100);
                        var recbuf = new lib.RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
                        var met = new lib.Metronome(actx, PULSE_INTERVAL_SEC);
                        var rfps = new lib.FPS(1000);
                        var pfps = new lib.FPS(1000);
                        met.nextTick = nextTick;
                        processor.addEventListener("audioprocess", handler);
                        nextTick();
                        recur();
                        function handler(ev) {
                            pfps.step();
                            recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                        }
                        function nextTick() {
                            var anode = osc.createAudioNodeFromAudioBuffer(abuf);
                            anode.connect(TEST_INPUT_MYSELF ? processor : actx.destination);
                            anode.start(met.nextTime);
                        }
                        function recur() {
                            console.log(rfps + "/60", pfps + "/" + (actx.sampleRate / processor.bufferSize * 1000 | 0) / 1000);
                            rfps.step();
                            if (actx.currentTime > RECORD_SEC) {
                                setTimeout(function () {
                                    stream.stop();
                                    processor.removeEventListener("audioprocess", handler);
                                    console.timeEnd("requestAnimationFrame, audioprocess, metronome");
                                    console.groupEnd();
                                    resolve(Promise.resolve([recbuf, barkerChirp]));
                                }, met.interval * 1.5 * 1000); // wait beep
                                return;
                            }
                            met.step();
                            requestAnimationFrame(recur);
                        }
                    });
                }).then(function (_c) {
                    var recbuf = _c[0], barkerChirp = _c[1];
                    var render = new duxca.lib.CanvasRender(128, 128);
                    console.group("show record");
                    console.time("show record");
                    var pcm = recbuf.toPCM();
                    var wav = new duxca.lib.Wave(recbuf.channel, recbuf.sampleRate, pcm);
                    var audio = wav.toAudio();
                    //audio.autoplay = true;
                    document.body.appendChild(audio);
                    console.timeEnd("show record");
                    console.groupEnd();
                    console.group("calc correlation");
                    console.time("calc correlation");
                    var rawdata = recbuf.merge();
                    recbuf.clear();
                    var windowsize = barkerChirp.length;
                    var resized_charp = new Float32Array(windowsize * 2); // for overwrap adding way correlation
                    resized_charp.set(barkerChirp, 0);
                    var buffer = new Float32Array(windowsize * 2); // for overwrap adding way correlation
                    var correlation = new Float32Array(rawdata.length);
                    for (var i = 0; rawdata.length - (i + windowsize) >= resized_charp.length; i += windowsize) {
                        buffer.set(rawdata.subarray(i, i + windowsize), 0);
                        var corr = duxca.lib.Signal.correlation(buffer, resized_charp);
                        for (var j = 0; j < corr.length; j++) {
                            correlation[i + j] = corr[j];
                        }
                    }
                    console.timeEnd("calc correlation");
                    console.groupEnd();
                    console.group("calc stdscores");
                    console.time("calc stdscores");
                    var _correlation = duxca.lib.Signal.normalize(correlation, 100);
                    var ave = duxca.lib.Statictics.average(_correlation);
                    var vari = duxca.lib.Statictics.variance(_correlation);
                    console.log("ave:", ave, "\n", "med:", duxca.lib.Statictics.median(_correlation), "\n", "var:", vari, "\n");
                    var stdscores = new Float32Array(_correlation.length);
                    for (var i = 0; i < _correlation.length; i++) {
                        stdscores[i] = 10 * (_correlation[i] - ave) / vari + 50;
                    }
                    console.timeEnd("calc stdscores");
                    console.groupEnd();
                    console.group("show correlation and stdscores");
                    console.time("show correlation and stdscores");
                    var splitsize = Math.pow(2, 10);
                    var _correlation = duxca.lib.Signal.normalize(correlation, 128);
                    var _stdscores = duxca.lib.Signal.normalize(stdscores, 128);
                    var min = duxca.lib.Statictics.findMin(stdscores)[0];
                    var max = duxca.lib.Statictics.findMax(stdscores)[0];
                    var stdscoreline = new Float32Array(splitsize);
                    for (var i = 0; i < stdscoreline.length; i++) {
                        stdscoreline[i] = (CUTOFF_STANDARDSCORE - min) / (max - min) * 128;
                    }
                    var lastptr = 0;
                    var count = 0;
                    for (var i = 0; i < _correlation.length; i += splitsize) {
                        var corpart = _correlation.subarray(i, i + splitsize);
                        var stdpart = _stdscores.subarray(i, i + splitsize);
                        render.cnv.width = corpart.length;
                        render.ctx.strokeStyle = "gray";
                        render.drawSignal(stdpart);
                        render.ctx.strokeStyle = "gray";
                        render.drawSignal(stdscoreline);
                        if (i % (PULSE_INTERVAL_SEC * recbuf.sampleRate) > (i + splitsize) % (PULSE_INTERVAL_SEC * recbuf.sampleRate)) {
                            var intvlptr = ((i / (PULSE_INTERVAL_SEC * recbuf.sampleRate) | 0) + 1) * PULSE_INTERVAL_SEC * recbuf.sampleRate;
                            render.ctx.strokeStyle = "red";
                            render.drawColLine(intvlptr - i);
                            count++;
                        }
                        console.log("" + count, lastptr + "-" + (i - 1) + "/" + _correlation.length, (i - lastptr) / recbuf.sampleRate * 1000 + "ms", render.cnv.width + "x" + render.cnv.height);
                        for (var j = i; j < i + splitsize; j++) {
                            if (stdscores[j] > CUTOFF_STANDARDSCORE) {
                                console.log("stdscore", stdscores[j], j);
                            }
                        }
                        render.ctx.strokeStyle = "black";
                        render.drawSignal(corpart);
                        console.screenshot(render.cnv);
                        lastptr = i;
                    }
                    console.timeEnd("calc stdscores");
                    console.groupEnd();
                    console.group("calc cycle");
                    console.time("calc cycle");
                    var splitsize = PULSE_INTERVAL_SEC * recbuf.sampleRate;
                    var results = [];
                    var count = 0;
                    var lastptr = 0;
                    for (var i = splitsize; i < stdscores.length; i += splitsize) {
                        var stdpart = stdscores.subarray(i, i + splitsize);
                        var _d = duxca.lib.Statictics.findMax(stdpart), max_score = _d[0], offset = _d[1];
                        console.log(count++, i + offset, offset, i + offset - lastptr, max_score);
                        results.push(offset);
                        lastptr = i + offset;
                    }
                    results.shift();
                    results.pop();
                    console.log(results);
                    console.log("min", duxca.lib.Statictics.findMin(results)[0], "\n", "max", duxca.lib.Statictics.findMax(results)[0], "\n", "ave", duxca.lib.Statictics.average(results), "\n", "med", duxca.lib.Statictics.median(results), "\n", "mode", duxca.lib.Statictics.mode(results), "\n", "stdev", duxca.lib.Statictics.stdev(results));
                    console.timeEnd("calc cycle");
                    console.groupEnd();
                    console.group("show spectrogram");
                    console.time("show spectrogram");
                    return new Promise(function (resolve, reject) {
                        var windowsize = Math.pow(2, 8); // spectrgram height
                        var slidewidth = Math.pow(2, 6); // spectrgram width rate
                        var sampleRate = recbuf.sampleRate;
                        console.log("sampleRate:", sampleRate, "\n", "windowsize:", windowsize, "\n", "slidewidth:", slidewidth, "\n", "windowsize(ms):", windowsize / sampleRate * 1000, "\n", "slidewidth(ms):", slidewidth / sampleRate * 1000, "\n");
                        var spectrums = [];
                        var ptr = 0;
                        var lstptr = 0;
                        var count = 0;
                        recur();
                        function recur() {
                            if (ptr + windowsize > rawdata.length) {
                                draw();
                                console.timeEnd("show spectrogram");
                                console.groupEnd();
                                return resolve(Promise.resolve([rawdata, barkerChirp]));
                            }
                            var spectrum = duxca.lib.Signal.fft(rawdata.subarray(ptr, ptr + windowsize), sampleRate)[2];
                            for (var i = 0; i < spectrum.length; i++) {
                                spectrum[i] = spectrum[i] * 20000;
                            }
                            spectrums.push(spectrum);
                            if (count % 512 === 511) {
                                draw();
                            }
                            ptr += slidewidth;
                            count++;
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
                    });
                }).catch(function end(err) {
                    console.error(err);
                    err instanceof Error && console.error(err.stack);
                }).then(function () {
                    console.timeEnd("testDetect2");
                    console.groupEnd();
                });
            }
            Sandbox.testDetect3 = testDetect3;
            function testDetect2() {
                console.group("testDetect2");
                console.time("testDetect2");
                var maybeStream = new Promise(function (resolbe, reject) {
                    return navigator.getUserMedia({ video: false, audio: true }, resolbe, reject);
                });
                maybeStream.then(function (stream) {
                    var actx = new AudioContext();
                    var source = actx.createMediaStreamSource(stream);
                    var processor = actx.createScriptProcessor(Math.pow(2, 14), 1, 1);
                    //source.connect(processor);
                    processor.connect(actx.destination);
                    var pulse = duxca.lib.Signal.createBarkerCodedChirp(13, 12);
                    for (var pow = 0; pulse.length > Math.pow(2, pow); pow++)
                        ;
                    var cliped_chirp = new Float32Array(Math.pow(2, pow));
                    cliped_chirp.set(pulse, 0);
                    console.log(pulse.length, cliped_chirp.length);
                    var osc = new duxca.lib.OSC(actx);
                    var abuf = osc.createAudioBufferFromArrayBuffer(cliped_chirp, 44100);
                    var met = new lib.Metronome(actx, 1);
                    var rfps = new lib.FPS(1000);
                    var pfps = new lib.FPS(1000);
                    var recbuf = new lib.RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
                    return new Promise(function (resolve, reject) {
                        console.group("fps\trequestAnimationFrame\taudioprocess");
                        recur();
                        nextTick();
                        met.nextTick = nextTick;
                        processor.addEventListener("audioprocess", handler);
                        function nextTick() {
                            var anode = osc.createAudioNodeFromAudioBuffer(abuf);
                            anode.connect(processor); //actx.destination);
                            anode.start(met.nextTime);
                        }
                        function recur() {
                            console.log(rfps + "/60\t" + pfps + "/" + (actx.sampleRate / processor.bufferSize * 1000 | 0) / 1000);
                            rfps.step();
                            if (actx.currentTime > 10) {
                                setTimeout(function () {
                                    stream.stop();
                                    processor.removeEventListener("audioprocess", handler);
                                    console.groupEnd();
                                    resolve(Promise.resolve([recbuf, cliped_chirp]));
                                }, met.interval * 1000);
                                return;
                            }
                            met.step();
                            setTimeout(recur, 0);
                        }
                        function handler(ev) {
                            pfps.step();
                            recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                        }
                    });
                }).then(function (_c) {
                    var recbuf = _c[0], cliped_chirp = _c[1];
                    var render = new duxca.lib.CanvasRender(128, 128);
                    console.group("cliped_chirp:" + cliped_chirp.length);
                    var min = duxca.lib.Statictics.findMin(cliped_chirp)[0];
                    for (var i = 0; i < cliped_chirp.length; i++) {
                        cliped_chirp[i] = cliped_chirp[i] + Math.abs(min);
                    }
                    render.cnv.width = cliped_chirp.length;
                    render.drawSignal(cliped_chirp, false, true);
                    console.screenshot(render.cnv);
                    console.groupEnd();
                    var pcm = recbuf.toPCM();
                    var wav = new duxca.lib.Wave(recbuf.channel, recbuf.sampleRate, pcm);
                    var audio = wav.toAudio();
                    //audio.autoplay = true;
                    document.body.appendChild(audio);
                    var rawdata = recbuf.merge(0);
                    console.group("rawdata:" + rawdata.length);
                    return new Promise(function (resolve, reject) {
                        var windowsize = Math.pow(2, 8);
                        var slidewidth = Math.pow(2, 6);
                        var sampleRate = recbuf.sampleRate;
                        console.log("sampleRate:", sampleRate, "\n", "windowsize:", windowsize, "\n", "slidewidth:", slidewidth, "\n", "windowsize(ms):", windowsize / sampleRate * 1000, "\n", "slidewidth(ms):", slidewidth / sampleRate * 1000, "\n");
                        var spectrums = [];
                        var ptr = 0;
                        var lstptr = 0;
                        var count = 0;
                        recur();
                        function recur() {
                            if (ptr + windowsize > rawdata.length) {
                                draw();
                                console.groupEnd();
                                return resolve(Promise.resolve([rawdata, cliped_chirp]));
                            }
                            var spectrum = duxca.lib.Signal.fft(rawdata.subarray(ptr, ptr + windowsize), recbuf.sampleRate)[2];
                            for (var i = 0; i < spectrum.length; i++) {
                                spectrum[i] = spectrum[i] * 20000;
                            }
                            spectrums.push(spectrum);
                            if (count % 512 === 511) {
                                draw();
                            }
                            ptr += slidewidth;
                            count++;
                            setTimeout(recur);
                        }
                        function draw() {
                            console.log(lstptr + "-" + (ptr - 1) + "/" + rawdata.length, (ptr - lstptr) / sampleRate * 1000 + "ms", spectrums.length + "x" + spectrums[0].length);
                            render.cnv.width = spectrums.length;
                            render.cnv.height = spectrums[0].length;
                            render.drawSpectrogram(spectrums);
                            console.screenshot(render.cnv);
                            spectrums = [];
                            lstptr = ptr;
                        }
                    });
                }).then(function (_c) {
                    var rawdata = _c[0], cliped_chirp = _c[1];
                    console.group("correlation");
                    console.time("correlation");
                    console.log(rawdata.length, cliped_chirp.length);
                    var windowsize = cliped_chirp.length;
                    var resized_charp = new Float32Array(windowsize * 2);
                    resized_charp.set(cliped_chirp, 0);
                    var tmp = new Float32Array(windowsize * 2);
                    var concat_corr = new Float32Array(rawdata.length);
                    for (var i = 0; rawdata.length - (i + windowsize) >= resized_charp.length; i += windowsize) {
                        var sig = rawdata.subarray(i, i + windowsize);
                        tmp.set(sig, 0);
                        var corr = duxca.lib.Signal.correlation(tmp, resized_charp);
                        for (var j = 0; j < corr.length; j++) {
                            concat_corr[i + j] = corr[j];
                        }
                    }
                    console.timeEnd("correlation");
                    console.groupEnd();
                    console.group("show correlation");
                    console.time("show correlation");
                    var concat_corr = duxca.lib.Signal.normalize(concat_corr, 100);
                    var ave = duxca.lib.Statictics.average(concat_corr);
                    var vari = duxca.lib.Statictics.variance(concat_corr);
                    console.log("ave:", ave, "\n", "med:", duxca.lib.Statictics.median(concat_corr), "\n", "var:", vari, "\n");
                    var stdscores = [];
                    for (var i = 0; i < concat_corr.length; i++) {
                        var stdscore = 10 * (concat_corr[i] - ave) / vari + 50;
                        stdscores.push(stdscore);
                    }
                    var render = new duxca.lib.CanvasRender(128, 128);
                    var goodscoreIds = [];
                    var splitsize = Math.pow(2, 10);
                    for (var i = 0; i < concat_corr.length; i += splitsize) {
                        var _corr = concat_corr.subarray(i, i + splitsize);
                        var __corr = concat_corr.subarray(i, i + splitsize * 2);
                        console.log("ptr:", i);
                        render.cnv.width = _corr.length;
                        render.drawSignal(_corr);
                        for (var j = i; j < i + splitsize; j++) {
                            if (stdscores[j] > 200) {
                                var localscore = duxca.lib.Statictics.stdscore(__corr, __corr[j - i]);
                                if (localscore > 60) {
                                    goodscoreIds.push(j);
                                    console.log("stdscore", stdscores[j], localscore, "index", j);
                                    render.drawColLine(j - i);
                                }
                            }
                        }
                        console.screenshot(render.cnv);
                    }
                    console.timeEnd("correlation show");
                    console.groupEnd();
                    console.group("clustering");
                    console.time("clustering");
                    console.log(goodscoreIds);
                    var clusterN = 10;
                    var clusterized = duxca.lib.Statictics.k_means1D(goodscoreIds, clusterN);
                    console.log(clusterized);
                    var clusterIds = [];
                    for (var j = 0; j < clusterN; j++) {
                        clusterIds[j] = [];
                    }
                    for (var i = 0; i < clusterized.length; i++) {
                        clusterIds[clusterized[i]].push(goodscoreIds[i]);
                    }
                    console.log(clusterIds);
                    var results = [];
                    for (var i = 0; i < clusterIds.length; i++) {
                        var _d = duxca.lib.Statictics.findMax(clusterIds[i].map(function (id) { return stdscores[id]; })), stdscore = _d[0], _id = _d[1];
                        var id = clusterIds[i][_id];
                        var val = concat_corr[id];
                        console.log("index", id, "val", val, "stdscore", stdscore);
                        results.push(id);
                    }
                    console.log(results.sort(function (a, b) { return a - b; }));
                    var _interval = [];
                    for (var i = 1; i < results.length; i++) {
                        _interval[i - 1] = results[i] - results[i - 1];
                    }
                    console.log(_interval);
                    console.timeEnd("clustering");
                    console.groupEnd();
                }).catch(function end(err) {
                    console.error(err);
                }).then(function () {
                    console.timeEnd("testDetect2");
                    console.groupEnd();
                });
            }
            Sandbox.testDetect2 = testDetect2;
            function testKmeans() {
                var arr = [1, 2, 3, 4, 5, 30, 435, 46, 3, 436, 63];
                console.log(arr);
                console.log(duxca.lib.Statictics.k_means1D(arr, 3));
            }
            Sandbox.testKmeans = testKmeans;
            function testComplementaryCode(n) {
                if (n === void 0) { n = 0; }
                var _c = duxca.lib.Signal.createComplementaryCode(n), a = _c[0], b = _c[1];
                console.log(0, a, b);
                var _a = duxca.lib.Signal.autocorr(a);
                var _b = duxca.lib.Signal.autocorr(b);
                console.log(_a);
                console.log(_b);
                console.log(_a.map(function (x, i) { return x + _b[i]; }));
            }
            Sandbox.testComplementaryCode = testComplementaryCode;
            function showChirp() {
                var bitwidth = Math.pow(2, 10);
                var up_chirp = duxca.lib.Signal.createChirpSignal(bitwidth);
                var down_chirp = new Float32Array(up_chirp);
                for (var i = 0; i < down_chirp.length; i++) {
                    down_chirp[i] *= -1;
                }
                var render = new duxca.lib.CanvasRender(128, 128);
                render.cnv.width = up_chirp.length;
                render.drawSignal(up_chirp, true, true);
                console.screenshot(render.element);
                render.cnv.width = up_chirp.length;
                render.drawSignal(down_chirp, true, true);
                console.screenshot(render.element);
                /*
                var pulse = new Float32Array(bitwidth/2*5);
                var code = duxca.lib.Signal.createBarkerCode(4);
                for(var i=0; i<code.length; i++){
                  for(var j=0; j<bitwidth; j++){
                    pulse[i*bitwidth/2+j] += (code[i] === 1) ? up_chirp[j] : down_chirp[j];
                  }
                }*/
                var pulse = duxca.lib.Signal.createBarkerCodedChirp(13);
                render.cnv.width = pulse.length;
                render.drawSignal(pulse, true, true);
                console.screenshot(render.element);
            }
            Sandbox.showChirp = showChirp;
            function testDetect() {
                console.group("testDetect");
                console.time("testDetect");
                navigator.getUserMedia({ video: false, audio: true }, function (stream) {
                    var actx = new AudioContext();
                    var source = actx.createMediaStreamSource(stream);
                    var processor = actx.createScriptProcessor(Math.pow(2, 12), 1, 1);
                    source.connect(processor);
                    processor.connect(actx.destination);
                    var render_corr = new duxca.lib.CanvasRender(128, 128);
                    var raw_chirp = duxca.lib.Signal.createChirpSignal(Math.pow(2, 10));
                    var cliped_chirp = raw_chirp.subarray(0, raw_chirp.length / 2);
                    var resized_chirp = new Float32Array(processor.bufferSize * 2);
                    resized_chirp.set(cliped_chirp, 0);
                    var cacheBuffer = new Float32Array(processor.bufferSize * 2);
                    var osc = new duxca.lib.OSC(actx);
                    var abuf = osc.createAudioBufferFromArrayBuffer(cliped_chirp, 44100);
                    var count = 0;
                    processor.addEventListener("audioprocess", handler);
                    function handler(ev) {
                        if (count > 100) {
                            processor.removeEventListener("audioprocess", handler);
                            stream.stop();
                            return end();
                        }
                        if (count % 2 === 0) {
                            var anode = osc.createAudioNodeFromAudioBuffer(abuf);
                            anode.connect(actx.destination);
                            anode.start(actx.currentTime);
                        }
                        cacheBuffer.set(ev.inputBuffer.getChannelData(0), (processor.bufferSize % 2) * processor.bufferSize);
                        var corr = duxca.lib.Signal.correlation(resized_chirp, cacheBuffer);
                        var cliped_corr = corr.subarray(0, corr.length / 2);
                        console.log("min", duxca.lib.Statictics.findMin(cliped_corr), "\n", "max", duxca.lib.Statictics.findMax(cliped_corr), "\n", "ave", duxca.lib.Statictics.average(cliped_corr), "\n", "med", duxca.lib.Statictics.median(cliped_corr), "\n", "var", duxca.lib.Statictics.variance(cliped_corr), "\n");
                        render_corr.cnv.width = cliped_corr.length;
                        render_corr.drawSignal(cliped_corr, false, true);
                        console.screenshot(render_corr.cnv);
                        count++;
                    }
                }, function (err) { console.error(err); end(); });
                function end() {
                    console.timeEnd("testDetect");
                    console.groupEnd();
                }
            }
            Sandbox.testDetect = testDetect;
            function testRecord() {
                console.group("testRecord");
                console.time("testRecord");
                navigator.getUserMedia({ video: false, audio: true }, function (stream) {
                    var actx = new AudioContext();
                    var source = actx.createMediaStreamSource(stream);
                    var processor = actx.createScriptProcessor(Math.pow(2, 12), 1, 1);
                    source.connect(processor);
                    processor.connect(actx.destination);
                    var recbuf = new lib.RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
                    var count = 0;
                    processor.addEventListener("audioprocess", handler);
                    function handler(ev) {
                        if (++count > 100) {
                            processor.removeEventListener("audioprocess", handler);
                            stream.stop();
                            var pcm = recbuf.toPCM();
                            //recbuf.clear();
                            var wav = new duxca.lib.Wave(recbuf.channel, actx.sampleRate, pcm);
                            var audio = wav.toAudio();
                            audio.loop = true;
                            audio.play();
                            console.log(recbuf, wav, audio);
                            return end();
                        }
                        if (count % 10 === 0)
                            console.log(count);
                        recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                    }
                }, function (err) { console.error(err); end(); });
                function end() {
                    console.timeEnd("testRecord");
                    console.groupEnd();
                }
            }
            Sandbox.testRecord = testRecord;
            function testScriptProcessor() {
                console.group("testScriptProcessor");
                console.time("testScriptProcessor");
                navigator.getUserMedia({ video: false, audio: true }, function (stream) {
                    var actx = new AudioContext();
                    var source = actx.createMediaStreamSource(stream);
                    var processor = actx.createScriptProcessor(Math.pow(2, 9), 1, 1);
                    source.connect(processor);
                    processor.connect(actx.destination);
                    var spectrums = [];
                    var count = 0;
                    processor.addEventListener("audioprocess", handler);
                    function handler(ev) {
                        if (count > 1000) {
                            processor.removeEventListener("audioprocess", handler);
                            stream.stop();
                            return end();
                        }
                        var buf = new Float32Array(ev.inputBuffer.getChannelData(0));
                        var _c = duxca.lib.Signal.fft(buf, actx.sampleRate), real = _c[0], imag = _c[1], spectrum = _c[2];
                        for (var i = 0; i < spectrum.length; i++) {
                            spectrum[i] = spectrum[i] * 20000;
                        }
                        if (spectrums.length > 200)
                            spectrums.shift();
                        spectrums.push(spectrum);
                        if (++count % 200 === 0)
                            draw();
                    }
                    function draw() {
                        var render = new duxca.lib.CanvasRender(spectrums.length, spectrums[0].length);
                        render.drawSpectrogram(spectrums);
                        console.screenshot(render.cnv);
                    }
                }, function (err) { console.error(err); end(); });
                function end() {
                    console.timeEnd("testScriptProcessor");
                    console.groupEnd();
                }
            }
            Sandbox.testScriptProcessor = testScriptProcessor;
            function testSpectrum() {
                console.group("testSpectrum");
                console.time("testSpectrum");
                navigator.getUserMedia({ video: false, audio: true }, function (stream) {
                    var actx = new AudioContext();
                    var analyser = actx.createAnalyser();
                    var source = actx.createMediaStreamSource(stream);
                    source.connect(analyser);
                    analyser.smoothingTimeConstant = 0;
                    analyser.fftSize = 512;
                    var fftdata = new Uint8Array(analyser.frequencyBinCount);
                    var spectrums = [];
                    var count = 0;
                    console.log("make noise and wait few sec");
                    recur();
                    function recur() {
                        if (count++ > 1000) {
                            stream.stop();
                            return end();
                        }
                        if (count % 100 === 0)
                            draw();
                        analyser.getByteFrequencyData(fftdata);
                        spectrums.push(new Uint8Array(fftdata));
                        requestAnimationFrame(recur);
                    }
                    function draw() {
                        console.log(count);
                        var render = new duxca.lib.CanvasRender(spectrums.length, spectrums[0].length);
                        render.drawSpectrogram(spectrums);
                        console.screenshot(render.cnv);
                    }
                }, function (err) { console.error(err); end(); });
                function end() {
                    console.timeEnd("testSpectrum");
                    console.groupEnd();
                }
            }
            Sandbox.testSpectrum = testSpectrum;
            function testOSC() {
                console.group("testOSC");
                console.time("testOSC");
                // raw cliped
                var raw_chirp = duxca.lib.Signal.createChirpSignal(Math.pow(2, 10));
                var cliped_chirp = raw_chirp.subarray(0, raw_chirp.length / 2);
                var actx = new AudioContext();
                var osc = new duxca.lib.OSC(actx);
                var abuf = osc.createAudioBufferFromArrayBuffer(cliped_chirp, 44100);
                var anode = osc.createAudioNodeFromAudioBuffer(abuf);
                anode.connect(actx.destination);
                anode.start(0);
                console.timeEnd("testOSC");
                console.groupEnd();
            }
            Sandbox.testOSC = testOSC;
            function testChirp() {
                console.group("testChirp");
                console.time("testChirp");
                // raw cliped
                var raw_chirp = duxca.lib.Signal.createChirpSignal(Math.pow(2, 10));
                var cliped_chirp = raw_chirp.subarray(0, raw_chirp.length / 2);
                // noised
                var noised_chirp = new Float32Array(cliped_chirp);
                for (var i = 0; i < noised_chirp.length; i++) {
                    noised_chirp[i] = cliped_chirp[i] + (Math.random() - 1 / 2) * 0.5;
                }
                // noised_corr
                console.time("noised_corr");
                var corr = duxca.lib.Signal.correlation(cliped_chirp, noised_chirp);
                console.timeEnd("noised_corr");
                // draw
                var render_cliped = new duxca.lib.CanvasRender(cliped_chirp.length, 128);
                var render_noised = new duxca.lib.CanvasRender(noised_chirp.length, 128);
                var render_corr = new duxca.lib.CanvasRender(corr.length, 128);
                var _cliped_chirp = new Float32Array(noised_chirp.length);
                var _noised_chirp = new Float32Array(cliped_chirp.length);
                for (var i = 0; i < cliped_chirp.length; i++) {
                    _cliped_chirp[i] = 1000 * cliped_chirp[i] + 64;
                    _noised_chirp[i] = 1000 * noised_chirp[i] + 64;
                }
                render_cliped.drawSignal(_cliped_chirp, true);
                render_noised.drawSignal(_noised_chirp, true);
                render_corr.drawSignal(corr, true, true);
                console.screenshot(render_cliped.cnv);
                duxca.lib.Statictics.all(cliped_chirp);
                console.screenshot(render_noised.cnv);
                duxca.lib.Statictics.all(noised_chirp);
                console.screenshot(render_corr.cnv);
                duxca.lib.Statictics.all(corr);
                console.timeEnd("testChirp");
                console.groupEnd();
            }
            Sandbox.testChirp = testChirp;
        })(Sandbox = lib.Sandbox || (lib.Sandbox = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
