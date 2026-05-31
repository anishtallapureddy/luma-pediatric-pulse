# Deploying Luma Pediatric Pulse

Internal provider dashboard. Hosted free on **GitHub Pages** at
**`https://pulse.lumapediatrics.com/provider-health-watch/`**.

The repo's `public/CNAME` already pins the custom domain, so it survives
re-deploys.

---

## Architecture (free pipeline)

```
┌─ GitHub repo (main) ─────────────────────────────────────────┐
│                                                              │
│  Code  ──── push ───▶  .github/workflows/deploy.yml          │
│                         (next build → out/ → Pages)          │
│                                                              │
│  Cron 12:00 + 13:00 UTC                                      │
│   └─▶  refresh-and-notify.yml                                │
│         ├─ scripts/refresh-snapshot.ts                       │
│         │   (fetches AirNow, Google Pollen, CDC, NNDSS, FDA) │
│         │   ↳ graceful fallback to prior snapshot per signal │
│         ├─ commits data/snapshot.json                        │
│         └─ scripts/send-staff-email.ts (Resend)              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
              GitHub Pages → pulse.lumapediatrics.com
```

Everything is $0:

- **Hosting:** GitHub Pages (static export)
- **Cron + CI:** GitHub Actions (free for public repos; 2,000 min/mo for private)
- **DNS / TLS:** GitHub Pages issues a Let's Encrypt cert automatically
- **Storage:** `data/snapshot.json` is committed to git (no DB)
- **Email:** Resend free tier (100 emails/day)

---

## One-time setup

### 1. Push the repo to GitHub

```bash
gh repo create anishtallapureddy/luma-pediatric-pulse --private --source=. --remote=origin
git push -u origin main
```

### 2. Enable GitHub Pages

In the repo: **Settings → Pages → Source = "GitHub Actions"**.

After the first successful `Deploy to GitHub Pages` run, the site goes live at
`https://<user>.github.io/luma-pediatric-pulse/` (interim URL).

### 3. Point the custom domain

At your DNS host for `lumapediatrics.com`, add:

| Record | Name    | Value                                  | TTL  |
| ------ | ------- | -------------------------------------- | ---- |
| CNAME  | `pulse` | `anishtallapureddy.github.io`          | 3600 |

Then in **Settings → Pages → Custom domain** confirm
`pulse.lumapediatrics.com`. The `public/CNAME` file in the repo locks this in
across deploys.

Wait 5–15 min for DNS + Let's Encrypt to provision.

### 4. Add Actions secrets

**Settings → Secrets and variables → Actions → New repository secret**, one
per row:

| Secret                  | Where to get it                                                       | Required? |
| ----------------------- | --------------------------------------------------------------------- | --------- |
| `AIRNOW_API_KEY`        | https://docs.airnowapi.org/                                           | Optional  |
| `GOOGLE_POLLEN_API_KEY` | Google Cloud Console → Pollen API                                     | Optional  |
| `CDC_APP_TOKEN`         | https://data.cdc.gov sign-up                                          | Optional  |
| `CDC_NNDSS_DATASET_ID`  | current NNDSS table 1A dataset id from `data.cdc.gov` (rotates yearly)| Optional  |
| `RESEND_API_KEY`        | https://resend.com → API Keys                                         | Optional  |
| `STAFF_EMAILS`          | comma-separated, e.g. `dr@luma...,frontdesk@luma...`                  | Optional  |
| `EMAIL_FROM`            | e.g. `pulse@lumapediatrics.com` (verified Resend sender)              | Optional  |
| `DASHBOARD_URL`         | `https://pulse.lumapediatrics.com/provider-health-watch/`             | Optional  |
| `LUMA_SITE_DISPATCH_TOKEN` | fine-grained PAT, scope: `anishtallapureddy/luma-pediatrics`, `Contents: write` | Optional  |

> Every secret is optional. Any fetcher whose secret is missing will fail
> gracefully → the previous snapshot's section is kept. Email send is skipped
> if `RESEND_API_KEY` is missing. The `LUMA_SITE_DISPATCH_TOKEN` triggers an
> immediate rebuild of `lumapediatrics.com/health-watch` after each new
> snapshot; without it the parent page still refreshes via its own daily
> 14:00 UTC cron.

### 4a. Finishing the daily 7 AM staff email (current setup)

The staff-email recipients and sender are already configured:

