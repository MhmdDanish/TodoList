import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';
import { DATABASE_NAME } from './schema';

let database: SQLite.SQLiteDatabase | null = null;

export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) {
    return database;
  }

  try {
    console.log('Initializing database...');
    // Updated for expo-sqlite v16+
    database = await SQLite.openDatabaseAsync(DATABASE_NAME);
    
    // Enable foreign keys and WAL mode for better performance
    await database.execAsync('PRAGMA foreign_keys = ON;');
    await database.execAsync('PRAGMA journal_mode = WAL;');
    
    // Run migrations
    await runMigrations(database);
    
    console.log('Database initialized successfully');
    return database;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!database) {
    return await initializeDatabase();
  }
  return database;
}

export async function closeDatabase(): Promise<void> {
  if (database) {
    await database.closeAsync();
    database = null;
  }
}