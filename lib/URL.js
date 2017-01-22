"use strict";
/**
 * @param T - JSONObject
 * @return location.search
 */
function encodeURIQuery(json) {
    return Object.keys(json)
        .map(function (key) { return key + "=" + encodeURIComponent(json[key]); })
        .join("&");
}
exports.encodeURIQuery = encodeURIQuery;
/**
 * @param search - location.search
 * @return T - JSONObject
 */
function decodeURIQuery(search) {
    if (search[0] === "?") {
        search = search.substr(1);
    }
    return search
        .split("&")
        .map(function (a) {
        var b = a.split("=");
        return [b[0], b.slice(1).join("=")];
    }).reduce((function (a, b) {
        a[b[0]] = decodeURIComponent(b[1]);
        return a;
    }), {});
}
exports.decodeURIQuery = decodeURIQuery;
