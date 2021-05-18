import { CamApi } from '@gov.nasa.jpl.aerie/cam';
import { json } from 'body-parser';
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
  app.use(json());
  app.use(express.static('public'));

  async function auth(req: Request, res: Response, next: NextFunction) {
    const { headers } = req;
    const { authorization: ssoToken = '' } = headers;
    const userResponse = await camApi.user(ssoToken);

    if (userResponse.success) {
      req.headers['x-user'] = userResponse.userId;
      next();
    } else {
      res.status(401).send(userResponse);
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
    const username = (query?.username as string) || '';
    const editorUrl = editor[username] || editor.shared || '';
    res.redirect(`${editorUrl}`);
  });

  app.get('/health', (_, res) => {
    const timestamp = new Date().toISOString();
    const uptimeMinutes = process.uptime() / 60;
    res.json({ timestamp, uptimeMinutes });
  });

  app.get('/views', auth, async (_, res) => {
    const { rows } = await dbPool.query(`
      SELECT view
      FROM ui.views
      ORDER BY view->'meta'->>'timeUpdated' DESC;
    `);
    const views = rows.map(({ view }) => ({
      id: view.id,
      meta: view.meta,
      name: view.name,
    }));
    res.json(views);
  });

  app.get('/views/latest', auth, async (req, res) => {
    const user = req.get('x-user');
    const view = await Db.latestView(user);

    if (view) {
      res.json(view);
    } else {
      res.json({
        message: `No views found`,
        success: false,
      });
    }
  });

  app.post('/views', auth, async (req, res) => {
    const { body } = req;
    const id = Db.uniqueId();
    const now = Date.now();
    const owner = req.get('x-user');
    const meta = { owner, timeCreated: now, timeUpdated: now };
    const view = { ...body, id, meta };
    const viewStr = JSON.stringify({ ...body, id, meta });
    const { rowCount } = await dbPool.query(`
      INSERT INTO ui.views (id, view)
      VALUES ('${id}', '${viewStr}');
    `);
    if (rowCount > 0) {
      res.json({
        message: `${id} created`,
        view,
      });
    } else {
      res.json({
        message: `${id} not created`,
      });
    }
  });

  app.put('/views/:id', auth, async (req, res) => {
    const { body, params } = req;
    const { id = '' } = params;
    const owner = req.get('x-user');
    const { rows } = await dbPool.query(`
      SELECT view
      FROM ui.views
      WHERE id='${id}'
      AND view->'meta'->>'owner' = '${owner}';
    `);
    const [{ view: currentView }] = rows;
    const now = Date.now();
    const view = JSON.stringify({
      ...body,
      meta: {
        ...currentView.meta,
        timeUpdated: now,
      },
    });
    const { rowCount } = await dbPool.query(`
      UPDATE ui.views
      SET view='${view}'
      WHERE id='${id}'
      AND view->'meta'->>'owner' = '${owner}';
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

  app.get('/views/:id', auth, async (req, res) => {
    const { params } = req;
    const { id = '' } = params;
    const { rows = [], rowCount } = await dbPool.query(`
      SELECT view
      FROM ui.views
      WHERE id = '${id}';
    `);
    if (rowCount > 0) {
      const [{ view = {} }] = rows;
      res.json(view);
    } else {
      res.status(404).json({
        message: `${id} not found`,
      });
    }
  });

  app.delete('/views/:id', auth, async (req, res) => {
    const { params } = req;
    const { id = '' } = params;
    const owner = req.get('x-user');
    const { rowCount } = await dbPool.query(`
      DELETE FROM ui.views
      WHERE id = '${id}'
      AND view->'meta'->>'owner' = '${owner}';
    `);
    if (rowCount > 0) {
      const nextView = await Db.latestView(owner);
      res.json({
        deletedViewId: id,
        message: `${id} successfully deleted`,
        nextView,
      });
    } else {
      res.status(404).json({
        message: `${id} not found`,
      });
    }
  });

  app.listen(port, () => {
    console.log(`🚀 AERIE-UI listening on port ${port}`);
  });
}

main();
