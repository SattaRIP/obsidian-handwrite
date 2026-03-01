# Handwrite Plugin - Complete Feature List

## Version 7.1.0 - Production Ready

Professional handwriting and drawing plugin for Obsidian, optimized for pen displays and tablets.

---

## Pen Types

### 1. Regular Pen
Standard digital pen with consistent line width.

### 2. Calligraphy Nib (Fixed-Angle)
Realistic calligraphy pen with variable stroke width based on direction:
- Thin strokes when moving perpendicular to nib angle
- Thick strokes when moving parallel to nib angle
- Authentic calligraphic effect without pressure sensitivity

### 3. Fountain Pen
Smooth, slightly variable line width for elegant handwriting.

### 4. Pencil
Textured, softer appearance for sketching and drafting.

---

## Drawing Modes (Mutually Exclusive)

### Handwriting Mode (Default: ON)
- Draw/write on canvas
- All pen types available
- Smooth quadratic curves for natural feel
- Button: "Handwriting: ON/OFF"

### Eraser Mode
- Remove strokes or objects
- Theme-matched cursor (white/black eraser icon)
- Click or drag to erase
- Button: "Eraser: ON/OFF"

### Pan Mode
- Move around large canvas (5000x5000)
- Hand cursor indicates pan mode
- Drag to navigate
- **Middle mouse button** also enables temporary panning without mode toggle
- Button: "Pan: ON/OFF"

### Select/Move Mode
- Click objects to select (stroke or text)
- Drag to move selected objects
- **Drag-to-select rectangle**: Select multiple objects at once
- Pointer/move cursor
- Button: "Select/Move: ON/OFF"

---

## Canvas Features

### Infinite-Like Canvas
- 5000x5000 pixel workspace
- Zoom in/out (buttons or mouse wheel)
- Pan with middle mouse or Pan mode
- Current zoom level displayed (e.g., "Zoom 100%")

### Ruled Lines
- Optional horizontal ruled lines for writing guidance
- Toggle with "Lines: ON/OFF" button
- Rendered on separate background layer for performance

### Canvas Theme
- **Light/Dark Toggle**: Switch between light and dark canvas
- **Auto Mode**: Follows Obsidian theme automatically
- **Auto Pen Color**: Pen color auto-switches with theme (white for dark, black for light)
- Settings: Can disable auto pen color and set manual color

---

## Color System

### Simplified Color Picker
Quick-select buttons for common colors:
- **White** (for dark backgrounds)
- **Light Grey**
- **Medium Grey**
- **Dark Grey**
- **Black** (for light backgrounds)

### Full Color Picker (Optional)
- Enable in settings: `Settings > Handwrite > Enable Full Color Picker`
- Obsidian's native color picker
- Any custom color

### Auto Pen Color
- Enabled by default
- Automatically switches pen color when canvas theme changes
- Can be disabled in settings for manual color control

---

## Selection & Object Management

### Selection
- **Single Click**: Select one stroke or text object
- **Drag Rectangle**: Select multiple objects at once
- **Customizable Selection Color**: Choose selection highlight color in settings (accessibility)

### Context Menu (Right-Click or Stylus Button)
- **Copy**: Duplicate selected object(s) to clipboard
- **Cut**: Remove and copy to clipboard
- **Paste**: Insert copied objects
- **Resize** (text only): Change font size
- **Duplicate**: Create copy at offset position

### Keyboard Shortcuts
- **Ctrl+Z**: Undo
- **Ctrl+Y**: Redo
- **Delete**: Remove selected objects

---

## Text Features

### Paste Text from Notes
1. Select text in an Obsidian note
2. Click "Paste Text" in handwriting canvas
3. Text appears on canvas as editable text objects
4. Adjust spacing between words/lines with sliders
5. Edit mode: Write between words, cross out words, or adjust spacing

### Text Objects
- Rendered separately from strokes
- Font size: 8-72px (adjustable slider)
- Can be moved, resized, copied, deleted
- Follows canvas theme (auto color switching)

### Spacing Controls (Edit Mode)
- **Word Spacing**: Adjust horizontal space between words (10-100px)
- **Line Spacing**: Adjust vertical space between lines (30-100px)
- **Reload Button**: Refresh text layout with new spacing

---

## Performance Optimizations

### Rendering
- **Eliminated save/restore overhead**: Direct property updates instead of canvas state stack
- **Conditional property updates**: Only update when values change
- **Batch rendering**: Draw multiple points per frame
- **Smooth quadratic curves**: Natural handwriting feel without performance cost

### Calligraphy Optimization
- **Cached trigonometry**: Pre-compute sin/cos for nib angles
- **Squared distance checks**: Avoid expensive sqrt() calls
- **Optimized point calculations**: Minimal math per stroke point

