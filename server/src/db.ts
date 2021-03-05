import fastGlob from 'fast-glob';
import { readFileSync } from 'fs';
import { customAlphabet } from 'nanoid';
import { Pool } from 'pg';
import { getEnv } from './config';

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
      const { postgres: postgresConfig } = getEnv();
      const { user } = postgresConfig;

      Db.pool = new Pool(postgresConfig);

      await this.pool.query(`
        CREATE SCHEMA IF NOT EXISTS ui
        AUTHORIZATION ${user};
      `);

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS ui.views (
          id text NOT NULL PRIMARY KEY,
          view jsonb NOT NULL
        );
      `);

      // Load default views from file system into the database.
      const filePaths = await fastGlob('views/*.json');
      for (const filePath of filePaths) {
        const view = readFileSync(filePath).toString();
        const { id } = JSON.parse(view);
        await this.pool.query(`
          INSERT INTO ui.views (id, view)
          VALUES ('${id}', '${view}')
          ON CONFLICT (id) DO UPDATE SET view='${view}';
        `);
      }
    } catch (error) {
      console.error(error);
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
