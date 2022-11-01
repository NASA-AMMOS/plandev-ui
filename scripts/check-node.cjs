const semver = require('semver');
const packageJSON = require('../package.json');

// get the list of valid node versions under the `engines` field in the package.json
const { node: requiredNodeVersions } = packageJSON.engines;

const nodeVersion = semver.coerce(process.version);

function main() {
  if (requiredNodeVersions) {
    const isValid = semver.satisfies(nodeVersion, requiredNodeVersions);
    if (!isValid) {
      console.log(
        '\x1b[37m\x1b[45m%s\x1b[0m',
        `Your version of Node (${nodeVersion}) does not meet the required version. Please use ${requiredNodeVersions}`,
      );
      process.exit(1);
    }
  }
}

main();
