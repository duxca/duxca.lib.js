/// <reference path="../../../tsd/qrcode-decoder-js/qrcode.d.ts" />
/// <reference path="../../../tsd/qrcodejs/qrcode.d.ts" />
declare module QRcode {
    function reader(cnv: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Promise<string>;
    function writer(data: string): HTMLCanvasElement;
}
export = QRcode;
