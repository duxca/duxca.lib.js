/// <reference path="../../typings/tsd.d.ts"/>
var QRcode;
(function (QRcode) {
    function reader(cnv, ctx) {
        return new Promise(function (resolve, reject) {
            qrcode.width = cnv.width;
            qrcode.height = cnv.height;
            qrcode.imagedata = ctx.getImageData(0, 0, cnv.width, cnv.height);
            try {
                var result = qrcode.process(ctx);
                resolve(Promise.resolve(result));
            }
            catch (err) {
                reject(err);
            }
        });
    }
    QRcode.reader = reader;
    function writer(data) {
        var div = document.createElement("div");
        var code = new QRCode(div, data);
        return div.children[0];
    }
    QRcode.writer = writer;
})(QRcode || (QRcode = {}));
module.exports = QRcode;
