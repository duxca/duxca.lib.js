// Type definitions for jsqrcode
// Project: https://github.com/LazarSoft/jsqrcode
// Definitions: https://github.com/borisyankov/DefinitelyTyped

interface jsqrcode{
  binarize(src:number): boolean[];
  callback(result: string): void;
  debug: boolean;
  decode(): string;
  decode(src: string): void;
  decode_url(url:string): string;
  decode_utf8(url:string): string;
  getMiddleBrightnessPerArea(image:number[]): number[][];
  getPixel(x:number, y:number): number;
  grayScaleToBitmap(grayScale: number[]): number[];
  grayscale(): number[];
  height: number;
  isUrl(url:string): boolean;
  imagedata: ImageData;
  maxImgSize: number;
  orderBestPatterns(patterns: any): any;
  process(ctx: CanvasRenderingContext2D): string;
  qrCodeSymbol: any;
  sizeOfDataLengthInfo: number[][];
  width: number;
}


declare var qrcode: jsqrcode;
