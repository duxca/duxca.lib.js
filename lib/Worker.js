"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t;
    return { next: verb(0), "throw": verb(1), "return": verb(2) };
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var Ajax_1 = require("./Ajax");
var Semaphore_1 = require("./Semaphore");
var Event_1 = require("./Event");
var IServerWorker = (function (_super) {
    __extends(IServerWorker, _super);
    function IServerWorker(importScriptsURLs, main) {
        var _this = _super.call(this) || this;
        _this.importScriptsURLs = importScriptsURLs;
        _this.main = main;
        _this.sem = new Semaphore_1.Semaphore(1);
        return _this;
    }
    IServerWorker.prototype.unload = function () {
        this.dispatchEvent(new Event("unload"));
        return Promise.resolve(void 0);
    };
    IServerWorker.prototype.addEventListener = function (event, listener) {
        return _super.prototype.addEventListener.apply(this, arguments);
    };
    ;
    IServerWorker.prototype.removeEventListener = function (event, listener) {
        return _super.prototype.addEventListener.apply(this, arguments);
    };
    IServerWorker.prototype.createSourceFileURL = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var blobURLs, importScriptText, mainScriptText, scriptText, mainScriptBlob, workerURL;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.all(this.importScriptsURLs.map(function (url) {
                            return Ajax_1.fetchBlob(url).then(URL.createObjectURL);
                        }))];
                    case 1:
                        blobURLs = _a.sent();
                        this.addEventListener("unload", function () { blobURLs.forEach(URL.revokeObjectURL); });
                        importScriptText = blobURLs.map(function (url) { return _this.createImportScript(url); }).join("\n");
                        mainScriptText = this.createMainFunction();
                        scriptText = [importScriptText, mainScriptText].join("\n");
                        mainScriptBlob = new Blob([scriptText], { type: "text/javascript" });
                        workerURL = URL.createObjectURL(mainScriptBlob);
                        blobURLs.push(workerURL);
                        return [2 /*return*/, workerURL];
                }
            });
        });
    };
    IServerWorker.prototype.request = function (event, data, transferable) {
        var _this = this;
        var msg = { event: event, data: data };
        var _resolve;
        var prm = new Promise(function (resolve) { return _resolve = resolve; });
        this.sem.addTask(function () { return _this.fetchMessageEvent().then(_resolve); });
        this.postMessage(msg, transferable);
        return prm.then(function (_a) {
            var data = _a.data;
            return data;
        });
    };
    return IServerWorker;
}(Event_1.EventTargetLike));
exports.IServerWorker = IServerWorker;
var IFrameWorker = (function (_super) {
    __extends(IFrameWorker, _super);
    function IFrameWorker() {
        return _super.apply(this, arguments) || this;
    }
    IFrameWorker.prototype.createImportScript = function (url) {
        return "<script src='" + url + "'></script>";
    };
    IFrameWorker.prototype.createMainFunction = function () {
        return "(" + this.main + ")();";
    };
    IFrameWorker.prototype.postMessage = function (data) {
        this.iframe.contentWindow.postMessage(data, "*");
    };
    IFrameWorker.prototype.fetchMessageEvent = function () {
        return Event_1.fetchEvent(this.iframe.contentWindow, "message", "error");
    };
    IFrameWorker.prototype.load = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var url;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.iframe = document.createElement("iframe");
                        this.iframe.setAttribute("style", "\n      position: absolute;\n      top: 0px;\n      left: 0px;\n      width: 0px;\n      height: 0px;\n      border: 0px;\n      margin: 0px;\n      padding: 0px;\n    ");
                        document.body.appendChild(this.iframe);
                        return [4 /*yield*/, this.createSourceFileURL()];
                    case 1:
                        url = _a.sent();
                        this.iframe.src = url;
                        //iframe.contentDocument.open();
                        //iframe.contentDocument.write();
                        //iframe.contentDocument.close();
                        this.addEventListener("unload", function () {
                            _this.iframe.removeAttribute("src");
                            _this.iframe.removeAttribute("srcdoc");
                            document.body.removeChild(_this.iframe);
                            _this.iframe = null;
                        });
                        return [4 /*yield*/, Event_1.fetchEvent(this.iframe, "load", "error")];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return IFrameWorker;
}(IServerWorker));
exports.IFrameWorker = IFrameWorker;
var ServerWorker = (function (_super) {
    __extends(ServerWorker, _super);
    function ServerWorker() {
        return _super.apply(this, arguments) || this;
    }
    ServerWorker.prototype.createImportScript = function (url) {
        return "self.importScripts('" + url + "');";
    };
    ServerWorker.prototype.createMainFunction = function () {
        return "(" + this.main + ")();";
    };
    ServerWorker.prototype.load = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var url;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.createSourceFileURL()];
                    case 1:
                        url = _a.sent();
                        this.worker = new Worker(url);
                        this.addEventListener("unload", function () {
                            _this.worker.terminate();
                            _this.worker = null;
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    ServerWorker.prototype.postMessage = function (data, transferable) {
        this.worker.postMessage(data, transferable);
    };
    ServerWorker.prototype.fetchMessageEvent = function () {
        return Event_1.fetchEvent(this.worker, "message", "error");
    };
    return ServerWorker;
}(IServerWorker));
exports.ServerWorker = ServerWorker;
