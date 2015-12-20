/// <reference path="../../typings/tsd.d.ts" />
export declare function summation(arr: number[] | Float32Array): number;
export declare function average(arr: number[] | Float32Array): number;
export declare function variance(arr: number[] | Float32Array): number;
export declare function stdev(arr: number[] | Float32Array): number;
export declare function stdscore(arr: number[] | Float32Array, x: number): number;
export declare function derivative(arr: number[] | Float32Array): number[];
export declare function median(arr: number[] | Float32Array): number;
export declare function KDE(arr: number[] | Float32Array, h?: number): number[];
export declare function mode(arr: number[] | Float32Array): number;
export declare function gaussian(x: number): number;
export declare function findMax(arr: number[] | Float32Array): [number, number];
export declare function findMin(arr: number[] | Float32Array): [number, number];
export declare function LWMA(arr: Float32Array): number;
export declare function all(arr: number[] | Float32Array): void;
export declare function k_means1D(data: number[], k: number): number[];
