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
  clipboardListener.startListening();

  clipboardListener.on('change', async () => {
    const text = clipboard.readText();
    if (text) {
      try {
        // Check if the clipboard item was just saved to prevent duplication.
        const duplicate = await isDuplicateClipboardItem(text);
        if (duplicate) return;

        // Use the categorizer to properly classify the content.
        const contentInfo = WindowManager.detectContentType(text);

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
        }
      } catch (error) {
        console.error('Error saving clipboard item:', error);
      }
    }

    // TODO: Handle images in Phase 1.1
    const image = clipboard.readImage();
    if (!image.isEmpty()) {
      // Handle image copying in next iteration
    }
  });
}