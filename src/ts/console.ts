/// <reference path="../../typings/tsd.d.ts"/>
interface Console {
  screenshot(cnv: HTMLCanvasElement): void;
}

console.screenshot = function (cnv: HTMLCanvasElement): void {
  document.body.appendChild(cnv);
}
