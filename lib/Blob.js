"use strict";
var Event_1 = require("./Event");
function readAsDataURL(blob, charset) {
    if (charset === void 0) { charset = "utf-8"; }
    var reader = new FileReader();
    reader.readAsDataURL(blob);
    return Event_1.fetchEvent(reader, "loadend", "error")
        .then(function () { return reader.result.replace(";base64,", ";charset=" + charset + ";base64,"); });
}
exports.readAsDataURL = readAsDataURL;
function readAsArrayBuffer(blob) {
    var reader = new FileReader();
    reader.readAsArrayBuffer(blob);
    return Event_1.fetchEvent(reader, "loadend", "error").then(function () { return reader.result; });
}
exports.readAsArrayBuffer = readAsArrayBuffer;
function readAsText(blob) {
    var reader = new FileReader();
    reader.readAsText(blob);
    return Event_1.fetchEvent(reader, "loadend", "error").then(function () { return reader.result; });
}
exports.readAsText = readAsText;
function readAsBinaryString(blob) {
    var reader = new FileReader();
    reader.readAsBinaryString(blob);
    return Event_1.fetchEvent(reader, "loadend", "error").then(function () { return reader.result; });
}
exports.readAsBinaryString = readAsBinaryString;
function readAsBase64(blob) {
    var reader = new FileReader();
    reader.readAsDataURL(blob);
    return Event_1.fetchEvent(reader, "loadend", "error")
        .then(function () { return reader.result.split(";base64,", 2).slice(1); });
}
exports.readAsBase64 = readAsBase64;
function base64ToBase64URL(base64) {
    return base64.split("+").join("-").split("/").join("_");
}
exports.base64ToBase64URL = base64ToBase64URL;
function base64URLToBase64(base64url) {
    return base64url.split("-").join("+").split("_").join("/");
}
exports.base64URLToBase64 = base64URLToBase64;
