export type KV<T> = { [key: string]: T };


/**
 * @param T - JSONObject
 * @return location.search
 */
export function encodeURIQuery<T extends { [key: string]: string }>(json: T): string {
  return Object.keys(json)
    .map((key)=> key + "=" + encodeURIComponent(json[key]) )
    .join("&");
}

/**
 * @param search - location.search
 * @return T - JSONObject
 */
export function decodeURIQuery<T extends { [key: string]: string }>(search: string): T {
  if(search[0] === "?"){
    search = search.substr(1);
  }
  return search
    .split("&")
    .map((a)=>{
      const b = a.split("=");
      return [b[0], b.slice(1).join("=")];
    }).reduce(((a, b)=>{
      a[b[0]] = decodeURIComponent(b[1]);
      return a;
    }), <T>{});
}