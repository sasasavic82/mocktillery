
import fs from "fs";
import path from "path";
import yml from "js-yaml";
import { exec } from "child_process";
import promisify from "util.promisify"

const execAsync = promisify(exec);

export enum TestType {
    Load = "load",
    Functional = "functional"
}

export interface MocktilleryConfig {
    type: TestType,
    testFolder: string,
    compileFolder: string,
    debug?: Boolean
}

export interface ConfigObject {
    [key: string]: any
}

export interface Std {
    stdout: string,
    stderr: string
}

export class Mocktillery {

    private configObject: ConfigObject = {};

    constructor(private config: MocktilleryConfig) {

    }

    public loadTests(): void {
        if (this.config.type == TestType.Functional)
            this.loadFunctionalTests();
    }

    public compile(): void {

        let yamlString = yml.safeDump(this.configObject);

        fs.writeFileSync(
            path.join(__dirname, this.config.compileFolder, "config.yml"), yamlString
        );
    }

    public async run(url: string): Promise<void> {
        try {
            let ret: Std = await execAsync(`artillery run --target ${url} ./dist/lib/config.yml`);
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
        return path.join(__dirname, this.config.testFolder, folderPath);
    }
}