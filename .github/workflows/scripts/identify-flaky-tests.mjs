import fs from 'node:fs/promises';
import path from 'node:path';
import jszip from 'jszip';
import * as core from '@actions/core';
import * as github from '@actions/github';

// GITHUB_TOKEN=whatever node .github/workflows/scripts/identify-flaky-tests.mjs \
//   --repo NASA-AMMOS/plandev-ui \
//   --workflows test,canary \
//   --branch develop \
//   --max-runs 25

function getArg(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find(arg => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) return process.argv[index + 1];

  return '';
}

function getConfigValue(name, fallback = '') {
  // get config values as args or env variables
  const normalizedInputEnvName = `INPUT_${name.replaceAll('-', '_').replaceAll(' ', '_').toUpperCase()}`;
  return getArg(name) || process.env[normalizedInputEnvName] || core.getInput(name) || fallback;
}

function getConfig() {
  const repoInput = getConfigValue('repo');
  const [owner, repo] = repoInput ? repoInput.split('/') : [github.context.repo.owner, github.context.repo.repo];

  const isGithubActions = process.env.github_actions === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const cacheDirInput = getConfigValue('cache-dir');

  return {
    owner,
    repo,
    workflows: getConfigValue('workflows', 'test.yml,canary.yml')
      .split(',')
      .map(workflow => workflow.trim())
      .filter(Boolean),
    branch: getConfigValue('branch', 'develop'),
    artifactName: getConfigValue('artifact-name', 'E2E Test Results'),
    maxRuns: Number(getConfigValue('max-runs', '10')),
    outputLimit: Number(getConfigValue('output-limit', '25')),
    token: process.env.GITHUB_TOKEN || '',
    cacheDir: cacheDirInput || (isGithubActions ? '' : 'tmp/flaky-test-artifacts'),
    outputDir: getConfigValue('output-dir', 'tmp/flaky-test-report'),
  };
}

/**
 * list recent completed runs for one GH workflow on the configured branch.
 * accepts a workflow id or workflow filename, e.g. "test.yml".
 */
async function listRunsForWorkflow(octokit, config, workflow) {
  const response = await octokit.rest.actions.listWorkflowRuns({
    owner: config.owner,
    repo: config.repo,
    workflow_id: workflow,
    branch: config.branch,
    status: 'completed',
    per_page: Math.min(config.maxRuns, 100),
  });

  return response.data.workflow_runs;
}

/**
 * list artifacts uploaded by a single github actions workflow run
 */
async function listArtifactsForRun(octokit, config, runId) {
  const response = await octokit.rest.actions.listWorkflowRunArtifacts({
    owner: config.owner,
    repo: config.repo,
    run_id: runId,
    per_page: 100,
  });

  return response.data.artifacts;
}

/**
 * return a (workflow run) artifact zip from the local cache when available.
 * otherwise download it from github and optionally cache it.
 */
async function getArtifactZipData(octokit, config, run, artifact) {
  const cachePath = config.cacheDir ? path.join(config.cacheDir, String(run.id), `${artifact.id}.zip`) : '';

  if (cachePath) {
    try {
      const cached = await fs.readFile(cachePath);
      console.log(`  cache hit: ${cachePath}`);
      return cached;
    } catch {
      // cache miss, download below
    }
  }

  console.log(`  downloading artifact: ${artifact.name} (${artifact.id})`);

  const response = await octokit.rest.actions.downloadArtifact({
    owner: config.owner,
    repo: config.repo,
    artifact_id: artifact.id,
    archive_format: 'zip',
  });

  const zipData = Buffer.from(response.data);

  if (cachePath) {
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, zipData);
    console.log(`  cached: ${cachePath}`);
  }

  return zipData;
}

/**
 * extract and parse playwright's json-results.json from an e2e test run artifact zip.
 * return null when the artifact does not contain that file.
 */
async function readJsonResultsFromArtifactZip(zipData) {
  const zip = await jszip.loadAsync(zipData);
  const file = zip.file(/(^|\/)json-results\.json$/)[0];

  if (!file) return null;

  return JSON.parse(await file.async('string'));
}

/**
 * collect flaky and unexpectedly failing tests from playwright json results.
 * include run metadata so examples can link back to github actions.
 */
