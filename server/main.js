// @ts-check
/* eslint-disable @typescript-eslint/naming-convention */

const { readFileSync } = require('fs');
const { CamApi } = require('@gov.nasa.jpl.aerie/cam');
const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const fastGlob = require('fast-glob');
const helmet = require('helmet');

function main() {
  const app = express();
  const camApi = new CamApi();
  const port = 80;

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(bodyParser.json());
  app.use(express.static('public'));

  app.post('/cam/login', async (req, res) => {
    const { body } = req;
    const { username, password } = body;
    const response = await camApi.login(username, password);
    res.json(response);
  });

  app.post('/cam/logout', async (req, res) => {
    const { body } = req;
    const { ssoToken } = body;
    const response = await camApi.logout(ssoToken);
    res.json(response);
  });

  app.post('/cam/session', async (req, res) => {
    const { body } = req;
    const { ssoToken } = body;
    const response = await camApi.session(ssoToken);
    res.json(response);
  });

  app.post('/cam/user', async (req, res) => {
    const { body } = req;
    const { ssoToken } = body;
    const response = await camApi.user(ssoToken);
    res.json(response);
  });

  app.get('/health', (_, res) => {
    const date = new Date().toISOString();
    const uptime = process.uptime();
    res.json({ date, uptime });
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
