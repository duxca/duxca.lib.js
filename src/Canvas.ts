
/**
 *  copy canvas as new object
 * this copy technic is faster than getImageData full copy, but some pixels are bad copy.
 * see also: http://stackoverflow.com/questions/4405336/how-to-copy-contents-of-one-canvas-to-another-canvas-locally
 */
export function copy(cnv: HTMLCanvasElement|HTMLImageElement|HTMLVideoElement): HTMLCanvasElement {
  const _copy = document.createElement("canvas");
  const ctx = <CanvasRenderingContext2D>_copy.getContext("2d");
  if(cnv instanceof HTMLVideoElement){
    _copy.width = cnv.videoWidth;
    _copy.height = cnv.videoHeight;
  }else{
    _copy.width = cnv.width;
    _copy.height = cnv.height;
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(<HTMLCanvasElement>cnv, 0, 0); // type hack
  return _copy;
}

export function toBlob(cnv: HTMLCanvasElement, mimeType: "image/jpeg" | "image/png", qualityArgument: number): Promise<Blob>{
  return new Promise((resolve, reject)=>{
    cnv.toBlob((blob)=>{
      if(blob instanceof Blob) resolve(blob);
      else                     reject(new Error("cannot get blob from canvas"));
    }, mimeType, qualityArgument);
  });
}