function collectProblemTests(jsonResults, run, workflow) {
  const problemTests = [];

  function collectFromSuite(suite, parentTitles = []) {
    const suiteTitles = suite.title ? [...parentTitles, suite.title] : parentTitles;

    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        if (test.status !== 'flaky' && test.status !== 'unexpected') {
          continue;
        }

        const resultStatuses = (test.results ?? []).map(result => result.status);
        const durationMs = (test.results ?? []).reduce((total, result) => total + (result.duration ?? 0), 0);

        problemTests.push({
          workflow,
          runId: run.id,
          runUrl: run.html_url,
          runConclusion: run.conclusion,
          runCreatedAt: run.created_at,
          project: test.projectName,
          file: suite.file,
          title: [...suiteTitles, spec.title, test.title].filter(Boolean).join(' › '),
          status: test.status,
          resultStatuses,
          durationMs,
        });
      }
    }

    for (const childSuite of suite.suites ?? []) {
      collectFromSuite(childSuite, suiteTitles);
    }
  }

  for (const suite of jsonResults.suites ?? []) {
    collectFromSuite(suite);
  }
  return problemTests;
}

const PROBLEM_ATTEMPT_STATUSES = new Set(['failed', 'timedOut', 'interrupted']);

/**
 * count failed/timed-out/interrupted playwright attempts.
 * ignore passed and skipped attempts.
 */
function countProblemAttempts(resultStatuses) {
  return resultStatuses.filter(status => PROBLEM_ATTEMPT_STATUSES.has(status)).length;
}

/**
 * build leaderboard rows from collected flaky/unexpected test results.
 * group rows by project, file, and full test title.
 */
