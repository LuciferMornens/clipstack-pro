declare module 'clipboard-event' {
  interface ClipboardEventEmitter {
    startListening(): void;
    stopListening(): void;
    on(event: 'change', callback: () => void): void;
    off(event: 'change', callback: () => void): void;
  }

  const clipboardEvent: ClipboardEventEmitter;
  export default clipboardEvent;
}
