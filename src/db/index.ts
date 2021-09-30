import { customAlphabet } from 'nanoid';
import type { Pool } from 'pg';
import pg from 'pg';
import {
  POSTGRES_DATABASE,
  POSTGRES_HOST,
  POSTGRES_PASSWORD,
  POSTGRES_PORT,
  POSTGRES_USER,
} from '../env';

const { Pool: CreatePool } = pg;

export class Db {
  private static pool: Pool | null = null;

  static async getPool(): Promise<Pool> {
    if (!Db.pool) {
      await Db.init();
    }
    return Db.pool;
  }

  static async init(): Promise<void> {
    try {
      const postgresConfig = {
        database: POSTGRES_DATABASE,
        host: POSTGRES_HOST,
        password: POSTGRES_PASSWORD,
        port: POSTGRES_PORT,
        user: POSTGRES_USER,
      };
      Db.pool = new CreatePool(postgresConfig);
    } catch (e) {
      console.log(e);
    }
  }

  static async latestView(user: string): Promise<any> {
    const pool = await Db.getPool();
    const { rows } = await pool.query(`
      SELECT view
      FROM ui.view
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
      return userView;
    } else if (systemViews.length) {
      const [systemView] = systemViews;
      return systemView;
    } else {
      return null;
    }
  }

  static uniqueId(): string {
    const alphabet =
      '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const size = 15;
    const nanoid = customAlphabet(alphabet, size);
    return nanoid();
  }
}
