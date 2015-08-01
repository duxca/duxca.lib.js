
interface QRCodeJS{
  new (cnv: HTMLElement, text: string): QRCodeJS;
  new (canvas_id: string, vOption: {
    text: string;
    width: number;
    height: number;
    colorDark: string;
    colorLight: string;
  }): QRCodeJS;
  clear(): void;
  makeCode(data: string): void;
  makeImage(): void;
  CorrectLevel: {L: number, M: number, Q: number, H: number};
}

declare var QRCode: QRCodeJS;
