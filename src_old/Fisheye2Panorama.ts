
import * as THREE from "three";
import {load_image} from "./Canvas";
import {load_video} from "./Media";

/*
魚眼->パノラマ
魚眼->全周
*/


export class Fisheye2Panorama{
  renderer: THREE.WebGLRenderer;
  canvas: HTMLCanvasElement;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  meshes: THREE.Mesh[];
  texis: THREE.Texture[];
  width: number;
  height: number;
  local: THREE.Object3D;

  constructor(){

    this.renderer = new THREE.WebGLRenderer();
    //this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.canvas = this.renderer.domElement;
    this.scene = new THREE.Scene();
    // 画角, アスペクト比、視程近距離、視程遠距離
    // アスペクト比はもらったvideoによって変化するのでこれは当面の値
    this.camera = new THREE.OrthographicCamera(window.innerWidth/-2, window.innerWidth/2, window.innerHeight/2, window.innerHeight/-2, 1, 10000);
    // これもとりあえずの値
    this.width  = 1; // パノラマ画像の本来の大きさ
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

  getRendererFromVideo(video: HTMLVideoElement, o: {margin?: number, width?: number, R1?: number, R2?: number}): ()=> HTMLCanvasElement {
    const {scene, camera, renderer} = this;

    const {tex, clip: texUpdater} = load_fisheye_video_canvas_texture(video, o.margin);
    this.texis.push(tex);

    const {mat, plane, width, height} = createPanoramaMaterial(tex, o.width, o.R1, o.R2);
    //const {mat, plane, width, height} = createPanoramaMaterial2(tex); //
    this.width  = width;
    this.height = height;

    // カメラサイズ初期値
    this.setCameraSize(width, height);
    
    const meshL = createPanoramaMesh(mat, plane);
    const meshR = createPanoramaMesh(mat, plane);

    meshL.position.x =  width/2;
    meshR.position.x = -width/2;

    this.unload(); // 以前のパノラマを消す

    this.meshes.push(meshL);
    this.meshes.push(meshR);

    this.local.add(meshL);
    this.local.add(meshR);
    

    return function draw(){
      texUpdater();
      renderer.render(scene, camera);
      return renderer.domElement;
    }
  }
  getPanoramaSize(): {width: number, height: number} {
    const {width, height} = this;
    return {width, height};
  }

  setCanvasSize(w: number, h: number): void {
    // 現在のレンダラを現在のピクセルサイズに最適化する
    this.renderer.setSize(w, h);
  }
  getCanvasSize(): {width: number, height: number} {
    return this.renderer.getSize();
  }

  setCameraSize(w: number, h: number): void {
    const {camera} = this;
    // パノラマのサイズを超えないようにする
    // 1 < w < this.width
    if(w > this.width){
      w = this.width;
    }else if(w < 1){
      w = 1;
    }
    // 1 < h < this.height
    if(h > this.height){
      h = this.height;
    }else if(h < 1){
      h = 1;
    }
    camera.left   = -w/2;
    camera.right  =  w/2;
    camera.top    =  h/2;
    camera.bottom = -h/2;
    camera.updateProjectionMatrix();
  }
  getCameraSize(): {width: number, height: number} {
    const {camera} = this;
    const width  = -camera.left + camera.right;
    const height =  camera.top  - camera.bottom;
    return {width, height};
  }

  setCameraPosition(x: number, y: number): void { // world 座標(右下座標系)上での cameraの位置(カメラ中心基準) 
    const cam  = this.getCameraSize();
    const pano  = this.getPanoramaSize();
    const {camera} = this;
     // -pano.width/2 < x < pano.width/2 の範囲で mod して無限スクロール
    if(0 <= x){
      x += pano.width/2;
      x %= pano.width;
      x -= pano.width/2;
    }else{
      x -= pano.width/2;
      x %= pano.width;
      x += pano.width/2;
    }

    // 上下は画角がはみ出ないように
    // -pano.height/2 + cam.height/2 < y < pano.height/2 - cam.height/2
    //console.log(-pano.height/2 + cam.height/2, y, pano.height/2 - cam.height/2)
    if(y < -pano.height/2 + cam.height/2){
      y = -pano.height/2 + cam.height/2;
    }else if(pano.height/2 - cam.height/2 < y){
      y = pano.height/2 - cam.height/2;
    }
    //console.log(y)

    this.camera.position.x = x;
    this.camera.position.y = y;
  
    camera.updateProjectionMatrix();
  }
  getCameraPosition(): {x: number, y: number} {
    const {camera} = this;
    const pano  = this.getPanoramaSize();

    const {x, y} = this.camera.position;
    return {x, y};
  }

  setCameraRect(rect: {x: number, y: number, width: number, height: number}): void {
    const {width, height, x, y} = rect;
    this.setCameraSize(width, height);
    this.setCameraPosition(x, y);
  }
  getCameraRect(): {x: number, y: number, width: number, height: number} {
    const {x, y} = this.getCameraPosition();
    const {width, height} = this.getCameraSize();
    return {width, height, x, y};
  }

  unload(): void {
    this.meshes.forEach((mesh)=>{
      this.local.remove( mesh );
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.texis.forEach((tex)=>{
      tex.dispose();
    });
    this.meshes = [];
    this.texis = [];
  }
}




export function convertCnvCoord2CameraCoord(
  cnv: {width: number, height: number},
  cam: {width: number, height: number}, 
  pos: {x: number, y: number} // canvas 左上座標系
): {x: number, y: number} {
  // canvas 左上座標系から camera 左上座標系へ変換する
  return {
    x: pos.x * cam.width /cnv.width,
    y: pos.y * cam.height/cnv.height
  };
}


export function convertCameraCoord2CnvCoord(
  cam: {width: number, height: number}, 
  cnv: {width: number, height: number},
  pos: {x: number, y: number} // camera 左上座標系
): {x: number, y: number} {
  // camera 左上座標系から canvas 左上座標系へ変換する
  return {
    x: pos.x * cnv.width /cam.width,
    y: pos.y * cnv.height/cam.height
  };
}

export function calcZoom(
    cam: {
      x: number, y: number, // world 座標系上でのカメラの中心座標
      width: number, height: number // カメラの大きさ
    },
    zoom: {
      x: number, y: number, // カメラ左上座標系上での拡大中心の座標
      scale: number // ズーム係数
    }
): {x: number, y: number, width: number, height: number} {
  const {x: camX, y: camY, width: camW, height: camH} = cam;
  const {x:cx, y:cy, scale} = zoom;
  // world 座標系上でのカメラの左上座標
  const camL = camX - camW/2;
  const camT = camY - camH/2;
  // world 座標系上でのカメラの左上座標からのズームによる変化分
  const dx = cx - cx * 1/scale;
  const dy = cy - cy * 1/scale;
  // world 座標系上でのカメラの左上座標からのズームで変化した新しい左上座標
  const camL_ = camL + dx;
  const camT_ = camT + dy;
  // ズームで変化した新しいカメラの大きさ
  const camW_ = 1/scale * camW;
  const camH_ = 1/scale * camH;
  // world 座標系上での新しいカメラ中心座標
  const camX_ = camL_ + camW_/2;
  const camY_ = camT_ + camH_/2;
  // 新しい大きさを返す
  return {width: camW_, height: camH_, x: camX_, y: camY_};
}

export function load_video_texture(url: string): Promise<THREE.Texture> {
  return load_video(url).then((video: HTMLVideoElement)=>{
    video.loop = true;
    video.play();
    return new THREE.VideoTexture( video );
  });
}

export function load_skybox_texture(urls: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject)=>{
    const loader = new THREE.CubeTextureLoader();
    loader.setPath(urls);
    loader.load( [
      'px.jpg', 'nx.jpg',
      'py.jpg', 'ny.jpg',
      'pz.jpg', 'nz.jpg'
    ], resolve, () => {}, reject );
  });
}

export let CLIPPING_OFFSET_X = -40;
export let CLIPPING_OFFSET_Y = -82;

export function calculate_clip_size(width: number, height: number, margin=0) {
  margin = 0
  const centerX = width /2 + CLIPPING_OFFSET_X;
  const centerY = height/2 + CLIPPING_OFFSET_Y;
  const clippedWidth  = centerY*2; // 
  const clippedHeight = centerY*2; 
  const left = centerX - clippedWidth /2;
  const top  = centerY - clippedHeight/2;
  console.info(`clipped size${clippedWidth}x${clippedHeight}, (${left}x${top})`);
  for(var i=0; height > Math.pow(2, i); i++); // 2^n の大きさを得る
  let pow = Math.pow(2, i); // 解像度 // i+1 オーバーサンプリングして解像度をより高く
  const [dx, dy, dw, dh] = [0, 0, pow, pow]; // 縮小先の大きさ
  const [sx, sy, sw, sh] = [left-margin, top-margin, clippedWidth+margin*2, clippedWidth+margin*2];
  console.log(`fisheye size: ${dw}x${dh}`);
  return {sx, sy, sw, sh, dx, dy, dw, dh};
}

export function load_fisheye_image_canvas_texture(url: string, margin=0): Promise<THREE.Texture> {
  return load_image(url).then((img)=>{
    const cnv = document.createElement("canvas");
    const _ctx = cnv.getContext("2d");
    if(_ctx == null) throw new Error("cannot get CanvasRenderingContext2d"); 
    const ctx = _ctx;
    const {width, height} = img;
    const {sx, sy, sw, sh, dx, dy, dw, dh} = calculate_clip_size(width, height, margin);
    const [_dw, _dh] = [dw, dh];
    [cnv.width, cnv.height] = [_dw, _dh];
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, _dw, _dh);
    const tex = new THREE.Texture(cnv);
    tex.needsUpdate = true;
    return tex;
  });
}

