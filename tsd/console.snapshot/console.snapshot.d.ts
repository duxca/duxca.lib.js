interface Console{
  snapshot(cnv: HTMLCanvasElement): void;
  screenshot(cnv: HTMLCanvasElement, scale?:number): void;
  image(url: string): void;
}
