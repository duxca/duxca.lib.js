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
            function testFDTD() {
                var render = new lib.CanvasRender(100, 100);
                var fdtd = new lib.FDTD(100, 100);
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
        })(Sandbox = lib.Sandbox || (lib.Sandbox = {}));
    })(lib = duxca.lib || (duxca.lib = {}));
})(duxca || (duxca = {}));
