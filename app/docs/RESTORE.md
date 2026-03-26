# JARVIS Disaster Recovery — Full Restore Guide

If the Mac Mini dies or you need to set up JARVIS on a new machine, follow these steps.

## Prerequisites

- A Mac with Docker Desktop installed
- Git installed
- Access to Apple Passwords (contains `.env.local` secrets)
- Access to Cloudflare dashboard (for tunnel setup)

## Step 1: Clone the repo

```bash
git clone https://github.com/cesilvia/JARVIS.git
cd JARVIS/app
```

## Step 2: Restore environment variables

1. Open Apple Passwords and find the JARVIS `.env.local` entry
2. Create the file:

```bash
nano .env.local
```

3. Paste all the environment variables. The file should contain:
   - `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET`
   - `OPENROUTER_API_KEY`
   - `READWISE_API_KEY`
   - `LIGHTRAG_URL=http://lightrag:9621`
   - `INTERVALS_API_KEY` / `INTERVALS_ATHLETE_ID`
   - `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME`
   - `AUTH_PASSWORD_HASH` / `SESSION_SECRET`
   - `USDA_API_KEY`

## Step 3: Create a new Cloudflare Tunnel

1. Go to https://one.dash.cloudflare.com → Networks → Tunnels
2. Create a new tunnel named `jarvis-mini`
3. Copy the tunnel token
4. Add to a `.env` file (not `.env.local`):

```bash
echo "CLOUDFLARE_TUNNEL_TOKEN=your-token-here" > .env
```

5. Configure the tunnel's public hostname:
   - Hostname: `jarvis.chrissilvia.com`
   - Service: `http://jarvis:3000`

## Step 4: Create the LightRAG env file

```bash
cat > lightrag.env << 'EOF'
LLM_MODEL=google/gemini-2.5-flash
LLM_BINDING=openai
LLM_BINDING_HOST=https://openrouter.ai/api/v1
LLM_BINDING_API_KEY=your-openrouter-key
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_BINDING=openai
EMBEDDING_BINDING_HOST=https://openrouter.ai/api/v1
EMBEDDING_BINDING_API_KEY=your-openrouter-key
EOF
```

Replace `your-openrouter-key` with the actual key from Apple Passwords.

## Step 5: Start Docker

```bash
docker compose up -d
```

This starts: JARVIS, N8N, LightRAG, cloudflared, and Watchtower.

Wait 1-2 minutes for everything to come up. Check with:

```bash
docker ps
```

All 5 containers should show "Up."

## Step 6: Restore data from R2 backup

### Option A: Via the JARVIS UI

1. Open `http://localhost:3000` in a browser
2. Log in (password from Apple Passwords)
3. Go to Settings → Backup
4. The most recent backup should be listed
5. Click Restore

### Option B: Via command line

If R2 backups aren't loading in the UI, download the latest backup manually:

1. Install the AWS CLI or use the Cloudflare dashboard
2. Download the latest `jarvis-backup-YYYY-MM-DD.json` from the `jarvis-backups` R2 bucket
3. Place it in the `backups/` directory
4. Call the restore endpoint:

```bash
curl -X PUT "http://localhost:3000/api/backup?file=jarvis-backup-YYYY-MM-DD.json"
```

This restores: all Strava rides, German vocabulary, recipes, bikes, components, gear, settings, and N8N workflows.

## Step 7: Re-sync external services

### Readwise (Research documents)
1. Go to Research page → click "Full Re-sync"
2. This pulls all documents from Readwise and re-indexes them in LightRAG

### Strava
1. Go to Bike → Strava → Sync
2. If the OAuth token expired, you may need to re-authorize via the Strava settings

### N8N workflows
1. The backup includes N8N workflow JSON, but N8N doesn't auto-import them
2. Open N8N at `http://localhost:5678`
3. Import workflows: Settings → Import from File
4. The workflow JSON is in the backup under `jarvis-n8n-workflows`
5. Re-create the nightly backup workflow: POST to `http://jarvis:3000/api/backup` at 2am daily

## Step 8: Podcast pipeline (optional)

If you want to continue podcast transcription:

1. Install whisper.cpp and yt-dlp on the new machine
2. The `podcast-pipeline/transcribe.sh` script is in the repo
3. Set up the cron job:

```bash
crontab -e
# Add: 0 20 * * * /path/to/transcribe.sh >> /path/to/cron.log 2>&1
```

4. Previously transcribed episodes will need to be re-downloaded and re-transcribed (originals are not backed up)

## Step 9: Set up auto-deploy

```bash
# Copy deploy.sh to the new machine and set up launchd
# The deploy script polls GitHub every 2 minutes and rebuilds Docker on changes
```

## Step 10: Install Tailscale

1. Install Tailscale on the new machine
2. Log in with your Tailscale account
3. The machine will appear in your Tailnet automatically

---

## What's backed up where

| Data | Location | Backed up? |
|------|----------|------------|
| SQLite (rides, vocab, recipes, bikes, gear, settings) | R2 + local | Yes (nightly) |
| N8N workflows | R2 (inside backup JSON) | Yes (nightly) |
| Code | GitHub | Yes (every push) |
| Environment variables | Apple Passwords | Yes (manual) |
| LightRAG embeddings | Docker volume | No — rebuilds from Readwise re-sync |
| Podcast transcripts | Local disk | No — re-download from YouTube |
| Cloudflare Tunnel token | Cloudflare dashboard | Create new tunnel |

## Estimated recovery time

- Steps 1-5 (setup): ~15 minutes
- Step 6 (restore data): ~2 minutes
- Step 7 (re-sync): ~10 minutes (Readwise), ~5 minutes (Strava)
- Step 8 (podcast): optional, hours to re-transcribe
- **Total: ~30 minutes to full operation** (excluding podcast backfill)
