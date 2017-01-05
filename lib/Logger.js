"use strict";
var Algorithm_1 = require("./Algorithm");
/**
 * @param err - lineInfo を表示するための stack をもつ Error
 * `#log` なる要素と console.log にログを出力する
 */
function logger(err) {
    /**
     * @param obj - 表示したいなにか
     */
    return function (obj) {
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
        // 文字列化を試す
        try {
            str = obj + " " + Algorithm_1.dump(obj, 2);
        }
        catch (err) {
            str = "" + obj;
        }
        // 出力
        if (typeof lineInfo === "string") {
            console.log(obj, lineInfo);
            $("#log").append(str + " " + lineInfo + "\n");
        }
        else {
            console.log(obj);
            $("#log").append(str + "\n");
        }
    };
}
exports.logger = logger;
