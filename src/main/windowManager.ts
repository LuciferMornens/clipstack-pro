// src/main/windowManager.ts
import { app, BrowserWindow, Tray, Menu, clipboard } from 'electron';
import * as path from 'path';
import {
  getClipboardHistory,
  // Note: saveClipboardItem and isDuplicateClipboardItem are no longer used here,
  // because the polling watcher was removed.
} from '../db/database';
import { isDevelopmentMode } from './utils';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private isQuitting = false;
  private static instance: WindowManager | null = null;

  private constructor() {
    // Initialize the unified database asynchronously
    // (Removed polling clipboard watcher to avoid duplicate saves.)
    this.setupAppEvents();
  }

  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }

  /**
   * Public static method to determine the type of clipboard content.
   * It checks for URLs, emails, and various code patterns.
   */
  public static detectContentType(content: string): {
    type: string;
    category: string | null;
    source: string | null;
    is_code: boolean;
    language: string | null;
  } {
    const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    if (urlRegex.test(content)) {
      try {
        return {
          type: 'url',
          category: 'web',
          source: new URL(content).hostname,
          is_code: false,
          language: null,
        };
      } catch {
        // Fall through if URL parsing fails
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(content)) {
      return {
        type: 'email',
        category: 'contact',
        source: content.split('@')[1],
        is_code: false,
        language: null,
      };
    }

    const codePatterns = {
      javascript: /^(const|let|var|function|class|import|export|async|await)/m,
      python: /^(def|class|import|from|async|await)/m,
      html: /^<!DOCTYPE|<html|<div|<p|<script/m,
      css: /^(\.|#|@media|@import|body|html|div|p|a)\s*{/m,
      sql: /^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|WITH|FROM)\s/im,
      json: /^[\[{]/m,
      typescript: /^(interface|type|namespace|enum)/m,
    };

    for (const [language, pattern] of Object.entries(codePatterns)) {
      if (pattern.test(content)) {
        return {
          type: 'code',
          category: 'development',
          source: null,
          is_code: true,
          language,
        };
      }
    }

    return {
      type: 'text',
      category: content.length > 100 ? 'long-text' : 'snippet',
      source: null,
      is_code: false,
      language: null,
    };
  }

  private setupAppEvents() {
    app.on('before-quit', () => {
      this.isQuitting = true;
      this.cleanup();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (!this.mainWindow) {
        this.createWindow();
      }
    });
  }

  private cleanup() {
    console.log('Cleaning up WindowManager...');
    // (Removed clipboard polling cleanup as it's no longer used.)
  }

  public async toggleWindow() {
    if (!this.mainWindow) {
      this.createWindow();
      return;
    }

    if (this.mainWindow.isVisible()) {
      this.mainWindow.hide();
    } else {
      this.mainWindow.show();
      this.mainWindow.focus();
      const items = await getClipboardHistory({});
      this.mainWindow.webContents.send('clipboard-updated', items);
    }
  }

  createWindow() {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore();
      this.mainWindow.show();
      this.mainWindow.focus();
      return;
    }

    this.mainWindow = new BrowserWindow({
      width: 800,
      height: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      icon: path.join(__dirname, '../../assets/cb.ico'),
      title: 'ClipStack Pro',
      show: false,
    });

    const isDevMode = isDevelopmentMode();

    if (isDevMode) {
      this.mainWindow.loadURL('http://localhost:3000').catch((error: any) => {
        console.error('Failed to load dev URL:', error);
      });
    } else {
      const resourcePath = path.join(process.resourcesPath, 'app', 'renderer', 'index.html');
      if (require('fs').existsSync(resourcePath)) {
        this.mainWindow.loadFile(resourcePath).catch((error: any) => {
          console.error('Failed to load from resource path:', error);
        });
      } else {
        console.error('Could not find index.html in resource path:', resourcePath);
      }
    }

    this.mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription);
    });

    this.mainWindow.on('ready-to-show', async () => {
      this.mainWindow?.show();
      this.mainWindow?.focus();
      const items = await getClipboardHistory({});
      this.mainWindow?.webContents.send('clipboard-updated', items);
    });

    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.mainWindow?.hide();
      }
    });

    if (!this.tray) {
      this.createTray();
    }
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  createTray() {
    const iconPath = path.join(__dirname, '../../assets/cb.ico');
    this.tray = new Tray(iconPath);
    this.tray.setToolTip('ClipStack Pro');
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show ClipStack Pro',
        click: () => {
          this.mainWindow?.show();
        },
      },
      {
        label: 'Quit',
        click: () => {
          this.quit();
        },
      },
    ]);
    this.tray.setContextMenu(contextMenu);
    this.tray.on('click', () => {
      this.mainWindow?.show();
    });
  }

  quit() {
    this.isQuitting = true;
    app.quit();
  }
}
