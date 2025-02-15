import { app, globalShortcut } from 'electron';
import * as path from 'path';
import { WindowManager } from './windowManager';
import { isDevelopmentMode } from './utils';
import { setupIPC } from './ipc';
import { setupClipboardWatcher } from './clipboardWatcher';

app.setName('ClipStack Pro');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.clipstack.pro');
}

if (isDevelopmentMode()) {
  const devUserDataPath = path.join(app.getPath('appData'), 'clipstack-pro-dev');
  app.setPath('userData', devUserDataPath);
}

const userDataPath = app.getPath('userData');
const cachePath = path.join(userDataPath, 'Cache');
app.setPath('cache', cachePath);

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('Another instance is running, quitting...');
  app.quit();
} else {
  let windowManager: WindowManager;

  app.on('second-instance', () => {
    console.log('Second instance detected, focusing existing window...');
    windowManager?.toggleWindow();
  });

  app.on('ready', () => {
    try {
      windowManager = WindowManager.getInstance();
      windowManager.createWindow();

      // Start the event-based clipboard watcher
      setupClipboardWatcher();

      globalShortcut.unregisterAll();
      console.log('Registering global shortcut Ctrl+Shift+V...');
      const success = globalShortcut.register('CommandOrControl+Shift+V', () => {
        console.log('Shortcut triggered');
        windowManager.toggleWindow();
      });

      if (!success) {
        console.error('Failed to register global shortcut');
      } else {
        console.log('Global shortcut registered successfully');
        const isRegistered = globalShortcut.isRegistered('CommandOrControl+Shift+V');
        console.log('Shortcut registration verified:', isRegistered);
      }

      setupIPC(); // Set up all IPC channels centrally
    } catch (error) {
      console.error('Error during app initialization:', error);
    }
  });

  let isQuitting = false;

  app.on('before-quit', () => {
    console.log('Application is quitting...');
    isQuitting = true;
  });

  app.on('will-quit', () => {
    console.log('Unregistering shortcuts...');
    try {
      globalShortcut.unregisterAll();
    } catch (error) {
      console.error('Error unregistering shortcuts:', error);
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    windowManager?.toggleWindow();
  });
}