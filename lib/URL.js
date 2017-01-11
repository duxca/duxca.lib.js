"use strict";
/**
 * blob ファイルから data uri scheme を作る
 */
function blobToDataURI(blob) {
    var reader = new FileReader();
    reader.readAsDataURL(blob);
    return new Promise(function (resolve, reject) {
        reader.onloadend = function () {
            var dataURI = reader.result;
            resolve(dataURI);
        };
        reader.onerror = function (err) {
            reject(err.error);
        };
    });
}
exports.blobToDataURI = blobToDataURI;
function encodeKVJSON(data) {
    return Object
        .keys(data)
        .reduce(function (o, k) { return (o[k] = JSON.stringify(data[k]), o); }, {});
}
exports.encodeKVJSON = encodeKVJSON;
function decodeKVJSON(kv) {
    return Object
        .keys(kv)
        .reduce(function (o, k) { return (o[k] = JSON.parse(kv[k]), o); }, {});
}
exports.decodeKVJSON = decodeKVJSON;
function encodeURIQuery(dic) {
    return Object.keys(dic)
        .map(function (key) { return key + "=" + encodeURIComponent(dic[key]); })
        .join("&");
}
exports.encodeURIQuery = encodeURIQuery;
function decodeURIQuery(query) {
    return query
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
// string -> utf8 txt の data uri string への変換
function encodeDataURI(data, mimetype) {
    var reader = new FileReader();
    reader.readAsDataURL(new Blob([data], { type: mimetype }));
    return new Promise(function (resolve, reject) {
        reader.onloadend = function () {
            resolve(reader.result.replace(";base64,", ";charset=utf-8;base64,"));
        };
        reader.onerror = function (err) {
            reject(err.error);
        };
    });
}
exports.encodeDataURI = encodeDataURI;
function decodeDataURI(dataURI) {
    var tmp = dataURI.split(',');
    var mimeString = tmp[0].split(':')[1].split(';')[0];
    var byteString = atob(tmp[1]);
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    var reader = new FileReader();
    reader.readAsText(new Blob([ab], { type: mimeString }));
    return new Promise(function (resolve, reject) {
        reader.onloadend = function () {
            resolve(reader.result);
        };
        reader.onerror = function (err) {
            reject(err.error);
        };
    });
}
exports.decodeDataURI = decodeDataURI;