export function load_fisheye_video_canvas_texture(video: HTMLVideoElement, margin=0): {clip: ()=>void, tex: THREE.Texture} {
  const cnv = document.createElement("canvas");
  const _ctx = cnv.getContext("2d");
  if(_ctx == null) throw new Error("cannot get CanvasRenderingContext2d");
  const ctx = _ctx;
  console.info(`source video size${video.videoWidth}x${video.videoHeight}`);
  const {videoWidth, videoHeight} = video;
  const {sx, sy, sw, sh, dx, dy, dw, dh} = calculate_clip_size(videoWidth, videoHeight, margin);
  [cnv.width, cnv.height] = [dw, dh];
  const tex = new THREE.Texture(cnv);
  function clip(){
    cnv.width = cnv.width;
    ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
    tex.needsUpdate = true;
  }
  //document.body.appendChild(video); // for debug
  //document.body.appendChild(cnv); // for debug
  return {tex, clip};
}

export function createSkyboxMesh(skybox_texture: THREE.Texture): THREE.Mesh {
  const cubeShader = THREE.ShaderLib[ 'cube' ];
  cubeShader.uniforms[ 'tCube' ].value = skybox_texture;
  const skyBoxMaterial = new THREE.ShaderMaterial({
    fragmentShader: cubeShader.fragmentShader,
    vertexShader: cubeShader.vertexShader,
    uniforms: cubeShader.uniforms,
    depthWrite: false,
    side: THREE.BackSide
  });
  // BoxGeometry(width, height, depth, widthSegments, heightSegments, depthSegments)
  const skybox = new THREE.Mesh( new THREE.BoxGeometry( 3000, 3000, 3000, 1, 1, 1 ), skyBoxMaterial);
  return skybox;
}

