import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

function getBranch() {
  if (process.env.GIT_BRANCH) {
    return process.env.GIT_BRANCH;
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
  const commitUrl = `https://github.com/NASA-AMMOS/plandev-ui/commit/${commit}`;
  const date = new Date().toLocaleString();
  const packageName = process.env.npm_package_name;
  const packageVersion = process.env.npm_package_version;

  const version = {
    branch,
    commit,
    commitUrl,
    date,
    name: `${packageName}-${packageVersion}`,
  };

  writeFileSync('static/version.json', `${JSON.stringify(version, null, 2)}\n`, { encoding: 'utf8' });
}

main();
