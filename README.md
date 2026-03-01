# Handwrite - Obsidian Plugin

Professional handwriting and drawing plugin for pen displays and tablets with **dual OCR options**: MyScript (2000 free/month, 98% accuracy - same as Kobo eReader) or Google Cloud Vision (1000 free/month).

Transform your Obsidian vault into a handwriting canvas with realistic pen types, OCR text extraction, and a complete toolkit for digital handwriting.

## ✨ Features

### Handwriting & Drawing
- **🖋️ Realistic Pen Types**:
  - **Calligraphy Nib**: Fixed-angle calligraphy with authentic stroke variation
  - **Fountain Pen**: Pressure-sensitive variable width
  - **Pencil**: Soft, natural pencil-like strokes
- **🎨 Infinite-like Canvas**: 5000x5000px workspace with zoom and pan
- **🖱️ 4 Modes**: Drawing, Eraser, Pan (hand tool), Select/Move
- **🔲 Multi-Select**: Drag rectangle to select multiple strokes, move/copy/delete together
- **✂️ Context Menus**: Right-click and stylus button support for copy/cut/paste/resize/duplicate
- **↩️ Undo/Redo**: Comprehensive history for all operations
- **📏 Ruled Lines**: Toggle horizontal guidelines for writing

### OCR (Handwriting Recognition)
- **🤖 Dual OCR Providers**:
  - **MyScript**: 2000 free requests/month, 98% accuracy (same tech as Kobo eReader)
  - **Google Cloud Vision**: 1000 free requests/month
- **📊 API Usage Tracking**: Monitor your monthly quota usage in settings
- **📋 Copy to Clipboard**: Extract text and copy directly to clipboard
- **⚙️ Provider Selection**: Switch between providers anytime in settings

### Canvas Features
- **🌓 Light/Dark Mode Toggle**: Switch canvas background with auto pen color adjustment
- **🎨 Simplified Color Picker**: Quick white/black/grey buttons (optional full picker in settings)
- **♿ Accessibility**: Customizable selection color for better visibility
- **📝 Text Paste**: Paste text from notes onto canvas for editing
- **🔤 Adjustable Font**: 8-72px size for pasted text
- **🖱️ Middle Mouse Pan**: Quick pan without switching modes

### Performance
- Optimized rendering with eliminated save/restore overhead
- Conditional updates for smooth drawing
- Cached trigonometry calculations
- Smooth quadratic curves for natural feel

## 🚀 Quick Start

### 1. Installation