### Memory
- **Stroke metadata**: Stores pen type, color, width per stroke for accurate duplication
- **Efficient undo/redo**: State snapshots without full canvas redraw

---

## Settings

### Plugin Settings (Settings > Handwrite)
- **Enable Full Color Picker**: Show/hide advanced color picker
- **Selection Color**: Choose highlight color for selected objects (default: blue with transparency)
- **Auto Pen Color**: Enable/disable automatic pen color switching with theme

---

## Cursor System

Dynamic cursors that match current mode and theme:

| Mode | Cursor |
|------|---------|
| Handwriting | Crosshair |
| Eraser | White/Black eraser icon (theme-matched) |
| Pan | Hand (open palm) |
| Select/Move | Pointer → Move (when dragging) |
| Middle Mouse Pan | Hand (temporary) |

---

## Toolbar Controls

### Top Toolbar
- Pen Type selector (Regular, Calligraphy, Fountain, Pencil)
- Pen Size slider (1-10)
- Color picker (simplified or full)
- Font Size slider (8-72px, for text)

### Mode Buttons
- Handwriting: ON/OFF
- Eraser: ON/OFF
- Pan: ON/OFF
- Select/Move: ON/OFF
- Lines: ON/OFF
- Light/Dark canvas toggle
- Auto pen color checkbox

### Action Buttons
- Undo (Ctrl+Z)
- Redo (Ctrl+Y)
- Paste Text (from Obsidian notes)
- Clear Canvas

### Zoom Controls
- Zoom Out (-)
- Zoom 100% (current level display)
- Zoom In (+)

---

## Use Cases

### Handwriting Notes
- Natural handwriting with calligraphy or fountain pen
- Ruled lines for guidance
- Large canvas for extensive notes
- Paste typed text and annotate

### Drawing & Sketching
- Pencil mode for drafts
- Large canvas with pan/zoom
- Select and move elements
- Multi-select with drag rectangle

### Text Editing Workflow
1. Paste text from Obsidian note
2. Adjust word/line spacing
3. Write corrections or additions between words
4. Cross out words to mark for deletion
5. Copy edited canvas as image

### Tablet/Stylus Writing
- Optimized for pen displays (Wacom, XP-Pen, Huion, etc.)
- Stylus button = right-click (context menu)
- Smooth, natural writing experience
- No pressure sensitivity required (calligraphy uses direction instead)

---

## Technical Details

- **Canvas Size**: 5000x5000 pixels
- **Dual Canvas Layers**: Background (lines) + Foreground (content)
- **Stroke Storage**: Array of {points, penType, penColor, baseLineWidth}
- **Text Storage**: Separate array of text objects with position/size
- **Undo/Redo**: Full state history with JSON serialization
- **Theme Detection**: Automatic Obsidian theme detection
- **Desktop Only**: Not available on mobile (requires precise mouse/stylus input)

---

## Known Limitations

1. **No handwriting recognition (OCR)**: Plugin focuses on drawing/writing, not text conversion
2. **No pressure sensitivity**: Uses direction-based calligraphy instead
3. **Desktop only**: Mobile support not available
4. **No export to note**: Content stays in canvas view (can screenshot)
5. **No cloud sync**: Canvas data stored locally in Obsidian vault

---

## Tips for Best Experience

### For Handwriting
- Use Calligraphy or Fountain pen for elegant writing
- Enable ruled lines for straight text
- Adjust pen size (3-5 recommended)
- Use auto pen color for consistent contrast

### For Drawing
- Use Pencil mode for sketching
- Regular pen for clean lines
- Select/Move mode to rearrange elements
- Drag-select rectangle for bulk operations

### For Performance
- Clear canvas periodically to reduce stroke count
- Use undo/redo instead of erasing large sections
- Zoom out when working with large areas

### For Accessibility
- Customize selection color for better visibility
- Adjust font size as needed (8-72px range)
- Use simplified color picker for quick access
- Light/Dark toggle for eye comfort

---

## Version History

### 7.1.0 (Current)
- Removed experimental OCR functionality
- Finalized as production-ready handwriting/drawing plugin
- Cleaned up codebase
- Updated documentation

### 6.x.x
- Attempted various OCR implementations (removed)

### 5.x.x
- Button renamed: "Drawing" → "Handwriting"
- Core features stabilized

### Earlier Versions
- Initial development of canvas, pen types, modes, etc.

---

## Future Possibilities

While the current plugin is complete and production-ready, potential future enhancements could include:

- Export canvas as PNG/SVG
- Import images to canvas
- Layers support
- More pen types (marker, highlighter)
- Pressure sensitivity (if Obsidian API supports it)
- Custom line patterns (dotted, dashed)

**The plugin is feature-complete as-is and ready for daily use.**
