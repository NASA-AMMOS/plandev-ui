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
        CREATE SCHEMA IF NOT EXISTS ui AUTHORIZATION ${user};
      `);

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS ui.states (
          id text NOT NULL PRIMARY KEY,
          state jsonb NOT NULL
        );
      `);

      // Load default UI states from file system into the database.
      const filePaths = await fastGlob('ui-states/*.json');
      for (const filePath of filePaths) {
        const state = readFileSync(filePath).toString();
        const { id } = JSON.parse(state);
        await this.pool.query(`
          INSERT INTO ui.states (id, state)
          VALUES ('${id}', '${state}')
          ON CONFLICT (id) DO UPDATE SET state='${state}';
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
