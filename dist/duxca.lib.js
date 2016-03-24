(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.duxca = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
function summation(arr) {
    var sum = 0;
    for (var j = 0; j < arr.length; j++) {
        sum += arr[j];
    }
    return sum;
}
exports.summation = summation;
function average(arr) {
    return summation(arr) / arr.length;
}
exports.average = average;
function variance(arr) {
    var ave = average(arr);
    var sum = 0;
    for (var j = 0; j < arr.length; j++) {
        sum += Math.pow(arr[j] - ave, 2);
    }
    return sum / (arr.length - 1);
}
exports.variance = variance;
function stdev(arr) {
    return Math.sqrt(variance(arr));
}
exports.stdev = stdev;
function stdscore(arr, x) {
    return 10 * (x - average(arr)) / variance(arr) + 50;
}
exports.stdscore = stdscore;
function derivative(arr) {
    var results = [0];
    for (var i = 1; i < arr.length; i++) {
        results.push(arr[i] - arr[i - 1]);
    }
    return results;
}
exports.derivative = derivative;
function median(arr) {
    return Array.prototype.slice.call(arr, 0).sort()[arr.length / 2 | 0];
}
exports.median = median;
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
exports.KDE = KDE;
function mode(arr) {
    var kde = KDE(arr);
    return arr[findMax(kde)[1]];
}
exports.mode = mode;
function gaussian(x) {
    return 1 / Math.sqrt(2 * Math.PI) * Math.exp(-Math.pow(x, 2) / 2);
}
exports.gaussian = gaussian;
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
exports.findMax = findMax;
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
exports.findMin = findMin;
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
exports.LWMA = LWMA;
function all(arr) {
    console.log("len", arr.length, "\n", "min", findMin(arr), "\n", "max", findMax(arr), "\n", "ave", average(arr), "\n", "med", median(arr), "\n", "mode", mode(arr), "\n", "var", variance(arr), "\n", "stdev", stdev(arr));
}
exports.all = all;
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
exports.k_means1D = k_means1D;

},{}]},{},[1])(1)
});