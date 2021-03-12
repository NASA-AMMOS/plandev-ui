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

  app.get('/views', auth, async (req, res) => {
    const owner = req.get('x-user');
    const { rows } = await dbPool.query(`
      SELECT view
      FROM ui.views
      WHERE view->'meta'->>'owner' = '${owner}'
      OR view->'meta'->>'owner' = 'system'
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

    const { rows } = await dbPool.query(`
      SELECT view
      FROM ui.views
      WHERE view->'meta'->>'owner' = '${user}'
      OR view->'meta'->>'owner' = 'system'
      ORDER BY view->'meta'->>'timeUpdated' DESC;
    `);

    const userViews = [];
    const systemViews = [];
    for (const row of rows) {
      const { view } = row;
      const { owner } = view.meta;
      if (owner === user) {
        userViews.push(view);
      }
      if (owner === 'system') {
        systemViews.push(view);
      }
    }

    if (userViews.length) {
      const [userView] = userViews;
      res.json(userView);
    } else if (systemViews.length) {
      const [systemView] = systemViews;
      res.json(systemView);
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
    const view = JSON.stringify({ ...body, id, meta });
    const { rowCount } = await dbPool.query(`
      INSERT INTO ui.views (id, view)
      VALUES ('${id}', '${view}');
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
    const owner = req.get('x-user');
    const { rows = [], rowCount } = await dbPool.query(`
      SELECT view
      FROM ui.views
      WHERE id = '${id}'
      AND (
        view->'meta'->>'owner' = '${owner}'
        OR view->'meta'->>'owner' = 'system'
      );
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
    console.log(`🚀 AERIE-UI listening on port ${port}`);
  });
}

main();
