// API for reading/writing sequences (& other files?) in workspace
async function listFiles() {
  console.warn(`List files - Not yet implemented`);
  return ["not implemented"];
}
async function readFile(path) {
  console.warn(`Read file ${path} - Not yet implemented`);
  return "not implemented";
}
async function writeFile(path, contents) {
  console.warn(`Write "${contents.slice(0, 50)}..." to ${path} - Not yet implemented`);
}

// import { ActionMain } from 'aerie-action/src/models/main.ts';
async function main(actionParameters, actionSettings) {
  const url = `${actionSettings.externalUrl}/${actionParameters.sequenceId}`;
  const startTime = performance.now();
  // Make a request to an external URL using fetch
  const result = await fetch(url, {
      method: 'get',
      headers: {
          'Content-Type': 'application/json'
      }
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
  // read/write files using the actions helpers
  listFiles();
  readFile('my_file');
  writeFile('new_file', 'new contents');
  return {
      status: "SUCCESS",
      data: resultData
  };
}

