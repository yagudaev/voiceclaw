import { db } from './client';
import { CREATE_TABLES } from './schema';

export async function runMigrations() {
  await db.execAsync(CREATE_TABLES);
}
