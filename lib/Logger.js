"use strict";
var Algorithm_1 = require("./Algorithm");
/**
 * @param err - lineInfo を表示するための stack をもつ Error
 * `#log` なる要素と console.log にログを出力する
 */
function logger(err) {
    /**
     * @param objs - 表示したいなにか
     */
    return function () {
        var objs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            objs[_i] = arguments[_i];
        }
        var str = "";
        var lineInfo = "";
        // lineInfo が取れそうなら取得
        if (err != null && err.stack != null) {
            var tmp = err.stack.split("\n").slice(1, 2);
            if (tmp.length > 0) {
                var match = tmp[0];
                lineInfo = match.trim();
            }
        }
        objs.forEach(function (obj) {
            // 文字列化を試す
            try {
                if (typeof obj === "string")
                    throw {}; // string ならそのまま表示
                str += Object.prototype.toString.call(obj) + " " + Algorithm_1.dump(obj, 2);
            }
            catch (err) {
                str += "" + obj;
            }
            str += " ";
        });
        // 出力
        if (typeof lineInfo === "string") {
            console.log.apply(console, objs.concat(lineInfo));
            $("#log").append(str + " " + lineInfo + "\n");
        }
        else {
            console.log(objs);
            $("#log").append(str + "\n");
        }
    };
}
exports.logger = logger;
