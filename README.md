# Pipeline — Phoenician Internal CRM

Internal sales/ops CRM for Phoenician leadership at **pipeline.phoeniciantech.com**.

Track leads through the funnel, sync Gmail/Drive/Calendar data, and surface outreach opportunities.

## Stack

- **Frontend:** React + Vite + Tailwind
- **Backend:** Express (Node 20)
- **Database:** PostgreSQL (Cloud SQL in production)
- **Auth:** Google OAuth, `@phoeniciantech.com` only
- **Sync:** Domain-Wide Delegation service account (Gmail, Drive, Calendar)
- **AI:** Vertex AI Gemini for email summaries and meeting-note extraction

## Local development

```bash
cd /opt/phoenician-projects/pipeline
cp .env.example .env
# Edit .env with OAuth credentials if testing login

# Option A: Docker Compose (Postgres + API + Vite)
docker compose up
npm run db:migrate   # in another terminal, with DATABASE_URL pointing at localhost:5433

# Option B: Native
npm install
cd server && npm install && cd ..
docker compose up db -d   # Postgres only
npm run db:migrate
npm run dev
```

- UI: http://localhost:5173
- API: http://localhost:8081

## Google OAuth setup (user login)

1. Google Cloud Console → APIs & Services → Credentials
2. Create **OAuth 2.0 Client ID** (Web application)
3. Authorized redirect URIs:
   - `http://localhost:8081/api/auth/callback` (local)
   - `https://pipeline.phoeniciantech.com/api/auth/callback` (production)
4. Set in `.env`:
   - `PIPELINE_GOOGLE_CLIENT_ID`
   - `PIPELINE_GOOGLE_CLIENT_SECRET`
   - `PIPELINE_GOOGLE_REDIRECT_URI`

OAuth consent screen should be **Internal** (Phoenician Workspace).

## Domain-Wide Delegation (Gmail/Drive/Calendar sync)

1. Create a service account in `phoenician-production`
2. Enable Domain-Wide Delegation; authorize in Workspace Admin:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/calendar.readonly`
3. Store JSON key in Secret Manager as `PIPELINE_SERVICE_ACCOUNT`
4. Set `PIPELINE_SYNC_MAILBOXES` (comma-separated leadership emails)
5. Set `PIPELINE_DRIVE_NOTES_FOLDER_ID` for meeting notes folder

## API routes

| Route | Auth |
|-------|------|
| `/api/auth/*` | Public |
| `/api/health` | Public |
| `/api/*` | Session cookie |
| `/api/internal/sync/*` | `x-pipeline-sync-token` or Cloud Scheduler OIDC |

Sync endpoints:
- `POST /api/internal/sync/gmail`
- `POST /api/internal/sync/drive`
- `POST /api/internal/sync/calendar`
- `POST /api/internal/sync/all`

## Database migrations

```bash
npm run db:migrate
```

## Seed Beacon checklist leads (optional)

Imports Firestore `checklist_leads` into Pipeline:

```bash
GCP_PROJECT=phoenician-production npm run seed:beacon
```

Requires Firestore read access and `DATABASE_URL`.

## Production deploy

```bash
bash deploy-to-gcp.sh
```

Deploys Cloud Run service `pipeline-production` in `phoenician-production` / `us-west1`.

**Secrets (GCP Secret Manager):**
- `PIPELINE_GOOGLE_CLIENT_ID` / `PIPELINE_GOOGLE_CLIENT_SECRET` (Pipeline Web OAuth — separate from Gmail Desktop client)
- `PHOENICIANTECH_GMAIL_CLIENT_ID` / `PHOENICIANTECH_GMAIL_CLIENT_SECRET` (unchanged; used by compliance, phoeniciantech-web for email)
- `PIPELINE_SESSION_SECRET`
- `PIPELINE_DATABASE_URL`
- `PIPELINE_INTERNAL_SYNC_TOKEN`

**Post-deploy (one-time):**
1. OAuth redirect URI (Console only): `bash scripts/provision-oauth.sh`
2. Domain-Wide Delegation for sync SA: `bash scripts/provision-dwd.sh`
3. Map `pipeline.phoeniciantech.com` in Cloud Run → Manage Custom Domains (done by deploy script)
4. Cloud DNS CNAME `pipeline` → `ghs.googlehosted.com` (done by deploy script)
5. Cloud Scheduler job `pipeline-sync-all` (every 4h)

## Project structure

```
pipeline/
├── src/              # React UI
├── server/           # Express API
├── shared/           # Funnel enums, constants
├── db/migrations/    # SQL migrations
├── scripts/          # migrate, seed, deploy
├── Dockerfile
├── docker-compose.yml
├── deploy-to-gcp.sh
└── README.md
```
