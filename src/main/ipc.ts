// src/main/ipc.ts
import { ipcMain, clipboard } from 'electron';
import { getRecentItems, getClipboardHistory } from '../db/database';
import { WindowManager } from './windowManager';

export function setupIPC() {
  ipcMain.handle('get-recent-items', async (_, limit?: number) => {
    try {
      return await getRecentItems(limit);
    } catch (error) {
      console.error('Error getting recent items:', error);
      throw error;
    }
  });

  ipcMain.handle('search-items', async (_, query: string) => {
    try {
      return await getClipboardHistory({ search: query });
    } catch (error) {
      console.error('Error searching items:', error);
      throw error;
    }
  });

  ipcMain.handle('get-clipboard-history', async (_, filters?: {
    type?: string;
    category?: string;
    isCode?: boolean;
    language?: string;
    search?: string;
  }) => {
    try {
      return await getClipboardHistory(filters || {});
    } catch (error) {
      console.error('Error getting clipboard history:', error);
      throw error;
    }
  });

  ipcMain.handle('copy-to-clipboard', async (_, content: string) => {
    try {
      clipboard.writeText(content);
      // Hide the window after copying:
      const mainWindow = WindowManager.getInstance().getMainWindow();
      if (mainWindow) mainWindow.hide();
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      throw error;
    }
  });

  ipcMain.handle('hide-window', async () => {
    try {
      const mainWindow = WindowManager.getInstance().getMainWindow();
      if (mainWindow) mainWindow.hide();
      return true;
    } catch (error) {
      console.error('Error hiding window:', error);
      throw error;
    }
  });

  ipcMain.handle('show-window', async () => {
    try {
      const mainWindow = WindowManager.getInstance().getMainWindow();
      if (mainWindow) mainWindow.show();
      return true;
    } catch (error) {
      console.error('Error showing window:', error);
      throw error;
    }
  });

  // New: Handler for "open-url" channel (using Electron’s shell)
  const { shell } = require('electron');
  ipcMain.handle('open-url', async (_, url: string) => {
    try {
      shell.openExternal(url);
      return true;
    } catch (error) {
      console.error('Error opening URL:', error);
      throw error;
    }
  });
}