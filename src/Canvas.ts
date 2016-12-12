import {fetchImageFromURL} from "./Ajax";

// tmpcnvにコピー
export function fastcopy(cnv: HTMLCanvasElement|HTMLImageElement, tmpctx: CanvasRenderingContext2D): void {
  tmpctx.canvas.width = cnv.width;
  tmpctx.canvas.height = cnv.height;
  //tmpctx.globalCompositeOperation = "source-over";
  tmpctx.drawImage(<HTMLCanvasElement>cnv, 0, 0); // type hack
}

// ArrayBuffer -> HTMLImageElement
export function fetchImageFromArrayBuffer(buffer: ArrayBuffer, mimetype?:string): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([buffer], {type: "image/png"}));
  return fetchImageFromURL(url).then((img)=>{
    URL.revokeObjectURL(url);
    return img;
  });
}

// copy canvas as new object
// this copy technic is faster than getImageData full copy, but some pixels are bad copy.
// see also: http://stackoverflow.com/questions/4405336/how-to-copy-contents-of-one-canvas-to-another-canvas-locally
export function copy(cnv: HTMLCanvasElement|HTMLImageElement): HTMLCanvasElement {
  const _copy = document.createElement("canvas");
  const ctx = <CanvasRenderingContext2D>_copy.getContext("2d");
  _copy.width = cnv.width;
  _copy.height = cnv.height;
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(<HTMLCanvasElement>cnv, 0, 0); // type hack
  return _copy;
}


export function cnvToBlob(cnv: HTMLCanvasElement, mimeType: string, qualityArgument: number): Promise<Blob>{
  return new Promise((resolve, reject)=>{
    cnv.toBlob((blob)=>{
      if(blob instanceof Blob) resolve(blob);
      else                     reject(new Error("cannot get blob from canvas"));
    }, mimeType, qualityArgument);
  });
}


export function create_video_canvas(video: HTMLVideoElement, step: (cnv: HTMLCanvasElement)=> void): CanvasRenderingContext2D {
  const cnv = document.createElement("canvas");
  const _ctx = cnv.getContext("2d");
  if(_ctx == null) throw new Error("cannot get CanvasRenderingContext2D");
  const ctx = _ctx;
  const {videoWidth, videoHeight} = video;
  cnv.width = videoWidth;
  cnv.height = videoHeight;
  let paused = false;
  video.addEventListener("playing", (ev)=>{ paused = false; requestAnimationFrame(_draw); });
  video.addEventListener("pause", (ev)=>{ paused = true; });
  video.addEventListener("ended", (ev)=>{ paused = true; });
  // timeupdate の更新間隔はフレーム更新間隔ではないので描画には使えない
  // video.addEventListener("timeupdate", (ev)=>{});
  function _draw(){
    cnv.width = cnv.width;
    ctx.drawImage(video, 0, 0);
    step(ctx.canvas);
    if(!paused) requestAnimationFrame(_draw);
  }
  _draw(); // clipping draw loop start
  return ctx;
}

// 1x1の canvas を作るだけ
export function createCanvas(width=1, height=1): HTMLCanvasElement {
  const cnv = document.createElement("canvas");
  cnv.width = width;
  cnv.height = height;
  return cnv;
}



export function load_image(url: string): Promise<HTMLImageElement> {
  return fetchImageFromURL(url);
}

export function load_cnv(src: string){
  return load_image(src).then(copy);
}

