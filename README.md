<img src="https://crashcatch.com/images/logo.png" width="150">

# Introduction
The ReactJS CrashCatch library allow you to send both handled and unhandled 
crashes to the CrashCatch crash monitoring service (https://crashcatch.com).

# Installing
The Crash Catch ReactJS library can be installed from NPM using the following
command

```text
npm install crashcatchlib-reactjs
```

# Using the Library
Once installed, in your app.js or app.tsx you need to import and the as shown below:

import {CrashCatch, CrashCatchProvider} from "crashcatchlib-reactjs";
Then in the function above the return statement, create a new instance of CrashCatch and initialise the library, using your proejct id, API key and your projects version number as shown below:

const crash_catch = new CrashCatch();
crash_catch.initialiseCrashCatch("<your project id>", "<your projects api key>", "<project version number>");
Then you need to wrap everything in the return of app.js in a and pass the value of a full example of your app.js might look like below:

import React from 'react';
import {BrowserRouter, Routes, Route} from "react-router-dom";
import Home from "./components/Home";
import NotFound from "./components/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import {CrashCatch, CrashCatchProvider, CrashCatchContext} from "crashcatchlib-reactjs";

function App() {

    const crash_catch = new CrashCatch();
    crash_catch.initialiseCrashCatch("12345678", "abcdefghijkl", "1.0.0");
  return (

      <CrashCatchProvider value={crash_catch}>
          <ErrorBoundary>
              <BrowserRouter>
                  <Routes>
                      <Route index element={<Home />} />
                      <Route path='*' element={<NotFound />} />
                  </Routes>
              </BrowserRouter>
          </ErrorBoundary>
      </CrashCatchProvider>

  );
}
export default App;
You may have noticed under there is another component called . You need to create this component with the following in as a minimum. You can add extra handling if you wish to this component but the below is required to submit unhandled crash exceptions:

import * as React from "react";
import {CrashCatchContext} from 'crashcatchlib-reactjs';

class ErrorBoundary extends React.Component {

    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo)
    {
        this.setState({hasError: true});
        const crash_catch = this.context;
        crash_catch.reportUnhandledException(error);
    }

    render() {
        return this.props.children
    }
}
export default ErrorBoundary
This is the minimum you need to send error reports, these will send unhandled errors that occur within your project. You can however, send errors from components that are handled by a try/catch error.


For example, you can do the following in a functional component.

import * as React from 'react'

import * as React from 'react';
import {CrashCatchContext} from 'crashcatchlib-reactjs';

export default function MyComponent() {

  const crash_catch = useContext(CrashCatchContext);

  //If your project is typescript then you would need to do the following:
  //const crash_catch : CrashCatchContext = useContext(CrashCatchContext);

  const sendHandledCrash = () => {
    try
    {
      //Do something that would trigger an error
    }
    catch (err)
    {
      //The second parameter should be Low, Medium or High
      crash_catch.reportCrash(err, "Low");
    
      //You can also pass a third parameter which is JSON object of some extra debug information such as:
      crash_catch.reportCrash(err, "Low", {
        "method": "sendHandledCrash",
        "url": window.location.href
      });
    }
  }
  
  return (
    <button onClick={() => sendHandledCrash()}>Test</button>
  )
}
