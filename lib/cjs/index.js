"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrashCatch = exports.CrashCatchConsumer = exports.CrashCatchProvider = exports.CrashCatchContext = void 0;
/**
* Crash Catch ReactJS Crash & Error Reporting Library
* Copyright (C) Devso 2021
*/
var react_1 = __importDefault(require("react"));
//import * as React from "react";
exports.CrashCatchContext = react_1.default.createContext(null);
exports.CrashCatchProvider = exports.CrashCatchContext.Provider;
exports.CrashCatchConsumer = exports.CrashCatchContext.Consumer;
var CrashCatch = /** @class */ (function () {
    function CrashCatch() {
        this.api_key = '';
        this.project_id = '';
        this.version = '';
        this.callback = null;
        this.is_initialised = false;
        this.crash_queue = [];
        this.device_id = '';
        this.cookie = null;
        this.initialiseAttempt = 0;
        this.do_lb = '';
    }
    CrashCatch.prototype.generateRandomDeviceID = function () {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (var i = 0; i < 20; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    };
    CrashCatch.prototype.setCookie = function (key, value, expire) {
        if (expire === void 0) { expire = false; }
        var d = new Date();
        if (!expire) {
            document.cookie = key + "=" + value + ";expires=Mon, 1 Jan " + (d.getFullYear() + 1) + " 12:00:00 UTC;";
        }
        else {
            var now = new Date();
            var minutes = 10;
            now.setTime(now.getTime() + (minutes * 60 * 1000));
            document.cookie = key + "=" + value + ";expires=" + now.toUTCString() + ";";
        }
    };
    CrashCatch.prototype.getCookie = function (cname) {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    };
    CrashCatch.prototype.initialiseCrashCatch = function (project_id, api_key, version, callback) {
        var _this = this;
        if (callback === void 0) { callback = null; }
        if (this.initialiseAttempt >= 3) {
            console.error("Initialisation attempt has failed too many times. Will no longer auto-retry");
            if (this.callback !== null) {
                this.callback({
                    result: -1,
                    message: "Initialisation attempt has failed too many times. Will no longer auto-retry"
                });
            }
        }
        if (typeof window !== typeof undefined) {
            window.onerror = function (_message, _source, _lineno, _colno, error) {
                _this.reportUnhandledException(error);
            };
        }
        this.api_key = api_key;
        this.project_id = project_id;
        this.version = version;
        this.callback = callback;
        var postArray = {
            ProjectID: this.project_id,
            ProjectVersion: this.version,
            DeviceID: ''
        };
        var deviceIDCookie = this.getCookie("DeviceID");
        if (deviceIDCookie !== null && deviceIDCookie !== "") {
            this.device_id = deviceIDCookie;
        }
        if (this.device_id === "") {
            this.device_id = this.generateRandomDeviceID();
        }
        this.setCookie("DeviceID", this.device_id);
        postArray.DeviceID = this.device_id;
        var sessionIDCookie = this.getCookie("session_id");
        if (sessionIDCookie !== null && sessionIDCookie !== "") {
            this.cookie = sessionIDCookie;
        }
        //Store the device id as a cookie so it can be reused
        this.setCookie("DeviceID", this.device_id, false);
        var main = this;
        this.sendRequest(postArray, "initialise").then(function (result) {
            try {
                if (result.result === 0) {
                    main.is_initialised = true;
                    main.crash_queue.forEach(function (crash) {
                        main.sendRequest(crash, "crash").then(function () {
                            //Nothing to do here as the result will be blank
                        }).catch(function (err) {
                            if (main.callback !== null) {
                                main.callback(err);
                            }
                        });
                    });
                    if (main.is_initialised) {
                        main.crash_queue = [];
                    }
                }
                else {
                    main.initialiseAttempt++;
                }
                if (callback !== null) {
                    callback(result);
                }
            }
            catch (err) {
            }
        }).catch(function (err) {
            if (callback !== null) {
                callback(err);
            }
        });
    };
    CrashCatch.prototype.sendRequest = function (postArray, endpoint) {
        var main = this;
        return new Promise(function (resolve, reject) {
            var url = "https://engine.crashcatch.com/api/";
            url += endpoint;
            var headers = null;
            if ((main.cookie !== null) && main.cookie !== "") {
                headers = {
                    'Content-Type': 'application/json',
                    'authorisation-token': main.api_key,
                    'session_id': main.cookie,
                };
            }
            else {
                headers = {
                    'Content-Type': 'application/json',
                    'authorisation-token': main.api_key
                };
            }
            fetch(url, {
                method: 'post',
                body: JSON.stringify(postArray),
                //crossDomain: true,
                headers: headers
            }).then(function (response) {
                if (response.status !== 200) {
                    reject(response);
                }
                else {
                    if (endpoint === "initialise") {
                        main.setCookie("session_id", response.headers.get("session_id"));
                        main.cookie = main.getCookie("session_id");
                        main.is_initialised = true;
                    }
                    response.text().then(function (text) {
                        if (text.length > 0) {
                            var json = JSON.parse(text);
                            //If result = 4 then take the post data and add it to the crash queue
                            if (json.result === 4 && endpoint === 'crash') {
                                main.crash_queue.push(postArray);
                                if (main.is_initialised) {
                                    main.initialiseCrashCatch(main.project_id, main.api_key, main.version, main.callback);
                                }
                            }
                            if (json.result === 0 && main.crash_queue.length > 0 && endpoint === 'initialise') {
                                main.crash_queue.forEach(function (crash) {
                                    if (main.is_initialised) {
                                        main.sendRequest(crash, 'crash').then(function () {
                                            //Nothing to do here
                                        });
                                    }
                                });
                                main.crash_queue = [];
                            }
                            resolve(json);
                        }
                        else {
                            resolve(null);
                        }
                    }).catch(function (err) {
                        var result = {
                            result: 1,
                            message: 'An converting Crash Catch Response to JSON: ' + err.toString()
                        };
                        reject(result);
                    });
                }
            }).catch(function (err) {
                var result = {
                    result: 1,
                    message: 'An error occurred sending request to request to Crash Catch: ' + err.toString()
                };
                reject(result);
            });
        });
    };
    CrashCatch.prototype.getPostArray = function (exception, exceptionMsg, severity, handledException) {
        var postArray = {
            Severity: severity,
            ScreenResolution: "",
            Locale: navigator.language,
            ProjectID: this.project_id,
            CrashType: handledException ? "Handled" : "Unhandled",
            DeviceID: this.device_id,
            ExceptionMessage: exceptionMsg,
            ExceptionType: '',
            Stacktrace: '',
            LineNo: '',
            ClassFile: '',
            JSFile: '',
            VersionName: '',
            BrowserWidthHeight: '',
            DeviceType: 'ReactJS',
            Browser: '',
            BrowserVersion: '',
            CustomProperty: ''
        };
        if (typeof exception.stack === typeof undefined) {
            //If it is a handled exception, then there might not be a stack
            var err = new Error();
            postArray.Stacktrace = err.stack;
        }
        else {
            postArray.Stacktrace = exception.stack;
        }
        //Now we have a stack get the line number
        postArray.LineNo = this.getLineNoFromStacktrace(postArray.Stacktrace);
        postArray.JSFile = this.getJSFileFromStacktrace(postArray.Stacktrace);
        if (postArray.JSFile.length === 0) {
            postArray.JSFile = "N/A";
        }
        var lineNo = parseInt(postArray.LineNo);
        if (isNaN(lineNo)) {
            postArray.LineNo = "0";
        }
        else {
            postArray.LineNo = lineNo.toString();
        }
        postArray.VersionName = this.version;
        postArray.ScreenResolution = screen.width + " x " + screen.height;
        postArray.BrowserWidthHeight = document.documentElement.clientWidth + " x " +
            document.documentElement.clientHeight;
        postArray.DeviceType = "ReactJS";
        var browserDetails = this.identifyBrowser();
        postArray.Browser = browserDetails.browser;
        postArray.BrowserVersion = browserDetails.version;
        return postArray;
    };
    CrashCatch.prototype.reportUnhandledException = function (exception) {
        var lines = exception.toString().split(/\r?\n/);
        var msg = lines[0];
        var postArray = this.getPostArray(exception, msg, "High", false);
        var customProperties = {};
        if (typeof window !== typeof undefined) {
            customProperties.Url = window.location.href;
        }
        postArray.CustomProperty = JSON.stringify(customProperties);
        postArray.Severity = "High";
        var main = this;
        if (this.is_initialised) {
            this.sendRequest(postArray, "crash").then(function (result) {
                if (main.callback !== null) {
                    main.callback(result);
                }
            }).catch(function (err) {
                if (main.callback !== null) {
                    main.callback(err);
                }
            });
        }
        else {
            this.crash_queue.push(postArray);
        }
    };
    CrashCatch.prototype.reportCrash = function (exception, severity, customProperties) {
        if (customProperties === void 0) { customProperties = null; }
        //Check that we received a valid severity
        switch (severity) {
            case "Low":
            case "Medium":
            case "High":
                break;
            default:
                console.error("Invalid severity specified: " + severity);
                return;
        }
        var lines = exception.toString().split(/\r?\n/);
        var msg = lines[0];
        var postArray = this.getPostArray(exception, msg, severity, true);
        if (customProperties !== null) {
            if (typeof customProperties === typeof String) {
                var currentProperties = JSON.parse(customProperties);
                if (typeof window !== typeof undefined) {
                    currentProperties.Url = window.location.href;
                }
                postArray.CustomProperty = JSON.stringify(customProperties);
            }
            else {
                if (typeof window !== typeof undefined) {
                    customProperties.Url = window.location.href;
                }
                postArray.CustomProperty = JSON.stringify(customProperties);
            }
        }
        else {
            if (typeof window !== typeof undefined) {
                customProperties = {};
                customProperties.Url = window.location.href;
                postArray.CustomProperty = JSON.stringify(customProperties);
            }
        }
        if (this.is_initialised) {
            var main_1 = this;
            this.sendRequest(postArray, "crash").then(function () {
            }).catch(function (err) {
                if (main_1.callback !== null) {
                    main_1.callback(err);
                }
            });
        }
        else {
            this.crash_queue.push(postArray);
            //this.initialiseCrashCatch(this.project_id, this.api_key, this.version, this.callback);
        }
    };
    CrashCatch.prototype.getLineNoFromStacktrace = function (stack) {
        document.write(stack);
        var stackSplit = stack.split(/\r?\n/);
        var updatedStackArray = [];
        stackSplit.forEach(function (line) {
            if (line.indexOf("CrashCatch") === -1) {
                updatedStackArray.push(line);
            }
        });
        stack = updatedStackArray.join('\n');
        var line = updatedStackArray[0];
        var parts = line.split(":");
        //Subtract -2 as the end of the script will contain line:character and we don't need the character
        return parts[parts.length - 2];
    };
    CrashCatch.prototype.getJSFileFromStacktrace = function (stack) {
        var stackSplit = stack.split(/\r?\n/);
        if (stackSplit.length >= 1) {
            var lineWithJSError = stackSplit[1];
            var jsLoc = lineWithJSError.substr(lineWithJSError.indexOf("(") + 1);
            jsLoc = jsLoc.replace("http://", "").replace("https://", "");
            jsLoc = jsLoc.substr(0, jsLoc.indexOf(":"));
            if (typeof window !== typeof undefined) {
                jsLoc = jsLoc.replace(window.location.hostname, "");
            }
            return jsLoc;
        }
        else {
            return "N/A";
        }
    };
    CrashCatch.prototype.identifyBrowser = function () {
        var regexps = {
            'Chrome': [/Chrome\/(\S+)/],
            'Firefox': [/Firefox\/(\S+)/],
            'MSIE': [/MSIE (\S+);/],
            'Opera': [
                /Opera\/.*?Version\/(\S+)/,
                /Opera\/(\S+)/
            ],
            'Safari': [/Version\/(\S+).*?Safari\//]
        };
        var re = null;
        var m = null;
        var browser = null;
        var version = null;
        var userAgent = navigator.userAgent;
        var elements = 2;
        for (browser in regexps) {
            while (re = regexps[browser].shift()) {
                if (m = userAgent.match(re)) {
                    version = (m[1].match(new RegExp('[^.]+(?:\.[^.]+){0,' + --elements + '}')))[0];
                    //return browser + ' ' + version);
                    var returnVal = {
                        browser: browser,
                        version: version
                    };
                    return returnVal;
                }
            }
        }
        return {
            browser: "N/A",
            version: "N/A"
        };
    };
    return CrashCatch;
}());
exports.CrashCatch = CrashCatch;
//module.exports.CrashCatch = CrashCatch;
