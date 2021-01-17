<img src="https://crashcatch.com/images/logo.png" width="150">

# Introduction
The ReactJS CrashCatch library allow you to send both handled and unhandled 
crashes to the CrashCatch crash monitoring service (https://crashcatch.com).

# Installing
The Crash Catch ReactJS library can be installed from NPM using the following
command

```text
npm install CrashCatchLib-ReactJS
```

# Using the Library
The first thing that needs to happen is to initialise the library. 
Assuming you have multiple pages, it is recommended to have the initialisation
somewhere globally within the project that you can reference from anywhere so that
you are able to report errors that are caught. It doesn't matter if you initialise
multiple times during one session, we'll manage this and just extend the action
session so there's nothing to worry about. 

Create an instance of the library - this might be useful to do in a state object
such as below

```javascript
const [crashCatch, setCrashCatch] = useState(new CrashCatch);
```

Then you can initialise Crash Catch doing the following

```javascript
crashCatch.initialiseCrashCatch("your_project_Id", "your_api_key", "version_number", initialiseCallback)
```

The initialisecallback parameter is optional. When Crash Catch initialised, if this 
is available, we'll call this callback with the result object so you can handle it 
accordingly. For information on the result object, check out our docs at
https://docs.crashcatch.com

We need to send a test crash to prove that installation has worked successfully. 
The easiest way to do this, is to write the below code and execute it. This will
report a null error due to the variable not being set even though toString() is 
being called. 

```javascript
try
{
    const test = null;
    console.log(test.toString());
}
catch (ex)
{
    crashCatch.reportCrash(ex, "Low");
}
```

The second parameter in the report crash parameter is the severity. This can be 
any of the following three values - anything other than below will result in an error
being returned

* Low
* Medium
* High

There is an optional parameter to the reportCrash method above. This is a JSON object
that allows you to submit custom debug information to help you diagnose an issue
easier, such as the following:

```javascript
crashCatch.reportCrash(ex, "Low", {
    "param1": "value1",
    "param2": "value2"
})
```

That it, Crash Catch is successfully initialised, you will now receive reports
for any errors that occur that aren't caught, and any errors that you wish
to report on that are caught.

