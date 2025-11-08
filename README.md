# YouTube Bookmark Extension 

A beautiful and powerful Chrome extension that allows you to bookmark timestamps in YouTube videos and easily navigate back to them.

![Extension Preview](https://img.shields.io/badge/Chrome-Extension-blue?style=for-the-badge&logo=google-chrome)
![Version](https://img.shields.io/badge/version-0.1.0-green?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-orange?style=for-the-badge)

## Features

- **Timestamp Bookmarks**: Save specific timestamps while watching YouTube videos
- **Quick Navigation**: Click any bookmark to jump directly to that timestamp
- **Auto-Play**: Video automatically plays when you navigate to a bookmarked timestamp
- **Easy Management**: Delete bookmarks you no longer need
- **Persistent Storage**: Bookmarks are saved per video and persist across browser sessions
- **Beautiful UI**: Modern, gradient-based interface with smooth animations
- **Fast & Lightweight**: Minimal performance impact on YouTube

## Screenshots

### Extension Popup

The extension displays all your bookmarks for the current video with a beautiful modern interface.

### Bookmark Button

A bookmark button is seamlessly integrated into YouTube's video player controls.

## Installation

### From Source

1. **Clone this repository**

   ```bash
   git clone https://github.com/alok410kr/YouTube-BookMark-Extension.git
   ```

2. **Open Chrome Extensions**

   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

3. **Load the Extension**

   - Click "Load unpacked"
   - Select the extension folder
   - The extension icon should appear in your toolbar

4. **Start Using**
   - Open any YouTube video
   - Look for the bookmark icon in the video player controls
   - Click it to save the current timestamp
   - Click the extension icon to view and manage your bookmarks

## How to Use

### Creating a Bookmark

1. Play a YouTube video
2. Pause at the timestamp you want to bookmark
3. Click the bookmark icon in the video player controls
4. The bookmark is automatically saved!

### Viewing Bookmarks

1. Click the extension icon in your Chrome toolbar
2. See all bookmarks for the current video
3. Each bookmark shows the timestamp (e.g., "Bookmark at 00:03:45")

### Playing a Bookmark

1. Open the extension popup
2. Click the play button next to any bookmark
3. The video jumps to that timestamp and starts playing

### Deleting a Bookmark

1. Open the extension popup
2. Click the delete button next to any bookmark
3. The bookmark is removed instantly

## 🛠️ Technical Details

### Technologies Used

- **JavaScript**: Core functionality
- **Chrome Extension APIs**: Storage, Tabs, Runtime
- **CSS3**: Modern UI with gradients and animations
- **HTML5**: Popup interface

### Architecture

- **manifest.json**: Extension configuration and permissions
- **contentScript.js**: Injected into YouTube pages, handles bookmark button and video control
- **background.js**: Service worker for tab updates and messaging
- **popup.js**: Manages the popup interface and user interactions
- **popup.html/css**: Beautiful UI for bookmark display
- **utils.js**: Shared utility functions

### Key Features Implementation

- **SPA Navigation Detection**: Handles YouTube's single-page app navigation
- **Player State Management**: Tracks video player readiness
- **Chrome Storage Sync**: Bookmarks sync across devices
- **Error Handling**: Comprehensive error handling with user feedback

## Project Structure

```
YouTube-BookMark-Extension/
├── assets/
│   ├── bookmark.png       # Bookmark button icon
│   ├── delete.png         # Delete button icon
│   ├── extension.png      # Extension toolbar icon
│   ├── play-button.png    # Play button icon
│   └── save.png           # Save icon
├── background.js          # Background service worker
├── contentScript.js       # Content script for YouTube pages
├── manifest.json          # Extension manifest
├── popup.css              # Popup styling
├── popup.html             # Popup HTML structure
├── popup.js               # Popup logic
├── utils.js               # Utility functions
└── README.md              # This file
```

## Development

### Prerequisites

- Google Chrome browser
- Basic knowledge of JavaScript and Chrome Extension APIs

### Local Development

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Reload any open YouTube pages
5. Test your changes

### Debugging

- **Content Script**: Open YouTube page → F12 → Console tab
- **Popup**: Right-click extension icon → Inspect popup
- **Background**: Go to `chrome://extensions/` → Click "service worker" under the extension

## Known Issues & Fixes

### "Extension context invalidated" error

**Solution**: Reload the extension and refresh the YouTube page

### Bookmark button not appearing

**Solution**: Wait a few seconds for the page to load, then refresh if needed

### Bookmarks not saving

**Solution**: Check that the extension has proper permissions in `chrome://extensions/`

## Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - feel free to use it however you like!

## Author

**alok410kr**

- GitHub: [@alok410kr](https://github.com/alok410kr)
- Repository: [YouTube-BookMark-Extension](https://github.com/alok410kr/YouTube-BookMark-Extension)

## Show Your Support

If you found this extension helpful, please consider giving it a on GitHub!

## Feedback & Support

Found a bug or have a feature request? Please open an issue on GitHub!

---

Made with Love by alok410kr
