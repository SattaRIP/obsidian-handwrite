# OCR (Handwriting Recognition) Setup

## Overview

The Handwrite plugin now supports **OCR (Optical Character Recognition)** to convert your handwriting into typed text. Perfect for your novel editing workflow: typed text → handwritten edits → OCR back to typed text.

## Two OCR Provider Options

Choose the provider that best fits your needs:

### Option 1: MyScript (Recommended)
- **Free tier**: 2000 requests/month
- **Accuracy**: 98% (handwriting-specific, same technology as Kobo eReader)
- **Best for**: Clean handwriting, cursive writing
- **Cost after free**: $10 per 1000 requests
- **Setup guide**: See `MYSCRIPT_SETUP.md`

### Option 2: Google Cloud Vision
- **Free tier**: 1000 requests/month (forever free)
- **Accuracy**: ~90-95% (general OCR, works on printed text too)
- **Best for**: Mixed content, print-style handwriting
- **Cost after free**: $1.50 per 1000 requests
- **Setup guide**: See `GOOGLE_CLOUD_SETUP.md`

## Quick Start

### 1. Choose Your Provider

Go to **Settings → Handwrite → OCR Settings**:
- Select your preferred OCR provider from the dropdown
- Default is MyScript (98% accuracy)

### 2. Get API Keys

Follow the setup guide for your chosen provider:
- **MyScript**: Open `MYSCRIPT_SETUP.md`
- **Google Cloud Vision**: Open `GOOGLE_CLOUD_SETUP.md`

Both guides include step-by-step instructions with screenshots.

### 3. Configure API Keys

In **Settings → Handwrite**, scroll down and enter your API keys:

**For MyScript**:
- MyScript Application Key
- MyScript HMAC Key

**For Google Cloud Vision**:
- Google Cloud API Key

### 4. Test OCR

1. Open Handwrite canvas (click pen icon in sidebar)
2. Write some text in English
3. Click **"Extract Text (OCR)"** button in toolbar
4. Review the extracted text in the modal
5. Edit if needed, then click **"Insert into Note"**

## How It Works

1. You draw handwriting on the canvas using pen/pencil
2. Click "Extract Text (OCR)" button
3. Plugin sends your strokes to the selected OCR provider:
   - **MyScript**: Sends stroke coordinates directly (more accurate)
   - **Google Cloud**: Converts to image first, then sends (works on any content)
4. OCR provider analyzes and returns recognized text
5. You review and edit the text in a modal
6. Insert the text into your active Obsidian note

## Novel Editing Workflow

Perfect for second draft editing:

1. **Paste typed text** from your note into canvas
2. **Handwrite corrections** between words, cross out mistakes, add notes
3. **Extract OCR text** from your handwritten edits
4. **Insert back** into your note

## Switching Providers

You can switch providers anytime:

1. Go to **Settings → Handwrite**
2. Change **"OCR Provider"** dropdown
3. Make sure you have API keys configured for the new provider
4. OCR button will automatically use the selected provider

## Free Tier Limits Summary

| Provider | Free Requests/Month | Resets |
|----------|---------------------|--------|
| MyScript | 2000 | Monthly |
| Google Cloud Vision | 1000 | Monthly |

Both are generous for novel editing use cases!

## Cost Comparison (If You Exceed Free Tier)

| Requests | MyScript Cost | Google Cloud Cost |
|----------|---------------|-------------------|
| 2000/month | FREE | $1.50 |
| 3000/month | $10 | $3.00 |
| 5000/month | $30 | $6.00 |

**Recommendation**: Start with MyScript (higher accuracy, more free requests). Switch to Google Cloud Vision if you need more requests at lower cost.

## Tips for Best Accuracy

### General Tips
- Write clearly and legibly
- Use fountain pen or calligraphy pen for better stroke definition
- Write larger text (pen size 4-6)
- Use dark pen colors (black on white canvas works best)

### MyScript-Specific Tips
- Works great with cursive writing
- Keep words well-spaced
- Write naturally (it's trained on handwriting)

### Google Cloud-Specific Tips
- Print-style handwriting works better than cursive
- Make sure strokes are continuous (don't lift pen mid-letter)
- Works better on shorter text blocks

## Troubleshooting

### "OCR Provider not configured"
→ Check Settings → Handwrite and make sure API keys are entered for your selected provider

### "No text recognized"
→ Try writing more clearly, using darker colors, or larger pen size

### Low accuracy / wrong words
→ Try the other OCR provider (they use different engines)

### "Quota exceeded" or "429 error"
→ You've used up your free tier for the month. Wait until next month or enable billing.

## Privacy & Data

- **MyScript**: Stroke coordinates are sent to MyScript Cloud API over HTTPS
- **Google Cloud Vision**: Image of your handwriting is sent to Google Cloud over HTTPS
- Both providers process data securely but may store requests for billing purposes
- Neither provider saves your content long-term
- For maximum privacy, use on non-sensitive content

## Future Plans

After OCR is working well, the next planned feature is:
- **Kobo ↔ Obsidian sync plugin**: Seamlessly sync text files between Obsidian and your Kobo eReader for handwriting on Kobo (with its 98% MyScript OCR) and editing in Obsidian

## Support

If you encounter issues:
1. Check the setup guides (MYSCRIPT_SETUP.md or GOOGLE_CLOUD_SETUP.md)
2. Verify API keys are correct in Settings
3. Check browser console (Ctrl+Shift+I) for error messages
4. Try the other OCR provider as a fallback
