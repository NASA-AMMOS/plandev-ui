'use strict';

const parameterDefinitions = {
  logCount: {
    type: 'int',
    description: 'Number of log lines to generate (0 for none)',
    defaultValue: 10,
  },
  mode: {
    type: 'variant',
    description: 'What the action should do',
    variants: [
      { key: 'fetch', label: 'Fetch URL' },
      { key: 'adaptation', label: 'Translate File using Adaptation' },
      { key: 'files', label: 'List & Read Files' },
      { key: 'write', label: 'Write a File' },
      { key: 'error', label: 'Throw an Error' },
      { key: 'slow', label: 'Slow (5s delay)' },
    ],
  },
  outputFile: {
    type: 'string',
    description: 'Filename to write (used in "write" mode)',
    defaultValue: 'action_output.txt',
  },
  outputContent: {
    type: 'string',
    description: 'Content to write to the file (used in "write" mode)',
    defaultValue: 'Hello from aerie-action-demo!',
  },
  secret: {
    type: 'secret',
    description: 'A secret value (e.g. API token) — sent securely, never stored in run history',
  },
  sequence: {
    type: 'sequence',
    description: 'A sequence file parameter (for testing file pickers)',
    primary: true,
  },
};

const settingDefinitions = {
  externalUrl: {
    type: 'string',
    description: 'Base URL for fetch mode',
    defaultValue: 'https://api.github.com',
  },
  secretSetting: {
    type: 'secret',
    description: 'A secret value (e.g. API token) — sent securely, never stored in run history',
  },
  files: {
    type: 'fileList',
    description: 'A list of files to process',
  },
  verbose: {
    type: 'string',
    description: 'Enable extra-verbose logging',
    defaultValue: "false",
  },
};

async function main(actionParameters, actionSettings, actionsAPI) {
  const { logCount = 10, mode = 'fetch', outputFile, outputContent, secret, sequence } = actionParameters;
  const { externalUrl = 'https://api.github.com', verbose = false } = actionSettings;
  const startTime = performance.now();

  // Generate requested log output
  emitLogs(logCount, verbose);

  console.log(`Action started — mode: ${mode}`);
  console.log(`Secret provided: ${secret ? 'yes (' + secret.length + ' chars)' : 'no'}`);
  console.log(`Parameters: ${JSON.stringify({ ...actionParameters, secret: secret ? '***' : undefined })}`);

  let result;
  switch (mode) {
    case 'fetch':
      result = await runFetchMode(externalUrl, verbose);
      break;
    case 'files':
      result = await runFilesMode(actionsAPI, sequence, verbose);
      break;
    case 'adaptation':
      result = await runAdaptationMode(actionsAPI, sequence);
      break;
    case 'write':
      result = await runWriteMode(actionsAPI, outputFile, outputContent, verbose);
      break;
    case 'error':
      result = runErrorMode();
      break;
    case 'slow':
      result = await runSlowMode(verbose);
      break;
    default:
      result = { status: 'FAILED', data: { error: `Unknown mode: ${mode}` } };
  }

  const elapsed = (performance.now() - startTime).toFixed(1);
  console.log(`Action completed in ${elapsed}ms with status: ${result.status}`);

  return result;
}

function emitLogs(count, verbose) {
  if (count <= 0) return;

  const messages = [
    'Initializing action runtime...',
    'Loading workspace configuration...',
    'Validating parameter schemas...',
    'Resolving file dependencies...',
    'Checking network connectivity...',
    'Authenticating with external service...',
    'Preparing execution context...',
    'Allocating resources...',
    'Starting main execution loop...',
    'Processing batch 1 of N...',
    'Intermediate checkpoint reached.',
    'Cache hit for resource lookup.',
    'Cache miss — fetching from remote.',
    'Retrying transient operation (attempt 2/3)...',
    'Rate limit approaching — throttling requests.',
    'Partial result received, continuing...',
    'Unexpected response format — attempting fallback parse.',
    'File handle released.',
    'Connection pool drained to 1 active.',
    'Garbage collection triggered.',
    'Serializing intermediate results...',
    'Compressing output payload...',
    'Flushing write buffer...',
    'Waiting for async callbacks...',
    'Finalizing transaction log...',
  ];

  for (let i = 0; i < count; i++) {
    const msg = messages[i % messages.length];
    if (verbose) {
      const ts = new Date().toISOString();
      console.log(`[${ts}] [line ${i + 1}/${count}] ${msg}`);
    } else {
      console.log(msg);
    }
  }
}

