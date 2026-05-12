import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const port = Number(process.env.HCM_MOCK_PORT ?? '4010');
const dbPath =
  process.env.HCM_MOCK_DB_PATH ??
  path.join(process.cwd(), 'test', 'mocks', 'data', 'hcm.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS balances (
    employee_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    days REAL NOT NULL,
    PRIMARY KEY(employee_id, location_id)
  );
  CREATE TABLE IF NOT EXISTS state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  INSERT OR IGNORE INTO state (key, value) VALUES ('failure_mode', 'none');
`);

const app = express();
app.use(express.json());

function failureMode(): string {
  const row = db
    .prepare(`SELECT value FROM state WHERE key = 'failure_mode'`)
    .get() as { value: string };
  return row?.value ?? 'none';
}

app.get('/balances/:employeeId/:locationId', (req, res) => {
  const mode = failureMode();
  if (mode === 'transient')
    return res.status(503).json({ code: 'HCM_UNAVAILABLE' });

  const row = db
    .prepare(
      `SELECT days FROM balances WHERE employee_id = ? AND location_id = ?`,
    )
    .get(req.params.employeeId, req.params.locationId) as
    | { days: number }
    | undefined;

  if (!row) return res.status(404).json({ code: 'INVALID_DIMENSIONS' });
  return res.json({ days: row.days });
});

app.post('/timeoff/consume', (req, res) => {
  const mode = failureMode();
  if (mode === 'transient')
    return res.status(503).json({ code: 'HCM_UNAVAILABLE' });
  if (mode === 'functional')
    return res.status(422).json({ code: 'INSUFFICIENT_BALANCE' });

  const { employeeId, locationId, days } = req.body as {
    employeeId: string;
    locationId: string;
    days: number;
  };
  if (!employeeId || !locationId || !Number.isFinite(days) || days <= 0) {
    return res.status(400).json({ code: 'INVALID_DIMENSIONS' });
  }

  const row = db
    .prepare(
      `SELECT days FROM balances WHERE employee_id = ? AND location_id = ?`,
    )
    .get(employeeId, locationId) as { days: number } | undefined;

  const current = row?.days ?? 0;
  if (current < days)
    return res.status(422).json({ code: 'INSUFFICIENT_BALANCE' });

  db.prepare(
    `INSERT INTO balances (employee_id, location_id, days) VALUES (?, ?, ?)
     ON CONFLICT(employee_id, location_id) DO UPDATE SET days = excluded.days`,
  ).run(employeeId, locationId, current - days);

  return res.json({ ok: true });
});

app.post('/admin/balances/upsert', (req, res) => {
  const { employeeId, locationId, days } = req.body as {
    employeeId: string;
    locationId: string;
    days: number;
  };
  if (!employeeId || !locationId || !Number.isFinite(days) || days < 0) {
    return res.status(400).json({ code: 'INVALID_DIMENSIONS' });
  }

  db.prepare(
    `INSERT INTO balances (employee_id, location_id, days) VALUES (?, ?, ?)
     ON CONFLICT(employee_id, location_id) DO UPDATE SET days = excluded.days`,
  ).run(employeeId, locationId, days);

  return res.json({ ok: true });
});

app.post('/admin/failure-mode', (req, res) => {
  const body = req.body as { mode?: unknown };
  const mode = body.mode;
  if (mode !== 'none' && mode !== 'transient' && mode !== 'functional') {
    return res.status(400).json({ code: 'INVALID_MODE' });
  }

  db.prepare(`UPDATE state SET value = ? WHERE key = 'failure_mode'`).run(mode);
  return res.json({ ok: true, mode });
});

app.post('/admin/reset', (_req, res) => {
  db.exec(
    `DELETE FROM balances; UPDATE state SET value='none' WHERE key='failure_mode';`,
  );
  return res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`HCM mock listening on ${port}`);
});
