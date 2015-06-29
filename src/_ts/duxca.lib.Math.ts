/// <reference path="../../typings/tsd.d.ts" />
/// <reference path="./duxca.lib.ts" />


module duxca.lib.Math {
/*
  export function summation(ary:number[]):number {
    var j, len, sum, v;
    sum = 0;
    for (j = 0, len = ary.length; j < len; j++) {
      v = ary[j];
      sum += v;
    }
    return sum;
  }

  export function average(ary:number[]):number {
    return summation(ary) / ary.length;
  }

  export function variance(ary:number[]):number {
    var ave, j, len, sum, v;
    ave = average(ary);
    sum = 0;
    for (j = 0, len = ary.length; j < len; j++) {
      v = ary[j];
      sum += Math.pow(v - ave, 2);
    }
    return sum / (ary.length - 1);
  }

  export function stdev(ary:number[]):number {
    return Math.sqrt(variance(ary));
  }

  export function derivative(ary:number[]):number[] {
    var i;
    return [0].concat((function() {
      var j, ref, results;
      results = [];
      for (i = j = 1, ref = ary.length - 1; 1 <= ref ? j <= ref : j >= ref; i = 1 <= ref ? ++j : --j) {
        results.push(ary[i] - ary[i - 1]);
      }
      return results;
    })());
  }
  export function median(ary:number[]):number {
    return Array.prototype.slice.call(ary, 0).sort()[ary.length / 2 | 0];
  }

  export function KDE(ary:number[], h?:number):number[] {
    var f, j, kernel, len, results, x;
    if (h == null) {
      h = 1.06 * stdev(ary) * Math.pow(ary.length, -1 / 5) + 0.0000000001;
    }
    kernel = function(x) {
      return Math.pow(Math.E, -Math.pow(x, 2) / 2) / Math.sqrt(2 * Math.PI);
    };
    f = function(x) {
      var i, j, len, s, v;
      s = 0;
      for (i = j = 0, len = ary.length; j < len; i = ++j) {
        v = ary[i];
        s += kernel((x - v) / h);
      }
      return s / (h * ary.length);
    };
    results = [];
    for (j = 0, len = ary.length; j < len; j++) {
      x = ary[j];
      results.push(f(x));
    }
    return results;
  }

  export function mode(ary:number[]):number {
    return ary[findMax(KDE(ary,0))[1]];
  }

  export function gaussian(x:number):number {
    return 1 / Math.sqrt(2 * Math.PI) * Math.exp(-Math.pow(x, 2) / 2);
  }

  export function findMax(ary:number[], min?:number, max?:number):[number, number] {
    var i, index, j, ref, ref1, result;
    if (min == null) {
      min = 0;
    }
    if (max == null) {
      max = ary.length - 1;
    }
    result = -Infinity;
    index = -1;
    for (i = j = ref = min, ref1 = max; ref <= ref1 ? j <= ref1 : j >= ref1; i = ref <= ref1 ? ++j : --j) {
      if (!(ary[i] > result)) {
        continue;
      }
      result = ary[i];
      index = i;
    }
    return [result, index];
  }

  export function findMin(ary:number[], min?:number, max?:number):[number, number] {
    var i, index, j, ref, ref1, result;
    if (min == null) {
      min = 0;
    }
    if (max == null) {
      max = ary.length - 1;
    }
    result = Infinity;
    index = -1;
    for (i = j = ref = min, ref1 = max; ref <= ref1 ? j <= ref1 : j >= ref1; i = ref <= ref1 ? ++j : --j) {
      if (!(ary[i] < result)) {
        continue;
      }
      result = ary[i];
      index = i;
    }
    return [result, index];
  }*/
}
