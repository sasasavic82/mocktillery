export enum TestType {
    Load = "load",
    Functional = "functional"
}

export interface MocktilleryConfig {
    type: TestType,
    testFolder: string,
    compileFolder: string,
    outputFilename: string,
    debug?: Boolean
}

export interface ConfigObject {
    [key: string]: any
}

export interface Std {
    stdout: string,
    stderr: string
}