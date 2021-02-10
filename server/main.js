// @ts-check

const { readFileSync } = require('fs');
const cors = require('cors');
const express = require('express');
const fastGlob = require('fast-glob');
const helmet = require('helmet');

function main() {
  const app = express();
  const port = 80;

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.static('public'));

  app.get('/health', (_, res) => {
    const uptimeMinutes = process.uptime() / 60;
    res.json({ status: 'healthy', uptimeMinutes });
  });

  app.get('/ui-states', async (_, res) => {
    const states = [];
    try {
      const filePaths = await fastGlob('ui-states/*.json');
      for (const filePath of filePaths) {
        const file = readFileSync(filePath).toString();
        const state = JSON.parse(file);
        states.push(state);
      }
    } catch (e) {
      console.error(e);
    }
    res.json(states);
  });

  app.listen(port, () => {
    console.log(`🚀 aerie-ui-server listening on port ${port}`);
  });
}

main();
