/**
* Crash Catch ReactJS Crash & Error Reporting Library
* Copyright (C) Devso 2021
*/
import React from "react";
export declare const CrashCatchContext: React.Context<any>;
export declare const CrashCatchProvider: React.Provider<any>;
export declare const CrashCatchConsumer: React.Consumer<any>;
declare type EngineAPIResult = {
    result: number;
    message: string;
    data?: any;
};
declare type BrowserType = {
    browser: string;
    version: string;
};
declare type CrashPostData = {
    ExceptionType: string;
    ExceptionMessage: string;
    ScreenResolution: string;
    Locale: string;
    ProjectID: string;
    CrashType: string;
    DeviceID: string;
    Stacktrace: string;
    LineNo: string | number;
    ClassFile: string;
    JSFile: string;
    VersionName: string;
    BrowserWidthHeight: string;
    DeviceType: string;
    Browser: string;
    BrowserVersion: string;
    Severity: string;
    CustomProperty: string & any;
};
declare type InitialisePostData = {
    ProjectID: string;
    DeviceID: string;
    ProjectVersion: string;
};
export declare class CrashCatch {
    api_key: string;
    project_id: string;
    version: string;
    callback: (result: EngineAPIResult) => void;
    is_initialised: boolean;
    crash_queue: Array<CrashPostData | InitialisePostData>;
    device_id: string;
    cookie: string;
    initialiseAttempt: number;
    do_lb: string;
    constructor();
    generateRandomDeviceID(): string;
    setCookie(key: string, value: string, expire?: boolean): void;
    getCookie(cname: string): string;
    initialiseCrashCatch(project_id: string, api_key: string, version: string, callback?: (result: EngineAPIResult) => void): void;
    sendRequest(postArray: CrashPostData | InitialisePostData, endpoint: string): Promise<unknown>;
    getPostArray(exception: Error, exceptionMsg: string, severity: string, handledException: boolean): CrashPostData;
    reportUnhandledException(exception: Error): void;
    reportCrash(exception: Error, severity: string, customProperties?: string & any): void;
    getLineNoFromStacktrace(stack: string): string;
    getJSFileFromStacktrace(stack: string): string;
    identifyBrowser(): BrowserType;
}
export {};