| Secret          | Current value                                       |
| --------------- | --------------------------------------------------- |
| `STAFF_EMAILS`  | `anish@lumapediatrics.com,drt@lumapediatrics.com`   |
| `EMAIL_FROM`    | `Luma Pediatric Pulse <onboarding@resend.dev>`      |
| `DASHBOARD_URL` | `https://pulse.lumapediatrics.com/`                 |

To turn on the daily 7 AM CST send, add one more secret:

```bash
# 1. Sign up at https://resend.com (free: 3,000 emails/month)
# 2. Create an API key in the Resend dashboard
# 3. Then run:
gh secret set RESEND_API_KEY -R anishtallapureddy/luma-pediatric-pulse
#    (paste the key when prompted)

# 4. Verify with a manual test:
gh workflow run "Refresh snapshot and email staff" -R anishtallapureddy/luma-pediatric-pulse
gh run watch -R anishtallapureddy/luma-pediatric-pulse
```

The cron already runs at `0 12,13 * * *` UTC, which covers 7 AM CST (winter) and 7 AM CDT (summer). Once `RESEND_API_KEY` is set, the daily email goes out automatically the next morning at 7 AM.

> **Branded sender (optional):** to send from `pulse@lumapediatrics.com`
> instead of `onboarding@resend.dev`, add `lumapediatrics.com` as a verified
> domain in Resend (3 DNS records: SPF, DKIM, return-path), then update the
> `EMAIL_FROM` secret.

### 5. Trigger the first refresh

**Actions → "Refresh snapshot and email staff" → Run workflow** (manual trigger).
After it commits `data/snapshot.json`, the deploy workflow auto-runs.

---

## Cron schedule

`refresh-and-notify.yml` runs at:

- **12:00 UTC** = 7 AM CDT (Mar–Nov)
- **13:00 UTC** = 7 AM CST (Nov–Mar)

Both fire year-round; the second run is a near-no-op because the snapshot
diff check skips commits when nothing changed. This is a deliberate trade-off
because GitHub Actions cron does not support timezones.

---

## Provider-only access (optional, free)

For an internal dashboard, layer **Cloudflare Access** in front of the Pages
site (free for ≤50 users):

1. Move DNS for `lumapediatrics.com` to Cloudflare (free plan).
2. Create a **Self-hosted application** on `pulse.lumapediatrics.com` in the
   Zero Trust dashboard.
3. Add an Access policy: "Allow emails ending in `@lumapediatrics.com`" or a
   manual allowlist.

Pages stays free; Cloudflare just adds a login page in front of the public
URL. Snapshot URLs (`/data/snapshot.json`) are also gated.

---

## Local development

```bash
npm install
npm run dev                   # http://localhost:3000/provider-health-watch
npm run seed                  # rewrite data/snapshot.json from mock data
npm run refresh               # run all fetchers locally (needs env vars)
npm run build                 # static export to out/
```

---

## Files of interest

| Path                                | Purpose                                                       |
| ----------------------------------- | ------------------------------------------------------------- |
| `.github/workflows/deploy.yml`      | Build + publish to Pages on push to main                      |
| `.github/workflows/refresh-and-notify.yml` | Daily 7am refresh + Resend email                       |
| `public/CNAME`                      | Pins `pulse.lumapediatrics.com` across Pages deploys          |
| `scripts/refresh-snapshot.ts`       | Orchestrates all data fetchers; falls back to prior snapshot  |
| `scripts/sources/*.ts`              | One file per upstream API (airnow, pollen, cdc, nndss, fda)   |
| `scripts/render-email.ts`           | Builds the HTML/text digest body                              |
| `scripts/send-staff-email.ts`       | Sends digest via Resend                                       |
| `data/snapshot.json`                | Single source of truth, committed to git on every refresh     |
| `src/lib/health-watch/loadSnapshot.ts` | Read snapshot at build time                                |
| `src/lib/health-watch/generateProviderSummary.ts` | Derives risk + headline at render time          |

---

## Future: parent-facing widget

When ready, add a second route (e.g. `src/app/health/page.tsx`) that reads the
same `data/snapshot.json` and renders a simplified parent-friendly view. Same
hosting, same cron, no new infra. Could live at `lumapediatrics.com/health`
(reverse-proxied from the main site) or `pulse.lumapediatrics.com/health`.
