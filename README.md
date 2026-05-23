# MyDrama — AI Research Dashboard

A research tool for creative producers. Enter a setting + genre/tropes → get organic content patterns, trending hooks, and AI strategy summary in seconds.

---

## Quick start (run locally)

Requirements: Node.js 18+ and an Anthropic API key (`sk-ant-...`).

```bash
# 1. unpack the folder, then inside it:
cp .env.example .env.local
# open .env.local and paste your real key after ANTHROPIC_API_KEY=

# 2. start the server
npm run dev
```

Open http://localhost:3000 in a browser. Logs go to `logs/server.log`.

To stop the server: `Ctrl+C` in the terminal.

---

## Push this folder to your own GitHub repo

Requirements: `git` installed, and either the GitHub CLI (`gh`) authenticated, or a manually-created empty repo on github.com.

### Option A — with GitHub CLI (one-liner)

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create mydrama-dashboard --public --source=. --remote=origin --push
```

This creates a new public repo under your account and pushes everything in one go.

### Option B — without GitHub CLI

1. Go to https://github.com/new → create empty repo named `mydrama-dashboard` (don't add README/license — keep it empty).
2. In this folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<YOUR-USERNAME>/mydrama-dashboard.git
git push -u origin main
```

> The `.gitignore` already excludes `.env.local` so your API key will NOT be uploaded. Double-check with `git status` before committing — `.env.local` should not appear.

---

## Deploy to a public URL (Vercel)

After your repo is on GitHub:

1. Go to vercel.com → log in with GitHub.
2. **Add New Project** → import your `mydrama-dashboard` repo → **Deploy**.
3. In Vercel: **Settings** → **Environment Variables** → add `ANTHROPIC_API_KEY` = your key → **Save**.
4. **Deployments** → **Redeploy** so the env var takes effect.
5. Vercel gives you a URL like `mydrama-dashboard.vercel.app` — share it with anyone.

---

## File structure

```
api/research.js      ← Backend: calls Anthropic API securely
public/index.html    ← Frontend: the full dashboard UI
local-server.js      ← Local dev server (used by `npm run dev`)
vercel.json          ← Routing config for Vercel
package.json         ← Project metadata + npm scripts
.env.example         ← Template for your API key (copy to .env.local)
```

---

## What's live vs stubbed

| Source | Status | How to connect |
|---|---|---|
| Organic content (AI) | Live | Works out of the box |
| AI Summary | Live | Works out of the box |
| Social Peta | Stub | Add Apify scraper → call from `api/research.js` |
| Internal base (Drive) | Stub | Add Google Drive OAuth → read docs from Drive |