function buildLeaderboard(problemTests) {
  const rowsByKey = new Map();

  for (const test of problemTests) {
    const key = [test.project, test.file, test.title].join('\0');

    if (!rowsByKey.has(key)) {
      rowsByKey.set(key, {
        key,
        project: test.project,
        file: test.file,
        title: test.title,
        workflows: new Set(),
        runIds: new Set(),
        problemTestRuns: 0,
        unexpectedRuns: 0,
        flakyRuns: 0,
        failedAttempts: 0,
        timedOutAttempts: 0,
        interruptedAttempts: 0,
        totalProblemAttempts: 0,
        totalDurationMs: 0,
        lastSeenAt: '',
        exampleRunUrl: '',
        problemRuns: [],
      });
    }

    const row = rowsByKey.get(key);

    row.problemRuns.push({
      workflow: test.workflow,
      runId: test.runId,
      runUrl: test.runUrl,
      runConclusion: test.runConclusion,
      runCreatedAt: test.runCreatedAt,
      status: test.status,
      resultStatuses: test.resultStatuses,
    });

    row.workflows.add(test.workflow);
    row.runIds.add(test.runId);
    row.problemTestRuns += 1;
    row.totalDurationMs += test.durationMs ?? 0;

    if (test.status === 'unexpected') {
      row.unexpectedRuns += 1;
    }

    if (test.status === 'flaky') {
      row.flakyRuns += 1;
    }

    for (const status of test.resultStatuses) {
      if (status === 'failed') {
        row.failedAttempts += 1;
      } else if (status === 'timedOut') {
        row.timedOutAttempts += 1;
      } else if (status === 'interrupted') {
        row.interruptedAttempts += 1;
      }
    }

    row.totalProblemAttempts += countProblemAttempts(test.resultStatuses);

    if (!row.lastSeenAt || test.runCreatedAt > row.lastSeenAt) {
      row.lastSeenAt = test.runCreatedAt;
      row.exampleRunUrl = test.runUrl;
    }
  }

  return [...rowsByKey.values()]
    .map(row => ({
      ...row,
      workflows: [...row.workflows].sort(),
      runsSeen: row.runIds.size,
      runIds: [...row.runIds],
      score: row.totalProblemAttempts,
      problemRuns: row.problemRuns.sort((a, b) => b.runCreatedAt.localeCompare(a.runCreatedAt)),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.unexpectedRuns - a.unexpectedRuns ||
        b.timedOutAttempts - a.timedOutAttempts ||
        b.lastSeenAt.localeCompare(a.lastSeenAt),
    );
}

/**
 * escape markdown table cell content to keep cells readable
 */
function escapeMarkdown(value) {
  return String(value ?? '')
    .replaceAll('\\', '\\\\')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');
}

/**
 * remove the repeated file prefix from a playwright title path.
 * keep the human-readable describe/test portion for leaderboard display.
 */
function getDisplayTitle(row) {
  const prefix = `${row.file} › `;
  return row.title.startsWith(prefix) ? row.title.slice(prefix.length) : row.title;
}

/**
 * Format an ISO timestamp for compact report display.
 */
function formatDate(value) {
  if (!value) {
    return '';
  }
  return new Date(value).toISOString().slice(0, 10);
}

/**
 * Render expandable links to every problematic workflow run for one test.
 * Keep the content inline so it renders safely inside a markdown table cell.
 */
function renderProblemRunsCell(row) {
  const links = row.problemRuns.map(run => {
    const badAttemptCount = countProblemAttempts(run.resultStatuses);
    return `<a href="${run.runUrl}">${run.runId}&nbsp;(${badAttemptCount})</a>`;
  });

  return [
    '<details>',
    `<summary>${row.problemRuns.length} run${row.problemRuns.length === 1 ? '' : 's'}</summary>`,
    links.join('<br>'),
    '</details>',
  ].join('');
}

/**
 * Render the E2E reliability leaderboard as a GitHub-flavored markdown report.
 * Explain the scoring model and include links to example workflow runs.
 */
function renderMarkdownReport(leaderboard, config, stats) {
  const topRows = leaderboard.slice(0, config.outputLimit);

  const lines = [
    '# E2E Test Reliability Leaderboard',
    '',
    `Analyzed ${stats.runsAnalyzed} workflow runs from ${config.workflows.map(workflow => `\`${workflow}\``).join(', ')} on branch \`${config.branch}\`.`,
    '',
    'This report ranks flaky or unexpectedly failing Playwright tests by total failed, timed-out, or interrupted retry attempts.',
    '',
    `Found ${stats.problemTestRuns} flaky/failing test results across ${stats.uniqueProblemTests} unique tests.`,
    '',
  ];

  if (stats.runsWithoutMatchingArtifact || stats.runsWithoutJsonResults || stats.runsWithArtifactDownloadErrors) {
    lines.push(
      '',
      `**Skipped ${stats.runsWithoutMatchingArtifact} runs without a matching artifact, ${stats.runsWithoutJsonResults} runs without \`json-results.json\`, and ${stats.runsWithArtifactDownloadErrors} runs with artifact download errors.**`,
    );
  }

  if (topRows.length === 0) {
    lines.push('No flaky or unexpectedly failing E2E tests were found.');
    return lines.join('\n');
  }

  lines.push(
    '| Rank | Score | Test | Runs | Problem Runs | Unexpected Runs | Flaky Runs | Timeout Attempts | Failed Attempts | Last Seen |',
    '|---:|---:|---|---|---:|---:|---:|---:|---:|---|',
  );

  for (const [index, row] of topRows.entries()) {
    const testCell = [`\`${escapeMarkdown(row.file)}\``, escapeMarkdown(getDisplayTitle(row))].join('<br>');

    const lastSeenCell = row.exampleRunUrl
      ? `[${escapeMarkdown(formatDate(row.lastSeenAt))}](${row.exampleRunUrl})`
      : escapeMarkdown(formatDate(row.lastSeenAt));

    lines.push(
      [
        index + 1,
        row.score,
        testCell,
        renderProblemRunsCell(row),
        row.problemTestRuns,
        row.unexpectedRuns,
        row.flakyRuns,
        row.timedOutAttempts,
        row.failedAttempts,
        lastSeenCell,
      ]
        .join(' | ')
        .replace(/^/, '| ')
        .replace(/$/, ' |'),
    );
  }

  return lines.join('\n');
}

/**
 * write markdown and json report files for github artifact upload.
 * create the output directory when it does not already exist.
 */
async function writeReportFiles(config, markdownReport, leaderboard, stats) {
  await fs.mkdir(config.outputDir, { recursive: true });

  await fs.writeFile(path.join(config.outputDir, 'flaky-test-leaderboard.md'), markdownReport);

  await fs.writeFile(
    path.join(config.outputDir, 'flaky-test-leaderboard.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        config: {
          owner: config.owner,
          repo: config.repo,
          workflows: config.workflows,
          branch: config.branch,
          maxRuns: config.maxRuns,
          artifactName: config.artifactName,
          outputLimit: config.outputLimit,
        },
        stats,
        leaderboard,
      },
      null,
      2,
    ),
  );
}

