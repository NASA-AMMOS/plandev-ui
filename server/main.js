// @ts-check

const express = require('express');

function main() {
  const app = express();
  const port = 80;
  app.use(express.static('public'));
  app.listen(port, () => {
    console.log(`🚀 aerie-ui-server listening on port ${port}`);
  });
}

main();
