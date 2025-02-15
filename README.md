# ClipStack Pro

Advanced Clipboard Manager with Smart Features

## Features

- **Smart Clipboard History**: Automatically tracks and stores your clipboard history
- **Advanced Search**: Search through your clipboard history with real-time filtering
- **Automatic Categorization**: Intelligently categorizes content (text, code, URLs, etc.)
- **Code Detection**: Automatically detects and highlights code snippets with language detection
- **Quick Access**: Global hotkeys for instant access to your clipboard history
- **Smart Filtering**: Filter by type, category, or programming language
- **Modern UI**: Clean, responsive interface with visual feedback
- **Keyboard Navigation**: Full keyboard support for power users

## Installation

Supported Platforms: Windows (primary), macOS and Linux support coming soon

1. Download the latest release from the releases page
2. Run the installer
3. Launch ClipStack Pro
4. Use `CTRL + SHIFT + V` to open the clipboard manager

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run dist
```

## Project Structure

- `src/` - Source code
  - `main/` - Electron main process
    - `windowManager.ts` - Main window and tray management
    - `db/` - Database operations and schema
  - `renderer/` - React frontend code
    - `App.tsx` - Main application component
    - `styles.css` - Application styles
  - `types/` - TypeScript type definitions

## Tech Stack

- **Framework**: Electron + React
- **Language**: TypeScript
- **Database**: SQLite (better-sqlite3)
- **Build Tools**: Webpack, electron-builder
- **Styling**: CSS Modules
- **Event Handling**: clipboard-event

## Usage

### Global Shortcuts
- `CTRL + SHIFT + V`: Open/close the clipboard manager
- `↑/↓`: Navigate through clipboard items
- `Enter`: Copy selected item
- `Esc`: Close the window

### Filtering
- Click on type buttons to filter by content type
- Click on category buttons to filter by category
- Click on language buttons to filter code snippets by language
- Use the search bar for text-based filtering

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details
