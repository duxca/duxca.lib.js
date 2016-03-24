/// <reference path="../../typings/tsd.d.ts" />
declare namespace QRcode {
    function reader(cnv: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Promise<string>;
    function writer(data: string): HTMLCanvasElement;
}
export = QRcode;