try {
  const config = getConfig();
  console.log('running with config:');
  console.log(JSON.stringify({ ...config, token: config.token ? '<set>' : '<missing>' }, null, 2));

  if (!config.token) {
    throw new Error('GITHUB_TOKEN is required.');
  }
  const octokit = github.getOctokit(config.token);

  // collection of all problematic test runs from past N workflow runs
  const allProblemTests = [];
  let runsAnalyzed = 0;
  let runsWithoutMatchingArtifact = 0;
  let runsWithoutJsonResults = 0;
  let runsWithArtifactDownloadErrors = 0;

  for (const workflow of config.workflows) {
    const runs = await listRunsForWorkflow(octokit, config, workflow);
    console.log(`\n${workflow}: found ${runs.length} completed runs`);

    for (const run of runs) {
      console.log(`- ${run.id} ${run.conclusion} ${run.created_at} ${run.html_url}`);

      const artifacts = await listArtifactsForRun(octokit, config, run.id);
      const matchingArtifacts = artifacts.filter(artifact => artifact.name === config.artifactName);

      if (matchingArtifacts.length === 0) {
        console.warn(`No e2e test artifacts found for run ${run.id}`);
        runsWithoutMatchingArtifact += 1;
        continue;
      }

      let zipData;
      try {
        zipData = await getArtifactZipData(octokit, config, run, matchingArtifacts[0]);
      } catch (error) {
        console.warn(
          `Unable to download artifact for run ${run.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
        runsWithArtifactDownloadErrors += 1;
        continue;
      }
      const jsonResults = await readJsonResultsFromArtifactZip(zipData);

      if (jsonResults) {
        console.log(
          `  results: ${jsonResults.stats?.unexpected ?? 0} unexpected, ${jsonResults.stats?.flaky ?? 0} flaky, ${jsonResults.stats?.expected ?? 0} expected`,
        );
        const problemTests = collectProblemTests(jsonResults, run, workflow);
        console.log(`  problem tests: ${problemTests.length}`);

        for (const test of problemTests) {
          console.log(
            `  - ${test.status} ${test.project} ${test.file} ${test.title} results=${test.resultStatuses.join(',')}`,
          );
        }
        allProblemTests.push(...problemTests);
        runsAnalyzed += 1;
      } else {
        console.warn(`No JSON results for run ${run.id}`);
        runsWithoutJsonResults += 1;
      }
    }
  }
  // build leaderboard of all flaky/problematic test runs
  const leaderboard = buildLeaderboard(allProblemTests);

  console.log('\nflaky/failing e2e leaderboard');
  for (const row of leaderboard.slice(0, config.outputLimit)) {
    console.log(
      `${row.score}\t${row.unexpectedRuns} unexpected\t${row.flakyRuns} flaky\t` +
        `${row.timedOutAttempts} timeouts\t${row.failedAttempts} failures\t` +
        `${row.project}\t${row.file}\t${row.title}\t${row.exampleRunUrl}`,
    );
  }

  const stats = {
    runsAnalyzed,
    runsWithoutMatchingArtifact,
    runsWithoutJsonResults,
    runsWithArtifactDownloadErrors,
    problemTestRuns: allProblemTests.length,
    uniqueProblemTests: leaderboard.length,
  };

  const markdownReport = renderMarkdownReport(leaderboard, config, stats);

  console.log(`\nAnalyzed ${runsAnalyzed} runs`);
  console.log(`Found ${allProblemTests.length} flaky/failing test results across ${leaderboard.length} unique tests`);

  await writeReportFiles(config, markdownReport, leaderboard, stats);
  console.log(`Wrote report files to ${config.outputDir}`);

  // If running in a GH actions context, write the markdown report to the action run summary
  if (process.env.GITHUB_ACTIONS === 'true') {
    await core.summary.addRaw(markdownReport).write();
    console.log('Wrote Github run report summary');
  }
} catch (error) {
  core.setFailed(error instanceof Error ? error.message : String(error));
}
