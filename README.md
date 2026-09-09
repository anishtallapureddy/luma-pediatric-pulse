# Luma Pediatric Pulse

Internal operational dashboard for **Luma Pediatrics** (McKinney, TX). Surfaces source-specific air quality, pollen, respiratory hospitalization, laboratory surveillance, provisional disease-report, and pediatric medication signals relevant to North Texas.

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

Every morning at 7 AM local time, the `refresh-and-notify` workflow:

1. Runs the source fetchers in parallel. A failure keeps the previous values and marks the affected section or card `stale`.
2. Writes `data/snapshot.json`.
3. Commits and pushes the snapshot — which triggers the `deploy` workflow and republishes GitHub Pages.
4. Sends a staff email digest via Resend (only on the day the snapshot actually changes).

The cron expression `0 12,13 * * *` fires at both 12:00 UTC and 13:00 UTC, so the job lands at 7 AM in both **CDT** and **CST** year-round. The refresh script is idempotent.

The workflow checks daily, but source schedules vary. CDC and Texas DSHS
surveillance generally update weekly. Quantitative cards retain their source,
geography, reporting date, fetch date, metric, and stale status.

Current automated sources:

- EPA AirNow 2026 observation and forecast services
- Google Pollen API
- Texas DSHS Public Health Region 2/3 hospitalization-rate ArcGIS service
- CDC NREVSS Texas and HHS Region 6 respiratory laboratory surveillance
- CDC national influenza laboratory surveillance
- CDC NNDSS Weekly Data for provisional Texas case counts
- FDA Drug Shortages through openFDA

CDC publishes current Norovirus and Rotavirus positivity in its NREVSS
enteric-virus dashboard, but not through a supported public API or stable
download endpoint. The snapshot links to that official regional surveillance
without scraping or inventing a numerical value.

### Controlled weekly Norovirus and Rotavirus import

When a staff member can verify the official CDC NREVSS dashboard values, copy
`data/manual/nrevss-enteric-template.csv` and enter exactly six consecutive
Southern U.S. Census Region weeks for both viruses. Record the PCR test count and
centered three-week moving-average positivity exactly as CDC displays them.

In the visible CDC dashboard:

1. Open the **Enteric viruses** view.
2. Open **Norovirus Tests and Percent Positive**.
3. Select **Census Region: SOUTH** and the current surveillance year.
4. Record the latest six visible week-ending dates, PCR tests displayed for each
   week, centered three-week average percent-positive values, and the dashboard
   update date.
5. Repeat the same steps for **Rotavirus Tests and Percent Positive**.
6. Do not use browser developer tools or undocumented Power BI requests. If the
   visible report does not expose every required field, do not import a value.

Validate without writing:

```bash
npm run import:nrevss-enteric -- path/to/completed.csv --check
```

Import after independently rechecking all 12 rows:

```bash
npm run import:nrevss-enteric -- path/to/completed.csv
npm run refresh
```

The importer rejects wrong headers, unknown viruses, non-Saturday or
nonconsecutive reporting weeks, missing/invalid test denominators, percentages
outside 0–100, mismatched geographies or test methods, inconsistent dashboard
update dates, and mismatched latest weeks. It writes
`data/manual/nrevss-enteric.json`, which the existing community-virus adapter
uses automatically. Imported values retain their source, geography, metric,
reporting weeks, test totals, dashboard update date, and import timestamp.
Values older than three weeks remain visible as last-known-good but are marked
stale.

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
