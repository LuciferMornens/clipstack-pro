import { Worker } from 'worker_threads';
import * as path from 'path';
import { app } from 'electron';

export interface ClipboardItem {
  id?: number;
  content: string;
  type: string;
  timestamp: number; // epoch milliseconds
  category?: string | null;
  source?: string | null;
  is_code?: boolean;
  language?: string | null;
}

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

let worker: Worker;
let messageId = 0;
const pending = new Map<number, { resolve: Function; reject: Function }>();

function initWorker() {
  if (worker) return;
  const workerPath = path.join(__dirname, 'databaseWorker.js');
  worker = new Worker(workerPath, {
    workerData: { userDataPath: app.getPath('userData') }
  });
  worker.on('message', (message: Response) => {
    const { id, result, error } = message;
    const promise = pending.get(id);
    if (promise) {
      if (error) {
        promise.reject(new Error(error));
      } else {
        promise.resolve(result);
      }
      pending.delete(id);
    }
  });
  worker.on('error', (err) => {
    console.error('Database worker error:', err);
  });
}

function sendRequest(action: string, payload: any): Promise<any> {
  initWorker();
  return new Promise((resolve, reject) => {
    const id = messageId++;
    pending.set(id, { resolve, reject });
    const req: Request = { id, action, payload };
    worker.postMessage(req);
  });
}

export function setupDatabase(): Promise<void> {
  // Worker initialization handles schema creation.
  initWorker();
  return Promise.resolve();
}

export function saveClipboardItem(item: ClipboardItem): Promise<number> {
  return sendRequest('saveClipboardItem', item);
}

export function getClipboardHistory(filters: {
  type?: string;
  category?: string;
  isCode?: boolean;
  language?: string;
  search?: string;
}): Promise<ClipboardItem[]> {
  return sendRequest('getClipboardHistory', filters);
}

export function isDuplicateClipboardItem(content: string): Promise<boolean> {
  return sendRequest('isDuplicateClipboardItem', { content });
}

export function getRecentItems(limit: number = 50): Promise<ClipboardItem[]> {
  return sendRequest('getRecentItems', { limit });
}