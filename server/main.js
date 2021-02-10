// @ts-check

const express = require('express');
const helmet = require('helmet');

function main() {
  const app = express();
  const port = 80;

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.static('public'));

  app.get('/health', (_, res) => {
    const uptimeMinutes = process.uptime() / 60;
    res.json({ status: 'healthy', uptimeMinutes });
  });

  app.listen(port, () => {
    console.log(`🚀 aerie-ui-server listening on port ${port}`);
  });
}

main();
