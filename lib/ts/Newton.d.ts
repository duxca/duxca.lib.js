/// <reference path="../../typings/tsd.d.ts" />
import Point = Newton.Point;
declare class Newton {
    theta: number;
    points: Point[];
    _pts: Point[];
    constructor(theta: number, pts: Point[], _pts: Point[]);
    step(): void;
    det(theta: number): number;
    der(theta: number): number;
}
declare namespace Newton {
    class Point {
        x: number;
        y: number;
        constructor(x: number, y: number);
        plus(pt: Point): Point;
        minus(pt: Point): Point;
        times(num: number): Point;
        distance(pt: Point): number;
    }
    class SDM {
        points: Point[];
        distance: number[][];
        a: number;
        constructor(pts: Point[], ds: number[][], a?: number);
        step(): void;
        det(): number;
    }
}
export = Newton;
