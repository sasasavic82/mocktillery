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

/**
 * Following types and interfaces are related to the artillery output
 */

export interface Latency {
    min: number,
    max: number,
    median: number,
    p95: number,
    p99: number
}

export interface Rps {
    count: number,
    mean: number
}

export interface ScenarioDuration extends Latency {

}

export interface ScenarioCounts {
    [str: string]: number
}

export interface Errors {
    [str: string]: number
}

export interface Codes {
    [code: string]: number
}

export interface Phase {
    duration: number,
    arrivalRate?: number,
    rampTo?: number,
    name?: string
}

export interface Aggregate {
    [str: string]: any,
    timestamp: Date,
    scenariosCreated: number,
    scenariosCompleted: number,
    requestsCompleted: number,
    latency: Latency,
    rps: Rps,
    scenarioDuration: ScenarioDuration,
    scenarioCounts: ScenarioCounts,
    errors: Errors,
    codes: Codes,
    matches: number,
    customStats: Object,
    counters: Object,
    scenariosAvoided: number,
    phases: Phase[]
}

export interface Intermediate extends Aggregate {
    [str: string]: any,
    latencies: number[],
    pendingRequests: number,
    concurrency: number
}

export interface Output {
    aggregate: Aggregate,
    intermediate: Intermediate[]
}

export enum TestResult {
    Fail = 'fail',
    Pass = 'pass',
    PassWithWarning = 'pass-with-warning'
}