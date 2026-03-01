# Google Cloud Vision API Setup Guide

## Getting Your API Key (1000 free requests/month)

### Step 1: Create Google Cloud Account

1. Go to: https://console.cloud.google.com
2. Sign in with your Google account
3. If it's your first time:
   - Accept terms of service
   - You may need to set up billing (but there's a free tier)
   - Google gives $300 free credit for new accounts (90 days)

### Step 2: Create a New Project

1. Click the project dropdown at the top (next to "Google Cloud")
2. Click "New Project"
3. Enter project name: "Obsidian Handwriting OCR" (or any name)
4. Click "Create"
5. Wait for project creation (few seconds)

### Step 3: Enable Vision API

1. In the search bar at top, type "Vision API"
2. Click "Cloud Vision API"
3. Click "Enable" button
4. Wait for API to be enabled (10-30 seconds)

### Step 4: Create API Key

1. Go to "APIs & Services" → "Credentials" (or search "Credentials")
2. Click "Create Credentials" at top
3. Select "API key"
4. Your API key will be generated and displayed
5. **Copy the API key** (looks like: `AIzaSyA...`)
6. Optional: Click "Restrict Key" to limit it to Vision API only (recommended for security)
   - Under "API restrictions", select "Restrict key"
   - Select "Cloud Vision API" from the list
   - Click "Save"

### Step 5: Configure in Obsidian

1. Open Obsidian
2. Go to: **Settings** → **Handwrite**
3. Under "OCR Settings":
   - **OCR Provider**: Select "Google Cloud Vision"
4. Scroll to "Google Cloud Vision Settings"
5. Paste:
   - **Google Cloud API Key**: [paste your API key]
6. Close settings

### Step 6: Test OCR

1. Open Handwrite canvas (sidebar icon)
2. Write something in English (e.g., "Hello world")
3. Click "Extract Text (OCR)" button
4. Review extracted text in modal
5. Click "Insert into Note" to paste into your active note

---

## Free Tier Limits

- **1000 Cloud Vision API units per month** (free forever)
- 1 unit = 1 DOCUMENT_TEXT_DETECTION request (what we use)
- Perfect for moderate handwriting OCR usage
- New accounts get $300 free credit (90 days) for additional usage beyond free tier

## Pricing After Free Tier

If you exceed 1000 requests/month:
- **$1.50 per 1000 requests** for DOCUMENT_TEXT_DETECTION
- Example: 2000 requests/month = $1.50

---

## Comparison: MyScript vs Google Cloud Vision

| Feature | MyScript | Google Cloud Vision |
|---------|----------|---------------------|
| **Free Tier** | 2000 requests/month | 1000 requests/month |
| **Accuracy** | 98% (handwriting-specific) | ~90-95% (general OCR) |
| **Best For** | Clean handwriting, cursive | Printed + handwriting mixed |
| **Technology** | Same as Kobo eReader | Google's OCR engine |
| **Cost After Free** | $10 per 1000 requests | $1.50 per 1000 requests |

**Recommendation**: Try MyScript first (higher accuracy for handwriting). Use Google Cloud Vision as backup or if you need more requests.

---

## Troubleshooting

### "API key not configured"
- Make sure you pasted the API key in Settings → Handwrite
- Key should not have extra spaces or quotes
- Should start with `AIzaSy...`

### "Google Cloud API error: 403"
- API key is invalid or restricted
- Check if Vision API is enabled in your project
- If you restricted the key, make sure "Cloud Vision API" is in the allowed list

### "Google Cloud API error: 429"
- You've exceeded 1000 requests this month
- Wait until next month for reset
- Or enable billing to pay $1.50 per 1000 additional requests

### "No text recognized"
- Try writing more clearly with darker pen
- Make sure you're writing in English
- Google Cloud works better for print-style handwriting than cursive

### "Billing must be enabled"
- Google Cloud requires billing info even for free tier
- You won't be charged unless you explicitly enable paid usage beyond free tier
- Add a credit/debit card to verify account (no automatic charges)

---

## Switching Between Providers

You can switch OCR providers anytime in Settings:

1. Go to Settings → Handwrite
2. Under "OCR Settings", change "OCR Provider" dropdown
3. Select "MyScript" or "Google Cloud Vision"
4. Make sure the API keys for your selected provider are configured

The "Extract Text (OCR)" button will automatically use whichever provider you've selected.