async function runFetchMode(externalUrl, verbose) {
  const url = `${externalUrl}/repos/NASA-AMMOS/aerie`;
  console.log(`Fetching: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (verbose) {
      console.log(`Response status: ${response.status} ${response.statusText}`);
    }

    let data;
    try {
      data = await response.clone().json();
    } catch {
      data = await response.clone().text();
    }

    if (!response.ok) {
      console.warn(`Non-OK response: ${response.status}`);
      return { status: 'FAILED', data };
    }

    // Return a curated subset so results aren't enormous
    const summary = {
      description: data.description,
      forks: data.forks_count,
      language: data.language,
      name: data.full_name,
      open_issues: data.open_issues_count,
      stars: data.stargazers_count,
      updated_at: data.updated_at,
      url: data.html_url,
    };

    return { status: 'SUCCESS', data: summary };
  } catch (err) {
    console.error(`Fetch failed: ${err.message}`);
    return { status: 'FAILED', data: { error: err.message } };
  }
}

async function runFilesMode(actionsAPI, sequence, verbose) {
  console.log('Listing workspace files...');
  try {
    const files = await actionsAPI.listFiles('.');
    console.log(`Found ${files.length} files`);

    if (verbose) {
      files.forEach((f, i) => console.log(`  [${i}] ${f}`));
    }

    let sequenceContent = null;
    if (sequence) {
      console.log(`Reading sequence file: ${sequence}`);
      try {
        sequenceContent = await actionsAPI.readFile(sequence);
        console.log(`Sequence file read successfully (${sequenceContent.length} chars)`);
      } catch (err) {
        console.warn(`Could not read sequence file: ${err.message}`);
      }
    }

    return {
      status: 'SUCCESS',
      data: {
        fileCount: files.length,
        files: files.slice(0, 20),
        sequenceContent: sequenceContent ? sequenceContent.substring(0, 500) : null,
        sequenceFile: sequence || null,
      },
    };
  } catch (err) {
    console.error(`File listing failed: ${err.message}`);
    return { status: 'FAILED', data: { error: err.message } };
  }
}

async function runWriteMode(actionsAPI, filename, content, verbose) {
  const name = filename || 'action_output.txt';
  const body = content || 'Written by aerie-action-demo';

  console.log(`Writing file: ${name}`);
  if (verbose) {
    console.log(`Content length: ${body.length} chars`);
  }

  try {
    const result = await actionsAPI.writeFile(name, body);
    console.log('File written successfully');
    return {
      status: 'SUCCESS',
      data: { filename: name, contentLength: body.length, writeResult: result },
    };
  } catch (err) {
    console.error(`Write failed: ${err.message}`);
    return { status: 'FAILED', data: { error: err.message } };
  }
}


async function runAdaptationMode(actionsAPI, sequence) {
  console.log('Loading adaptation');

  try {
    const adaptation = await actionsAPI.loadAdaptation();
    console.log('Adaptation loaded');

    if (!sequence) {
      throw new Error('No sequence file provided for adaptation mode');
    }

    console.log(`Reading sequence file: ${sequence}`);
    const sequenceContent = await actionsAPI.readFile(sequence);
    console.log(`Sequence file read successfully (${sequenceContent.length} chars)`);
    const translated = adaptation.outputs[0].toOutputFormat(
      sequenceContent,
      { commandDictionary: null, channelDictionary: null, parameterDictionaries: [], librarySequences: [] },
      'my-sequence'
    );
    console.log(`Sequence translated successfully (${translated.length} chars)`);

    return {
      status: 'SUCCESS',
      data: { translated: JSON.parse(translated) },
    };
  } catch (err) {
    console.error(`Translate sequence with adaptation failed: ${err.message}`);
    return { status: 'FAILED', data: { error: err.message } };
  }
}

function runErrorMode() {
  console.log('Error mode selected — about to throw');
  console.warn('This is intentional for testing error display');
  throw new Error(
    'Intentional error from aerie-action-demo (error mode).\n' +
    'This tests the error display in the action run detail view.\n' +
    'Stack trace should appear below.'
  );
}

async function runSlowMode(verbose) {
  const totalMs = 5000;
  const steps = 5;
  const stepMs = totalMs / steps;

  console.log(`Slow mode: running ${steps} steps over ${totalMs}ms`);

  for (let i = 1; i <= steps; i++) {
    await new Promise(resolve => setTimeout(resolve, stepMs));
    const pct = Math.round((i / steps) * 100);
    console.log(`Step ${i}/${steps} complete (${pct}%)`);
    if (verbose) {
      console.log(`  Elapsed: ${i * stepMs}ms`);
    }
  }

  return {
    status: 'SUCCESS',
    data: { message: 'Slow operation completed', durationMs: totalMs, steps },
  };
}

exports.main = main;
exports.parameterDefinitions = parameterDefinitions;
exports.settingDefinitions = settingDefinitions;
