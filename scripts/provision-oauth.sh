#!/usr/bin/env bash
# Create a dedicated Web OAuth client for Pipeline CRM SSO.
# The PHOENICIANTECH_GMAIL client is a Desktop app (loopback only) — it cannot
# register https:// redirect URIs and will always cause redirect_uri_mismatch.
set -euo pipefail

PROJECT="${GCP_PROJECT:-phoenician-production}"
DOMAIN="${PIPELINE_DOMAIN:-pipeline.phoeniciantech.com}"
ORIGIN="https://${DOMAIN}"
REDIRECT_URI="${ORIGIN}/api/auth/callback"
ID_SECRET="PIPELINE_GOOGLE_CLIENT_ID"
SECRET_SECRET="PIPELINE_GOOGLE_CLIENT_SECRET"

echo "══════════════════════════════════════════════════════════════════════"
echo "  Pipeline CRM — Create Web OAuth Client (fixes redirect_uri_mismatch)"
echo "══════════════════════════════════════════════════════════════════════"
echo ""
echo "WHY: Pipeline was using PHOENICIANTECH_GMAIL (Desktop OAuth client)."
echo "     Desktop clients only allow http://127.0.0.1 — not https:// redirects."
echo ""
echo "FIX: Create a new Web application OAuth client:"
echo "  https://console.cloud.google.com/apis/credentials/oauthclient/new?project=${PROJECT}"
echo ""
echo "Settings:"
echo "  Application type:  Web application"
echo "  Name:                Pipeline CRM"
echo "  JavaScript origins:  ${ORIGIN}"
echo "  Redirect URIs:       ${REDIRECT_URI}"
echo ""
echo "Also confirm Audience is Internal (@phoeniciantech.com only):"
echo "  https://console.cloud.google.com/auth/audience?project=${PROJECT}"
echo ""

if [[ "${1:-}" == "--store" ]]; then
  echo "Paste the new Client ID, then Client Secret when prompted."
  read -r -p "Client ID: " CLIENT_ID
  read -r -s -p "Client Secret: " CLIENT_SECRET
  echo ""
  [[ -n "$CLIENT_ID" && -n "$CLIENT_SECRET" ]] || { echo "Both values required."; exit 1; }
  echo -n "$CLIENT_ID" | gcloud secrets versions add "$ID_SECRET" --project="$PROJECT" --data-file=- --quiet
  echo -n "$CLIENT_SECRET" | gcloud secrets versions add "$SECRET_SECRET" --project="$PROJECT" --data-file=- --quiet
  echo "Secrets updated. Redeploying Cloud Run..."
  gcloud run services update pipeline-production --region=us-west1 --project="$PROJECT" --quiet
  echo "Done. Try https://${DOMAIN}/login"
  exit 0
fi

echo "After creating the client in Console, store credentials:"
echo "  bash scripts/provision-oauth.sh --store"
echo ""
echo "Or manually:"
echo "  gcloud secrets versions add ${ID_SECRET} --project=${PROJECT} --data-file=-"
echo "  gcloud secrets versions add ${SECRET_SECRET} --project=${PROJECT} --data-file=-"
echo "  gcloud run services update pipeline-production --region=us-west1 --project=${PROJECT}"
