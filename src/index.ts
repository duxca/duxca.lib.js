
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

export function stdscore(arr:number[]|Float32Array, x:number):number {
  return 10*(x - average(arr))/variance(arr)+50;
}

export function derivative(arr:number[]|Float32Array):number[] {
  var results = [0];
  for(var i=1; i<arr.length; i++){
    results.push(arr[i] - arr[i - 1]);
  }
  return results;
}

export function median(arr:number[]|Float32Array):number {
  return Array.prototype.slice.call(arr, 0).sort()[arr.length / 2 | 0];
}

export function KDE(arr:number[]|Float32Array, h?:number):number[] {
  // kernel density estimation
  if (typeof h !== "number") {
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

export function LWMA(arr: Float32Array): number {
  // liner weighted moving average
  var a = 0;
  var b = 0;
  var i = 0;
  var j = arr.length - 1;
  while(i < arr.length){
    a += arr[i] * j;
    b += j;
    i++;
    j--;
  }
  return a / b
}

export function all(arr:number[]|Float32Array): void{
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

export function k_means1D(data:number[], k:number){
  var klass: number[] = [];
  for(var i=0; i<data.length; i++){
    klass[i] = (Math.random()*10000|0)%k;
  }
  var count = 0;
  recur:while(true){
    if(++count > 100000) throw new Error("Maximum call stack size exceeded");
    var laststate = klass.slice(0);
    var sums:number[][] = [];
    for(var j=0; j<k; j++){
      sums[j] = [];
    }
    for(var i=0; i<data.length; i++){
      sums[klass[i]].push(data[i]);
    }
    var aves:number[] = [];
    for(var j=0; j<k; j++){
      aves[j] = average(sums[j]);
    }
    for(var i=0; i<data.length; i++){
      for(var j=0; j<aves.length; j++){
        if(Math.abs(aves[klass[i]] - data[i]) > Math.abs(aves[j] - data[i])){
          klass[i] = j;
        }
      }
    }
    for(var i=0; i<klass.length; i++){
      if(klass[i] !== laststate[i]){
        continue recur;
      }
    }
    return klass;
  }
}
