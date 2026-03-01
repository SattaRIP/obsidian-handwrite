# MyScript OCR Setup Guide

## OCR Provider Options

The plugin supports **two OCR providers**:

1. **MyScript** (this guide) - 2000 free requests/month, 98% accuracy (same as Kobo eReader)
2. **Google Cloud Vision** (see GOOGLE_CLOUD_SETUP.md) - 1000 free requests/month

You can switch between them anytime in Settings → Handwrite → OCR Provider.

---

## Getting Your Free MyScript API Keys (2000 requests/month)

### Step 1: Create MyScript Developer Account

1. Go to: https://developer.myscript.com
2. Click "Sign Up" (top right)
3. Fill in your details:
   - Email address
   - Password
   - Accept terms
4. Verify your email address

### Step 2: Create an Application

1. Log in to MyScript Developer Portal
2. Go to "Applications" section
3. Click "Create New Application"
4. Fill in:
   - **Application Name**: "Obsidian Handwrite Plugin" (or any name)
   - **Application Type**: Select "Web"
   - **Recognition Type**: Select "iink" (Interactive Ink)
5. Click "Create"

### Step 3: Get Your API Keys

After creating the application, you'll see:
- **Application Key** - Copy this
- **HMAC Key** - Copy this

### Step 4: Configure in Obsidian

1. Open Obsidian
2. Go to: **Settings** → **Handwrite** (scroll down to Plugin Options)
3. Scroll to "MyScript OCR Settings"
4. Paste:
   - **MyScript Application Key**: [paste your Application Key]
   - **MyScript HMAC Key**: [paste your HMAC Key]
5. Close settings

### Step 5: Test OCR

1. Open Handwrite canvas (sidebar icon)
2. Write something in English (e.g., "Hello world")
3. Click "Extract Text (OCR)" button
4. Review extracted text in modal
5. Click "Insert into Note" to paste into your active note

---

## Free Tier Limits

- **2000 requests per month** (resets monthly)
- Perfect for novel editing workflow (typed text → handwritten edits → OCR back)
- Same 98% accuracy technology used in Kobo eReaders

## Troubleshooting

### "API keys not configured"
- Make sure both keys are pasted in Settings → Handwrite
- Keys should not have extra spaces or quotes

### "MyScript API error: 401"
- Invalid API keys - double-check you copied them correctly
- Make sure you selected "iink" (Interactive Ink) when creating the app

### "MyScript API error: 403"
- You've exceeded 2000 requests this month
- Wait until next month for reset
- Check your usage at developer.myscript.com

### "No text recognized"
- Try writing more clearly
- Make sure you're writing in English
- Use calligraphy or fountain pen for better stroke definition

---

## What Happens Next

After you finish getting OCR to work for free with MyScript, we can work on the **Kobo ↔ Obsidian sync plugin** for seamless handwriting workflow between your eReader and Obsidian.
