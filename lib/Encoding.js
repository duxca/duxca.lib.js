"use strict";
var Encoding = require("encoding-japanese");
function decode(buffer) {
    return Encoding.codeToString(Encoding.convert(buffer, 'UNICODE', 'AUTO'));
}
exports.decode = decode;
