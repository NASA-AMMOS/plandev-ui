import { CamApi } from '@gov.nasa.jpl.aerie/cam';
import bodyParser from 'body-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { config } from './config';
import { Db } from './db';

async function main() {
  const { cam, editor, port } = config;
  const app = express();
  const camApi = new CamApi(cam);
  const dbPool = await Db.getPool();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(bodyParser.json());
  app.use(express.static('public'));

  async function auth(req: Request, res: Response, next: NextFunction) {
    const { headers } = req;
    const { authorization: ssoToken = '' } = headers;
    const response = await camApi.session(ssoToken);

    if (response.success) {
      next();
    } else {
      res.status(401).send(response);
    }
  }

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

  app.get('/ui-states', auth, async (_, res) => {
    const { rows } = await dbPool.query(`
      SELECT state FROM ui.states
    `);
    const states = rows.map(({ state }) => state);
    res.json(states);
  });

  app.post('/ui-states', auth, async (req, res) => {
    const { body } = req;
    const id = Db.uniqueId();
    const state = JSON.stringify({ ...body, id });
    const { rowCount } = await dbPool.query(`
      INSERT INTO ui.states (id, state)
      VALUES ('${id}', '${state}');
    `);
    if (rowCount > 0) {
      res.json({
        message: `${id} created`,
      });
    } else {
      res.json({
        message: `${id} not created`,
      });
    }
  });

  app.put('/ui-states/:id', auth, async (req, res) => {
    const { body, params } = req;
    const { id = '' } = params;
    const state = JSON.stringify({ ...body, id });
    const { rowCount } = await dbPool.query(`
      UPDATE ui.states
      SET state='${state}'
      WHERE id='${id}'
    `);
    if (rowCount > 0) {
      res.json({
        message: `${id} updated`,
      });
    } else {
      res.status(404).json({
        message: `${id} not updated`,
      });
    }
  });

  app.get('/ui-states/:id', auth, async (req, res) => {
    const { params } = req;
    const { id = '' } = params;
    const { rows = [], rowCount } = await dbPool.query(`
      SELECT state FROM ui.states
      WHERE id = '${id}'
    `);
    if (rowCount > 0) {
      const [{ state = {} }] = rows;
      res.json(state);
    } else {
      res.status(404).json({
        message: `${id} not found`,
      });
    }
  });

  app.delete('/ui-states/:id', auth, async (req, res) => {
    const { params } = req;
    const { id = '' } = params;
    const { rowCount } = await dbPool.query(`
      DELETE FROM ui.states
      WHERE id = '${id}'
    `);
    if (rowCount > 0) {
      res.json({
        message: `${id} successfully deleted`,
      });
    } else {
      res.status(404).json({
        message: `${id} not found`,
      });
    }
  });

  app.listen(port, () => {
    console.log(`🚀 aerie-ui-server listening on port ${port}`);
  });
}

main();
