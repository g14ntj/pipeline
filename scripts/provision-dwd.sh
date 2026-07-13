#!/usr/bin/env bash
# Workspace Admin: authorize Pipeline sync service account for domain-wide delegation.
set -euo pipefail

PROJECT="${GCP_PROJECT:-phoenician-production}"
SA_EMAIL="pipeline-sync@${PROJECT}.iam.gserviceaccount.com"
CLIENT_ID="$(gcloud iam service-accounts describe "${SA_EMAIL}" --project="${PROJECT}" --format='value(oauth2ClientId)')"
SCOPES=(
  "https://www.googleapis.com/auth/gmail.readonly"
  "https://www.googleapis.com/auth/drive.readonly"
  "https://www.googleapis.com/auth/calendar.readonly"
)

echo "=== Pipeline CRM — Domain-Wide Delegation (Workspace Admin) ==="
echo ""
echo "1. Open: https://admin.google.com/ac/owl/domainwidedelegation"
echo "2. Add new API client:"
echo "   Client ID: ${CLIENT_ID}"
echo "   OAuth scopes (comma-separated):"
IFS=,
echo "   ${SCOPES[*]}"
echo ""
echo "3. Leadership mailboxes synced (PIPELINE_SYNC_MAILBOXES):"
echo "   sethpoor@phoeniciantech.com, jaredbodily@phoeniciantech.com"
echo ""
echo "Service account: ${SA_EMAIL}"
