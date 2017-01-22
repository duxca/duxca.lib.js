import {fetchEvent} from "./Event";

export function readAsDataURL(blob: Blob, charset="utf-8"): Promise<string> {
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  return fetchEvent(reader, "loadend", "error")
    .then(()=> reader.result.replace(";base64,", `;charset=${charset};base64,`));
}

export function readAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  const reader = new FileReader();
  reader.readAsArrayBuffer(blob);
  return fetchEvent(reader, "loadend", "error").then(()=> reader.result);
}

export function readAsText(blob: Blob): Promise<string> {
  const reader = new FileReader();
  reader.readAsText(blob);
  return fetchEvent(reader, "loadend", "error").then(()=> reader.result);
}

export function readAsBinaryString(blob: Blob): Promise<string> {
  const reader = new FileReader();
  reader.readAsBinaryString(blob);
  return fetchEvent(reader, "loadend", "error").then(()=> reader.result);
}

export function readAsBase64(blob: Blob): Promise<string> {
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  return fetchEvent(reader, "loadend", "error")
    .then(()=> reader.result.split(";base64,", 2).slice(1) );
}

export function base64ToBase64URL(base64: string): string{
  return base64.split("+").join("-").split("/").join("_");
}

export function base64URLToBase64(base64url: string): string{
  return base64url.split("-").join("+").split("_").join("/");
}
