/// <reference path="../../typings/tsd.d.ts"/>
var Statictics;
(function (Statictics) {
    function summation(arr) {
        var sum = 0;
        for (var j = 0; j < arr.length; j++) {
            sum += arr[j];
        }
        return sum;
    }
    Statictics.summation = summation;
    function average(arr) {
        return summation(arr) / arr.length;
    }
    Statictics.average = average;
    function variance(arr) {
        var ave = average(arr);
        var sum = 0;
        for (var j = 0; j < arr.length; j++) {
            sum += Math.pow(arr[j] - ave, 2);
        }
        return sum / (arr.length - 1);
    }
    Statictics.variance = variance;
    function stdev(arr) {
        return Math.sqrt(variance(arr));
    }
    Statictics.stdev = stdev;
    function stdscore(arr, x) {
        return 10 * (x - average(arr)) / variance(arr) + 50;
    }
    Statictics.stdscore = stdscore;
    function derivative(arr) {
        var results = [0];
        for (var i = 1; i < arr.length; i++) {
            results.push(arr[i] - arr[i - 1]);
        }
        return results;
    }
    Statictics.derivative = derivative;
    function median(arr) {
        return Array.prototype.slice.call(arr, 0).sort()[arr.length / 2 | 0];
    }
    Statictics.median = median;
    function KDE(arr, h) {
        // kernel density estimation
        if (typeof h !== "number") {
            h = 0.9 * stdev(arr) * Math.pow(arr.length, -1 / 5) + 0.0000000001;
        }
        function kernel(x) {
            return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
        }
        function estimate(x) {
            var s = 0;
            for (var i = 0; i < arr.length; i++) {
                s += kernel((x - arr[i]) / h);
            }
            return s / (h * arr.length);
        }
        var results = [];
        for (var i = 0; i < arr.length; i++) {
            results.push(estimate(arr[i]));
        }
        return results;
    }
    Statictics.KDE = KDE;
    function mode(arr) {
        var kde = KDE(arr);
        return arr[findMax(kde)[1]];
    }
    Statictics.mode = mode;
    function gaussian(x) {
        return 1 / Math.sqrt(2 * Math.PI) * Math.exp(-Math.pow(x, 2) / 2);
    }
    Statictics.gaussian = gaussian;
    function findMax(arr) {
        var result = -Infinity;
        var index = -1;
        for (var i = 0; i < arr.length; i++) {
            if (!(arr[i] > result)) {
                continue;
            }
            result = arr[i];
            index = i;
        }
        return [result, index];
    }
    Statictics.findMax = findMax;
    function findMin(arr) {
        var result = Infinity;
        var index = -1;
        for (var i = 0; i < arr.length; i++) {
            if (!(arr[i] < result)) {
                continue;
            }
            result = arr[i];
            index = i;
        }
        return [result, index];
    }
    Statictics.findMin = findMin;
    function LWMA(arr) {
        // liner weighted moving average
        var a = 0;
        var b = 0;
        var i = 0;
        var j = arr.length - 1;
        while (i < arr.length) {
            a += arr[i] * j;
            b += j;
            i++;
            j--;
        }
        return a / b;
    }
    Statictics.LWMA = LWMA;
    function all(arr) {
        console.log("len", arr.length, "\n", "min", findMin(arr), "\n", "max", findMax(arr), "\n", "ave", average(arr), "\n", "med", median(arr), "\n", "mode", mode(arr), "\n", "var", variance(arr), "\n", "stdev", stdev(arr));
    }
    Statictics.all = all;
    function k_means1D(data, k) {
        var klass = [];
        for (var i = 0; i < data.length; i++) {
            klass[i] = (Math.random() * 10000 | 0) % k;
        }
        var count = 0;
        recur: while (true) {
            if (++count > 100000)
                throw new Error("Maximum call stack size exceeded");
            var laststate = klass.slice(0);
            var sums = [];
            for (var j = 0; j < k; j++) {
                sums[j] = [];
            }
            for (var i = 0; i < data.length; i++) {
                sums[klass[i]].push(data[i]);
            }
            var aves = [];
            for (var j = 0; j < k; j++) {
                aves[j] = average(sums[j]);
            }
            for (var i = 0; i < data.length; i++) {
                for (var j = 0; j < aves.length; j++) {
                    if (Math.abs(aves[klass[i]] - data[i]) > Math.abs(aves[j] - data[i])) {
                        klass[i] = j;
                    }
                }
            }
            for (var i = 0; i < klass.length; i++) {
                if (klass[i] !== laststate[i]) {
                    continue recur;
                }
            }
            return klass;
        }
    }
    Statictics.k_means1D = k_means1D;
})(Statictics || (Statictics = {}));
module.exports = Statictics;
