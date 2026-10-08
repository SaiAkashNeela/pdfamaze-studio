/**
 * Personal usage stats, kept in a SQLite file inside the app's private folder.
 * Only counts are stored (which tool, when, how many files, how big) — never file names or
 * contents — and nothing is ever sent anywhere. "Clear my stats" deletes every row.
 */
import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";

let db: SQLiteDatabase | null = null;

function open(): SQLiteDatabase | null {
  if (db) return db;
  try {
    db = openDatabaseSync("pdfamaze-stats.db");
    db.execSync(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        slug TEXT,
        ok INTEGER NOT NULL DEFAULT 1,
        files INTEGER NOT NULL DEFAULT 0,
        bytes INTEGER NOT NULL DEFAULT 0,
        at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS events_kind_at ON events (kind, at);
    `);
    return db;
  } catch {
    // Stats are a nice-to-have; the tools must work even if storage fails.
    return null;
  }
}

function insert(kind: "open" | "run", slug: string | null, ok: boolean, files: number, bytes: number) {
  try {
    open()?.runSync("INSERT INTO events (kind, slug, ok, files, bytes, at) VALUES (?, ?, ?, ?, ?, ?)", [kind, slug, ok ? 1 : 0, files, bytes, Date.now()]);
  } catch {
    // Ignore: never let bookkeeping break a tool.
  }
}

export function recordAppOpen() {
  insert("open", null, true, 0, 0);
}

export function recordToolRun(slug: string, ok: boolean, files: number, bytes: number) {
  insert("run", slug, ok, files, bytes);
}

export type StatsSummary = {
  opens: number;
  runs: number;
  files: number;
  bytes: number;
  since: number | null;
  topTools: { slug: string; count: number }[];
  /** Successful runs per day for the last 7 days, oldest first. */
  week: { day: number; count: number }[];
};

const EMPTY: StatsSummary = { opens: 0, runs: 0, files: 0, bytes: 0, since: null, topTools: [], week: [] };

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function readStats(): StatsSummary {
  const conn = open();
  if (!conn) return EMPTY;
  try {
    const totals = conn.getFirstSync<{ opens: number; runs: number; files: number; bytes: number; since: number | null }>(
      `SELECT
         SUM(kind = 'open') AS opens,
         SUM(kind = 'run' AND ok = 1) AS runs,
         SUM(CASE WHEN kind = 'run' AND ok = 1 THEN files ELSE 0 END) AS files,
         SUM(CASE WHEN kind = 'run' AND ok = 1 THEN bytes ELSE 0 END) AS bytes,
         MIN(at) AS since
       FROM events`,
      [],
    );
    const topTools = conn.getAllSync<{ slug: string; count: number }>(
      "SELECT slug, COUNT(*) AS count FROM events WHERE kind = 'run' AND ok = 1 GROUP BY slug ORDER BY count DESC LIMIT 5",
      [],
    );
    const today = startOfDay(Date.now());
    const from = today - 6 * DAY;
    const rows = conn.getAllSync<{ at: number }>("SELECT at FROM events WHERE kind = 'run' AND ok = 1 AND at >= ?", [from]);
    const counts = new Map<number, number>();
    for (const r of rows) counts.set(startOfDay(r.at), (counts.get(startOfDay(r.at)) ?? 0) + 1);
    const week = Array.from({ length: 7 }, (_, i) => {
      const day = from + i * DAY;
      return { day, count: counts.get(day) ?? 0 };
    });
    return {
      opens: totals?.opens ?? 0,
      runs: totals?.runs ?? 0,
      files: totals?.files ?? 0,
      bytes: totals?.bytes ?? 0,
      since: totals?.since ?? null,
      topTools,
      week,
    };
  } catch {
    return EMPTY;
  }
}

export function clearStats() {
  try {
    open()?.execSync("DELETE FROM events");
  } catch {
    // Nothing to clear.
  }
}
