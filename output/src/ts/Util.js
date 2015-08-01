var Util;
(function (Util) {
    function importObject(hash) {
        new Function("hash", "Object.keys(hash).forEach(function(key){self[key]=hash[key];});").call(self, hash);
        console.log("some global variables appended: ", Object.keys(hash));
    }
    Util.importObject = importObject;
})(Util || (Util = {}));
module.exports = Util;
