
module duxca.lib.Statictics {
  export function summation(arr:number[]|Float32Array):number {
    var sum = 0;
    for (var j = 0; j < arr.length; j++) {
      sum += arr[j];
    }
    return sum;
  }

  export function average(arr:number[]|Float32Array):number {
    return summation(arr) / arr.length;
  }

  export function variance(arr:number[]|Float32Array):number {
    var ave = average(arr);
    var sum = 0;
    for (var j = 0; j < arr.length; j++) {
      sum += Math.pow(arr[j] - ave, 2);
    }
    return sum / (arr.length - 1);
  }

  export function stdev(arr:number[]|Float32Array):number {
    return Math.sqrt(variance(arr));
  }

  export function derivative(arr:number[]|Float32Array):number[] {
    var results = [0];
    for(var i=1; 0<arr.length; i++){
      results.push(arr[i] - arr[i - 1]);
    }
    return results;
  }

  export function median(arr:number[]|Float32Array):number {
    return Array.prototype.slice.call(arr, 0).sort()[arr.length / 2 | 0];
  }

  export function KDE(arr:number[]|Float32Array, h?:number):number[] {
    // kernel density estimation
    if (h == null) {
      h = 0.9 * stdev(arr) * Math.pow(arr.length, -1 / 5) + 0.0000000001;
    }
    function kernel(x:number):number {
      return Math.exp(-x*x/2) / Math.sqrt(2 * Math.PI);
    }
    function estimate(x:number):number {
      var s = 0;
      for (var i = 0;i < arr.length; i++) {
        s += kernel((x - arr[i]) / h);
      }
      return s / (h * arr.length);
    }
    var results:number[] = [];
    for (var i = 0; i < arr.length; i++) {
      results.push(estimate(arr[i]));
    }
    return results;
  }

  export function mode(arr:number[]|Float32Array):number {
    var kde = KDE(arr);
    return arr[findMax(kde)[1]];
  }

  export function gaussian(x:number):number {
    return 1 / Math.sqrt(2 * Math.PI) * Math.exp(-Math.pow(x, 2) / 2);
  }

  export function findMax(arr:number[]|Float32Array):[number, number] {
    var result = -Infinity;
    var index = -1;
    for(var i=0; i<arr.length;i++){
      if (!(arr[i] > result)) {
        continue;
      }
      result = arr[i];
      index = i;
    }
    return [result, index];
  }

  export function findMin(arr:number[]|Float32Array):[number, number] {
    var result = Infinity;
    var index = -1;
    for(var i=0; i<arr.length;i++){
      if (!(arr[i] < result)) {
        continue;
      }
      result = arr[i];
      index = i;
    }
    return [result, index];
  }

  export function log(arr:number[]|Float32Array): void{
    console.log(
      "len", arr.length, "\n",
      "min",findMin(arr), "\n",
      "max",findMax(arr), "\n",
      "ave",average(arr), "\n",
      "med",median(arr), "\n",
      "mode",mode(arr), "\n",
      "var",variance(arr), "\n",
      "stdev",stdev(arr));
  }
}
