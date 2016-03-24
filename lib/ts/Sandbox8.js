/// <reference path="../../typings/tsd.d.ts"/>
var CanvasRender_1 = require("./CanvasRender");
var QRcode_1 = require("./QRcode");
var FDTD_1 = require("./FDTD");
var Sandbox;
(function (Sandbox) {
    function testQRCodeWrite() {
        console.screenshot(QRcode_1.default.writer("hoge"));
    }
    Sandbox.testQRCodeWrite = testQRCodeWrite;
    function testQRCodeRead() {
        new Promise(function (resolbe, reject) { return navigator.getUserMedia({ video: true, audio: false }, resolbe, reject); })
            .then(function (stream) {
            var video = document.createElement("video");
            video.src = window.URL.createObjectURL(stream);
            video.autoplay = true;
            var tid = 0;
            var render = new CanvasRender_1.default(0, 0);
            return new Promise(function (resolve, reject) {
                tid = setInterval(function () {
                    render.cnv.width = video.videoWidth;
                    render.cnv.height = video.videoHeight;
                    render.ctx.drawImage(video, 0, 0);
                    console.clear();
                    console.screenshot(render.cnv);
                    QRcode_1.default.reader(render.cnv, render.ctx).then(function (result) {
                        stream.stop();
                        video.pause();
                        clearInterval(tid);
                        resolve(Promise.resolve(result));
                    }).catch(function (err) {
                        console.log("failed");
                    });
                }, 1000);
            });
        })
            .then(function (data) {
            console.log(data);
        });
    }
    Sandbox.testQRCodeRead = testQRCodeRead;
    function testFDTD() {
        var render = new CanvasRender_1.default(100, 100);
        var fdtd = new FDTD_1.default(100, 100);
        var counter = 0;
        fdtd.pressures[0][1024] = 1024;
        function recur() {
            fdtd.step();
            fdtd.draw(render);
            console.log(counter);
            console.log(fdtd);
            console.screenshot(render.cnv);
            if (counter++ < 1000) {
                setTimeout(recur, 1000 / 30);
            }
        }
        recur();
    }
    Sandbox.testFDTD = testFDTD;
})(Sandbox || (Sandbox = {}));
module.exports = Sandbox;
