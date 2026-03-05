# WhatsApp Notes — Setup Guide

## 1. Install dependencies

```bash
cd C:\Users\Dheeraj\Claude\whatsapp-notes
npm install
```

## 2. Run Supabase schema

1. Go to [supabase.com](https://supabase.com) → your project → **SQL Editor**
2. Paste the contents of `supabase/schema.sql` and run it
3. This creates `wa_users`, `wa_notes`, and `wa_conversations` tables

## 3. Test locally

```bash
npm run dev
```

Visit http://localhost:3000 — should show the status page.

## 4. Expose local server to Twilio (for local testing)

Download [ngrok](https://ngrok.com) and run:
```bash
ngrok http 3000
```
Copy the HTTPS URL (e.g. `https://abc123.ngrok.io`).

## 5. Set Twilio webhook

1. Go to [twilio.com/console](https://console.twilio.com)
2. Messaging → Try it out → Send a WhatsApp message → Sandbox settings
3. Set **"A message comes in"** webhook to:
   ```
   https://abc123.ngrok.io/api/webhook
   ```
   Method: **HTTP POST**
4. Save

## 6. Test via WhatsApp

Send a message to your Twilio sandbox number (+13312600199).
If you haven't joined the sandbox yet, send the join code first.

## 7. Deploy to Vercel

```bash
# Push to GitHub first
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/whatsapp-notes.git
git push -u origin main
```

Then in Vercel:
1. Import the GitHub repo
2. Add all `.env.local` variables as **Environment Variables** in Vercel dashboard
3. Deploy → get your URL (e.g. `https://whatsapp-notes.vercel.app`)
4. Update Twilio webhook to `https://whatsapp-notes.vercel.app/api/webhook`

## Usage examples

| You send | Bot does |
|---|---|
| "Remember to renew car insurance by March 15" | Saves note with reminder tag |
| "Meeting with Rajesh tomorrow 3pm re: project proposal" | Saves meeting note |
| 🎤 Voice note about your grocery list | Transcribes & saves |
| "show notes" | Lists 5 most recent |
| "find insurance" | Searches notes for "insurance" |
| "delete note 2" | Deletes that note after confirmation |
