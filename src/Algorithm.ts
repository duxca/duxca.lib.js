

import * as deep from "deep-diff";

export type SUDiff = deepDiff.IDiff[];
export function diff(lhs: Object, rhs: Object, prefilter?: deepDiff.IPrefilter, acc?: deepDiff.IAccumulator): SUDiff {
  const ret = deep.diff(lhs, rhs, prefilter, acc);
  return ret != null ? ret : [];
}


// [1,2,3] -> 1 or 2 or 3 as 33% probability
export function choice<T>(arr: T[]): T {
  return arr[(Math.random()*100*(arr.length)|0)%arr.length];
}

export function gensym(): string{
  // ユニーク値を返す
  // 雑な実装
  return `__${Date.now()}${Math.random()*10000000|0}__`;
}

/*
export function binarySearch<T>(arr: T[], fn: (elm: T)=> number): number {
  let head = 0;
  let tail = arr.length - 1;
  let where = 0;
  while (head <= tail){
    where = head + Math.floor((tail - head) / 2);
    let c  = fn(arr[where]);
    if (0 === c) return where;
    if (0  <  c) tail = where - 1;
    else         head = where + 1;
    console.log(c, tail - head, head, tail);
    if(tail - head <= 1) return where;
  }
  console.error("cannot find elm in bin search", where, head, tail);
  return -1;
}*/




export function times(char: string, n: number):string{
    return n === 0 ? ""   :
           n <= 1  ? char :
                     char + times(char, n-1) ;
}

export function randTimes<T>(fn: ()=>T, threshold: number): T[]{
  let ret:T[] = [];
  while(Math.random() < threshold){
    ret.push(fn());
  }
  return ret;
}



// min-max 間のランダム値
export function randomRange(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
