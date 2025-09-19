export const DATABASE_NAME = 'tasks.db';
export const DATABASE_VERSION = 1;

export const CREATE_TASKS_TABLE = `
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    notes TEXT,
    isDone INTEGER NOT NULL DEFAULT 0,
    dueAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    dirty INTEGER NOT NULL DEFAULT 1,
    deleted INTEGER NOT NULL DEFAULT 0,
    lastSyncAt TEXT
  );
`;

export const CREATE_SYNC_METADATA_TABLE = `
  CREATE TABLE IF NOT EXISTS sync_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`;

export const CREATE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_tasks_isDone ON tasks(isDone);',
  'CREATE INDEX IF NOT EXISTS idx_tasks_dirty ON tasks(dirty);',
  'CREATE INDEX IF NOT EXISTS idx_tasks_deleted ON tasks(deleted);',
  'CREATE INDEX IF NOT EXISTS idx_tasks_updatedAt ON tasks(updatedAt);',
];

export const INITIAL_SYNC_METADATA = [
  "INSERT OR IGNORE INTO sync_metadata (key, value, updatedAt) VALUES ('lastPullAt', '1970-01-01T00:00:00.000Z', datetime('now'));",
  "INSERT OR IGNORE INTO sync_metadata (key, value, updatedAt) VALUES ('lastPushAt', '1970-01-01T00:00:00.000Z', datetime('now'));",
];