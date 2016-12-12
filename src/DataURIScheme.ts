(function(global) {
"use strict";

// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------
//var _runOnNode = "process" in global;
//var _runOnWorker = "WorkerLocation" in global;
//var _runOnBrowser = "document" in global;

// --- class / interfaces ----------------------------------
var DataURIScheme = {};

//{@dev
DataURIScheme["repository"] = "https://github.com/duxca/WMDataURIScheme.js"; // GitHub repository URL. http://git.io/Help
//}@dev

DataURIScheme["StringToDataURI"] = DataURIScheme_StringToDataURI; // DataURIScheme.StringToDataURI(str, mimetype, callback):void
DataURIScheme["DataURIToString"] = DataURIScheme_DataURIToString; // DataURIScheme.DataURIToString(dataURI, callback):void

// --- implements -------------------------------------------
function DataURIScheme_StringToDataURI(str,        // @arg String
                                       mimeType,   // @arg MimeTypeString
                                       callback) { // @arg Function - callback(err:Error|null, String:DataURISchemeString):void
                                                   // @ret void
//{@dev
    $args(DataURIScheme_StringToDataURI, arguments);
//}@dev
    var reader = new FileReader();
    reader.addEventListener("loadend", function() {
        var dataURI = reader.result.replace(";base64,", ";charset=utf-8;base64,");
        // example: data:text/plain;charset=utf-8;base64,YfCgrp9i8J+SqQ==
        //{@dev
        console.info(dataURI);
        //}@dev
        callback(null, dataURI);
    });
    reader.addEventListener("error", function(ev) {
        var err = new Error(ev.target.error.name+": "+ev.target.error.message);
        console.info(err);
        callback(err, "");
    });
    reader.readAsDataURL(new Blob([str], {type: mimeType}));
}

function DataURIScheme_DataURIToString(dataURI,    // @arg DataURISchemeString
                                       callback) { // @arg Function - callback(err:Error|null, String):void
                                                   // @ret void
//{@dev
    $args(DataURIScheme_DataURIToString, arguments);
//}@dev
    if(!/^data\:.*?base64\,.+/.test(dataURI)){
        setTimeout(function(){
            callback(new Error("Unvalid format. "+dataURI), "");
        });
        return;
    }
    var tmp = dataURI.split(',');
    var mimeType = tmp[0].split(':')[1].split(';')[0];
    var byteString = atob(tmp[1]);
    var bytes = new Uint8Array(byteString.length);
    for (var i=0; i < bytes.length; i++) {
        bytes[i] = byteString.charCodeAt(i);
    }
    var reader = new FileReader();
    reader.addEventListener("loadend", function() {
        //{@dev
        console.info(reader.result);
        //}@dev
        callback(null, reader.result);
    });
    reader.addEventListener("error", function(ev) {
        var err = new Error(ev.target.error.name+": "+ev.target.error.message);
        console.info(err);
        callback(err, "");
    });
    reader.readAsText(new Blob([bytes.buffer], {type: mimeType}));
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
    module["exports"] = DataURIScheme;
}
global["WMDataURIScheme" in global ? "WMDataURIScheme_" : "WMDataURIScheme"] = DataURIScheme; // switch module. http://git.io/Minify

})((this || 0).self || global); // WebModule idiom. http://git.io/WebModule