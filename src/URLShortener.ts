
(function(global) {
"use strict";

// --- dependency modules ----------------------------------
var XHRProxy = global["XHRProxy"] || require("uupaa.xhrproxy.js");
var JSON     = global["JSON"];


// --- define / local variables ----------------------------
//var _runOnNode = "process" in global;
//var _runOnWorker = "WorkerLocation" in global;
//var _runOnBrowser = "document" in global;


// --- class / interfaces ----------------------------------
function WMURLShortener(opt) { // @ret this
//{@dev
    $args(WMURLShortener, arguments);
//}@dev
    opt = opt || {};
    this["retryCount"] = 0;
    this["maximumRetryCount"] = opt["maximumRetryCount"] || 10;
}


//{@dev
WMURLShortener["repository"] = "https://github.com/duxca/WMURLShortener.js"; // GitHub repository URL. http://git.io/Help
//}@dev

WMURLShortener["prototype"]["shorten"] = WMURLShortener_shorten; // WMURLShortener#shorten(url:URLString, callback:Function):void
WMURLShortener["prototype"]["expand"]  = WMURLShortener_expand;  // WMURLShortener#expand(url:URLString, callback:Function):void


// --- implements ------------------------------------------
function WMURLShortener_shorten(longUrl,    // @arg URLString
                                callback) { // @arg Function - callback(err:Error|null, str:String):void
                                            // @ret void
//{@dev
    $args(WMURLShortener_shorten, arguments);
//}@dev
    var that = this;
    var xhr = new XHRProxy();
    var retry = WMURLShortener_shorten["bind"](that, longUrl, callback);
    xhr["on"]("load", _createListener(that, xhr, retry, function(err){
        if(!!err) return callback(err, "");
        callback(null, xhr["response"]["id"]);
    }));
    xhr["open"]('POST', 'https://www.googleapis.com/urlshortener/v1/url', true);
    xhr["setRequestHeader"]('Content-Type', 'application/json');
    xhr["responseType"] = "json";
    xhr["send"](JSON["stringify"]({'longUrl': longUrl}));
}


function WMURLShortener_expand(shortUrl,   // @arg URLString
                               callback) { // @arg Function - callback(err:Error|null, str:String):void
                                           // @ret void
//{@dev
    $args(WMURLShortener_expand, arguments);
//}@dev
    var that = this;
    var xhr = new XHRProxy();
    var retry = WMURLShortener_expand["bind"](that, shortUrl, callback);
    xhr["on"]("load", _createListener(that, xhr, retry, function(err){
        if(!!err) return callback(err, "");
        callback(null, xhr["response"]["longUrl"]);
    }));
    xhr["open"]("GET", "https://www.googleapis.com/urlshortener/v1/url?shortUrl=" + shortUrl);
    xhr["responseType"] = "json";
    xhr["send"]();
}

function _createListener(that,      // @arg WMURLShortener
                         xhr,       // @arg XHRProxy
                         retry,     // @arg Function - callback():void
                         callback) {// @arg Function - callback(err:Error|null):void
                                    // @ret Function - callback():void
//{@dev
    $args(_createListener, arguments);
//}@dev
    return _listener;

    function _listener(){
        if (200 <= xhr["status"] && xhr["status"] < 300) {
            //{@dev
            console.info(JSON["stringify"](xhr["response"], null, "  "));
            //}@dev
            if(typeof xhr["response"]["error"] === "undefined"){
                callback(null);
            }else{
                callback(new Error(xhr["response"]["error"]["message"]));
            }
        } else if(xhr["status"] === 403 && that["retryCount"] < that["maximumRetryCount"]){
            that["retryCount"]++;
            var timeout = 3 * Math.pow(2, that["retryCount"]);
            console.info(xhr["status"]+": retrying "+timeout+"ms after... " +
                         that["retryCount"] + "/" + that["maximumRetryCount"]);
            setTimeout(retry, timeout);
        } else {
            //{@dev
            console.info(xhr["status"]);
            //}@dev
            callback(new Error(xhr["status"]));
        }
    }
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
    module["exports"] = WMURLShortener;
}

global["WMURLShortener" in global ? "WMURLShortener_" : "WMURLShortener"] = WMURLShortener;　// switch module.

})((this || 0).self || global); // WebModule idiom. http://git.io/WebModule