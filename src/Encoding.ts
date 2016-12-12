import * as Encoding from "encoding-japanese";


export function decode(buffer: Buffer): string{
  return Encoding.codeToString(Encoding.convert(buffer, 'UNICODE', 'AUTO'));
}