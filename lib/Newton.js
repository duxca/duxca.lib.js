"use strict";
var Newton = (function () {
    function Newton(theta, pts, _pts) {
        this.theta = theta;
        this.points = pts;
        this._pts = _pts;
    }
    Newton.prototype.step = function () {
        var _theta = this.theta - this.det(this.theta) / this.der(this.theta);
        this.theta = _theta;
    };
    Newton.prototype.det = function (theta) {
        var _this = this;
        return this.points.reduce(function (sum, _, k) {
            return (_this.points[k].x - Math.pow((_this._pts[k].x * Math.cos(theta) - _this._pts[k].y * Math.sin(theta)), 2)) +
                (_this.points[k].y - Math.pow((_this._pts[k].x * Math.sin(theta) + _this._pts[k].y * Math.cos(theta)), 2));
        }, 0);
    };
    Newton.prototype.der = function (theta) {
        var _this = this;
        return -2 * this.points.reduce(function (sum, _, k) {
            return (_this.points[k].x * (-1 * _this._pts[k].x * Math.sin(theta) - _this._pts[k].y * Math.cos(theta))) +
                (_this.points[k].y * (-1 * _this._pts[k].x * Math.cos(theta) - _this._pts[k].y * Math.sin(theta)));
        }, 0);
    };
    return Newton;
}());
var Newton;
(function (Newton) {
    var Point = (function () {
        function Point(x, y) {
            this.x = x;
            this.y = y;
        }
        Point.prototype.plus = function (pt) {
            return new Point(this.x + pt.x, this.y + pt.y);
        };
        Point.prototype.minus = function (pt) {
            return new Point(this.x - pt.x, this.y - pt.y);
        };
        Point.prototype.times = function (num) {
            return new Point(num * this.x, num * this.y);
        };
        Point.prototype.distance = function (pt) {
            return Math.sqrt(Math.pow(pt.x - this.x, 2) +
                Math.pow(pt.y - this.y, 2));
        };
        return Point;
    }());
    Newton.Point = Point;
    var SDM = (function () {
        function SDM(pts, ds, a) {
            if (a === void 0) { a = 0.05; }
            this.points = pts;
            this.distance = ds;
            this.a = a;
        }
        SDM.prototype.step = function () {
            var _this = this;
            var _pts = [];
            for (var i = 0; i < this.points.length; i++) {
                var delta = this.distance[i].reduce((function (sumPt, _, j) {
                    if (i === j) {
                        return sumPt;
                    }
                    else {
                        return sumPt.plus((_this.points[i].minus(_this.points[j])).times((1 - _this.distance[i][j] / _this.points[i].distance(_this.points[j]))));
                    }
                }), new Point(0, 0)).times(2);
                _pts[i] = this.points[i].minus(delta.times(this.a));
            }
            this.points = _pts;
        };
        SDM.prototype.det = function () {
            var _this = this;
            return this.points.reduce((function (sum, _, i) {
                return sum + _this.points.reduce((function (sum, _, j) {
                    return i === j ? sum :
                        sum + Math.pow(_this.points[i].distance(_this.points[j]) - _this.distance[i][j], 2);
                }), 0);
            }), 0);
        };
        return SDM;
    }());
    Newton.SDM = SDM;
})(Newton || (Newton = {}));
module.exports = Newton;
