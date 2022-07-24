/**
* Crash Catch ReactJS Crash & Error Reporting Library
* Copyright (C) Devso 2021
*/
import React from "react";

//import * as React from "react";

export const CrashCatchContext = React.createContext(null);

export const CrashCatchProvider = CrashCatchContext.Provider;
export const CrashCatchConsumer = CrashCatchContext.Consumer;


type EngineAPIResult = {
    result: number,
    message: string,
    data?: any
}

type BrowserType = {
    browser: string,
    version: string
}

type CrashPostData = {
    ExceptionType: string,
    ExceptionMessage: string,
    ScreenResolution: string,
    Locale: string,
    ProjectID: string,
    CrashType: string,
    DeviceID: string,
    Stacktrace: string,
    LineNo: string|number,
    ClassFile: string,
    JSFile: string
    VersionName: string,
    BrowserWidthHeight: string,
    DeviceType: string,
    Browser: string,
    BrowserVersion: string,
    Severity: string,
    CustomProperty: string & any
}

type InitialisePostData = {
    ProjectID: string,
    DeviceID: string,
    ProjectVersion: string
}

export class CrashCatch
{
    api_key: string
    project_id: string
    version: string
    callback: (result: EngineAPIResult) => void;
    is_initialised: boolean
    crash_queue: Array<CrashPostData | InitialisePostData>
    device_id: string
    cookie: string
    initialiseAttempt: number
    do_lb: string
    constructor()
    {
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

    generateRandomDeviceID()
    {
        let text = "";
        const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (let i = 0; i < 20; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }

    setCookie(key: string, value: string, expire = false)
    {
        const d = new Date();
        if (!expire)
        {
            document.cookie = key + "=" + value + ";expires=Mon, 1 Jan " + (d.getFullYear() + 1) + " 12:00:00 UTC;";
        }
        else
        {
            const now = new Date();
            const minutes = 10;
            now.setTime(now.getTime() + (minutes * 60 * 1000));

            document.cookie = key + "=" + value + ";expires=" + now.toUTCString() + ";";
        }

    }

    getCookie(cname: string)
    {
        const name = cname + "=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const ca = decodedCookie.split(';');
        for(let i = 0; i <ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }

    initialiseCrashCatch(project_id: string, api_key: string, version:string, callback: (result: EngineAPIResult) => void = null)
    {

        if (this.initialiseAttempt >= 3)
        {
            console.error("Initialisation attempt has failed too many times. Will no longer auto-retry");
            if (this.callback !== null)
            {
                this.callback({
                    result: -1,
                    message: "Initialisation attempt has failed too many times. Will no longer auto-retry"
                });
            }
        }
        if (typeof window !== typeof undefined) {
            window.onerror = (_message, _source, _lineno, _colno, error: Error|undefined) => {

                this.reportUnhandledException(error);
            }
        }
        this.api_key = api_key;
        this.project_id = project_id;
        this.version = version;
        this.callback = callback;

        const postArray : InitialisePostData = {
            ProjectID: this.project_id,
            ProjectVersion: this.version,
            DeviceID: ''
        }

        const deviceIDCookie = this.getCookie("DeviceID");


        if (deviceIDCookie !== null && deviceIDCookie !== "")
        {
            this.device_id = deviceIDCookie;
        }


        if (this.device_id === "")
        {
            this.device_id = this.generateRandomDeviceID();
        }

        this.setCookie("DeviceID", this.device_id);

        postArray.DeviceID = this.device_id;

        const sessionIDCookie = this.getCookie("session_id")
        if (sessionIDCookie !== null && sessionIDCookie !== "")
        {
            this.cookie = sessionIDCookie;
        }


        //Store the device id as a cookie so it can be reused
        this.setCookie("DeviceID", this.device_id, false);

        const main = this;
        this.sendRequest(postArray, "initialise").then(function(result: EngineAPIResult){
            try {

                if (result.result === 0) {
                    main.is_initialised = true;

                    main.crash_queue.forEach(crash => {
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
                } else {
                    main.initialiseAttempt++;
                }
                if (callback !== null) {
                    callback(result);
                }
            }
            catch (err)
            {
            }
        }).catch(function(err){

            if (callback !== null)
            {
                callback(err);
            }
        });




    }


    sendRequest(postArray: CrashPostData | InitialisePostData, endpoint: string)
    {
        const main = this;
                
        return new Promise(function(resolve, reject)
        {
            let url = "https://engine.crashcatch.com/api/";
            
            url += endpoint;


            let headers = null;
            if ((main.cookie !== null) && main.cookie !== "")
            {
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
            }).then(function (response)
            {
                if (response.status !== 200)
                {
                    reject(response);
                }
                else
                {
                    if (endpoint === "initialise")
                    {

                        main.setCookie("session_id", response.headers.get("session_id"));
                        main.cookie = main.getCookie("session_id");
                        main.is_initialised = true;


                    }
                    response.text().then(function (text)
                    {
                        if (text.length > 0)
                        {
                            const json = JSON.parse(text);
                            //If result = 4 then take the post data and add it to the crash queue

                            if (json.result === 4 && endpoint === 'crash')
                            {
                                main.crash_queue.push(postArray);
                                if (main.is_initialised) {
                                    main.initialiseCrashCatch(main.project_id, main.api_key, main.version, main.callback);
                                }
                            }
                            if (json.result === 0 && main.crash_queue.length > 0 && endpoint === 'initialise')
                            {
                                main.crash_queue.forEach(crash => {
                                    if (main.is_initialised)
                                    {
                                        main.sendRequest(crash, 'crash').then(function(){
                                            //Nothing to do here
                                        });
                                    }

                                });
                                main.crash_queue = [];
                            }


                            resolve(json);
                        }
                        else
                        {
                            resolve(null);
                        }
                    }).catch(function (err)
                    {
                        const result = {
                            result: 1,
                            message: 'An converting Crash Catch Response to JSON: ' + err.toString()
                        }
                        reject(result);
                    });
                }
            }).catch(function (err)
            {
                const result = {
                    result: 1,
                    message: 'An error occurred sending request to request to Crash Catch: ' + err.toString()
                }
                reject(result);
            });
        });
    }


    getPostArray(exception : Error, exceptionMsg : string, severity: string, handledException: boolean)
    {
        const postArray : CrashPostData = {
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

        if (typeof exception.stack ===typeof undefined )
        {
            //If it is a handled exception, then there might not be a stack
            const err = new Error();

            postArray.Stacktrace = err.stack;
        }
        else
        {
            postArray.Stacktrace = exception.stack
        }


        //Now we have a stack get the line number
        postArray.LineNo = this.getLineNoFromStacktrace(postArray.Stacktrace);
        postArray.JSFile = this.getJSFileFromStacktrace(postArray.Stacktrace);

        if (postArray.JSFile.length === 0)
        {
            postArray.JSFile = "N/A";
        }

        const lineNo = parseInt(postArray.LineNo);

        if (isNaN(lineNo))
        {
            postArray.LineNo = "0";
        }
        else
        {
            postArray.LineNo = lineNo.toString();
        }

        postArray.VersionName = this.version;

        postArray.ScreenResolution = screen.width + " x " + screen.height;
        postArray.BrowserWidthHeight = document.documentElement.clientWidth + " x " +
            document.documentElement.clientHeight;
        postArray.DeviceType = "ReactJS";

        const browserDetails : BrowserType = this.identifyBrowser();
        postArray.Browser = browserDetails.browser;
        postArray.BrowserVersion = browserDetails.version;

        return postArray;
    }

    reportUnhandledException(exception: Error)
    {
        const lines = exception.toString().split(/\r?\n/);
        const msg = lines[0];

        const postArray = this.getPostArray(exception, msg, "High", false);

        let customProperties : string & any = {};

        if (typeof window !== typeof undefined) {
            customProperties.Url = window.location.href;
        }
        postArray.CustomProperty = JSON.stringify(customProperties);
        postArray.Severity = "High";

        const main = this;
        if (this.is_initialised)
        {
            this.sendRequest(postArray, "crash").then(function (result: EngineAPIResult)
            {
                if (main.callback !== null)
                {
                    main.callback(result);
                }
            }).catch(function (err)
            {
                if (main.callback !== null)
                {
                    main.callback(err);
                }
            })
        }
        else
        {
            this.crash_queue.push(postArray);
        }
    }

    reportCrash(exception: Error, severity: string, customProperties : string & any = null)
    {
            //Check that we received a valid severity
            switch (severity)
            {
                case "Low":
                case "Medium":
                case "High":
                    break;
                default:
                    console.error("Invalid severity specified: " + severity);
                    return;
            }

            const lines = exception.toString().split(/\r?\n/);
            const msg = lines[0];

            const postArray = this.getPostArray(exception, msg, severity, true);

            if (customProperties !== null)
            {
                if (typeof customProperties === typeof String)
                {
                    const currentProperties = JSON.parse(customProperties);
                    if (typeof window !== typeof undefined)
                    {
                        currentProperties.Url = window.location.href;
                    }
                    postArray.CustomProperty = JSON.stringify(customProperties);
                }
                else
                {
                    if (typeof window !== typeof undefined) {
                        customProperties.Url = window.location.href;
                    }
                    postArray.CustomProperty = JSON.stringify(customProperties);
                }
            }
            else
            {
                if (typeof window !== typeof undefined)
                {
                    customProperties = { };
                    customProperties.Url = window.location.href;
                    postArray.CustomProperty = JSON.stringify(customProperties);
                }
            }


        if (this.is_initialised)
        {
            const main = this;
            this.sendRequest(postArray, "crash").then(function(){

            }).catch(function(err){
                if (main.callback !== null)
                {
                    main.callback(err);
                }
            })
        }
        else
        {
            this.crash_queue.push(postArray);
            //this.initialiseCrashCatch(this.project_id, this.api_key, this.version, this.callback);
        }
    }

    getLineNoFromStacktrace(stack: string)
    {
        const stackSplit = stack.split(/\r?\n/);

        const updatedStackArray : Array<string> = [];

        stackSplit.forEach(line => {
            if (line.indexOf("CrashCatch") === -1)
            {
                updatedStackArray.push(line);
            }
        })

        stack = updatedStackArray.join('\n')

        const line = updatedStackArray[0];

        const parts = line.split(":");
        //Subtract -2 as the end of the script will contain line:character and we don't need the character
        return parts[parts.length-2];
    }

    getJSFileFromStacktrace(stack: string)
    {
        const stackSplit = stack.split(/\r?\n/);
        if (stackSplit.length >= 1) {
            const lineWithJSError = stackSplit[1];
            let jsLoc = lineWithJSError.substr(lineWithJSError.indexOf("(")+1);
            jsLoc = jsLoc.replace("http://", "").replace("https://", "");
            jsLoc = jsLoc.substr(0, jsLoc.indexOf(":"));
            if (typeof window !== typeof undefined) {
                jsLoc = jsLoc.replace(window.location.hostname, "");
            }
            return jsLoc;
        }
        else
        {
            return "N/A";
        }
    }
    identifyBrowser()
    {
        const regexps = {
                'Chrome': [/Chrome\/(\S+)/],
                'Firefox': [/Firefox\/(\S+)/],
                'MSIE': [/MSIE (\S+);/],
                'Opera': [
                    /Opera\/.*?Version\/(\S+)/,
                    /Opera\/(\S+)/
                ],
                'Safari': [/Version\/(\S+).*?Safari\//]
            };

        let re = null;
        let m = null;
        let browser = null;
        let version = null;

        let userAgent = navigator.userAgent;
        let elements = 2;
        for (browser in regexps)
        {
            while (re = regexps[browser].shift())
            {
                if (m = userAgent.match(re))
                {
                    version = (m[1].match(new RegExp('[^.]+(?:\.[^.]+){0,' + --elements + '}')))[0];
                    //return browser + ' ' + version);
                    const returnVal : BrowserType = {
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
        }
    }

}

//module.exports.CrashCatch = CrashCatch;
