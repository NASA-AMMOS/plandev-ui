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
      { key: 'noop', label: 'No-op' },
      { key: 'fetch', label: 'Fetch URL' },
      { key: 'adaptation', label: 'Translate File using Adaptation' },
      { key: 'files', label: 'List & Read Files' },
      { key: 'write', label: 'Write a File' },
      { key: 'error', label: 'Throw an Error' },
      { key: 'slow', label: 'Slow (5s delay)' },
      { key: 'api-test', label: 'API Integration Tests' },
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
  required: {
    type: 'string',
    description: 'A required parameter',
    defaultValue: 'This is required',
    required: true,
  },
  requiredNoDefault: {
    type: 'string',
    description: 'A required parameter without a default value',
    required: true,
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
  requiredSetting: {
    type: 'string',
    description: 'A required setting',
    required: true,
  },
};

async function main(actionParameters, actionSettings, actionsAPI) {
  const { logCount = 10, mode = 'noop', outputFile, outputContent, secret, sequence } = actionParameters;
  const { externalUrl = 'https://api.github.com', verbose = false } = actionSettings;
  const startTime = performance.now();

  // Generate requested log output
  emitLogs(logCount, verbose);

  console.log(`Action started — mode: ${mode}`);
  console.log(`Secret provided: ${secret ? 'yes (' + secret.length + ' chars)' : 'no'}`);
  console.log(`Parameters: ${JSON.stringify({ ...actionParameters, secret: secret ? '***' : undefined })}`);

  let result;
  switch (mode) {
    case 'noop':
      result = { status: 'SUCCESS', data: { mode } };
      break;
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
    case 'api-test':
      result = await runApiTestMode(actionsAPI, verbose);
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
  const url = `${externalUrl}/repos/NASA-AMMOS/plandev`;
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
    // For now treat files as a JSON string that needs parsing. This should be fixed in the API to return an array directly.
    const filesString = await actionsAPI.listFiles('.', { withMetadata: true });
    const files = JSON.parse(filesString);
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
        throw new Error(`Could not read sequence file: ${err.message}`);
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
    console.error(`Files mode failed: ${err.message}`);
    return { status: 'FAILED', data: { error: err.message } };
  }
}

// ---------------------------------------------------------------------------
// API Integration Test Mode
// ---------------------------------------------------------------------------
// Runs a comprehensive test suite against the actionsAPI surface.
// Each section throws on the first assertion failure so the action returns FAILED
// with a clear error message. The e2e test only needs to invoke the action in
// this mode and check for SUCCESS.

async function runApiTestMode(actionsAPI, verbose) {
  const results = {};
  const log = (msg) => console.log(`[api-test] ${msg}`);

  log('Starting API integration tests...\n');

  // --- File Lifecycle ---
  log('=== File Lifecycle ===');
  results.fileLifecycle = await testFileLifecycle(actionsAPI, log);

  // --- Directories ---
  log('=== Directories ===');
  results.directories = await testDirectories(actionsAPI, log);

  // --- Metadata CRUD ---
  log('=== Metadata CRUD ===');
  results.metadata = await testMetadataCrud(actionsAPI, log);

  // --- Environment Variables ---
  log('=== Environment Variables ===');
  results.environment = await testEnvironmentVariables(actionsAPI, log);

  // --- Dictionaries / Parcel (best-effort) ---
  log('=== Dictionaries / Parcel ===');
  results.dictionaries = await testDictionariesAndParcel(actionsAPI, log);

  log('\nAll API integration tests passed.');
  return { status: 'SUCCESS', data: results };
}

// --- File Lifecycle Tests ---

