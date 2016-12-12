"use strict";
var THREE = require("three");
var Canvas_1 = require("./Canvas");
var Media_1 = require("./Media");
/*
魚眼->パノラマ
魚眼->全周
*/
var Fisheye2Panorama = (function () {
    function Fisheye2Panorama() {
        this.renderer = new THREE.WebGLRenderer();
        //this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.canvas = this.renderer.domElement;
        this.scene = new THREE.Scene();
        // 画角, アスペクト比、視程近距離、視程遠距離
        // アスペクト比はもらったvideoによって変化するのでこれは当面の値
        this.camera = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, 1, 10000);
        // これもとりあえずの値
        this.width = 1; // パノラマ画像の本来の大きさ
        this.height = 1;
        this.local = new THREE.Object3D();
        this.meshes = [];
        this.texis = [];
        this.local.rotation.x = Math.PI; // 北緯側の半球になるように回転
        this.local.rotation.y = Math.PI; // こっちむいてベイビー
        this.local.position.z = -100;
        this.camera.position.z = 100; // 相対距離200
        this.scene.add(this.camera);
        this.scene.add(this.local);
    }
    Fisheye2Panorama.prototype.getRendererFromVideo = function (video, o) {
        var _a = this, scene = _a.scene, camera = _a.camera, renderer = _a.renderer;
        var _b = load_fisheye_video_canvas_texture(video, o.margin), tex = _b.tex, texUpdater = _b.clip;
        this.texis.push(tex);
        var _c = createPanoramaMaterial(tex, o.width, o.R1, o.R2), mat = _c.mat, plane = _c.plane, width = _c.width, height = _c.height;
        //const {mat, plane, width, height} = createPanoramaMaterial2(tex); //
        this.width = width;
        this.height = height;
        // カメラサイズ初期値
        this.setCameraSize(width, height);
        var meshL = createPanoramaMesh(mat, plane);
        var meshR = createPanoramaMesh(mat, plane);
        meshL.position.x = width / 2;
        meshR.position.x = -width / 2;
        this.unload(); // 以前のパノラマを消す
        this.meshes.push(meshL);
        this.meshes.push(meshR);
        this.local.add(meshL);
        this.local.add(meshR);
        return function draw() {
            texUpdater();
            renderer.render(scene, camera);
            return renderer.domElement;
        };
    };
    Fisheye2Panorama.prototype.getPanoramaSize = function () {
        var _a = this, width = _a.width, height = _a.height;
        return { width: width, height: height };
    };
    Fisheye2Panorama.prototype.setCanvasSize = function (w, h) {
        // 現在のレンダラを現在のピクセルサイズに最適化する
        this.renderer.setSize(w, h);
    };
    Fisheye2Panorama.prototype.getCanvasSize = function () {
        return this.renderer.getSize();
    };
    Fisheye2Panorama.prototype.setCameraSize = function (w, h) {
        var camera = this.camera;
        // パノラマのサイズを超えないようにする
        // 1 < w < this.width
        if (w > this.width) {
            w = this.width;
        }
        else if (w < 1) {
            w = 1;
        }
        // 1 < h < this.height
        if (h > this.height) {
            h = this.height;
        }
        else if (h < 1) {
            h = 1;
        }
        camera.left = -w / 2;
        camera.right = w / 2;
        camera.top = h / 2;
        camera.bottom = -h / 2;
        camera.updateProjectionMatrix();
    };
    Fisheye2Panorama.prototype.getCameraSize = function () {
        var camera = this.camera;
        var width = -camera.left + camera.right;
        var height = camera.top - camera.bottom;
        return { width: width, height: height };
    };
    Fisheye2Panorama.prototype.setCameraPosition = function (x, y) {
        var cam = this.getCameraSize();
        var pano = this.getPanoramaSize();
        var camera = this.camera;
        // -pano.width/2 < x < pano.width/2 の範囲で mod して無限スクロール
        if (0 <= x) {
            x += pano.width / 2;
            x %= pano.width;
            x -= pano.width / 2;
        }
        else {
            x -= pano.width / 2;
            x %= pano.width;
            x += pano.width / 2;
        }
        // 上下は画角がはみ出ないように
        // -pano.height/2 + cam.height/2 < y < pano.height/2 - cam.height/2
        //console.log(-pano.height/2 + cam.height/2, y, pano.height/2 - cam.height/2)
        if (y < -pano.height / 2 + cam.height / 2) {
            y = -pano.height / 2 + cam.height / 2;
        }
        else if (pano.height / 2 - cam.height / 2 < y) {
            y = pano.height / 2 - cam.height / 2;
        }
        //console.log(y)
        this.camera.position.x = x;
        this.camera.position.y = y;
        camera.updateProjectionMatrix();
    };
    Fisheye2Panorama.prototype.getCameraPosition = function () {
        var camera = this.camera;
        var pano = this.getPanoramaSize();
        var _a = this.camera.position, x = _a.x, y = _a.y;
        return { x: x, y: y };
    };
    Fisheye2Panorama.prototype.setCameraRect = function (rect) {
        var width = rect.width, height = rect.height, x = rect.x, y = rect.y;
        this.setCameraSize(width, height);
        this.setCameraPosition(x, y);
    };
    Fisheye2Panorama.prototype.getCameraRect = function () {
        var _a = this.getCameraPosition(), x = _a.x, y = _a.y;
        var _b = this.getCameraSize(), width = _b.width, height = _b.height;
        return { width: width, height: height, x: x, y: y };
    };
    Fisheye2Panorama.prototype.unload = function () {
        var _this = this;
        this.meshes.forEach(function (mesh) {
            _this.local.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        this.texis.forEach(function (tex) {
            tex.dispose();
        });
        this.meshes = [];
        this.texis = [];
    };
    return Fisheye2Panorama;
}());
exports.Fisheye2Panorama = Fisheye2Panorama;
function convertCnvCoord2CameraCoord(cnv, cam, pos // canvas 左上座標系
    ) {
    // canvas 左上座標系から camera 左上座標系へ変換する
    return {
        x: pos.x * cam.width / cnv.width,
        y: pos.y * cam.height / cnv.height
    };
}
exports.convertCnvCoord2CameraCoord = convertCnvCoord2CameraCoord;
function convertCameraCoord2CnvCoord(cam, cnv, pos // camera 左上座標系
    ) {
    // camera 左上座標系から canvas 左上座標系へ変換する
    return {
        x: pos.x * cnv.width / cam.width,
        y: pos.y * cnv.height / cam.height
    };
}
exports.convertCameraCoord2CnvCoord = convertCameraCoord2CnvCoord;
function calcZoom(cam, zoom) {
    var camX = cam.x, camY = cam.y, camW = cam.width, camH = cam.height;
    var cx = zoom.x, cy = zoom.y, scale = zoom.scale;
    // world 座標系上でのカメラの左上座標
    var camL = camX - camW / 2;
    var camT = camY - camH / 2;
    // world 座標系上でのカメラの左上座標からのズームによる変化分
    var dx = cx - cx * 1 / scale;
    var dy = cy - cy * 1 / scale;
    // world 座標系上でのカメラの左上座標からのズームで変化した新しい左上座標
    var camL_ = camL + dx;
    var camT_ = camT + dy;
    // ズームで変化した新しいカメラの大きさ
    var camW_ = 1 / scale * camW;
    var camH_ = 1 / scale * camH;
    // world 座標系上での新しいカメラ中心座標
    var camX_ = camL_ + camW_ / 2;
    var camY_ = camT_ + camH_ / 2;
    // 新しい大きさを返す
    return { width: camW_, height: camH_, x: camX_, y: camY_ };
}
exports.calcZoom = calcZoom;
function load_video_texture(url) {
    return Media_1.load_video(url).then(function (video) {
        video.loop = true;
        video.play();
        return new THREE.VideoTexture(video);
    });
}
exports.load_video_texture = load_video_texture;
function load_skybox_texture(urls) {
    return new Promise(function (resolve, reject) {
        var loader = new THREE.CubeTextureLoader();
        loader.setPath(urls);
        loader.load([
            'px.jpg', 'nx.jpg',
            'py.jpg', 'ny.jpg',
            'pz.jpg', 'nz.jpg'
        ], resolve, function () { }, reject);
    });
}
exports.load_skybox_texture = load_skybox_texture;
exports.CLIPPING_OFFSET_X = -40;
exports.CLIPPING_OFFSET_Y = -82;
function calculate_clip_size(width, height, margin) {
    if (margin === void 0) { margin = 0; }
    margin = 0;
    var centerX = width / 2 + exports.CLIPPING_OFFSET_X;
    var centerY = height / 2 + exports.CLIPPING_OFFSET_Y;
    var clippedWidth = centerY * 2; // 
    var clippedHeight = centerY * 2;
    var left = centerX - clippedWidth / 2;
    var top = centerY - clippedHeight / 2;
    console.info("clipped size" + clippedWidth + "x" + clippedHeight + ", (" + left + "x" + top + ")");
    for (var i = 0; height > Math.pow(2, i); i++)
        ; // 2^n の大きさを得る
    var pow = Math.pow(2, i); // 解像度 // i+1 オーバーサンプリングして解像度をより高く
    var _a = [0, 0, pow, pow], dx = _a[0], dy = _a[1], dw = _a[2], dh = _a[3]; // 縮小先の大きさ
    var _b = [left - margin, top - margin, clippedWidth + margin * 2, clippedWidth + margin * 2], sx = _b[0], sy = _b[1], sw = _b[2], sh = _b[3];
    console.log("fisheye size: " + dw + "x" + dh);
    return { sx: sx, sy: sy, sw: sw, sh: sh, dx: dx, dy: dy, dw: dw, dh: dh };
}
exports.calculate_clip_size = calculate_clip_size;
function load_fisheye_image_canvas_texture(url, margin) {
    if (margin === void 0) { margin = 0; }
    return Canvas_1.load_image(url).then(function (img) {
        var cnv = document.createElement("canvas");
        var _ctx = cnv.getContext("2d");
        if (_ctx == null)
            throw new Error("cannot get CanvasRenderingContext2d");
        var ctx = _ctx;
        var width = img.width, height = img.height;
        var _a = calculate_clip_size(width, height, margin), sx = _a.sx, sy = _a.sy, sw = _a.sw, sh = _a.sh, dx = _a.dx, dy = _a.dy, dw = _a.dw, dh = _a.dh;
        var _b = [dw, dh], _dw = _b[0], _dh = _b[1];
        _c = [_dw, _dh], cnv.width = _c[0], cnv.height = _c[1];
        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, _dw, _dh);
        var tex = new THREE.Texture(cnv);
        tex.needsUpdate = true;
        return tex;
        var _c;
    });
}
exports.load_fisheye_image_canvas_texture = load_fisheye_image_canvas_texture;
function load_fisheye_video_canvas_texture(video, margin) {
    if (margin === void 0) { margin = 0; }
    var cnv = document.createElement("canvas");
    var _ctx = cnv.getContext("2d");
    if (_ctx == null)
        throw new Error("cannot get CanvasRenderingContext2d");
    var ctx = _ctx;
    console.info("source video size" + video.videoWidth + "x" + video.videoHeight);
    var videoWidth = video.videoWidth, videoHeight = video.videoHeight;
    var _a = calculate_clip_size(videoWidth, videoHeight, margin), sx = _a.sx, sy = _a.sy, sw = _a.sw, sh = _a.sh, dx = _a.dx, dy = _a.dy, dw = _a.dw, dh = _a.dh;
    _b = [dw, dh], cnv.width = _b[0], cnv.height = _b[1];
    var tex = new THREE.Texture(cnv);
    function clip() {
        cnv.width = cnv.width;
        ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
        tex.needsUpdate = true;
    }
    //document.body.appendChild(video); // for debug
    //document.body.appendChild(cnv); // for debug
    return { tex: tex, clip: clip };
    var _b;
}
exports.load_fisheye_video_canvas_texture = load_fisheye_video_canvas_texture;
function createSkyboxMesh(skybox_texture) {
    var cubeShader = THREE.ShaderLib['cube'];
    cubeShader.uniforms['tCube'].value = skybox_texture;
    var skyBoxMaterial = new THREE.ShaderMaterial({
        fragmentShader: cubeShader.fragmentShader,
        vertexShader: cubeShader.vertexShader,
        uniforms: cubeShader.uniforms,
        depthWrite: false,
        side: THREE.BackSide
    });
    // BoxGeometry(width, height, depth, widthSegments, heightSegments, depthSegments)
    var skybox = new THREE.Mesh(new THREE.BoxGeometry(3000, 3000, 3000, 1, 1, 1), skyBoxMaterial);
    return skybox;
}
exports.createSkyboxMesh = createSkyboxMesh;
function calcuratePanoramaSizeFromFisheyeImage(R, r1, r2) {
    if (r1 === void 0) { r1 = 0; }
    if (r2 === void 0) { r2 = 1; }
    // R: テクスチャとする fisheye 画像 の 中心座標からの半径
    // r1, r2: 0 =< r1 < r2 =< 1 fisheye から ドーナッツ状に切り取る領域を決める半径二つ
    var _a = [R * r1, R * r2], R1 = _a[0], R2 = _a[1];
    var _b = [(R2 * 2 * Math.PI + R1 * 2 * Math.PI) / 2, R2 - R1], width = _b[0], height = _b[1]; // ドーナッツ状に切り取った領域を矩形に変換した大きさ
    //const h_per_w_ratio = height/width; // アスペクト比
    return { height: height, width: width };
}
exports.calcuratePanoramaSizeFromFisheyeImage = calcuratePanoramaSizeFromFisheyeImage;
function planeRect2Fisheye(u, v, width, height, r1, r2) {
    if (width === void 0) { width = 1; }
    if (height === void 0) { height = 1; }
    if (r1 === void 0) { r1 = 0; }
    if (r2 === void 0) { r2 = 1; }
    // width, height は UV 矩形の大きさ、通常 1x1
    // uv 矩形直交平面座標を fisheye 画像へドーナツ状に埋め込み fisheye 画像の xy 平面座標を返す
    // fisheye 画像座標の原点は画像中心
    // uv 矩形直交座標の原点は矩形左上
    // ドーナツの切れ目は 右手座標系の y=0 な直線上つまり x 軸上に存在する
    var R = 1 / 2; // 中心座標からの半径
    var _a = [R * r1, R * r2], R1 = _a[0], R2 = _a[1]; // UV からドーナッツ状に切り取る領域を決める半径二つ
    var r = (v / height) * (R2 - R1) + R1;
    var theta = (u / width) * 2 * Math.PI;
    var x = r * Math.sin(theta);
    var y = r * Math.cos(theta);
    return { x: x, y: y };
}
exports.planeRect2Fisheye = planeRect2Fisheye;
function fisheye2Hemisphere(x, y, r) {
    // fisheye 画像座標上の点を 半径 r の半球上へと写す
    // -r < x < r, -r < y < r 
    // 半径 r はfisheye画像を表す UV 矩形の半径つまり 1/2
    // 点 x,y における z 方向の高さを半球との交点として求める
    var z2 = Math.pow(r, 2)
        - Math.pow(x, 2)
        - Math.pow(y, 2);
    var z = z2 >= 0 ? Math.sqrt(z2) : 0; // 誤差対策
    //if(z2 < 0) console.error(z, r, x, y, "|", z2);
    return { x: x, y: y, z: z };
}
exports.fisheye2Hemisphere = fisheye2Hemisphere;
//console.log(fisheye2Hemisphere(0,0,10).z === 10, "fisheye2Hemisphere");
function hemisphere2PolarHemisphere(x, y, z) {
    // xy fisheye 直交座標系 + 高さ z で表された 半径 r の半球上の座標を lθ+z 半球極座標系へ変換する
    var l = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
    var theta = Math.atan2(y, x);
    return { l: l, theta: theta, z: z };
}
exports.hemisphere2PolarHemisphere = hemisphere2PolarHemisphere;
var TEST = hemisphere2PolarHemisphere(1, 1, 10);
//console.log(Math.round(TEST.l * 10) === 14, "hemisphere2PolarHemisphere");
//console.log(Math.round(TEST.l*Math.cos(TEST.theta)|0) === 1, "hemisphere2PolarHemisphere");
function theSystemTransform(l, theta, z, r, alpha, beta) {
    // lθ+z 半球極座標系を反時計回りに方位 alpha rad, 仰角 beta rad 動かして得られる m alpha_ 極座標平面 に対して
    // lθ+z 半球極座標系の点から m alpha_ 極座標平面への垂線を引いた時の交点を m alpha_ 極座標系 で表現する
    var alpha_ = Math.atan(Math.cos(beta) * Math.tan(theta - alpha));
    var beta_ = Math.atan(Math.tan(beta) * Math.sin(theta - alpha));
    var phi = Math.atan2(z, l);
    var psi = phi - beta_;
    var m = r * Math.cos(psi);
    return { m: m, alpha_: alpha_ };
}
exports.theSystemTransform = theSystemTransform;
function polar2Orthogonal(l, theta) {
    // 極座標から直交座標へ変換
    var x = l * Math.cos(theta);
    var y = l * Math.sin(theta);
    return { x: x, y: y };
}
exports.polar2Orthogonal = polar2Orthogonal;
function createPanoramaMaterial2(fisheye_texture) {
    var MESH_N = 16;
    // fisheye_texture は正方形と仮定
    var img = fisheye_texture.image;
    var R = img.width / 2;
    var R1_ratio = 0;
    var R2_ratio = 1;
    var r1 = 0;
    var r2 = 1;
    var pano = calcuratePanoramaSizeFromFisheyeImage(R, r1, r2);
    /*(()=>{
      // fisheye -> panorama のパノラマのw/hアスペクト比を計算
      const {width, height} = fisheye_texture.image;
      const [Hs, Ws] = [width, height]; // fisheye 画像短径
      const [Cx, Cy] = [Ws/2, Hs/2]; // fisheye 中心座標
      const R = Hs/2; // 中心座標からの半径
      const [R1, R2] = [R*R1_ratio, R*R2_ratio]; // fisheye から ドーナッツ状に切り取る領域を決める半径二つ
      const [Wd, Hd] = [(R2 + R1)*Math.PI, R2 - R1] // ドーナッツ状に切り取った領域を矩形に変換した大きさ
      console.log(pano)
      console.log({height:Hd, width:Wd});
    })();*/
    pano.width = pano.width / 2;
    var h_per_w = pano.height / pano.width; // アスペクト比
    console.log("createPanoramaMesh-2", "MESH_N:", MESH_N, "width:", pano.width, "height:", pano.height, "r1:", r1, "r2:", r2);
    var plane = new THREE.PlaneGeometry(pano.width, pano.height, MESH_N, MESH_N);
    var vertices = plane.vertices, faces = plane.faces, faceVertexUvs = plane.faceVertexUvs;
    faceVertexUvs[0] = faceVertexUvs[0].map(function (pt2Dx3) {
        // pt2D が 3 つで ひとつのポリゴン
        return pt2Dx3.map(function (_a) {
            var x = _a.x, y = _a.y;
            var fish = planeRect2Fisheye(x, y); // uv 矩形の大きさは {width: 1, height: 1} に正規化されている ok.
            //
            var hemi = fisheye2Hemisphere(x - 1 / 2, y - 1 / 2, 1 / 2); // r は uv 矩形の半径 ok.
            var pol1 = hemisphere2PolarHemisphere(hemi.x, hemi.y, hemi.z); // 
            var pol2 = theSystemTransform(pol1.l, pol1.theta, pol1.z, 1 / 2, 0, 0);
            var dest = polar2Orthogonal(pol2.m, pol2.alpha_);
            // 原点を左上へ移動 
            dest.x += 1 / 2;
            dest.y += 1 / 2;
            return new THREE.Vector2(dest.x, dest.y);
        });
    });
    var mat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, map: fisheye_texture });
    return { mat: mat, plane: plane, width: pano.width, height: pano.height };
}
exports.createPanoramaMaterial2 = createPanoramaMaterial2;
function createPanoramaMaterial(fisheye_texture, panorama_width, _R1_ratio, _R2_ratio) {
    if (panorama_width === void 0) { panorama_width = 0; }
    if (_R1_ratio === void 0) { _R1_ratio = 0.25; }
    if (_R2_ratio === void 0) { _R2_ratio = 0.9; }
    var MESH_N = 64;
    //const panorama_width = 400; パノラマ板ポリの空間上の横幅、デフォルトはR2の円周の長さ
    //const R1_ratio = 0; // 扇型の下弦 0~1
    //const R2_ratio = 1; // 扇型の上弦 0~1 下弦 < 上弦
    var R2_ratio = 1 - _R1_ratio; // 下向きY座標を上向きY座標へ変換
    var R1_ratio = 1 - _R2_ratio;
    // 正方形テクスチャを仮定
    var _a = (function () {
        // fisheye -> panorama のパノラマのw/hアスペクト比を計算
        var _a = fisheye_texture.image, width = _a.width, height = _a.height;
        var _b = [width, height], Hs = _b[0], Ws = _b[1]; // fisheye 画像短径
        var _c = [Ws / 2, Hs / 2], Cx = _c[0], Cy = _c[1]; // fisheye 中心座標
        var R = Hs / 2; // 中心座標からの半径
        var _d = [R * R1_ratio, R * R2_ratio], R1 = _d[0], R2 = _d[1]; // fisheye から ドーナッツ状に切り取る領域を決める半径二つ
        var _e = [(R2 + R1) * Math.PI, R2 - R1], Wd = _e[0], Hd = _e[1]; // ドーナッツ状に切り取った領域を矩形に変換した大きさ
        return { height: Hd, width: Wd };
    })(), width = _a.width, height = _a.height;
    var h_per_w_ratio = height / width; // アスペクト比
    // panorama_width の デフォルト値設定
    if (panorama_width <= 0) {
        panorama_width = width;
    }
    var panorama_height = panorama_width * h_per_w_ratio;
    console.log("createPanoramaMesh", "MESH_N:", MESH_N, "width:", panorama_width, "height:", panorama_height, "R1:", R1_ratio, "R2:", R2_ratio);
    var plane = new THREE.PlaneGeometry(panorama_width, panorama_height, MESH_N, MESH_N);
    var vertices = plane.vertices, faces = plane.faces, faceVertexUvs = plane.faceVertexUvs;
    // UVを扇型に変換
    var _b = [1, 1], Hs = _b[0], Ws = _b[1]; // UV のサイズ
    var _c = [Ws / 2, Hs / 2], Cx = _c[0], Cy = _c[1]; // UV の中心座標
    var R = Hs / 2; // 中心座標からの半径
    var _d = [R * R1_ratio, R * R2_ratio], R1 = _d[0], R2 = _d[1]; // UV からドーナッツ状に切り取る領域を決める半径二つ
    var _e = [1, 1], Wd = _e[0], Hd = _e[1]; // ドーナッツ状に切り取った領域を矩形に変換した大きさ
    faceVertexUvs[0] = faceVertexUvs[0].map(function (pt2Dx3) {
        return pt2Dx3.map(function (_a) {
            var x = _a.x, y = _a.y;
            var _b = [x, y], xD = _b[0], yD = _b[1];
            var r = (yD / Hd) * (R2 - R1) + R1;
            var theta = (xD / Wd) * 2.0 * Math.PI;
            var xS = Cx + r * Math.sin(theta);
            var yS = Cy + r * Math.cos(theta);
            return new THREE.Vector2(xS, yS);
        });
    });
    var mat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, map: fisheye_texture });
    return { mat: mat, plane: plane, width: panorama_width, height: panorama_height };
}
exports.createPanoramaMaterial = createPanoramaMaterial;
function createPanoramaMesh(mat, plane) {
    var mesh = new THREE.Mesh(plane, mat);
    return mesh;
}
exports.createPanoramaMesh = createPanoramaMesh;
function createFisheyeMesh(fisheye_texture) {
    var MESH_N = 64;
    // SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength)
    var sphere = new THREE.SphereGeometry(1000, MESH_N, MESH_N, 0, Math.PI);
    var vertices = sphere.vertices, faces = sphere.faces, faceVertexUvs = sphere.faceVertexUvs;
    var radius = sphere.boundingSphere.radius;
    // 半球の正射影をとる
    faces.forEach(function (face, i) {
        var a = face.a, b = face.b, c = face.c;
        faceVertexUvs[0][i] = [a, b, c].map(function (id) {
            var _a = vertices[id], x = _a.x, y = _a.y;
            return new THREE.Vector2((x + radius) / (2 * radius), (y + radius) / (2 * radius));
        });
    });
    var mat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, map: fisheye_texture, side: THREE.BackSide });
    var mesh = new THREE.Mesh(sphere, mat);
    mesh.rotation.x = Math.PI * 3 / 2; // 北緯側の半球になるように回転
    return mesh;
}
exports.createFisheyeMesh = createFisheyeMesh;
