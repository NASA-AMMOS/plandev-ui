const { execSync } = require('child_process');

function main() {
  try {
    const stdout = execSync('yarn lint').toString();
    console.log(stdout);
  } catch ({ stdout }) {
    console.error(stdout.toString());
  }

  try {
    const stdout = execSync('yarn format').toString();
    console.log(stdout);
  } catch ({ stdout }) {
    console.error(stdout.toString());
  }
}

main();
