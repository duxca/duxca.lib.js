var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        function hue2rgb(p, q, t) {
            if (t < 0) {
                t += 1;
            }
            if (t > 1) {
                t -= 1;
            }
            if (t < 1 / 6) {
                return p + (q - p) * 6 * t;
            }
            if (t < 1 / 2) {
                return q;
            }
            if (t < 2 / 3) {
                return p + (q - p) * (2 / 3 - t) * 6;
            }
            return p;
        }
        function hslToRgb(h, s, l) {
            // h, s, l: 0~1
            h *= 5 / 6;
            if (h < 0) {
                h = 0;
            }
            if (5 / 6 < h) {
                h = 5 / 6;
            }
            var r, g, b;
            if (s === 0) {
                r = g = b = l;
            }
            else {
                var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                var p = 2 * l - q;
                r = hue2rgb(p, q, h + 1 / 3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1 / 3);
            }
            return [r * 255, g * 255, b * 255];
        }
        var CanvasRender = (function () {
            function CanvasRender(width, height) {
                this.element = this.cnv = document.createElement("canvas");
                this.cnv.width = width;
                this.cnv.height = height;
                this.ctx = this.cnv.getContext("2d");
            }
            CanvasRender.prototype.clear = function () {
                this.cnv.width = this.cnv.width;
            };
            CanvasRender.prototype.drawSignal = function (signal, flagX, flagY) {
                if (flagX === void 0) { flagX = false; }
                if (flagY === void 0) { flagY = false; }
                if (flagY) {
                    signal = duxca.lib.Signal.standard(signal, 1);
                }
                var zoomX = !flagX ? 1 : this.cnv.width / signal.length;
                var zoomY = !flagY ? 1 : this.cnv.height / Math.max.apply(null, signal);
                this.ctx.beginPath();
                this.ctx.moveTo(0, this.cnv.height - signal[0] * zoomY);
                for (var i = 1; i < signal.length; i++) {
                    this.ctx.lineTo(zoomX * i, this.cnv.height - signal[i] * zoomY);
                }
                this.ctx.stroke();
            };
            CanvasRender.prototype.drawColLine = function (x) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.cnv.height);
                this.ctx.stroke();
            };
            CanvasRender.prototype.drawRowLine = function (y) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.cnv.width, y);
                this.ctx.stroke();
            };
            CanvasRender.prototype.drawSpectrogram = function (spectrogram, max) {
                if (max === void 0) { max = 255; }
                var imgdata = this.ctx.createImageData(spectrogram.length, spectrogram[0].length);
                for (var i = 0; i < spectrogram.length; i++) {
                    for (var j = 0; j < spectrogram[i].length; j++) {
                        var _a = hslToRgb(spectrogram[i][j] / max, 0.5, 0.5), r = _a[0], g = _a[1], b = _a[2];
                        var _b = [i, imgdata.height - 1 - j], x = _b[0], y = _b[1];
                        var index = x + y * imgdata.width;
                        imgdata.data[index * 4 + 0] = b | 0;
                        imgdata.data[index * 4 + 1] = g | 0;
                        imgdata.data[index * 4 + 2] = r | 0;
                        imgdata.data[index * 4 + 3] = 255;
                    }
                }
                this.ctx.putImageData(imgdata, 0, 0);
            };
            return CanvasRender;
        })();
        lib.CanvasRender = CanvasRender;
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var FPS = (function () {
            function FPS(period) {
                this.period = period;
                this.lastTime = performance.now();
                this.fps = 0;
                this.counter = 0;
            }
            FPS.prototype.step = function () {
                var currentTime = performance.now();
                this.counter += 1;
                if (currentTime - this.lastTime > this.period) {
                    this.fps = 1000 * this.counter / (currentTime - this.lastTime);
                    this.counter = 0;
                    this.lastTime = currentTime;
                }
            };
            FPS.prototype.valueOf = function () {
                return Math.round(this.fps * 1000) / 1000;
            };
            return FPS;
        })();
        lib.FPS = FPS;
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Metronome = (function () {
            function Metronome(actx, interval) {
                this.actx = actx;
                this.interval = interval;
                this.lastTime = this.actx.currentTime;
                this.nextTime = this.interval + this.actx.currentTime;
                this.nextTick = function () { };
            }
            Metronome.prototype.step = function () {
                if (this.actx.currentTime - this.nextTime >= 0) {
                    this.lastTime = this.nextTime;
                    this.nextTime += this.interval;
                    this.nextTick();
                }
            };
            return Metronome;
        })();
        lib.Metronome = Metronome;
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var OSC = (function () {
            function OSC(actx) {
                this.actx = actx;
            }
            OSC.prototype.createAudioBufferFromArrayBuffer = function (arr, sampleRate) {
                var abuf = this.actx.createBuffer(1, arr.length, sampleRate);
                var buf = abuf.getChannelData(0);
                buf.set(arr);
                return abuf;
            };
            OSC.prototype.createAudioNodeFromAudioBuffer = function (abuf) {
                var asrc = this.actx.createBufferSource();
                asrc.buffer = abuf;
                return asrc;
            };
            return OSC;
        })();
        lib.OSC = OSC;
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
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
                    source.connect(processor);
                    processor.connect(actx.destination);
                    var raw_chirp = duxca.lib.Signal.createChirpSignal(Math.pow(2, 14));
                    var cliped_chirp = raw_chirp.subarray(0, raw_chirp.length);
                    var osc = new duxca.lib.OSC(actx);
                    var abuf = osc.createAudioBufferFromArrayBuffer(cliped_chirp, 44100);
                    var met = new lib.Metronome(actx, 0.5);
                    met.nextTick = function () {
                        var anode = osc.createAudioNodeFromAudioBuffer(abuf);
                        anode.connect(actx.destination);
                        anode.start(actx.currentTime);
                    };
                    var rfps = new lib.FPS(1000);
                    var pfps = new lib.FPS(1000);
                    var recbuf = new lib.RecordBuffer(actx.sampleRate, processor.bufferSize, processor.channelCount);
                    return new Promise(function (resolve, reject) {
                        console.group("fps\trequestAnimationFrame\taudioprocess");
                        recur();
                        processor.addEventListener("audioprocess", handler);
                        function recur() {
                            console.log(rfps + "/60\t" + pfps + "/" + (actx.sampleRate / processor.bufferSize * 1000 | 0) / 1000);
                            rfps.step();
                            if (actx.currentTime > 2) {
                                setTimeout(function () {
                                    stream.stop();
                                    processor.removeEventListener("audioprocess", handler);
                                    console.groupEnd();
                                    resolve(Promise.resolve([recbuf, cliped_chirp]));
                                }, met.interval * 1000);
                                return;
                            }
                            met.step();
                            requestAnimationFrame(recur);
                        }
                        function handler(ev) {
                            pfps.step();
                            recbuf.add([new Float32Array(ev.inputBuffer.getChannelData(0))], actx.currentTime);
                        }
                    });
                }).then(function (_a) {
                    var recbuf = _a[0], cliped_chirp = _a[1];
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
                }).then(function (_a) {
                    var rawdata = _a[0], cliped_chirp = _a[1];
                    console.group("correlation");
                    console.time("correlation");
                    console.log(rawdata.length, cliped_chirp.length);
                    var render = new duxca.lib.CanvasRender(128, 128);
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
                    var concat_corr = duxca.lib.Signal.standard(concat_corr, 100);
                    var ave = duxca.lib.Statictics.average(concat_corr);
                    var vari = duxca.lib.Statictics.variance(concat_corr);
                    console.log("ave:", ave, "\n", "med:", duxca.lib.Statictics.median(concat_corr), "\n", "var:", vari, "\n");
                    var stdscores = [];
                    for (var i = 0; i < concat_corr.length; i++) {
                        var stdscore = 10 * (concat_corr[i] - ave) / vari + 50;
                        stdscores.push(stdscore);
                    }
                    var splitsize = Math.pow(2, 10);
                    for (var i = 0; i < concat_corr.length; i += splitsize) {
                        var _corr = concat_corr.subarray(i, i + splitsize);
                        console.log("ptr:", i);
                        render.cnv.width = _corr.length;
                        render.drawSignal(_corr);
                        for (var j = i; j < i + splitsize; j++) {
                            if (stdscores[j] > 80) {
                                var localscore = duxca.lib.Statictics.stdscore(_corr, _corr[j - i]);
                                console.log("stdscore", stdscores[j], "localscore", localscore, "index", j);
                                render.drawColLine(j - i);
                            }
                        }
                        console.screenshot(render.cnv);
                    }
                    console.timeEnd("correlation");
                    console.groupEnd();
                }).catch(function end(err) {
                    console.error(err);
                }).then(function () {
                    console.timeEnd("testDetect2");
                    console.groupEnd();
                });
            }
            Sandbox.testDetect2 = testDetect2;
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
                        var _a = duxca.lib.Signal.fft(buf, actx.sampleRate), real = _a[0], imag = _a[1], spectrum = _a[2];
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
/// <reference path="../../tsd/dsp/dsp.d.ts" />
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Signal;
        (function (Signal) {
            function standard(arr, max_val) {
                if (max_val === void 0) { max_val = 1; }
                var min = duxca.lib.Statictics.findMin(arr)[0];
                var max = duxca.lib.Statictics.findMax(arr)[0];
                var _arr = new Float32Array(arr.length);
                for (var j = 0; j < arr.length; j++) {
                    _arr[j] = (arr[j] - min) / (max - min) * max_val;
                }
                return _arr;
            }
            Signal.standard = standard;
            function correlation(signalA, signalB, sampleRate) {
                if (signalA.length !== signalB.length)
                    throw new Error("unmatch signal length A and B as " + signalA.length + " and " + signalB.length);
                var fft = new FFT(signalA.length, sampleRate);
                fft.forward(signalA);
                //var a_spectrum = new Float32Array(fft.spectrum);
                var a_real = new Float32Array(fft.real);
                var a_imag = new Float32Array(fft.imag);
                fft.forward(signalB);
                //var b_spectrum = new Float32Array(fft.spectrum);
                var b_real = fft.real; //new Float32Array(fft.real);
                var b_imag = fft.imag; //new Float32Array(fft.imag);
                var cross_real = b_real; //new Float32Array(b_real.length);
                var cross_imag = b_imag; //new Float32Array(b_imag.length);
                for (var i = 0; i < cross_real.length; i++) {
                    cross_real[i] = a_real[i] * b_real[i] / cross_real.length;
                    cross_imag[i] = a_imag[i] * b_imag[i] / cross_imag.length;
                }
                var inv_real = fft.inverse(cross_real, cross_imag);
                for (var i = 0; i < inv_real.length; i++) {
                    inv_real[i] = inv_real[i] / inv_real.length;
                }
                return inv_real;
            }
            Signal.correlation = correlation;
            function fft(signal, sampleRate) {
                if (sampleRate === void 0) { sampleRate = 44100; }
                var fft = new FFT(signal.length, sampleRate);
                fft.forward(signal);
                return [fft.real, fft.imag, fft.spectrum];
            }
            Signal.fft = fft;
            function createChirpSignal(pulse_length) {
                var pulse_real = new Float32Array(pulse_length);
                var pulse_imag = new Float32Array(pulse_length);
                for (var i = 0; i < pulse_length / 2; i++) {
                    pulse_real[i] = Math.cos(Math.PI * i * (i / pulse_length + 1 / 2));
                    pulse_imag[i] = -Math.sin(Math.PI * i * (i / pulse_length + 1 / 2));
                }
                for (var i = pulse_length / 2 + 1; i < pulse_length; i++) {
                    pulse_real[i] = pulse_real[pulse_length - i];
                    pulse_imag[i] = -pulse_imag[pulse_length - i];
                }
                var fft = new FFT(pulse_length, 44100);
                var inv_real = fft.inverse(pulse_real, pulse_imag);
                return inv_real;
            }
            Signal.createChirpSignal = createChirpSignal;
        })(Signal = lib.Signal || (lib.Signal = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Statictics;
        (function (Statictics) {
            function summation(arr) {
                var sum = 0;
                for (var j = 0; j < arr.length; j++) {
                    sum += arr[j];
                }
                return sum;
            }
            Statictics.summation = summation;
            function average(arr) {
                return summation(arr) / arr.length;
            }
            Statictics.average = average;
            function variance(arr) {
                var ave = average(arr);
                var sum = 0;
                for (var j = 0; j < arr.length; j++) {
                    sum += Math.pow(arr[j] - ave, 2);
                }
                return sum / (arr.length - 1);
            }
            Statictics.variance = variance;
            function stdev(arr) {
                return Math.sqrt(variance(arr));
            }
            Statictics.stdev = stdev;
            function stdscore(arr, x) {
                return 10 * (x - average(arr)) / variance(arr) + 50;
            }
            Statictics.stdscore = stdscore;
            function derivative(arr) {
                var results = [0];
                for (var i = 1; 0 < arr.length; i++) {
                    results.push(arr[i] - arr[i - 1]);
                }
                return results;
            }
            Statictics.derivative = derivative;
            function median(arr) {
                return Array.prototype.slice.call(arr, 0).sort()[arr.length / 2 | 0];
            }
            Statictics.median = median;
            function KDE(arr, h) {
                // kernel density estimation
                if (h == null) {
                    h = 0.9 * stdev(arr) * Math.pow(arr.length, -1 / 5) + 0.0000000001;
                }
                function kernel(x) {
                    return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
                }
                function estimate(x) {
                    var s = 0;
                    for (var i = 0; i < arr.length; i++) {
                        s += kernel((x - arr[i]) / h);
                    }
                    return s / (h * arr.length);
                }
                var results = [];
                for (var i = 0; i < arr.length; i++) {
                    results.push(estimate(arr[i]));
                }
                return results;
            }
            Statictics.KDE = KDE;
            function mode(arr) {
                var kde = KDE(arr);
                return arr[findMax(kde)[1]];
            }
            Statictics.mode = mode;
            function gaussian(x) {
                return 1 / Math.sqrt(2 * Math.PI) * Math.exp(-Math.pow(x, 2) / 2);
            }
            Statictics.gaussian = gaussian;
            function findMax(arr) {
                var result = -Infinity;
                var index = -1;
                for (var i = 0; i < arr.length; i++) {
                    if (!(arr[i] > result)) {
                        continue;
                    }
                    result = arr[i];
                    index = i;
                }
                return [result, index];
            }
            Statictics.findMax = findMax;
            function findMin(arr) {
                var result = Infinity;
                var index = -1;
                for (var i = 0; i < arr.length; i++) {
                    if (!(arr[i] < result)) {
                        continue;
                    }
                    result = arr[i];
                    index = i;
                }
                return [result, index];
            }
            Statictics.findMin = findMin;
            function LWMA(arr) {
                // liner weighted moving average
                var a = 0;
                var b = 0;
                var i = 0;
                var j = arr.length - 1;
                while (i < arr.length) {
                    a += arr[i] * j;
                    b += j;
                    i++;
                    j--;
                }
                return a / b;
            }
            Statictics.LWMA = LWMA;
            function all(arr) {
                console.log("len", arr.length, "\n", "min", findMin(arr), "\n", "max", findMax(arr), "\n", "ave", average(arr), "\n", "med", median(arr), "\n", "mode", mode(arr), "\n", "var", variance(arr), "\n", "stdev", stdev(arr));
            }
            Statictics.all = all;
        })(Statictics = lib.Statictics || (lib.Statictics = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
var duxca;
(function (duxca) {
    var lib;
    (function (lib) {
        var Util;
        (function (Util) {
            function importObject(hash) {
                new Function("hash", "Object.keys(hash).forEach(function(key){self[key]=hash[key];});").call(self, hash);
                console.log("some global variables appended: ", Object.keys(hash));
            }
            Util.importObject = importObject;
        })(Util = lib.Util || (lib.Util = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
