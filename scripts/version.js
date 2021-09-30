import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

function getBranch() {
  if (process***REMOVED***.GIT_BRANCH) {
    return process***REMOVED***.GIT_BRANCH;
  } else {
    const branch = execSync('git rev-parse --abbrev-ref HEAD');
    return branch.toString().trim();
  }
}

function getCommit() {
  const commit = execSync('git rev-parse --short HEAD');
  return commit.toString().trim();
}

function main() {
  const branch = getBranch();
  const commit = getCommit();
  const commitUrl = `https://github.jpl.nasa.gov/Aerie/aerie-ui/commit/${commit}`;
  const date = new Date().toLocaleString();
  const packageName = process***REMOVED***.npm_package_name;
  const packageVersion = process***REMOVED***.npm_package_version;

  const version = {
    branch,
    commit,
    commitUrl,
    date,
    name: `${packageName}-${packageVersion}`,
  };

  writeFileSync(
    'static/version.json',
    `${JSON.stringify(version, null, 2)}\n`,
    { encoding: 'utf8' },
  );
}

main();