async function testFileLifecycle(actionsAPI, log) {
  const testDir = '_api_test';
  const testFile = `${testDir}/lifecycle_test.txt`;
  const testContent = 'Hello from API integration test — ' + new Date().toISOString();
  const copyDest = `${testDir}/lifecycle_copy.txt`;
  const moveDest = `${testDir}/lifecycle_moved.txt`;

  // Setup: create a directory for our test files
  log('Creating test directory...');
  await actionsAPI.createDirectory(testDir);

  // 1. writeFile — create a new file
  log('writeFile — creating test file...');
  await actionsAPI.writeFile(testFile, testContent);

  // 2. readFile — read it back and assert content matches
  log('readFile — reading back...');
  const readBack = await actionsAPI.readFile(testFile);
  if (readBack !== testContent) {
    throw new Error(`File lifecycle: readFile content mismatch.\n  Expected: "${testContent}"\n  Got:      "${readBack}"`);
  }
  log('readFile — content matches.');

  // 3. writeFile (overwrite) — overwrite with new content
  const updatedContent = testContent + '\n(updated)';
  log('writeFile — overwriting...');
  await actionsAPI.writeFile(testFile, updatedContent, true);
  const readUpdated = await actionsAPI.readFile(testFile);
  if (readUpdated !== updatedContent) {
    throw new Error(`File lifecycle: overwrite content mismatch.\n  Expected: "${updatedContent}"\n  Got:      "${readUpdated}"`);
  }
  log('writeFile (overwrite) — content matches.');

  // 4. listFiles — verify our file appears
  log('listFiles — checking file appears in listing...');
  const listString = await actionsAPI.listFiles(testDir);
  const listing = JSON.parse(listString);
  const names = listing.map(f => typeof f === 'string' ? f : (f.name || f.path || ''));
  if (!names.some(n => n.includes('lifecycle_test'))) {
    throw new Error(`File lifecycle: listFiles did not contain lifecycle_test. Got: ${JSON.stringify(names)}`);
  }
  log('listFiles — file found.');

  // 5. copyFile — copy and verify both exist with same content
  log('copyFile — copying...');
  await actionsAPI.copyFile(testFile, copyDest);
  const copiedContent = await actionsAPI.readFile(copyDest);
  if (copiedContent !== updatedContent) {
    throw new Error(`File lifecycle: copyFile content mismatch.\n  Expected: "${updatedContent}"\n  Got:      "${copiedContent}"`);
  }
  // Original should still exist
  const originalStillThere = await actionsAPI.readFile(testFile);
  if (originalStillThere !== updatedContent) {
    throw new Error('File lifecycle: original file missing after copyFile');
  }
  log('copyFile — copy matches, original intact.');

  // 6. moveFile — move copy to new name, verify old path gone
  log('moveFile — moving...');
  await actionsAPI.moveFile(copyDest, moveDest);
  const movedContent = await actionsAPI.readFile(moveDest);
  if (movedContent !== updatedContent) {
    throw new Error(`File lifecycle: moveFile content mismatch.\n  Expected: "${updatedContent}"\n  Got:      "${movedContent}"`);
  }
  // Old path should be gone
  try {
    await actionsAPI.readFile(copyDest);
    throw new Error('File lifecycle: moveFile source still readable after move');
  } catch (err) {
    if (err.message.includes('still readable')) throw err;
    log('moveFile — source correctly gone after move.');
  }

  // 7. deleteFile — clean up test files
  log('deleteFile — cleaning up...');
  await actionsAPI.deleteFile(testFile);
  await actionsAPI.deleteFile(moveDest);

  // Verify deletions
  for (const path of [testFile, moveDest]) {
    try {
      await actionsAPI.readFile(path);
      throw new Error(`File lifecycle: "${path}" still readable after deleteFile`);
    } catch (err) {
      if (err.message.includes('still readable')) throw err;
    }
  }
  log('deleteFile — files cleaned up.');

  // Clean up test directory
  await actionsAPI.deleteFile(testDir);
  log('File lifecycle tests passed.\n');

  return { passed: true };
}

// --- Directory Tests ---

async function testDirectories(actionsAPI, log) {
  const baseDir = '_api_test_dirs';
  const nestedDir = `${baseDir}/level1/level2/level3`;

  // 1. createDirectory — single level
  log('createDirectory — single level...');
  await actionsAPI.createDirectory(baseDir);

  // Verify it exists via listFiles on parent
  const parentList = JSON.parse(await actionsAPI.listFiles('.'));
  const parentNames = parentList.map(f => typeof f === 'string' ? f : (f.name || f.path || ''));
  if (!parentNames.some(n => n.includes('_api_test_dirs'))) {
    throw new Error(`Directories: createDirectory did not create "${baseDir}". Listing: ${JSON.stringify(parentNames)}`);
  }
  log('createDirectory — directory visible in listing.');

  // 2. createDirectories — nested (mkdir -p behavior)
  log('createDirectories — nested path...');
  await actionsAPI.createDirectories(nestedDir);

  // Write a file into the deepest level to prove it exists
  const deepFile = `${nestedDir}/probe.txt`;
  await actionsAPI.writeFile(deepFile, 'probe');
  const probeContent = await actionsAPI.readFile(deepFile);
  if (probeContent !== 'probe') {
    throw new Error(`Directories: could not write/read in nested dir. Got: "${probeContent}"`);
  }
  log('createDirectories — nested path created, write/read verified.');

  // 3. Idempotency — creating an existing directory should not error
  log('createDirectory — idempotency check...');
  await actionsAPI.createDirectory(baseDir);
  log('createDirectory — idempotent (no error on existing dir).');

  // Clean up
  log('Cleaning up directories...');
  await actionsAPI.deleteFile(deepFile);
  await actionsAPI.deleteFile(nestedDir);
  await actionsAPI.deleteFile(`${baseDir}/level1/level2`);
  await actionsAPI.deleteFile(`${baseDir}/level1`);
  await actionsAPI.deleteFile(baseDir);
  log('Directory tests passed.\n');

  return { passed: true };
}

