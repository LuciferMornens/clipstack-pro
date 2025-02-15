// src/main/clipboardWatcher.ts
import { clipboard } from 'electron';
import clipboardListener from 'clipboard-event';
import {
  saveClipboardItem,
  getClipboardHistory,
  isDuplicateClipboardItem,
} from '../db/database';
import { WindowManager } from './windowManager';

export function setupClipboardWatcher() {
  try {
    console.log('Initializing clipboard watcher...');
    clipboardListener.startListening();
    console.log('Clipboard watcher initialized successfully');
    
    // Verify clipboard event registration
    const testText = 'ClipStack Test ' + Date.now();
    clipboard.writeText(testText);
    const readText = clipboard.readText();
    if (readText !== testText) {
      console.error('Clipboard verification failed: write/read mismatch');
    }
  } catch (error) {
    console.error('Failed to initialize clipboard watcher:', error);
    throw error;
  }

  clipboardListener.on('change', async () => {
    try {
      const text = clipboard.readText();
      if (!text) {
        console.log('Clipboard change detected but no text content');
        return;
      }

      console.log('Clipboard change detected, processing content...');
      // Check if the clipboard item was just saved to prevent duplication.
      const duplicate = await isDuplicateClipboardItem(text);
      if (duplicate) {
        console.log('Duplicate content detected, skipping');
        return;
      }

      // Use the categorizer to properly classify the content.
      const contentInfo = WindowManager.detectContentType(text);
      console.log('Content classified as:', contentInfo.type);

      await saveClipboardItem({
        content: text,
        timestamp: Date.now(),
        type: contentInfo.type,
        category: contentInfo.category,
        source: contentInfo.source,
        is_code: contentInfo.is_code,
        language: contentInfo.language,
      });

      // If the main window is visible, update the clipboard history in the UI.
      const mainWindow = WindowManager.getInstance().getMainWindow();
      if (mainWindow && mainWindow.isVisible()) {
        const items = await getClipboardHistory({});
        mainWindow.webContents.send('clipboard-updated', items);
        console.log('UI updated with new clipboard content');
      }
    } catch (error) {
      console.error('Error handling clipboard change:', error);
      // Don't throw here to keep the listener alive
    }
  });

  // Handle images in Phase 1.1
  clipboardListener.on('change', () => {
    const image = clipboard.readImage();
    if (!image.isEmpty()) {
      console.log('Image content detected, will be supported in future update');
    }
  });

  // Add error recovery
  // Handle clipboard listener errors
  clipboardListener.on('error', () => {
    console.error('Clipboard listener error occurred');
    try {
      console.log('Attempting to restart clipboard listener...');
      clipboardListener.startListening();
    } catch (restartError) {
      console.error('Failed to restart clipboard listener:', restartError);
    }
  });
}
