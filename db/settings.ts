import { db } from './client';

export async function getSetting(key: string): Promise<string | null> {
  const result = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key],
  );
  return result?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
    [key, value, value],
  );
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT * FROM settings',
  );
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
