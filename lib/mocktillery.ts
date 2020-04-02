
import fs from "fs";
import path from "path";
import yml from "js-yaml";
import promisify from "util.promisify"

import { exec } from "child_process";
import { ConfigObject, TestType, MocktilleryConfig, Std, Output, TestResult } from "./types";
import { formatWithOptions } from "util";

const execAsync = promisify(exec);

export class Mocktillery {

    private configObject: ConfigObject = {};
    private currentWorkingDir: string = process.cwd();

    constructor(private config: MocktilleryConfig) {

    }

    public static evaluateTest(testFile: string, resultsFile: string): void {

        let cwd: string = process.cwd();
        let filePath: string = path.join(cwd, testFile);

        if(!fs.existsSync(filePath))
            throw new Error(`file ${filePath} does not exist`);

        let testOutput: Output = require(filePath) as Output;

        let results: TestResult | undefined = undefined;

        if(!testOutput)
            return;

        if(testOutput.aggregate.scenariosCreated == testOutput.aggregate.scenariosCompleted) 
            results = TestResult.Pass;
        else
            results = TestResult.Fail;

        this.saveEvaluation(results, resultsFile);
    }

    public static saveEvaluation(testResult: TestResult | undefined, resultsFile: string): void {
        /**
         * Ignore saving results if undefined
         */
        if(!testResult)
            return;

        let cwd: string = process.cwd();
        let outputFile: string = path.join(cwd, resultsFile);
        try {
            fs.writeFileSync(outputFile, testResult);
        }catch(e) {
            console.log(e);
        }
    }

    /**
     * Public method for loading the tests. Depending on the type of tests you'd like to run
     * the method will load up the config and test cases necessary to run them
     */
    public loadTests(): void {
        if (this.config.type == TestType.Functional)
            this.loadFunctionalTests();

        if (this.config.type == TestType.Load)
            this.loadLoadTests();  
        
    }

    /**
     * Public method that compiles all of the individual test cases and load test configuration,
     * into one file "config.yml" which artillery uses to load up and run its tests
     */
    public compile(): void {

        let yamlString = yml.safeDump(this.configObject);

        fs.writeFileSync(
            path.join(this.currentWorkingDir, this.config.compileFolder, "testplan.yml"), yamlString
        );
    }

    /**
     * Public run method that kicks off the load/functional tests
     * @param url Service end point url
     * @param withReport Once the load/functional tests are completed, we may want to output a report
     */
    public async run(url: string, withReport: Boolean = false): Promise<void> {
        try {
            await this.runTestsInternal(url);
            if(withReport) 
                await this.runReportInternal();

        } catch(e) {
            console.log(e);
        }
    }

    /**
     * Internal function that kicks off load/functional tests
     * @param url 
     */
    private async runTestsInternal(url: string): Promise<void> {

        try {
            let ret: Std = await execAsync(`artillery run --target ${url} testplan.yml --output ${this.config.outputFilename}.json --quiet &> ${this.config.outputFilename}.log`);
            console.log(ret.stdout);
            console.log(ret.stderr);

        } catch(e) {
            console.log(e);
        }        
    }

    /**
     * Internal function that runs once test run completes.
     * The function runs an external process (artillery) that amalgamates the load / functional test results
     * and outputs a html file.
     */
    private async runReportInternal(): Promise<void> {
        
        try {
            let ret: Std = await execAsync(`artillery report ${this.config.outputFilename}.json`, {
                timeout: 10000
            });
            console.log(ret.stdout);
            console.log(ret.stderr);

        } catch(e) {
            console.log(e);
        }        
    }

    /**
     * Load functional tests from the functional tests folder
     * 
     * This method will load the configuration file, as well as the individual
     * test scenarios/cases.
     */
    private loadFunctionalTests(): void {

        let testDir: string = this.getTestFolderPath();

        if (this.config.debug)
            console.log(testDir);

        if (!fs.existsSync(testDir))
            throw new Error(`${this.config.type} test folder doesn't exist`);

        this.configObject['config'] = this.loadConfig();
        this.configObject['scenarios'] = this.loadScenarios();

    }

    /**
     * Load functional tests from the functional tests folder
     * 
     * This method will load the configuration file, as well as the individual
     * test scenarios/cases.
     */
    private loadLoadTests(): void {

        let testDir: string = this.getTestFolderPath();

        if (this.config.debug)
            console.log(testDir);

        if (!fs.existsSync(testDir))
            throw new Error(`${this.config.type} test folder doesn't exist`);

        let profile: string = this.config.testProfile ?? "full";

        this.configObject['config'] = this.loadConfig(profile);
        this.configObject['scenarios'] = this.loadScenarios();

    }

    /**
     * Function that loads, parses and outputs the test scenarios/cases.
     */
    private loadScenarios(): any[] {

        let scenarioFiles: string[] = fs.readdirSync(this.getTestFolderPath("scenarios"));

        if (scenarioFiles.length <= 0)
            throw new Error("no scenarios found");

        let scenarios = scenarioFiles.map((scenarioFile) => {
            let scenario: ConfigObject | undefined =
                this.loadYmlObject(path.join("scenarios", scenarioFile));
            if (scenario)
                return scenario.scenarios;
        });

        return scenarios.map((scenario) => {
            if (scenario[0]) {
                console.log(`loaded: ${scenario[0].name}`);
                return scenario[0];
            }
        });
    }

    /**
     * Load the config section of the tests. This section specifies attributes
     * related to the length of the tests and the different load phases
     * that would run.
     */
    private loadConfig(profile: string | undefined = undefined): ConfigObject {

        let config: ConfigObject | undefined = undefined

        if(!profile)
            config = this.loadYmlObject("config.yml");
        else
            config = this.loadYmlObject(`${profile}.yml`, "profiles");

        if (!config)
            throw new Error("unable to load config.yml file contents");  

        return config.config;     
    }

    /**
     * Helper method for loading yml files.
     * @param file yml filename
     */
    private loadYmlObject(file: string, profilePath: string | undefined = undefined): ConfigObject | undefined {
        
        let configPath: string = "";

        if(!profilePath)
            configPath = path.join(this.getTestFolderPath(), file);
        else
            configPath = path.join(this.getTestFolderPath(profilePath), file);

        if (!fs.existsSync(configPath))
            throw new Error(`${file} doesn't exist`);

        try {

            let obj = yml.safeLoad(
                fs.readFileSync(configPath, "utf8"));

            return obj as ConfigObject;

        } catch (e) {
            console.log(e);
        }

    }

    /**
     * Helper method for constructing the full test path, including subfolders
     * @param folderPath sub folders
     */
    private getTestFolderPath(folderPath: string = ""): string {
        return path.join(this.currentWorkingDir, this.config.testFolder, folderPath);
    }
}
