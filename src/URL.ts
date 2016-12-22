// URL の get query や hash として使える文字列への変換
export type JSONString = string;
export type QueryString = string;
export function encodeURIQuery(dic: { [key: string]: JSONString }): QueryString {
  return Object.keys(dic)
    .map((key)=> key + "=" + encodeURIComponent(dic[key]) )
    .join("&");
}
export function decodeURIQuery(query: QueryString): { [key: string]: JSONString } {
  return query
    .split("&")
    .map((a)=>{
      const b = a.split("=");
      return [b[0], b.slice(1).join("=")];
    }).reduce(((a, b)=>{
      a[b[0]] = decodeURIComponent(b[1]);
      return a;
    }), {});
}
// string -> utf8 txt の data uri string への変換
export type DataURI = string;
export function encodeDataURI(data: string, mimetype: string): Promise<DataURI> {
  const reader = new FileReader();
  reader.readAsDataURL(new Blob([data], {type: mimetype}))
  return new Promise((resolve, reject)=>{
    reader.onloadend = ()=>{
      resolve(reader.result.replace(";base64,", ";charset=utf-8;base64,"));
    };
    reader.onerror = (err)=>{
      reject(err.error);
    };
  });
}
export function decodeDataURI(dataURI: DataURI): Promise<string> {
  const tmp = dataURI.split(',');
  const mimeString = tmp[0].split(':')[1].split(';')[0];
  const byteString = atob(tmp[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for(let i=0; i<byteString.length; i++){
    ia[i] = byteString.charCodeAt(i);
  }
  const reader = new FileReader();
  reader.readAsText(new Blob([ab], {type: mimeString}));
  return new Promise((resolve, reject)=>{
    reader.onloadend = ()=> {
      resolve(reader.result);
    };
    reader.onerror = (err)=> {
      reject(err.error);
    };
  });
}