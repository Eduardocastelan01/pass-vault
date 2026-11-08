import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

export interface UserRow {
  id: string;
  email: string;
  salt: string;
  auth_hash: string;
  created_at: string;
}

export interface VaultItemRow {
  id: string;
  user_id: string;
  type: string;
  name: string;
  favorite: number;
  folder_id: string | null;
  iv: string;
  ciphertext: string;
  tag: string;
  version: number;
  deleted: number;
  updated_at: string;
}

export interface FolderRow {
  id: string;
  user_id: string;
  name: string;
  deleted: number;
  updated_at: string;
}

export class VaultDatabase {
  public db: DatabaseSync;

  constructor(dbPath?: string) {
    if (!dbPath) {
      const dataDir = path.resolve(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      dbPath = path.join(dataDir, 'vault.sqlite');
    }

    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.initTables();
  }

  private initTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        salt TEXT NOT NULL,
        auth_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vault_items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        favorite INTEGER NOT NULL DEFAULT 0,
        folder_id TEXT,
        iv TEXT NOT NULL,
        ciphertext TEXT NOT NULL,
        tag TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        deleted INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_vault_items_user_sync 
      ON vault_items(user_id, updated_at);

      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }

  // Métodos de Usuario
  getUserByEmail(email: string): UserRow | undefined {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email.toLowerCase()) as UserRow | undefined;
  }

  getUserById(id: string): UserRow | undefined {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as UserRow | undefined;
  }

  createUser(id: string, email: string, salt: string, authHash: string): UserRow {
    const createdAt = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, salt, auth_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, email.toLowerCase(), salt, authHash, createdAt);
    return { id, email: email.toLowerCase(), salt, auth_hash: authHash, created_at: createdAt };
  }

  // Métodos de Sincronización de Items
  getItemsForUserSince(userId: string, sinceIso?: string): VaultItemRow[] {
    if (sinceIso) {
      const stmt = this.db.prepare(`
        SELECT * FROM vault_items 
        WHERE user_id = ? AND updated_at > ?
        ORDER BY updated_at ASC
      `);
      return stmt.all(userId, sinceIso) as unknown as VaultItemRow[];
    }
    const stmt = this.db.prepare(`
      SELECT * FROM vault_items 
      WHERE user_id = ? AND deleted = 0
      ORDER BY updated_at ASC
    `);
    return stmt.all(userId) as unknown as VaultItemRow[];
  }

  upsertVaultItem(item: {
    id: string;
    userId: string;
    type: string;
    name: string;
    favorite: boolean;
    folderId: string | null;
    iv: string;
    ciphertext: string;
    tag: string;
    version: number;
    deleted: boolean;
    updatedAt: string;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO vault_items (id, user_id, type, name, favorite, folder_id, iv, ciphertext, tag, version, deleted, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        name = excluded.name,
        favorite = excluded.favorite,
        folder_id = excluded.folder_id,
        iv = excluded.iv,
        ciphertext = excluded.ciphertext,
        tag = excluded.tag,
        version = excluded.version,
        deleted = excluded.deleted,
        updated_at = excluded.updated_at
      WHERE excluded.version >= vault_items.version OR excluded.updated_at > vault_items.updated_at;
    `);

    stmt.run(
      item.id,
      item.userId,
      item.type,
      item.name,
      item.favorite ? 1 : 0,
      item.folderId,
      item.iv,
      item.ciphertext,
      item.tag,
      item.version,
      item.deleted ? 1 : 0,
      item.updatedAt
    );
  }
}

