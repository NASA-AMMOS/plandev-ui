const { execSync } = require('child_process');

function main() {
  try {
    const stdout = execSync('npm run lint').toString();
    console.log(stdout);
  } catch ({ stdout }) {
    const error = stdout.toString();
    console.error(error);
    throw new Error(error);
  }

  try {
    const stdout = execSync('npm run format').toString();
    console.log(stdout);
  } catch ({ stdout }) {
    const error = stdout.toString();
    console.error(error);
    throw new Error(error);
  }
}

main();
