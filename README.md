# TodoList

Offline-First Task Sync App
React Native task manager with bidirectional synchronization and offline-first architecture.


Architecture Overview
System Architecture
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Native  │    │     Redux       │    │     SQLite      │
│   Components    │◄──►│  State Manager  │◄──►│  Local Database │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI Layer      │    │  Business Logic │    │  Data Layer     │
│ - TaskList      │    │ - Sync Service  │    │ - Task Queries  │
│ - TaskDetail    │    │ - API Service   │    │ - Migrations    │
│ - SyncStatus    │    │ - Network Det.  │    │ - Indexes       │
└─────────────────┘    └─────────────────┘    └─────────────────┘

Sync Flow Diagram
[App Start] → [Load Local Tasks] → [Check Network]
                    │                     │
                    ▼                     ▼
            [Display Tasks]        [Online?] ──No──► [Offline Mode]
                    │                     │              │
                    │               Yes───┘              │
                    │                     │              │
                    ▼                     ▼              │
            [User Actions] ──────► [Trigger Sync] ◄──────┘
                    │                     │
                    ▼                     ▼
            [Mark as Dirty]     ┌─────────────────┐
                    │           │   SYNC PROCESS  │
                    │           │                 │
                    │           │ 1. Push Local   │
                    │           │    Changes      │
                    │           │                 │
                    │           │ 2. Pull Remote  │
                    │           │    Changes      │
                    │           │                 │
                    │           │ 3. Resolve      │
                    │           │    Conflicts    │
                    │           │                 │
                    │           │ 4. Update UI    │
                    │           └─────────────────┘
                    │                     │
                    └─────────────────────┘


Database Schema
Tasks Table

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,              -- Unique identifier
  title TEXT NOT NULL,              -- Task title (required)
  notes TEXT,                       -- Optional description
  isDone INTEGER NOT NULL DEFAULT 0, -- Completion status (0/1)
  dueAt TEXT,                       -- ISO datetime string
  createdAt TEXT NOT NULL,          -- ISO datetime string
  updatedAt TEXT NOT NULL,          -- ISO datetime string
  dirty INTEGER NOT NULL DEFAULT 1, -- Has unsynced changes (0/1)
  deleted INTEGER NOT NULL DEFAULT 0, -- Soft delete flag (0/1)
  lastSyncAt TEXT                   -- Last successful sync timestamp
);

-- Performance indexes
CREATE INDEX idx_tasks_dirty ON tasks(dirty);
CREATE INDEX idx_tasks_deleted ON tasks(deleted);
CREATE INDEX idx_tasks_updated_at ON tasks(updatedAt);
CREATE INDEX idx_tasks_is_done ON tasks(isDone);

Sync Metadata Table

CREATE TABLE sync_metadata (
  key TEXT PRIMARY KEY,             -- Metadata key
  value TEXT NOT NULL,              -- Metadata value
  updatedAt TEXT NOT NULL           -- Last update timestamp
);

-- Stores sync timestamps and configuration
INSERT INTO sync_metadata VALUES ('lastPullAt', '1970-01-01T00:00:00.000Z', datetime('now'));


Migration Strategy
Current Approach

Single schema version with CREATE IF NOT EXISTS
Safe for initial deployment
All tables and indexes created on first run


Conflict Resolution Policy
Strategy: Last-Writer-Wins (LWW)
Chosen because:

Simplicity: Easy to implement and understand
Deterministic: Same result regardless of sync order
No user intervention: Automatic resolution prevents UI blocking
Mobile-friendly: Works well with intermittent connectivity