// --- Metadata CRUD Tests ---

async function testMetadataCrud(actionsAPI, log) {
  const testDir = '_api_test_meta';
  const testFile = `${testDir}/meta_target.txt`;

  // Setup: create a file to attach metadata to
  await actionsAPI.createDirectory(testDir);
  await actionsAPI.writeFile(testFile, 'metadata test file');

  // 1. GET — baseline
  log('getFileMetadata — reading baseline...');
  const initial = await actionsAPI.getFileMetadata(testFile);
  if (typeof initial !== 'object' || initial === null) {
    throw new Error(`Metadata: getFileMetadata returned ${typeof initial}, expected object`);
  }
  log(`getFileMetadata — baseline: ${JSON.stringify(initial)}`);

  // 2. SET (overwrite)
  const setTimestamp = new Date().toISOString();
  log('setFileMetadata (overwrite) — writing...');
  await actionsAPI.setFileMetadata(testFile, {
    user: { actionDemo: true, runTimestamp: setTimestamp, source: 'api-test' },
  }, { mergeBehavior: 'overwrite' });

  const afterSet = await actionsAPI.getFileMetadata(testFile);
  if (!afterSet.user) {
    throw new Error('Metadata SET: "user" key missing after SET');
  }
  if (afterSet.user.source !== 'api-test') {
    throw new Error(`Metadata SET: expected user.source="api-test", got "${afterSet.user.source}"`);
  }
  if (afterSet.user.actionDemo !== true) {
    throw new Error(`Metadata SET: expected user.actionDemo=true, got ${afterSet.user.actionDemo}`);
  }
  if (afterSet.user.runTimestamp !== setTimestamp) {
    throw new Error(`Metadata SET: expected user.runTimestamp="${setTimestamp}", got "${afterSet.user.runTimestamp}"`);
  }
  log('setFileMetadata (overwrite) — verified.');

  // 3. SET (deep merge) — add a key, confirm originals survive
  log('setFileMetadata (deep merge) — merging...');
  await actionsAPI.setFileMetadata(testFile, {
    user: { extraField: 'deep-merge-test' },
  }, { mergeBehavior: 'deep' });

  const afterMerge = await actionsAPI.getFileMetadata(testFile);
  if (afterMerge.user.extraField !== 'deep-merge-test') {
    throw new Error(`Metadata merge: expected user.extraField="deep-merge-test", got "${afterMerge.user.extraField}"`);
  }
  if (afterMerge.user.source !== 'api-test') {
    throw new Error(`Metadata merge: original key user.source lost (got "${afterMerge.user.source}")`);
  }
  if (afterMerge.user.actionDemo !== true) {
    throw new Error(`Metadata merge: original key user.actionDemo lost (got ${afterMerge.user.actionDemo})`);
  }
  log('setFileMetadata (deep merge) — verified.');

  // 4. UNSET — remove the "user" key
  log('unsetFileMetadata — removing "user"...');
  await actionsAPI.unsetFileMetadata(testFile, ['user']);

  const afterUnset = await actionsAPI.getFileMetadata(testFile);
  if (afterUnset.user !== undefined) {
    throw new Error(`Metadata UNSET: "user" should be gone, got ${JSON.stringify(afterUnset.user)}`);
  }
  log('unsetFileMetadata — verified.');

  // 5. DELETE — re-set then delete all metadata
  log('deleteFileMetadata — full delete...');
  await actionsAPI.setFileMetadata(testFile, { user: { cleanup: true } }, { mergeBehavior: 'overwrite' });
  await actionsAPI.deleteFileMetadata(testFile);

  const afterDelete = await actionsAPI.getFileMetadata(testFile);
  if (afterDelete.user !== undefined) {
    throw new Error(`Metadata DELETE: "user" should be gone, got ${JSON.stringify(afterDelete.user)}`);
  }
  log('deleteFileMetadata — verified.');

  // Clean up
  await actionsAPI.deleteFile(testFile);
  await actionsAPI.deleteFile(testDir);
  log('Metadata CRUD tests passed.\n');

  return { passed: true };
}

// --- Environment Variable Tests ---

