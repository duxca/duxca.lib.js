import xs, {Stream} from 'xstream';
import sampleCombine from "xstream/extra/sampleCombine";
import dropRepeats from "xstream/extra/dropRepeats";
import delay from 'xstream/extra/delay'


import {Fisheye2Panorama, convertCnvCoord2CameraCoord, calcZoom} from "./Fisheye2Panorama";
import {reconnect} from "./XStream";

export function updateCameraRect(
  canvasSize$: Stream<{width: number, height: number}>, // window.onresize したいとき
  panoramaSize$: Stream<{width: number, height: number}>, // world 座標系上の panorama size
  cameraRect$: Stream<{x: number, y: number, width: number, height: number}>, // world 座標系上の 位置 x,y(カメラ中心基準) と大きさ width|height, clipping したいときに便利
  delta$: Stream<{deltaX: number, deltaY: number}>, // 前回のtouchmove位置からの delta、 canvas座標
  zoom$: Stream<{centerX: number, centerY: number, scale: number}>, // 前回の pinchmove からの zoom の delta、 (cx,cy)は canvas座標
): Stream<{x: number, y: number, width: number, height: number}> { // 拡大、平行移動が適用された新しい camera rect
const _cameraRect$ = xs.combine(canvasSize$, panoramaSize$, cameraRect$)
    .map(([cnv, pano, cam])=>{
      const camD$ = delta$
        .map(({deltaX, deltaY})=>{
          // canvas 座標系 -> camera 座標系
          const {x: _deltaX, y: _deltaY} = convertCnvCoord2CameraCoord(cnv, cam, {x: deltaX, y: deltaY});
          const {x, y, width, height} = cam;
          return {
            x: x + _deltaX,
            y: y + _deltaY,
            width,
            height
          };
        });
      const camZ$ = zoom$
        .map(({centerX, centerY, scale})=>{
          const {x: _cX, y: _cY} = convertCnvCoord2CameraCoord(cnv, cam, {x: centerX, y: centerY});
          const _cam = calcZoom(cam, {x: _cX, y: _cY, scale});
          return _cam;
        });
      return xs.merge(camD$, camZ$);
    }).compose(reconnect);
  return _cameraRect$;
}
