import * as core from '@actions/core';
import * as github from '@actions/github';

function getArg(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find(arg => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) return process.argv[index + 1];

  return '';
}

function getConfigValue(name, fallback = '') {
  return getArg(name) || core.getInput(name) || fallback;
}

function getConfig() {
  const repoInput = getConfigValue('repo');
  const [owner, repo] = repoInput ? repoInput.split('/') : [github.context.repo.owner, github.context.repo.repo];

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
  };
}

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

async function listArtifactsForRun(octokit, config, runId) {
  const response = await octokit.rest.actions.listWorkflowRunArtifacts({
    owner: config.owner,
    repo: config.repo,
    run_id: runId,
    per_page: 100,
  });

  return response.data.artifacts;
}

try {
  const config = getConfig();

  console.log('identify flaky tests config:');
  console.log(JSON.stringify({ ...config, token: config.token ? '<set>' : '<missing>' }, null, 2));

  const octokit = github.getOctokit(config.token);

  for (const workflow of config.workflows) {
    const runs = await listRunsForWorkflow(octokit, config, workflow);

    console.log(`\n${workflow}: found ${runs.length} completed runs`);
    for (const run of runs.slice(0, 5)) {
      console.log(`- ${run.id} ${run.conclusion} ${run.created_at} ${run.html_url}`);

      const artifacts = await listArtifactsForRun(octokit, config, run.id);
      const matchingArtifacts = artifacts.filter(artifact => artifact.name === config.artifactName);

      console.log(`  artifacts: ${artifacts.map(artifact => artifact.name).join(', ') || '<none>'}`);
      console.log(`  matching "${config.artifactName}": ${matchingArtifacts.length}`);
    }
  }
} catch (error) {
  core.setFailed(error instanceof Error ? error.message : String(error));
}
