
import fs from "fs";
import path from "path";
import yml from "js-yaml";
import promisify from "util.promisify"

import { exec } from "child_process";
import { ConfigObject, TestType, MocktilleryConfig, Std } from "./types";

const execAsync = promisify(exec);

export class Mocktillery {

    private configObject: ConfigObject = {};
    private currentWorkingDir: string = process.cwd();

    constructor(private config: MocktilleryConfig) {

    }

    /**
     * Public method for loading the tests. Depending on the type of tests you'd like to run
     * the method will load up the config and test cases necessary to run them
     */
    public loadTests(): void {
        if (this.config.type == TestType.Functional)
            this.loadFunctionalTests();
    }

    /**
     * Public method that compiles all of the individual test cases and load test configuration,
     * into one file "config.yml" which artillery uses to load up and run it's tests
     */
    public compile(): void {

        let yamlString = yml.safeDump(this.configObject);

        fs.writeFileSync(
            path.join(this.currentWorkingDir, this.config.compileFolder, "config.yml"), yamlString
        );
    }

    /**
     * Public run method that kicks off the load/functional tests
     * @param url Service end point url
     * @param withReport Once the load/functional tests are completed, we may want to output a report
     */
    public async run(url: string, withReport: Boolean = false): Promise<void> {
        try {
            await this.runInternal(url);
            if(withReport) 
                await this.runInternalReport();

        } catch(e) {
            console.log(e);
        }
    }

    /**
     * 
     * @param url 
     */
    private async runInternal(url: string): Promise<void> {

        try {
            let ret: Std = await execAsync(`artillery run --target ${url} config.yml --output ${this.config.outputFilename}.json --quiet &> ${this.config.outputFilename}.log`);
            console.log(ret.stdout);
            console.log(ret.stderr);

        } catch(e) {
            console.log(e);
        }        
    }

    private async runInternalReport(): Promise<void> {
        
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

    private loadFunctionalTests(): void {

        let testDir: string = this.getTestFolderPath();

        if (this.config.debug)
            console.log(testDir);

        if (!fs.existsSync(testDir))
            throw new Error(`${this.config.type} test folder doesn't exist`);

        this.configObject['config'] = this.loadConfig();
        this.configObject['scenarios'] = this.loadScenarios();

    }

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
            if (scenario[0])
                return scenario[0];
        });
    }

    private loadConfig(): ConfigObject {

        let config: ConfigObject | undefined = this.loadYmlObject("config.yml");

        if (!config)
            throw new Error("unable to load config.yml file contents");  

        return config.config;     
    }

    private loadYmlObject(file: string): ConfigObject | undefined {

        let configPath = path.join(this.getTestFolderPath(), file);

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

    private getTestFolderPath(folderPath: string = ""): string {
        return path.join(this.currentWorkingDir, this.config.testFolder, folderPath);
    }
}