# Quick Start Guide - Handwrite

## You're Almost Ready!

Your plugin is installed and ready to use. Just 2 quick steps:

---

## Step 1: Install Tesseract (Required - One Time Only)

Open a terminal and paste this command:

```bash
sudo pacman -S tesseract tesseract-data-eng
```

Enter your password when prompted. This installs the OCR engine needed to convert handwriting to text.

**Verify it worked:**
```bash
tesseract --version
```

Should show version information.

---

## Step 2: Enable the Plugin in Obsidian

1. **Restart Obsidian** (close and reopen)
2. Go to **Settings** (gear icon) → **Community Plugins**
3. Turn off **Restricted Mode** if it's on
4. Find **"Handwrite"** in the list
5. Toggle it **ON**

---

## You're Done! Now Use It:

### Option A: Free Drawing → Text
1. Click the **pen icon** in the left sidebar
2. Write something on the canvas
3. Click **"Extract Text (OCR)"**
4. Insert into your note

### Option B: Edit Typed Text with Handwriting
1. Type a paragraph in a note
2. **Select it** (highlight the text)
3. Press **Ctrl+P** → type "Edit selected text"
4. Write in the spaces, scribble over words to delete
5. Extract and review the diff

---

## Key Features:

- **Scribble Delete**: Turn ON (button goes red), scribble over words to delete them
- **Word/Line Spacing**: Adjust sliders to create room for insertions
- **Reload Text**: Redraws text with new spacing
- **Calligraphy Mode**: Creates beautiful variable-width strokes

---

## Quick Tips:

- Increase **Word Space** to 60-80 before editing
- Scribble HEAVILY over words you want to delete
- Click **Reload Text** after adjusting spacing
- Review the diff before applying changes

---

**Need help?** Check the full README.md in this folder.
