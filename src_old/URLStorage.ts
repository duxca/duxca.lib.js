(function(global) {
"use strict";

// --- dependency modules ----------------------------------
var Base64       = global["Base64"]         || require("uupaa.base64.js");
var DataType     = global["DataType"]       || require("uupaa.datatype.js");
var URLShortener = global["WMURLShortener"] || require("duxca.wmurlshortener.js");

// --- define / local variables ----------------------------
var _runOnNode = "process" in global;
//var _runOnWorker = "WorkerLocation" in global;
//var _runOnBrowser = "document" in global;

// --- class / interfaces ----------------------------------
function WMURLStorage(opt){
    opt = opt || {};
    this["baseURL"] = opt["baseURL"] || "http://data.bin/";
    this["parallelConnection"] = opt["parallelConnection"] || 3;
}

//{@dev
WMURLStorage["repository"] = "https://github.com/duxca/WMURLStorage.js"; // GitHub repository URL. http://git.io/Help
//}@dev

WMURLStorage["prototype"]["save"] = WMURLStorage_save; // WMURLStorage#save(str:String, callback:Function):void
WMURLStorage["prototype"]["load"] = WMURLStorage_load; // WMURLStorage#load(url:URLString, callback:Function):void


// --- implements ------------------------------------------
function WMURLStorage_save(arr,       // @arg Uint8Array
                           callback){ // @arg Function - callback(err:Error|null, url:URLString):void
                                      // @ret void
//{@dev
    $args(WMURLStorage_save, arguments);
//}@dev
    var base64url = base64URLencode(arr);
    if(base64url["length"] <= 14000){
        var longUrl = this["baseURL"] + "#" + base64url;
        new URLShortener().shorten(longUrl, function(err, shortUrl) {
            if(!!err) return callback(err, "");
            callback(null, shortUrl);
        });
    }else{
        setTimeout(function(){
            callback(new Error("data too lerge"), "");
        });
    }
}


function base64URLencode(uint8arr){ // @arg Uint8Array
                                    // @ret Base64URLString - base64url encoding
//{@dev
    $args(base64URLencode, arguments);
//}@dev
    var octetString = DataType["Array"]["toString"](uint8arr);
    var base64 = _runOnNode ?
      new Buffer(octetString["toString"](), 'binary')["toString"]('base64') ://btoa
      Base64["btoa"](octetString);
    var base64url = base64.split("+").join("-").split("/").join("_");
    return base64url;
}

function base64URLdecode(base64url){ // @arg Base64URLString - base64url encoding
                                     // @ret Uint8Array
//{@dev
    $args(base64URLdecode, arguments);
//}@dev
    var base64 = base64url.split("-").join("+").split("_").join("/");
    var octetString = _runOnNode ?
        new Buffer(base64, 'base64')["toString"]('binary') ://atob
        Base64["atob"](base64);
    var uint8arr = DataType["Uint8Array"]["fromString"](octetString);
    return uint8arr;
}


function WMURLStorage_load(shortUrl,  // @arg URLString
                           callback){ // @arg Function - callback(err:Error|null, uint8arr:Uint8Array):void
                                      // @ret void
//{@dev
    $args(WMURLStorage_load, arguments);
//}@dev
    new URLShortener()["expand"](shortUrl, function(err, longUrl) {
        if(!!err) return callback(err, "");
        var base64url = longUrl.split("#").slice(1).join("#");
        var uint8arr = base64URLdecode(base64url);
        callback(null, uint8arr);
    });
}


// --- validate / assertions -------------------------------
//{@dev
//function $valid(val, fn, hint) { if (global["Valid"]) { global["Valid"](val, fn, hint); } }
//function $type(obj, type) { return global["Valid"] ? global["Valid"].type(obj, type) : true; }
//function $keys(obj, str) { return global["Valid"] ? global["Valid"].keys(obj, str) : true; }
//function $some(val, str, ignore) { return global["Valid"] ? global["Valid"].some(val, str, ignore) : true; }
function $args(fn, args) { if (global["Valid"]) { global["Valid"].args(fn, args); } }
//}@dev


// --- exports ---------------------------------------------
if ("process" in global) {
    module["exports"] = WMURLStorage;
}

global["WMURLStorage" in global ? "WMURLStorage_" : "WMURLStorage"] = WMURLStorage;　// switch module.

})((this || 0).self || global); // WebModule idiom. http://git.io/WebModule