"use strict";
// [1,2,3] -> 1 or 2 or 3 as 33% probability
function choice(arr) {
    return arr[(Math.random() * 100 * (arr.length) | 0) % arr.length];
}
exports.choice = choice;
function gensym() {
    // ユニーク値を返す
    // 雑な実装
    return "__" + Date.now() + (Math.random() * 10000000 | 0) + "__";
}
exports.gensym = gensym;
/*
export function binarySearch<T>(arr: T[], fn: (elm: T)=> number): number {
  let head = 0;
  let tail = arr.length - 1;
  let where = 0;
  while (head <= tail){
    where = head + Math.floor((tail - head) / 2);
    let c  = fn(arr[where]);
    if (0 === c) return where;
    if (0  <  c) tail = where - 1;
    else         head = where + 1;
    console.log(c, tail - head, head, tail);
    if(tail - head <= 1) return where;
  }
  console.error("cannot find elm in bin search", where, head, tail);
  return -1;
}*/
function times(char, n) {
    return n === 0 ? "" :
        n <= 1 ? char :
            char + times(char, n - 1);
}
exports.times = times;
function randTimes(fn, threshold) {
    var ret = [];
    while (Math.random() < threshold) {
        ret.push(fn());
    }
    return ret;
}
exports.randTimes = randTimes;
// min-max 間のランダム値
function randomRange(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}
exports.randomRange = randomRange;
function heredoc(fn) {
    var str = fn.toString();
    var matches = str.match(/^function\s*\(\s*\)\s*\{\s*\/\*([\S\s]*)\*\/\s*\;?\}$/);
    if (!matches) {
        console.error(str);
        throw new Error("heredoc format is worng. please check it.");
    }
    return matches[1];
}
exports.heredoc = heredoc;
function space(i) {
    var result = "";
    while (i--)
        result += "  ";
    return result;
}
exports.space = space;
console.assert(space(0) === "", "space 0");
console.assert(space(1) === "  ", "space 1");
console.assert(space(2) === "    ", "space 2");
function evaluate(code, env) {
    // @ret Any
    var _env = env || {};
    var vars = Object.keys(_env);
    var vals = vars.map(function (key) { return _env[key]; });
    var args = vars.concat("return " + code + ";");
    var fn = Function.apply(this, args);
    return fn.apply(self, vals);
}
console.assert(evaluate("unko", { unko: 0 }) === 0, "evaluate");
function getPropertys(o) {
    /*
    var keys1 = (function(o){
        var results = [];
        for(key in o) results.push(key);
        return results;
    })(o);
    var keys2 = Object.keys(o);
    */
    var keys3 = (function (o) {
        var results = [];
        while (o) {
            results = results.concat(Object.getOwnPropertyNames(o));
            o = Object.getPrototypeOf(o);
        }
        return results;
    })(o);
    //var keys = [].concat(keys1, keys2, keys3);
    var keys = keys3;
    var merged = keys.reduce(function (_, key) {
        if (!!_["keySet"][key])
            return _;
        _["keySet"][key] = true;
        _["results"]["push"](key);
        return _;
    }, { "keySet": {}, "results": [] })["results"];
    var sorted = merged.sort();
    return sorted;
}
exports.getPropertys = getPropertys;
console.assert(getPropertys({ a: 0, b: 0 }).length === 2, "getPropertys");
function suggest(env, // @arg Object
    keyword) {
    // @ret StringArray
    var reg = new RegExp("^" + keyword + ".*");
    var keys = getPropertys(env);
    var candidates = keys.filter(function (key) {
        return reg.test(key) && key !== keyword;
    });
    return candidates;
}
exports.suggest = suggest;
console.assert(suggest(self, "sel").length === 1, "suggest");
function autocomplete(code) {
    // @ret Object
    var reg = /((?:[A-Za-z0-9$_](?:\.(?:[A-Za-z0-9$_]+)?)?)+)$/;
    var exp = (reg.exec(code) || ["", ""])[1];
    var pre = code.replace(exp, "");
    var arr = exp.split(".");
    var env = arr.slice(0, arr.length - 1).join(".");
    var key = arr.slice(arr.length - 1)[0];
    if (key.length === 0) {
        var results = getPropertys(evaluate(env));
    }
    else if (env.length === 0) {
        var results = suggest(self, key);
    }
    else {
        var results = suggest(evaluate(env), key);
    }
    if (exp === key) {
        return { "tokens": [pre, "", key], "results": results };
    }
    else {
        return { "tokens": [pre, env, key], "results": results };
    }
}
exports.autocomplete = autocomplete;
console.assert(autocomplete("if").results.length === 0, "autocomplete 1");
console.assert(autocomplete("if win").results[0] === "window", "autocomplete 2");
console.assert(autocomplete("if window.sel").results[0] === "self", "autocomplete 2");
function type(o) {
    // @ret String
    if (o === null) {
        return "null";
    }
    else if (o === void 0) {
        return "undefined";
    }
    else if (o === self) {
        return "global";
    }
    else if (o["nodeType"] != null) {
        return "node";
    }
    else if (typeof o !== "object") {
        return typeof o;
    }
    else {
        var str = Object.prototype.toString.call(o);
        return ((str === "[object Object]" ?
            /^\s*function\s+(\w+)/.exec("" + o["constructor"]) :
            /^\[object (\w+)\]$/.exec(str)) || ["", "object"])[1]["toLowerCase"]();
    }
}
exports.type = type;
console.assert(type(null) === "null", "type null");
console.assert(type(void 0) === "undefined", "type undefined");
console.assert(type(true) === "boolean", "type boolean");
console.assert(type(0) === "number", "type number");
console.assert(type("string") === "string", "type string");
console.assert(type(function () { }) === "function", "type function");
console.assert(type([]) === "array", "type array");
console.assert(type({}) === "object", "type object");
console.assert(type(new Date) === "date", "type date");
console.assert(type(Math) === "math", "type math");
console.assert(type(/0/) === "regexp", "type regexp");
console.assert(type(window) === "global", "type global");
console.assert(type(document.createElement("div")) === "node", "type node");
console.assert(type(new (function Foo() { })) === "foo", "type foo");
function dump(o, // @arg Object
    depth) {
    if (depth === void 0) { depth = 0; }
    // @ret String
    return recur(o, depth, 0, []);
    function recur(o, depth, i, ancestors) {
        switch (type(o)) {
            case "null":
            case "undefined":
            case "boolean":
            case "number": return "" + o;
            case "string": return "\"" + o.split('\n').join('\\n') + "\"";
            case "function": return Object.prototype.toString.call(o);
            case "date": return JSON.stringify(o);
            case "array":
                if (ancestors.some(function (_o) { return _o === o; })) {
                    return Object.prototype.toString.call(o) + "// Recursive Definition";
                }
                else if (i >= depth) {
                    return Object.prototype.toString.call(o);
                }
                else {
                    var arr = o.map(function (val) {
                        return recur(val, depth, i + 1, ancestors.concat(o));
                    }).join(", ");
                    return "[" + arr + "]";
                }
            default:
                if (ancestors.some(function (_o) { return _o === o; })) {
                    return Object.prototype.toString.call(o) + " <- Recursive Definition";
                }
                else if (i >= depth) {
                    return Object.prototype.toString.call(o);
                }
                else {
                    var keys = getPropertys(o);
                    if (keys.length === 0) {
                        return "{}";
                    }
                    else {
                        var props = keys.map(function (key) {
                            var val = recur(o[key], depth, i + 1, ancestors.concat(o));
                            return "" + space(i + 1) + key + ": " + val;
                        }).join(",\n");
                        return "{\n" + props + "\n" + space(i) + "}";
                    }
                }
        }
    }
}
exports.dump = dump;
console.assert(dump({ a: { b: { c: 0, d: 0 } } }) === "[object Object]", "dump {a:{b:{c:0,d:0}}}");
console.assert(dump({ a: { b: { c: 0, d: 0 } } }, 3) === "{\n  a: {\n    b: {\n      c: 0,\n      d: 0\n    }\n  }\n}", "dump {a:{b:{c:0,d:0}}}, 3");
