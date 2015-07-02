declare module duxca.lib.Statictics {
    function summation(arr: number[] | Float32Array): number;
    function average(arr: number[] | Float32Array): number;
    function variance(arr: number[] | Float32Array): number;
    function stdev(arr: number[] | Float32Array): number;
    function stdscore(arr: number[] | Float32Array, x: number): number;
    function derivative(arr: number[] | Float32Array): number[];
    function median(arr: number[] | Float32Array): number;
    function KDE(arr: number[] | Float32Array, h?: number): number[];
    function mode(arr: number[] | Float32Array): number;
    function gaussian(x: number): number;
    function findMax(arr: number[] | Float32Array): [number, number];
    function findMin(arr: number[] | Float32Array): [number, number];
    function LWMA(arr: Float32Array): number;
    function all(arr: number[] | Float32Array): void;
}