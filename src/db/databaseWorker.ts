// src/db/databaseWorker.ts
import Database from 'better-sqlite3';
import * as path from 'path';
import { workerData, parentPort } from 'worker_threads';

// Use workerData to get the user data path passed from the main thread.
const userDataPath: string = workerData.userDataPath;
const dbPath = path.join(userDataPath, 'clipstack.db');

const db = new Database(dbPath);

// Create the unified table if it does not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS clipboard_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    type TEXT NOT NULL,
    category TEXT,
    source TEXT,
    is_code BOOLEAN DEFAULT 0,
    language TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_timestamp ON clipboard_items(timestamp);
  CREATE INDEX IF NOT EXISTS idx_type ON clipboard_items(type);
`);

interface Request {
  id: number;
  action: string;
  payload: any;
}

interface Response {
  id: number;
  result?: any;
  error?: string;
}

// Define an interface for rows returned from the duplicate check query
interface ClipboardItemRow {
  id: number;
  timestamp: number;
}

const port = parentPort;
if (!port) {
  throw new Error("Worker thread has no parent port.");
}

port.on('message', (req: Request) => {
  try {
    let result;
    switch (req.action) {
      case 'saveClipboardItem': {
        const { content, timestamp, type, category, source, is_code, language } = req.payload;
        const stmt = db.prepare(
          `INSERT INTO clipboard_items (content, timestamp, type, category, source, is_code, language)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        );
        const res = stmt.run(content, timestamp, type, category || null, source || null, is_code ? 1 : 0, language || null);
        result = res.lastInsertRowid;
        break;
      }
      case 'getClipboardHistory': {
        const filters = req.payload;
        let query = `SELECT * FROM clipboard_items WHERE 1=1`;
        const params: any[] = [];
        if (filters.type && filters.type.trim()) {
          query += ' AND type = ?';
          params.push(filters.type.trim());
        }
        if (filters.category && filters.category.trim()) {
          query += ' AND category = ?';
          params.push(filters.category.trim());
        }
        if (filters.isCode !== undefined) {
          query += ' AND is_code = ?';
          params.push(filters.isCode ? 1 : 0);
        }
        if (filters.language && filters.language.trim()) {
          query += ' AND language = ?';
          params.push(filters.language.trim());
        }
        if (filters.search && filters.search.trim()) {
          query += ' AND content LIKE ?';
          params.push(`%${filters.search.trim()}%`);
        }
        query += ' ORDER BY timestamp DESC LIMIT 50';
        const stmt = db.prepare(query);
        result = stmt.all(...params);
        break;
      }
      case 'isDuplicateClipboardItem': {
        const { content } = req.payload;
        const currentTime = Date.now();
        const stmt = db.prepare(`
          SELECT id, timestamp FROM clipboard_items 
          WHERE content = ? 
          ORDER BY timestamp DESC 
          LIMIT 1
        `);
        const item = stmt.get(content) as ClipboardItemRow | undefined;
        result = item && currentTime - item.timestamp < 2000 ? true : false;
        break;
      }
      case 'getRecentItems': {
        const { limit } = req.payload;
        const stmt = db.prepare(`
          SELECT * FROM clipboard_items
          ORDER BY timestamp DESC
          LIMIT ?
        `);
        result = stmt.all(limit);
        break;
      }
      default:
        throw new Error(`Unknown action: ${req.action}`);
    }
    const response: Response = { id: req.id, result };
    port.postMessage(response);
  } catch (error: any) {
    const response: Response = { id: req.id, error: error.message };
    port.postMessage(response);
  }
});