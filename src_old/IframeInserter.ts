(function(global) {
"use strict";

// --- dependency modules ----------------------------------
var DataURIScheme = global["WMDataURIScheme"] || require("duxca.wmdataurischeme.js");

// --- define / local variables ----------------------------
//var _runOnNode = "process" in global;
//var _runOnWorker = "WorkerLocation" in global;
//var _runOnBrowser = "document" in global;

// --- class / interfaces ----------------------------------
function IframeInserter(iframeElement) { // @arg HTMLIFrameElement comment
//{@dev
    $args(IframeInserter, arguments);
    //Valid(Valid.type(iframeElement, "HTMLIFrameElement"), IframeInserter, "iframeElement");
//}@dev
    this.iframe = iframeElement;
}

//{@dev
IframeInserter["repository"] = "https://github.com/duxca/IframeInserter.js"; // GitHub repository URL. http://git.io/Help
//}@dev

IframeInserter["prototype"]["write"]   = IframeInserter_write;     // IframeInserter#write(  code:String):void
IframeInserter["prototype"]["blobURL"] = IframeInserter_blobURL;   // IframeInserter#blobURL(code:String):void
IframeInserter["prototype"]["srcdoc"]  = IframeInserter_srcdoc;    // IframeInserter#srcdoc( code:String):void
IframeInserter["prototype"]["dataURI"] = IframeInserter_dataURI;   // IframeInserter#dataURI(code:String):void
IframeInserter["prototype"]["message"] = IframeInserter_message;   // IframeInserter#message(code:String):void

// --- implements ------------------------------------------
function IframeInserter_write(code){ // @arg String
                                     // @ret void
//{@dev
    $args(IframeInserter_write, arguments);
//}@dev
    this.iframe.contentDocument.open();
    this.iframe.contentDocument.write(code);
    this.iframe.contentDocument.close();
}

function IframeInserter_blobURL(code){ // @arg String
                                       // @ret void
//{@dev
    $args(IframeInserter_blobURL, arguments);
//}@dev
    var url = URL.createObjectURL(new Blob([code], {"type": "text/html"}));
    this.iframe.setAttribute("src", url);
}

function IframeInserter_srcdoc(code){ // @arg String
                                      // @ret void
//{@dev
    $args(IframeInserter_srcdoc, arguments);
//}@dev
    this.iframe.setAttribute("srcdoc", code);
}

function IframeInserter_dataURI(code){ // @arg String
                                       // @ret void
//{@dev
    $args(IframeInserter_dataURI, arguments);
//}@dev
    var iframe = this.iframe;
    DataURIScheme["StringToDataURI"](code, "text/html", function(err, dataURI){
        if(!!err) return console.error(err);
        iframe.setAttribute("src", dataURI);
    });
}

function IframeInserter_message(code, src){ // @arg String
    var that = this;
    src = src || "iframe.html";
    this.iframe.setAttribute("src", src);
    this.iframe.addEventListener("load", function _handler(){
        that.iframe.removeEventListener("load", _handler);
        that.iframe.contentWindow.postMessage(code, "*");
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

// --- exports ----------------------------------------------
if ("process" in global) {
    module["exports"] = IframeInserter;
}
global["WMIframeInserter" in global ? "WMIframeInserter_" : "WMIframeInserter"] = IframeInserter; // switch module. http://git.io/Minify

})((this || 0).self || global); // WebModule idiom. http://git.io/WebModule