import {dump} from "./Algorithm";

/**
 * @param err - lineInfo を表示するための stack をもつ Error
 * `#log` なる要素と console.log にログを出力する
 */
export function logger(err?: Error): (obj: any) => void {
  /**
   * @param obj - 表示したいなにか
   */
  return function (obj: any){
    let str = "";
    let lineInfo = "";
    // lineInfo が取れそうなら取得
    if(err != null && err.stack != null){
      const tmp = err.stack.split("\n").slice(1,2);
      if(tmp.length > 0){
        const match = tmp[0];
        lineInfo = match.trim();
      }
    }
    // 文字列化を試す
    try{
      str = `${obj} ${dump(obj, 2)}`;
    }catch(err){
      str = `${obj}`;
    }
    // 出力
    if(typeof lineInfo === "string"){
      console.log(obj, lineInfo);
      $("#log").append(`${str} ${lineInfo}\n`);
    }else{
      console.log(obj);
      $("#log").append(`${str}\n`);
    }
  }
}