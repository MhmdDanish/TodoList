import * as SQLite from 'expo-sqlite';
import { 
  CREATE_TASKS_TABLE, 
  CREATE_SYNC_METADATA_TABLE, 
  CREATE_INDEXES,
  INITIAL_SYNC_METADATA,
  DATABASE_VERSION 
} from './schema';

export interface Migration {
  version: number;
  up: string[];
  down?: string[];
}

const migrations: Migration[] = [
  {
    version: 1,
    up: [
      CREATE_TASKS_TABLE,
      CREATE_SYNC_METADATA_TABLE,
      ...CREATE_INDEXES,
      ...INITIAL_SYNC_METADATA,
    ],
    down: [
      'DROP TABLE IF EXISTS tasks;',
      'DROP TABLE IF EXISTS sync_metadata;',
    ],
  },
];

export async function getCurrentVersion(db: SQLite.SQLiteDatabase): Promise<number> {
  try {
    const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
    return result?.user_version || 0;
  } catch (error) {
    console.warn('Failed to get database version:', error);
    return 0;
  }
}

export async function setVersion(db: SQLite.SQLiteDatabase, version: number): Promise<void> {
  await db.execAsync(`PRAGMA user_version = ${version};`);
}

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const currentVersion = await getCurrentVersion(db);
  
  console.log(`Current database version: ${currentVersion}`);
  
  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      console.log(`Running migration ${migration.version}...`);
      
      try {
        // Run all statements in the migration
        for (const statement of migration.up) {
          await db.execAsync(statement);
        }
        
        // Update version
        await setVersion(db, migration.version);
        console.log(`Migration ${migration.version} completed successfully`);
      } catch (error) {
        console.error(`Migration ${migration.version} failed:`, error);
        throw error;
      }
    }
  }
  
  console.log('All migrations completed');
}