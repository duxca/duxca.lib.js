


export function reader(cnv: HTMLCanvasElement, ctx:CanvasRenderingContext2D): Promise<string>{
  return new Promise<string>((resolve, reject)=>{
    qrcode.width  = cnv.width;
    qrcode.height = cnv.height;
    qrcode.imagedata = ctx.getImageData(0, 0, cnv.width, cnv.height);
    try {
      var result = qrcode.process(ctx);
      resolve(Promise.resolve(result));
    }catch(err){
      reject(err);
    }
  });
}

export function writer(data: string):HTMLCanvasElement {
  var div = document.createElement("div");
  var code = new QRCode(div, data);
  return <HTMLCanvasElement>div.children[0];
}