async function testEnvironmentVariables(actionsAPI, log) {
  // getEnvironmentVariable only returns vars prefixed with PUBLIC_ACTION_
  // We can't guarantee any specific env var exists, but we can verify the method
  // is callable and returns the right types.

  log('getEnvironmentVariable — testing known-missing key...');
  const missing = actionsAPI.getEnvironmentVariable('DEFINITELY_DOES_NOT_EXIST_12345');
  if (missing !== undefined) {
    throw new Error(`Environment: expected undefined for missing var, got "${missing}"`);
  }
  log('getEnvironmentVariable — correctly returned undefined for missing key.');

  // Verify that sensitive internal env vars are not accessible
  log('getEnvironmentVariable — verifying ACTION_DB_PASSWORD is blocked...');
  const dbPassword = actionsAPI.getEnvironmentVariable('ACTION_DB_PASSWORD');
  if (dbPassword !== undefined) {
    throw new Error('Environment: ACTION_DB_PASSWORD should not be accessible from actions');
  }
  log('getEnvironmentVariable — ACTION_DB_PASSWORD correctly blocked.');

  log('Environment variable tests passed.\n');
  return { passed: true };
}

// --- Dictionary / Parcel Tests (best-effort) ---

function assertDictionaryResult(dict, label) {
  if (!dict || typeof dict !== 'object') {
    throw new Error(`${label}: expected object, got ${typeof dict}`);
  }
  if (typeof dict.id !== 'number') {
    throw new Error(`${label}: expected numeric id, got ${typeof dict.id}`);
  }
  if (typeof dict.mission !== 'string' || dict.mission.length === 0) {
    throw new Error(`${label}: expected non-empty mission string, got "${dict.mission}"`);
  }
  if (typeof dict.version !== 'number' && typeof dict.version !== 'string') {
    throw new Error(`${label}: expected version (number or string), got ${typeof dict.version}`);
  }
  if (typeof dict.dictionary_path !== 'string') {
    throw new Error(`${label}: expected dictionary_path string, got ${typeof dict.dictionary_path}`);
  }
  if (!(dict.created_at instanceof Date) && typeof dict.created_at !== 'string') {
    throw new Error(`${label}: expected created_at as Date or string, got ${typeof dict.created_at}`);
  }
  if (!(dict.updated_at instanceof Date) && typeof dict.updated_at !== 'string') {
    throw new Error(`${label}: expected updated_at as Date or string, got ${typeof dict.updated_at}`);
  }
}

async function testDictionariesAndParcel(actionsAPI, log) {
  const results = { parcel: 'skipped', dictionaries: 'skipped' };

  // readParcel — requires workspace to have a parcel configured
  log('readParcel — attempting...');
  try {
    const parcel = await actionsAPI.readParcel();
    if (typeof parcel !== 'object' || parcel === null) {
      throw new Error(`Parcel: expected object, got ${typeof parcel}`);
    }
    log(`readParcel — succeeded: ${JSON.stringify(parcel).substring(0, 200)}`);
    results.parcel = 'passed';

    // If parcel has dictionary IDs, try reading them
    // ReadDictionaryResult: { id, dictionary_path, dictionary_file_path, mission, version, parsed_json, created_at, updated_at }
    if (parcel.command_dictionary_id) {
      log(`readCommandDictionary — id ${parcel.command_dictionary_id}...`);
      const cmdDict = await actionsAPI.readCommandDictionary(parcel.command_dictionary_id);
      log(typeof cmdDict.created_at);
      assertDictionaryResult(cmdDict, 'readCommandDictionary');
      log(`readCommandDictionary — succeeded (mission: "${cmdDict.mission}", version: ${cmdDict.version}).`);
      results.dictionaries = 'passed';
    }

    if (parcel.channel_dictionary_id) {
      log(`readChannelDictionary — id ${parcel.channel_dictionary_id}...`);
      const chanDict = await actionsAPI.readChannelDictionary(parcel.channel_dictionary_id);
      assertDictionaryResult(chanDict, 'readChannelDictionary');
      log(`readChannelDictionary — succeeded (mission: "${chanDict.mission}", version: ${chanDict.version}).`);
    }

    if (parcel.parameter_dictionary_ids && parcel.parameter_dictionary_ids.length > 0) {
      const paramId = parcel.parameter_dictionary_ids[0];
      log(`readParameterDictionary — id ${paramId}...`);
      const paramDict = await actionsAPI.readParameterDictionary(paramId);
      assertDictionaryResult(paramDict, 'readParameterDictionary');
      log(`readParameterDictionary — succeeded (mission: "${paramDict.mission}", version: ${paramDict.version}).`);
    }
  } catch (err) {
    // Parcel/dictionaries may not be configured — that's fine, just report it
    log(`Skipped (no parcel configured or error): ${err.message}`);
  }

  log('Dictionary / Parcel tests done.\n');
  return results;
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
