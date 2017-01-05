/**
 * @param err - lineInfo を表示するための stack をもつ Error
 * `#log` なる要素と console.log にログを出力する
 */
export declare function logger(err?: Error): (obj: any) => void;