export type Radian = number; 

export function calcuratePanoramaSizeFromFisheyeImage(R: number, r1=0, r2=1): { width: number, height: number} {
  // R: テクスチャとする fisheye 画像 の 中心座標からの半径
  // r1, r2: 0 =< r1 < r2 =< 1 fisheye から ドーナッツ状に切り取る領域を決める半径二つ
  const [R1, R2] = [R*r1, R*r2];
  const [width, height] = [(R2 * 2 * Math.PI + R1 * 2 * Math.PI) / 2, R2 - R1] // ドーナッツ状に切り取った領域を矩形に変換した大きさ
  //const h_per_w_ratio = height/width; // アスペクト比
  return {height, width};
}

export function planeRect2Fisheye(u: number, v: number, width=1, height=1, r1=0, r2=1): {x: number, y: number} {
  // width, height は UV 矩形の大きさ、通常 1x1
  // uv 矩形直交平面座標を fisheye 画像へドーナツ状に埋め込み fisheye 画像の xy 平面座標を返す
  // fisheye 画像座標の原点は画像中心
  // uv 矩形直交座標の原点は矩形左上
  // ドーナツの切れ目は 右手座標系の y=0 な直線上つまり x 軸上に存在する
  const R = 1/2; // 中心座標からの半径
  const [R1, R2] = [R*r1, R*r2]; // UV からドーナッツ状に切り取る領域を決める半径二つ
  const r = (v / height) * (R2-R1) + R1;
  const theta = (u / width) * 2 * Math.PI;
  const x = r * Math.sin(theta);
  const y = r * Math.cos(theta);
  return {x, y};
}

