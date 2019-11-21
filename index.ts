/*
* Export all types.
* The interfaces, types and classes exported here are to be
* used when extending Mockingbird or rolling your own server
* with custom simulators.
*/

// export * from "./lib";

import { MocktilleryConfig, Mocktillery, TestType } from "./lib";


let config: MocktilleryConfig = {
    type: TestType.Functional,
    testFolder: "../../../okapi3-infra/cdk/test/certification/functional",
    compileFolder: "./",
    debug: false
}

let mocktillery = new Mocktillery(config);

mocktillery.loadTests();
mocktillery.compile();
mocktillery.run("http://localhost:3333");

