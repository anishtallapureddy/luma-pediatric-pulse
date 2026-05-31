# Luma Pediatric Pulse

Internal operational dashboard for **Luma Pediatrics** (McKinney, TX). Surfaces local air quality, pollen, respiratory illness, and pediatric medication shortage signals to help provider and staff plan triage, staffing, and prescribing workflows.

> Internal operational dashboard. Public health data is used for awareness and planning only. Clinical decisions should be based on provider judgment and patient-specific evaluation. This is not a diagnosis tool.

## Stack

- Next.js (App Router, static export) + TypeScript
- Tailwind CSS, Recharts, lucide-react, date-fns
- **Hosting:** GitHub Pages (free)
- **Scheduler:** GitHub Actions cron (free)
- **Email:** Resend (free tier: 3,000/mo)
- **Data store:** `data/snapshot.json` committed to repo (git history = free audit log)

## Local development

```bash
npm install
npm run dev
```

Then open <http://localhost:3000/provider-health-watch>.

The page reads from `data/snapshot.json` and falls back to mock data if the snapshot is missing or invalid.

## Daily refresh pipeline

Every morning at 7 AM CST, the `refresh-and-notify` workflow:

1. Runs all four source fetchers in parallel (graceful degradation — a failure keeps the previous values and marks that section `stale`).
2. Writes `data/snapshot.json`.
3. Commits and pushes the snapshot — which triggers the `deploy` workflow and republishes GitHub Pages.
4. Sends a staff email digest via Resend (only on the day the snapshot actually changes).

The cron expression `0 12,13 * * *` fires at both 12:00 UTC and 13:00 UTC, so the job lands at 7 AM in both **CDT** and **CST** year-round. The refresh script is idempotent.

### Required GitHub Actions secrets

| Secret | Required | Notes |
| --- | --- | --- |
| `AIRNOW_API_KEY` | yes | Free from <https://docs.airnowapi.org/account/request/> |
| `GOOGLE_POLLEN_API_KEY` | yes | Free tier 10k/mo. Create a GCP project, enable **Pollen API**, restrict the key to that API. |
| `RESEND_API_KEY` | yes | Free 3k/mo at <https://resend.com>. |
| `STAFF_EMAILS` | yes | Comma-separated list of recipient addresses. |
| `EMAIL_FROM` | optional | Defaults to `Luma Pediatric Pulse <pulse@lumapediatrics.com>`. Domain must be verified in Resend. |
| `DASHBOARD_URL` | optional | Defaults to `https://pulse.lumapediatrics.com/`. |
| `CDC_APP_TOKEN` | optional | Increases CDC Socrata rate limits — not required. |

### Manual run

```bash
AIRNOW_API_KEY=... GOOGLE_POLLEN_API_KEY=... npm run refresh
RESEND_API_KEY=... STAFF_EMAILS=staff@example.com npm run send-email
```

## Hosting on GitHub Pages

1. Push this directory to its own GitHub repo (e.g. `luma-pediatric-pulse`).
2. Repo **Settings → Pages → Source = GitHub Actions**.
3. First push to `main` runs `deploy.yml`, which builds (`next build` with `output: 'export'`) and publishes `out/`.
4. (Optional) Custom domain `pulse.lumapediatrics.com`: add `public/CNAME` containing `pulse.lumapediatrics.com`, then create a CNAME record `pulse → anishtallapureddy.github.io` at your DNS provider.

> **Note:** the working tree currently lives inside the `anish-projects` monorepo as `luma-pediatric-pulse/`. That monorepo's GitHub Pages slot already serves `lumapediatrics.com` from `luma-pediatrics/`. Move this folder to its own repo before enabling Pages.

## Resend setup

1. Sign up at <https://resend.com> (free tier).
2. **Domains → Add domain** `lumapediatrics.com`. Add the DNS records Resend shows. Wait for verification (a few minutes).
3. Create an API key — copy into `RESEND_API_KEY` secret.
4. Set `EMAIL_FROM` to a verified sender address on that domain (e.g. `pulse@lumapediatrics.com`).

## Access model (v2)

Internal-by-obscurity: dashboard URL is not linked anywhere public. Add real auth (Cloudflare Access / Tailscale Funnel / basic auth proxy) in v3 if needed.

## Project layout

```
data/snapshot.json                           # committed daily by cron
scripts/
  refresh-snapshot.ts                        # orchestrator (graceful degradation)
  send-staff-email.ts                        # Resend sender
  render-email.ts                            # HTML + text email body
  sources/{airnow,pollen,cdc,openfda}.ts     # per-source fetchers
src/
  app/provider-health-watch/page.tsx         # dashboard composition
  components/health-watch/*                  # cards + badges
  lib/health-watch/
    loadSnapshot.ts                          # reads snapshot, falls back to mock
    generateProviderSummary.ts               # shared by UI + email
    mock-data.ts                             # dev / first-boot seed
  types/health-watch.ts                      # central data contracts
.github/workflows/
  refresh-and-notify.yml                     # 7 AM CST cron
  deploy.yml                                 # static deploy to Pages
```

## Out of scope (intentionally)

No Supabase, no auth, no patient alerts, no PHI, no EMR integration. Future v3 candidates: auth, public website summary widget, parent-facing daily blurb.