#### From GitHub Releases (Recommended)
1. Download the latest release from [GitHub Releases](https://github.com/SattaRIP/obsidian-handwrite/releases)
2. Extract `main.js`, `styles.css`, `manifest.json` to:
   ```
   <your-vault>/.obsidian/plugins/handwrite/
   ```
3. Reload Obsidian (Settings → Community Plugins → Reload)
4. Enable "Handwrite" plugin

#### From Obsidian Community Plugins (Coming Soon)
1. Open Obsidian Settings
2. Go to Community Plugins → Browse
3. Search for "Handwrite"
4. Click Install, then Enable

### 2. OCR Setup (Choose One or Both)

The plugin supports **two OCR providers**. You can use either one, or set up both and switch between them.

#### Option A: MyScript (Recommended)
**Best for**: Cursive handwriting, 2000 free requests/month, 98% accuracy

1. Sign up at [developer.myscript.com](https://developer.myscript.com)
2. Create a new application (type: Web, recognition: iink)
3. Copy your **Application Key** and **HMAC Key**
4. In Obsidian Settings → Handwrite:
   - Paste Application Key
   - Paste HMAC Key
   - Select "MyScript" as OCR Provider

**Detailed setup guide**: See [MYSCRIPT_SETUP.md](MYSCRIPT_SETUP.md)

#### Option B: Google Cloud Vision
**Best for**: Print-style handwriting, 1000 free requests/month

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable Cloud Vision API
4. Create an API key (restrict to Vision API only)
5. Activate billing (required, but free tier covers 1000 requests/month)
6. In Obsidian Settings → Handwrite:
   - Paste API Key
   - Select "Google Cloud Vision" as OCR Provider

**Detailed setup guide**: See [GOOGLE_CLOUD_SETUP.md](GOOGLE_CLOUD_SETUP.md)

**OCR Overview**: See [OCR_README.md](OCR_README.md) for comparison and tips

### 3. Start Writing!

1. Click the **pen icon** in the sidebar
2. Choose a pen type (Regular/Fountain/Calligraphy/Pencil)
3. Draw on the canvas
4. Click **"Extract Text (OCR)"** to recognize handwriting
5. Text is copied to clipboard - paste wherever you need it!

## 📖 Usage

### Opening the Canvas
- **Ribbon Icon**: Click pen tool icon in left sidebar
- **Command Palette**: `Ctrl/Cmd + P` → "Open Handwrite Canvas"
- Canvas opens in right sidebar

### Toolbar Controls

**Mode Buttons** (mutually exclusive):
- **Handwriting** 🖊️: Draw mode (default)
- **Eraser** 🧹: Erase strokes
- **Pan** 🖐️: Move canvas around
- **Select/Move** ⬚: Select and move strokes

**Pen Settings**:
- **Pen Type**: Regular, Fountain, Calligraphy, Pencil
- **Pen Size**: 1-10 (base stroke width)
- **Color**: Simple white/black/grey buttons (full picker in settings)
- **Auto Pen Color**: Automatically switches pen color when toggling canvas mode

**Canvas Controls**:
- **Lines ON/OFF**: Toggle ruled lines
- **Spacing**: Adjust line spacing (40-100)
- **Light/Dark**: Toggle canvas background
- **Reload**: Refresh canvas
- **Zoom In/Out**: Zoom to 50%/100%/200%
- **Undo/Redo**: `Ctrl+Z` / `Ctrl+Y`
- **Clear Canvas**: Erase everything
- **Extract Text (OCR)**: Send to OCR provider

### Selection & Context Menu

**Drag-to-Select**:
1. Click "Select/Move" mode
2. Click and drag to create selection rectangle
3. All strokes inside are selected (highlighted in blue)
4. Click and drag selection to move
5. Right-click for context menu

**Context Menu** (right-click or stylus button):
- **Copy Selection**: Copy to clipboard
- **Cut Selection**: Copy and delete
- **Paste**: Paste at clicked position
- **Duplicate**: Create copy at cursor
- **Delete Selection**: Remove selected strokes
- **Resize Selection**: Scale strokes

**Keyboard Shortcuts**:
- `Ctrl+C`: Copy selection
- `Ctrl+X`: Cut selection
- `Ctrl+V`: Paste
- `Delete`: Delete selection
- `Ctrl+Z`: Undo
- `Ctrl+Y`: Redo

### OCR (Handwriting Recognition)

1. **Write** on the canvas with your preferred pen
2. **Click "Extract Text (OCR)"** button
3. **Wait** for OCR processing (1-3 seconds)
4. **Review** extracted text in modal
5. **Edit** if needed
6. **Click "Copy to Clipboard"**
7. **Paste** wherever you need the text

**Tips for Best OCR Accuracy**:
- Write clearly and legibly
- Use larger pen size (4-6)
- Use dark colors (black works best)
- Write horizontally
- Leave space between lines
- **MyScript**: Works great with cursive, keep words well-spaced
- **Google Cloud**: Print-style handwriting works better than cursive

### API Usage Tracking

Monitor your OCR usage in **Settings → Handwrite**:
- **MyScript**: X / 2000 requests
- **Google Cloud Vision**: X / 1000 requests
- **Reset Counters**: Click button at start of each month

When you exceed quota, you'll get a clear error message telling you to wait until next month.

### Switching OCR Providers

Go to **Settings → Handwrite → OCR Provider** and select:
- **MyScript** (2000 free/month, 98% accuracy)
- **Google Cloud Vision** (1000 free/month)

The Extract Text button automatically uses your selected provider.

## 🎨 Pen Types Explained

### Regular Pen
- Uniform stroke width
- Responsive to pressure
- Good for diagrams

### Fountain Pen
- Variable width based on pressure
- Natural writing feel
- Great for signatures

### Calligraphy Nib
- Fixed 45° nib angle
- Authentic calligraphic variation
- Thick on downstrokes, thin on horizontals
- Beautiful for handwriting practice

### Pencil
- Soft, natural pencil texture
- Subtle pressure variation
- Great for sketching

## 💡 Workflow Examples

### Quick Handwritten Notes
1. Open canvas in sidebar
2. Write quick notes with stylus
3. Extract text with OCR
4. Paste into your note
5. Clear canvas, continue

### Handwriting Practice
1. Select Calligraphy pen
2. Practice letterforms on canvas
3. Use ruled lines for alignment
4. Save as PNG for reference

### Sketching & Diagrams
1. Use Regular pen for clean lines
2. Draw diagrams or mind maps
3. Right-click → Save as PNG
4. Embed in your notes

### Editing with Handwriting
1. Paste text onto canvas
2. Handwrite corrections/annotations
3. Extract combined text
4. Review and paste back

## ⚙️ Settings

**Obsidian Settings → Handwrite**:

- **Enable Full Color Picker**: Show full color picker in toolbar (default: off)
- **Selection Color**: Choose highlight color for selected strokes (accessibility)
- **OCR Provider**: MyScript or Google Cloud Vision
- **API Usage Tracking**: View current usage and reset counters
- **MyScript Keys**: Application Key and HMAC Key
- **Google Cloud Key**: API Key

## 🔒 Privacy & Data

### MyScript
- Stroke coordinates sent to MyScript Cloud over HTTPS
- Processed for handwriting recognition only
- Not stored long-term by MyScript
- See [MyScript Privacy Policy](https://developer.myscript.com/privacy)

### Google Cloud Vision
- Image of handwriting sent to Google Cloud over HTTPS
- Processed by Vision API for OCR
- May be stored temporarily for billing
- See [Google Cloud Privacy Policy](https://cloud.google.com/terms/cloud-privacy-notice)

### Local Data
- Canvas strokes stored in `data.json` in plugin folder
- No telemetry or tracking
- No data sent anywhere except OCR API calls

## 🛠️ Troubleshooting

### OCR Not Working

**"MyScript API keys not configured"**
→ Go to Settings → Handwrite and enter your MyScript Application Key and HMAC Key

**"Google Cloud API key not configured"**
→ Go to Settings → Handwrite and enter your Google Cloud API Key

**"MyScript quota exceeded"**
→ You've used 2000 requests this month. Wait until next month or enable billing.

**"Google Cloud quota exceeded"**
→ You've used 1000 requests this month. Wait until next month or check billing.

**"No text recognized"**
→ Try writing more clearly, using larger pen size, or switching OCR providers

### Canvas Issues

**Canvas not drawing**
→ Check if Drawing mode is selected (should be green)

**Can't select strokes**
→ Click "Select/Move" mode button first

**Pen pressure not working**
→ Ensure device drivers are installed, some devices/browsers don't support pressure

**Cursor not changing**
→ Reload the plugin (Settings → Community Plugins → toggle off/on)

### Performance

**Slow drawing**
→ Try reducing canvas size or clearing old strokes

**OCR is slow**
→ Normal - cloud APIs can take 1-3 seconds

## 📋 Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Copy | `Ctrl+C` |
| Cut | `Ctrl+X` |
| Paste | `Ctrl+V` |
| Delete | `Delete` |
| Undo | `Ctrl+Z` |
| Redo | `Ctrl+Y` |
| Pan Canvas | Middle Mouse Drag |

## 🗺️ Roadmap

Future enhancements planned:
- [ ] Offline OCR option (Tesseract integration)
- [ ] Kobo eReader sync plugin (import handwritten notes from Kobo)
- [ ] Layer support
- [ ] Shape recognition
- [ ] Custom OCR language selection
- [ ] Export to PDF with vector strokes

## 📜 License

MIT License - See [LICENSE](LICENSE) file

## 🙏 Credits

- **OCR Providers**: MyScript Cloud API, Google Cloud Vision API
- **Obsidian API**: For the amazing plugin ecosystem

## 🐛 Support & Issues

- **Documentation**: Check README.md and setup guides
- **Issues**: Report bugs on [GitHub Issues](https://github.com/SattaRIP/obsidian-handwrite/issues)
- **Discussions**: Ask questions in [GitHub Discussions](https://github.com/SattaRIP/obsidian-handwrite/discussions)

## 🌟 Support This Plugin

If you find this plugin useful:
- ⭐ Star the repository on GitHub
- 🐛 Report bugs and suggest features
- 📝 Share your handwriting workflow
- ☕ [Buy me a coffee](https://buymeacoffee.com/SattaRIP) (optional)

---

**Enjoy handwriting in Obsidian!** ✍️
