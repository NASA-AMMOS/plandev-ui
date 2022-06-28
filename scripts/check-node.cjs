const packageJSON = require('../package.json');

const { node: requiredNodeVersions } = packageJSON.engines;

const nodeVersion = process.version;

function isValidNodeVersion(currentNodeVersion, requiredVersion, comparison) {
  switch (comparison) {
    case '<':
      return currentNodeVersion < requiredVersion;
    case '>':
      return currentNodeVersion > requiredVersion;
    case '<=':
      return currentNodeVersion <= requiredVersion;
    case '=':
      return currentNodeVersion === requiredVersion;
    case '!':
      return currentNodeVersion !== requiredVersion;
    case '*':
      return true;
    case '~':
    case '>=':
    default:
      return currentNodeVersion >= requiredVersion;
  }
}

function main() {
  // get the list of valid versions under the `engines` field in the package.json
  const versionMatches = requiredNodeVersions.match(/(?:[<>=~]+)?[^\s\|]+/g);

  if (versionMatches) {
    // process.version returns a version number that includes "v" (e.g. v16.14.0)
    // remove the "v" to be able to compare the versions
    const currentNodeVersion = nodeVersion.replace('v', '');

    const validations = versionMatches.map(requiredVersion => {
      // grab the comparison symbol (e.g. >=) and the version number
      const {
        groups: { comparison = '=', version },
      } = requiredVersion.match(/(?<comparison>[<>=~]+)?(?<version>[^\s]+)/);

      return isValidNodeVersion(currentNodeVersion, version, comparison);
    });

    const isValid = validations.reduce((currentValidity, validation) => {
      // if a single version is listed or a "||" is present in the version list,
      // pass the check as long as one required version is met
      // otherwise all version requirements must pass
      return validations.length === 1 || /\|\|/.test(requiredNodeVersions)
        ? validation || currentValidity
        : validation && currentValidity;
    }, false);

    if (!isValid) {
      console.log(
        '\x1b[37m\x1b[45m%s\x1b[0m',
        `Your version of node (${currentNodeVersion}) does not meet the required node version. Please use ${requiredNodeVersions}`,
      );
      process.exit(1);
    }
  }
}

main();
