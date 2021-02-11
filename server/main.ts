import { CamApi } from '@gov.nasa.jpl.aerie/cam';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import fastGlob from 'fast-glob';
import { readFileSync } from 'fs';
import helmet from 'helmet';
import config from './config/config.json';

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
    const ssoToken = (query?.ssoToken as string) || '';
    const { userId = '' } = await camApi.user(ssoToken);
    const editorUrl = editor[userId] || editor.shared || '';
    res.redirect(`${editorUrl}?ssoToken=${ssoToken}`);
  });

  app.get('/health', (_, res) => {
    const timestamp = new Date().toISOString();
    const uptimeMinutes = process.uptime() / 60;
    res.json({ timestamp, uptimeMinutes });
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
