import { Injectable } from '@nestjs/common';
import Database from 'better-sqlite3';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { ConfigService } from '../config/config.service';

@Injectable()
export class DatabaseService {
  private readonly db: Database.Database;

  constructor(
    private readonly configService: ConfigService = new ConfigService(),
  ) {
    this.configService.validate();
    this.db = new Database(this.configService.dbPath);
    this.db.pragma('foreign_keys = ON');
    this.runMigrations();
  }

  connection(): Database.Database {
    return this.db;
  }

  withTransaction<T>(fn: () => T): T {
    const tx = this.db.transaction(fn);
    return tx();
  }

  resetAllTables(): void {
    this.db.exec(`
      DELETE FROM log;
      DELETE FROM balance_ledger;
      DELETE FROM sync_events;
      DELETE FROM idempotency_records;
      DELETE FROM dead_letters;
      DELETE FROM batch_checkpoints;
      DELETE FROM batch_jobs;
      DELETE FROM drift_events;
      DELETE FROM time_off_requests;
      DELETE FROM balances;
    `);
  }

  private runMigrations(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL
      );
    `);
    const compiledDir = join(__dirname, 'migrations');
    const sourceDir = join(process.cwd(), 'src', 'db', 'migrations');
    const migrationsDir = existsSync(compiledDir) ? compiledDir : sourceDir;
    const migrationNames = readdirSync(migrationsDir)
      .filter((fileName) => fileName.endsWith('.sql'))
      .sort();

    for (const migrationName of migrationNames) {
      const alreadyApplied = this.db
        .prepare(`SELECT 1 FROM schema_migrations WHERE name = ?`)
        .get(migrationName);

      if (alreadyApplied) {
        continue;
      }

      const migrationPath = join(migrationsDir, migrationName);
      const migrationSql = readFileSync(migrationPath, 'utf8');
      this.db.exec(migrationSql);
      this.db
        .prepare(`INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)`)
        .run(migrationName, new Date().toISOString());
    }
  }
}
