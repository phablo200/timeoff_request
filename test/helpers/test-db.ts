import { DatabaseService } from '../../src/db/database.service';

export function createTestDatabaseService(): DatabaseService {
  process.env.DB_PATH = ':memory:';
  return new DatabaseService();
}
