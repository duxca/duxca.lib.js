"use strict";
var xstream_1 = require("xstream");
var Fisheye2Panorama_1 = require("./Fisheye2Panorama");
var XStream_1 = require("./XStream");
function updateCameraRect(canvasSize$, // window.onresize したいとき
    panoramaSize$, // world 座標系上の panorama size
    cameraRect$, // world 座標系上の 位置 x,y(カメラ中心基準) と大きさ width|height, clipping したいときに便利
    delta$, // 前回のtouchmove位置からの delta、 canvas座標
    zoom$) {
    var _cameraRect$ = xstream_1.default.combine(canvasSize$, panoramaSize$, cameraRect$)
        .map(function (_a) {
        var cnv = _a[0], pano = _a[1], cam = _a[2];
        var camD$ = delta$
            .map(function (_a) {
            var deltaX = _a.deltaX, deltaY = _a.deltaY;
            // canvas 座標系 -> camera 座標系
            var _b = Fisheye2Panorama_1.convertCnvCoord2CameraCoord(cnv, cam, { x: deltaX, y: deltaY }), _deltaX = _b.x, _deltaY = _b.y;
            var x = cam.x, y = cam.y, width = cam.width, height = cam.height;
            return {
                x: x + _deltaX,
                y: y + _deltaY,
                width: width,
                height: height
            };
        });
        var camZ$ = zoom$
            .map(function (_a) {
            var centerX = _a.centerX, centerY = _a.centerY, scale = _a.scale;
            var _b = Fisheye2Panorama_1.convertCnvCoord2CameraCoord(cnv, cam, { x: centerX, y: centerY }), _cX = _b.x, _cY = _b.y;
            var _cam = Fisheye2Panorama_1.calcZoom(cam, { x: _cX, y: _cY, scale: scale });
            return _cam;
        });
        return xstream_1.default.merge(camD$, camZ$);
    }).compose(XStream_1.reconnect);
    return _cameraRect$;
}
exports.updateCameraRect = updateCameraRect;
