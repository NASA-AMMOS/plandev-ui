'use strict';

// Define schemas for your action's settings and parameters
const parameterDefinitions = {
  boolean: { type: "boolean" },
  delay: { type:"int" },
  duration: { type: "duration" },
  path: { type: "path" },
  real: { type: "real" },
  repository: { type: "string" },
  series: { items:{ type: "string" }, type: "series",  },
  string: { type: "string" },
  variant: { type: "variant", variants: [{key: "foo", label: "Foo"}, {key: "bar", label: "Bar"}] },
};
const settingDefinitions = {
  externalUrl: { type: "string" },
  retries: { type: "int" }
};
async function main(actionParameters, actionSettings, actionsAPI) {
    await new Promise((resolve) => {
      setTimeout(() => {
          resolve();
      }, actionParameters.delay ?? 0);
    })

    const url = `${actionSettings.externalUrl}/${actionParameters.repository}`;
    const startTime = performance.now();
    // Make a request to an external URL using fetch
    const result = await fetch(url, {
        method: "get",
        headers: {
            "Content-Type": "application/json",
        },
    });
    console.log(`request took ${performance.now() - startTime}ms`);
    // try parsing result as either json or text
    let resultData;
    try {
        resultData = await result.clone().json();
    }
    catch {
        resultData = await result.clone().text();
    }
    try  {
      // read/write files using the actions helpers
      const files = await actionsAPI.listSequences();
      const myFile = await actionsAPI.readSequence("my_file");
      const writeResult = await actionsAPI.writeSequence("new_file", "new contents");
      console.log(`writeResult: ${JSON.stringify(writeResult)}`);
      console.log('sequence files:', JSON.stringify(files));
      console.log(`myFile: ${JSON.stringify(myFile)}`);
    } catch (error) {
      console.log(error)
    }
    return {
        status: "SUCCESS",
        data: resultData,
    };
}

exports.main = main;
exports.parameterDefinitions = parameterDefinitions;
exports.settingDefinitions = settingDefinitions;