export function fisheye2Hemisphere(x: number, y: number, r: number): {x: number, y: number, z: number} {
  // fisheye 画像座標上の点を 半径 r の半球上へと写す
  // -r < x < r, -r < y < r 
  // 半径 r はfisheye画像を表す UV 矩形の半径つまり 1/2
  // 点 x,y における z 方向の高さを半球との交点として求める
  const z2 = Math.pow(r, 2)
           - Math.pow(x, 2)
           - Math.pow(y, 2);
  const z = z2 >= 0 ? Math.sqrt(z2) : 0; // 誤差対策
  //if(z2 < 0) console.error(z, r, x, y, "|", z2);
  return {x, y, z};
}
//console.log(fisheye2Hemisphere(0,0,10).z === 10, "fisheye2Hemisphere");

export function hemisphere2PolarHemisphere(x: number, y: number, z: number): {l: number, theta: Radian, z: number} {
  // xy fisheye 直交座標系 + 高さ z で表された 半径 r の半球上の座標を lθ+z 半球極座標系へ変換する
  const l = Math.sqrt( Math.pow(x, 2) + Math.pow(y, 2) );
  const theta = Math.atan2(y, x);
  return {l, theta, z};
}
let TEST = hemisphere2PolarHemisphere(1,1,10);
//console.log(Math.round(TEST.l * 10) === 14, "hemisphere2PolarHemisphere");
//console.log(Math.round(TEST.l*Math.cos(TEST.theta)|0) === 1, "hemisphere2PolarHemisphere");


export function theSystemTransform(l: number, theta: Radian, z: number, r: number, alpha: Radian, beta: Radian): {m: number, alpha_: Radian} {
  // lθ+z 半球極座標系を反時計回りに方位 alpha rad, 仰角 beta rad 動かして得られる m alpha_ 極座標平面 に対して
  // lθ+z 半球極座標系の点から m alpha_ 極座標平面への垂線を引いた時の交点を m alpha_ 極座標系 で表現する
  const alpha_ = Math.atan(Math.cos(beta) * Math.tan(theta - alpha));
  const beta_  = Math.atan(Math.tan(beta) * Math.sin(theta - alpha));
  const phi = Math.atan2(z, l);
  const psi = phi - beta_;
  const m = r * Math.cos(psi);
  return {m, alpha_};
}

export function polar2Orthogonal(l: number, theta: Radian): {x: number, y: number} {
  // 極座標から直交座標へ変換
  const x = l * Math.cos(theta);
  const y = l * Math.sin(theta);
  return {x, y};
}

export function createPanoramaMaterial2(fisheye_texture: THREE.Texture): {mat: THREE.Material, plane: THREE.Geometry, width: number, height: number} {
  const MESH_N = 16;
  // fisheye_texture は正方形と仮定
  const img = fisheye_texture.image;
  const R = img.width/2;
  const R1_ratio = 0;
  const R2_ratio = 1;
  const r1 = 0;
  const r2 = 1;
  const pano = calcuratePanoramaSizeFromFisheyeImage(R, r1, r2);
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
  pano.width = pano.width/2
  const h_per_w = pano.height/pano.width; // アスペクト比
  console.log("createPanoramaMesh-2",
    "MESH_N:", MESH_N,
    "width:", pano.width, "height:", pano.height,
    "r1:", r1, "r2:", r2);
  const plane = new THREE.PlaneGeometry(pano.width, pano.height, MESH_N, MESH_N);
  const {vertices, faces, faceVertexUvs} = plane;
  faceVertexUvs[0] = faceVertexUvs[0].map((pt2Dx3)=>{
    // pt2D が 3 つで ひとつのポリゴン
    return pt2Dx3.map(({x, y})=>{
      const fish = planeRect2Fisheye(x, y); // uv 矩形の大きさは {width: 1, height: 1} に正規化されている ok.
      //
      const hemi = fisheye2Hemisphere(x-1/2, y-1/2, 1/2); // r は uv 矩形の半径 ok.
      const pol1 = hemisphere2PolarHemisphere(hemi.x, hemi.y, hemi.z); // 
      const pol2 = theSystemTransform(pol1.l, pol1.theta, pol1.z, 1/2, 0, 0);
      const dest = polar2Orthogonal(pol2.m, pol2.alpha_);
      // 原点を左上へ移動 
      dest.x += 1/2;
      dest.y += 1/2;
      return new THREE.Vector2(dest.x, dest.y);
    });
  });
  const mat = new THREE.MeshBasicMaterial( { color: 0xFFFFFF, map: fisheye_texture } );
  return {mat, plane, width: pano.width, height: pano.height};
}

