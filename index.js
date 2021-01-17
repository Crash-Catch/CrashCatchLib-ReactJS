/**
* Crash Catch ReactJS Crash & Error Reporting Library
* Copyright (C) Boardies IT Solutions 2021
*/

class CrashCatch
{
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
    }

    generateRandomDeviceID()
    {
        let text = "";
        const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (let i = 0; i < 20; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }

    setCookie(key, value, expire = false)
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

    getCookie(cname)
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

    initialiseCrashCatch(project_id, api_key, version, callback = null)
    {
        this.api_key = api_key;
        this.project_id = project_id;
        this.version = version;
        this.callback = callback;

        console.log("API Key: " + this.api_key);
        console.log("App ID: " + this.project_id);
        console.log("Version: " + this.version);

        const postArray = {
            ProjectID: this.project_id,
            AppVersion: this.version
        }

        const deviceIDCookie = this.getCookie("DeviceID");

        console.log("Device ID Cookie: " + deviceIDCookie);

        if (deviceIDCookie !== "")
        {
            this.device_id = deviceIDCookie;
        }

        console.log("this.device_id is: " + this.device_id);

        if (this.device_id === "")
        {
            console.log("Generating device id");
            this.device_id = this.generateRandomDeviceID();
            console.log("Device ID is: " + this.device_id);

        }

        postArray.DeviceID = this.device_id;

        const sessionIDCookie = this.getCookie("session_id")
        if (sessionIDCookie !== "")
        {
            this.cookie = sessionIDCookie;
        }


        //Store the device id as a cookie so it can be reused
        this.setCookie("DeviceID", this.device_id, false);

        this.is_initialised = true;



        const main = this;
        this.sendRequest(postArray, "initialise").then(function(result){
            if (result.result === 0)
            {
                main.crash_queue.forEach(crash => {
                    main.sendRequest(crash, "crash").then(function(result){
                        //Nothing to do here as the result will be blank
                    }).catch(function(err){
                        if (main.callback !== null)
                        {
                            main.callback(err);
                        }
                    });
                });
            }
            if (callback !== null)
            {
                callback(result);
            }
        }).catch(function(err){
            if (callback !== null)
            {
                callback(err);
            }
        });

        window.onerror = (message, source, lineno, colno, error) => {
            console.log("Handling unhandled error");
            //this.reportCrash(error, "High", null);
            this.reportUnhandledException(error);
        }


    }


    sendRequest(postArray, endpoint)
    {
        console.log("Sending Request");
        const main = this;
        return new Promise(function(resolve, reject)
        {
            let url = "https://engine.crashcatch.com/";
            
            url += endpoint;

            let formBody = [];
            for (const property in postArray) {
                const encodedKey = encodeURIComponent(property);
                const encodedValue = encodeURIComponent(postArray[property]);
                formBody.push(encodedKey + "=" + encodedValue);
            }
            formBody = formBody.join("&");
            fetch(url, {
                method: 'post',
                body: formBody,
                crossDomain: true,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'authorisation-token': main.api_key,
                    'session_id': main.cookie,
                }
            }).then(function (response)
            {
                if (response.status !== 200)
                {
                    reject(response);
                }
                else
                {
                    response.text().then(function (text)
                    {
                        if (text.length > 0)
                        {
                            const json = JSON.parse(text);
                            resolve(json);
                        }
                        else
                        {
                            resolve();
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


    getPostArray(exception, exceptionMsg, severity, handledException)
    {
        const postArray = { };
        postArray.Severity = severity;
        if (exceptionMsg.indexOf(":") >= 0)
        {
            postArray.ExceptionType = exceptionMsg.substring(0, exceptionMsg.indexOf(":"));
            postArray.ExceptionMessage = exceptionMsg.substring(exceptionMsg.indexOf(":")+1).trim();
        }
        else
        {
            postArray.ExceptionType = exceptionMsg;
            postArray.ExceptionMessage = exceptionMsg;
        }
        postArray.ScreenResolution = "";
        postArray.Locale = navigator.language;
        postArray.ProjectID = this.project_id;
        postArray.CrashType = handledException ? "Handled" : "Unhandled"
        postArray.DeviceID = this.device_id;

        postArray.Stacktrace = exception.stack

        //Now we have a stack get the line number
        postArray.LineNo = this.getLineNoFromStacktrace(postArray.Stacktrace);
        postArray.JSFile = this.getJSFileFromStacktrace(postArray.Stacktrace);

        postArray.VersionName = this.version;

        postArray.ScreenResolution = screen.width + " x " + screen.height;
        postArray.BrowserWidthHeight = document.documentElement.clientWidth + " x " +
            document.documentElement.clientHeight;
        postArray.DeviceType = "ReactJS";

        const browserDetails = this.identifyBrowser();
        postArray.Browser = browserDetails.browser;
        postArray.BrowserVersion = browserDetails.version;

        return postArray;
    }

    reportUnhandledException(exception)
    {
        const lines = exception.toString().split(/\r?\n/);
        const msg = lines[0];

        const postArray = this.getPostArray(exception, msg);

        const customProperties = {};
        customProperties.Url = window.location.href;

        postArray.CustomProperty = JSON.stringify(customProperties);
        postArray.Severity = "High";

        const main = this;
        this.sendRequest(postArray, "crash").then(function(result){
            if (main.callback !== null)
            {
                main.callback(result);
            }
        }).catch(function(err){
            if (main.callback !== null)
            {
                main.callback(err);
            }
        })
    }

    reportCrash(exception, severity, customProperties = null)
    {

            console.log("Here is the exception for project id " + this.project_id);
            console.log(exception);


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
                    currentProperties.Url = window.location.href;
                    postArray.CustomProperty = JSON.stringify(customProperties);
                }
                else
                {
                    customProperties.Url = window.location.href;
                    postArray.CustomProperty = JSON.stringify(customProperties);
                }
            }
            else
            {
                customProperties = { };
                customProperties.Url = window.location.href;
                postArray.CustomProperty = JSON.stringify(customProperties);
            }

            console.log("Post array is");
            console.log(postArray);


        if (this.is_initialised)
        {
            const main = this;
            this.sendRequest(postArray, "crash").then(function(result){

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
            this.initialiseCrashCatch(this.api_key, this.project_id, this.version, this.callback);
        }
    }

    getLineNoFromStacktrace(stack)
    {
        console.log("The stack is");
        console.log(stack);
        const stackSplit = stack.split(/\r?\n/);

        console.log(stackSplit);

        console.log("Stack line 1: ");
        console.log(stack);

        /*stack = stack.replace("http://");
        stack = stack.replace("https://");
        //Get the first colon (:), after this is the line number)*/
        const lineInfo = stack.substring(stack.indexOf(":")+1);

        console.log("Line info: " + lineInfo);
        //Now what we have left, the colon next is the end of the line number

        return lineInfo.substring(0, lineInfo.indexOf(":"));
    }

    getJSFileFromStacktrace(stack)
    {
        const stackSplit = stack.split(/\r?\n/);
        if (stackSplit.length >= 1) {
            const lineWithJSError = stackSplit[1];
            let jsLoc = lineWithJSError.substr(lineWithJSError.indexOf("(")+1);
            jsLoc = jsLoc.replace("http://", "").replace("https://", "");
            jsLoc = jsLoc.substr(0, jsLoc.indexOf(":"));
            jsLoc = jsLoc.replace(window.location.hostname, "");

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
                    const returnVal = {
                        "browser": browser,
                        "version": version
                    };
                    return returnVal;
                }
            }
        }
    }

}

module.exports.CrashCatch = CrashCatch;

/*const initialiseCrashCatch = (api_key, project_id, version, callback = null) => {
    console.log("API Key: " + api_key);
    console.log("App ID: " + project_id);
    console.log("Version: " + version);

    if (callback !== null)
    {
        callback(true);
    }
}

const reportCrash = (exception, severity) => {
    console.log("Here is the exception");
    console.error(exception);
}

module.exports.initialiseCrashCatch = initialiseCrashCatch;
module.exports.reportCrash = reportCrash;*/