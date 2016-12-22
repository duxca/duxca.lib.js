// URL の get query や hash として使える文字列への変換
export type JSONString = string;
export type QueryString = string;
export type KV<T> = { [key: string]: T };

export function encodeKVJSON<T extends KV<any>>(data: T): KV<JSONString> {
  return Object
    .keys(data)
    .reduce((o, k)=> (o[k] = JSON.stringify(data[k]), o), <KV<JSONString>>{});
}
export function decodeKVJSON<T extends KV<any>>(kv: KV<JSONString>): T {
  return Object
    .keys(kv)
    .reduce((o, k)=> (o[k] = JSON.parse(kv[k]), o), <T>{});
}

export function encodeURIQuery(dic: KV<JSONString>): QueryString {
  return Object.keys(dic)
    .map((key)=> key + "=" + encodeURIComponent(dic[key]) )
    .join("&");
}
export function decodeURIQuery<T extends KV<JSONString>>(query: QueryString): T {
  return query
    .split("&")
    .map((a)=>{
      const b = a.split("=");
      return [b[0], b.slice(1).join("=")];
    }).reduce(((a, b)=>{
      a[b[0]] = decodeURIComponent(b[1]);
      return a;
    }), <T>{});
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