export function createPanoramaMaterial(fisheye_texture: THREE.Texture, panorama_width=0, _R1_ratio=0.25, _R2_ratio=0.9): {mat: THREE.Material, plane: THREE.Geometry, width: number, height: number} {
  const MESH_N = 64;
  //const panorama_width = 400; パノラマ板ポリの空間上の横幅、デフォルトはR2の円周の長さ
  //const R1_ratio = 0; // 扇型の下弦 0~1
  //const R2_ratio = 1; // 扇型の上弦 0~1 下弦 < 上弦
  const R2_ratio = 1 - _R1_ratio; // 下向きY座標を上向きY座標へ変換
  const R1_ratio = 1 - _R2_ratio;
  // 正方形テクスチャを仮定
  const {width, height} = (()=>{
    // fisheye -> panorama のパノラマのw/hアスペクト比を計算
    const {width, height} = fisheye_texture.image;
    const [Hs, Ws] = [width, height]; // fisheye 画像短径
    const [Cx, Cy] = [Ws/2, Hs/2]; // fisheye 中心座標
    const R = Hs/2; // 中心座標からの半径
    const [R1, R2] = [R*R1_ratio, R*R2_ratio]; // fisheye から ドーナッツ状に切り取る領域を決める半径二つ
    const [Wd, Hd] = [(R2 + R1)*Math.PI, R2 - R1] // ドーナッツ状に切り取った領域を矩形に変換した大きさ
    return {height:Hd, width:Wd};
  })();
  const h_per_w_ratio = height/width; // アスペクト比
  // panorama_width の デフォルト値設定
  if(panorama_width <= 0){
    panorama_width = width;
  }
  const panorama_height = panorama_width*h_per_w_ratio;
  console.log("createPanoramaMesh",
    "MESH_N:", MESH_N,
    "width:", panorama_width, "height:", panorama_height,
    "R1:", R1_ratio, "R2:", R2_ratio);
  const plane = new THREE.PlaneGeometry(panorama_width, panorama_height, MESH_N, MESH_N);
  const {vertices, faces, faceVertexUvs} = plane;
  // UVを扇型に変換
  const [Hs, Ws] = [1, 1]; // UV のサイズ
  const [Cx, Cy] = [Ws/2, Hs/2]; // UV の中心座標
  const R = Hs/2; // 中心座標からの半径
  const [R1, R2] = [R*R1_ratio, R*R2_ratio]; // UV からドーナッツ状に切り取る領域を決める半径二つ
  const [Wd, Hd] = [1, 1] // ドーナッツ状に切り取った領域を矩形に変換した大きさ
  faceVertexUvs[0] = faceVertexUvs[0].map((pt2Dx3)=>{
    return pt2Dx3.map(({x, y})=>{
      const [xD, yD] = [x, y];
      const r = (yD/Hd)*(R2-R1) + R1;
      const theta = (xD/Wd)*2.0*Math.PI;
      const xS = Cx + r*Math.sin(theta);
      const yS = Cy + r*Math.cos(theta);
      return new THREE.Vector2(xS, yS);
    });
  });
  const mat = new THREE.MeshBasicMaterial( { color: 0xFFFFFF, map: fisheye_texture } );
  return {mat, plane, width: panorama_width, height: panorama_height};
}

export function createPanoramaMesh(mat: THREE.Material, plane: THREE.Geometry): THREE.Mesh {
  const mesh = new THREE.Mesh(plane, mat);
  return mesh;
}

export function createFisheyeMesh(fisheye_texture: THREE.Texture): THREE.Mesh { // 正方形テクスチャを仮定
  const MESH_N = 64;
  // SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength)
  const sphere = new THREE.SphereGeometry(1000, MESH_N, MESH_N, 0, Math.PI);
  const {vertices, faces, faceVertexUvs} = sphere;
  const radius = sphere.boundingSphere.radius;
  // 半球の正射影をとる
  faces.forEach((face, i)=>{
    const {a, b, c} = face;
    faceVertexUvs[0][i] = [a, b, c].map((id)=>{
      const {x, y} = vertices[id];
      return new THREE.Vector2(
        (x+radius)/(2*radius),
        (y+radius)/(2*radius));
    });
  });
  const mat = new THREE.MeshBasicMaterial( { color: 0xFFFFFF, map: fisheye_texture, side: THREE.BackSide } );
  const mesh = new THREE.Mesh(sphere, mat);
  mesh.rotation.x = Math.PI*3/2; // 北緯側の半球になるように回転
  return mesh;
}
