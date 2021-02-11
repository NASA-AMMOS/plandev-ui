// @ts-check
/* eslint-disable @typescript-eslint/naming-convention */

const { readFileSync } = require('fs');
const { CamApi } = require('@gov.nasa.jpl.aerie/cam');
const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const fastGlob = require('fast-glob');
const helmet = require('helmet');
const config = require('./config/config.json');

function main() {
  const { cam, editor, port } = config;
  const app = express();
  const camApi = new CamApi(cam);

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
    const { headers } = req;
    const { authorization: ssoToken = '' } = headers;
    const response = await camApi.logout(ssoToken);
    res.json(response);
  });

  app.get('/editor', async (req, res) => {
    const { query } = req;
    const { ssoToken = '' } = query;
    // @ts-ignore
    const { userId = '' } = await camApi.user(ssoToken);
    const editorUrl = editor[userId] || editor.shared || '';
    res.redirect(`${editorUrl}?ssoToken=${ssoToken}`);
  });

  app.get('/health', (_, res) => {
    const date = new Date().toISOString();
    const uptimeMinutes = process.uptime() / 60;
    res.json({ date, uptimeMinutes });
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
