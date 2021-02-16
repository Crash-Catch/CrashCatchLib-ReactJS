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

        this.initialiseAttempt = 0;
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
        window.onerror = (message, source, lineno, colno, error) => {

            this.reportUnhandledException(error);
        }

        this.api_key = api_key;
        this.project_id = project_id;
        this.version = version;
        this.callback = callback;

        const postArray = {
            ProjectID: this.project_id,
            AppVersion: this.version
        }

        const deviceIDCookie = this.getCookie("DeviceID");


        if (deviceIDCookie !== "")
        {
            this.device_id = deviceIDCookie;
        }


        if (this.device_id === "")
        {
            this.device_id = this.generateRandomDeviceID();
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
            else
            {
                main.initialiseAttempt++;
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




    }


    sendRequest(postArray, endpoint)
    {
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

            let headers = null;
            if ((main.cookie !== null) && main.cookie !== "")
            {
                headers = {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'authorisation-token': main.api_key,
                    'session_id': main.getCookie("session_id"),
                };
            }
            else
            {
                headers = {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'authorisation-token': main.api_key
                };
            }

            fetch(url, {
                method: 'post',
                body: formBody,
                crossDomain: true,
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
                    }
                    response.text().then(function (text)
                    {
                        if (text.length > 0)
                        {
                            const json = JSON.parse(text);
                            //If result = 4 then take the post data and add it to the crash queue

                            if (json.result === 4)
                            {
                                main.crash_queue.push(postArray);
                                main.initialiseCrashCatch(main.project_id, main.api_key, main.version, main.callback);
                            }

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
       
        postArray.ScreenResolution = "";
        postArray.Locale = navigator.language;
        postArray.ProjectID = this.project_id;
        postArray.CrashType = handledException ? "Handled" : "Unhandled"
        postArray.DeviceID = this.device_id;

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
        if (this.is_initialised)
        {
            this.sendRequest(postArray, "crash").then(function (result)
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

    reportCrash(exception, severity, customProperties = null)
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
        const stackSplit = stack.split(/\r?\n/);

        //Get the first colon (:), after this is the line number)*/
        const lineInfo = stack.substring(stack.indexOf(":")+1);

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