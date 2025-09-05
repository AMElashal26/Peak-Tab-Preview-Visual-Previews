# Tab Splitter Chrome Extension

A Chrome extension that allows you to split your browser window to view two tabs side-by-side.

## Features

- **Split Window**: Divide your current window into two side-by-side windows
- **Tab Selection**: Choose which tabs to display in each window
- **Quick Actions**: Split current tab with next tab, or split first two tabs
- **Keyboard Shortcuts**:[WIP] Use Ctrl+Shift+S for quick splitting
- **Modern UI**: Clean, Material Design-inspired interface

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select this extension folder
4. The extension icon should appear in your toolbar

## Usage

### Method 1: Popup Interface
1. Click the Tab Splitter icon in your toolbar
2. Select tabs for the left and right windows from the dropdowns
3. Click "Split Windows" or use quick action buttons
4. Your window will be split into two side-by-side windows

### Method 2: Keyboard Shortcut
- Press `Ctrl+Shift+S` on any webpage to quickly split the current tab with the next tab

## How It Works

The extension uses Chrome's `chrome.windows` API to:
1. Get the current window dimensions and position
2. Calculate new dimensions for two side-by-side windows
3. Create two new windows with the selected tabs
4. Position them perfectly to create a seamless split-screen experience

## File Structure

```
chrome-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for window management
├── popup.html            # Extension popup interface
├── popup.css             # Popup styling
├── popup.js              # Popup functionality
├── content.js            # Content script for keyboard shortcuts
├── icons/                # Extension icons
│   ├── icon.svg          # Source SVG icon
│   └── generate-icons.html # Icon generator tool
└── README.md             # This file
```

## Icon Generation

To generate proper PNG icons:
1. Open `icons/generate-icons.html` in your browser
2. Right-click on each canvas and save as:
   - `icon16.png` (16x16)
   - `icon32.png` (32x32)
   - `icon48.png` (48x48)
   - `icon128.png` (128x128)

## Permissions

- `tabs`: Access tab information and move tabs between windows
- `windows`: Create and manage browser windows
- `activeTab`: Access the currently active tab

## Browser Compatibility

- Chrome (Manifest V3)
- Edge (Chromium-based)
- Other Chromium-based browsers

## Development

The extension is built using:
- Manifest V3
- Vanilla JavaScript (no frameworks)
- Modern CSS with Material Design principles
- Chrome Extension APIs

## Troubleshooting

**Extension not working?**
- Make sure you have at least 2 tabs open
- Check that the extension has the required permissions
- Try refreshing the page and clicking the extension icon again

**Windows not positioning correctly?**
- The extension calculates positions based on your current window
- Try resizing your current window before splitting
- Make sure you have enough screen space for two windows

## License

This project is open source and available under the MIT License.
