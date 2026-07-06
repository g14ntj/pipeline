#!/bin/bash
# Pipeline CRM — GCP Cloud Run Deployment
# Run: bash deploy-to-gcp.sh
# Does NOT auto-run — prepares and executes deploy when invoked manually.

set -e

PROJECT_ID="phoenician-production"
REGION="us-west1"
REPO_NAME="ufp-repo-oregon"
IMAGE_NAME="pipeline"
SERVICE_NAME="pipeline-production"
SQL_INSTANCE="pipeline-db"
DOMAIN="pipeline.phoeniciantech.com"

FULL_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:latest"

echo "══════════════════════════════════════════════════════════════════════"
echo "  PIPELINE CRM → GCP CLOUD RUN DEPLOYMENT"
echo "  Target: https://${DOMAIN}"
echo "══════════════════════════════════════════════════════════════════════"

echo ""
echo "[1/6] Authenticating with Artifact Registry..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

echo ""
echo "[2/6] Building Docker image: ${FULL_TAG}"
docker build -t ${FULL_TAG} .

echo ""
echo "[3/6] Pushing image to Artifact Registry..."
docker push ${FULL_TAG}

echo ""
echo "[4/6] Deploying to Cloud Run service: ${SERVICE_NAME}..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${FULL_TAG} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --allow-unauthenticated \
  --add-cloudsql-instances "${PROJECT_ID}:${REGION}:${SQL_INSTANCE}" \
  --set-env-vars "NODE_ENV=production,SERVER_PORT=8080,GCP_PROJECT=${PROJECT_ID},GOOGLE_CLOUD_PROJECT=${PROJECT_ID},APP_URL=https://${DOMAIN},API_URL=https://${DOMAIN},PIPELINE_GOOGLE_REDIRECT_URI=https://${DOMAIN}/api/auth/callback,VERTEX_AI_LOCATION=${REGION},ORACLE_USE_VERTEX_AI=true,VERTEX_ORACLE_MODEL=gemini-2.5-flash,PIPELINE_SYNC_MAILBOXES=sethpoor@phoeniciantech.com,jared@phoeniciantech.com" \
  --set-secrets "PIPELINE_GOOGLE_CLIENT_ID=PIPELINE_GOOGLE_CLIENT_ID:latest,PIPELINE_GOOGLE_CLIENT_SECRET=PIPELINE_GOOGLE_CLIENT_SECRET:latest,PIPELINE_SESSION_SECRET=PIPELINE_SESSION_SECRET:latest,PIPELINE_DB_PASSWORD=PIPELINE_DB_PASSWORD:latest,PIPELINE_INTERNAL_SYNC_TOKEN=PIPELINE_INTERNAL_SYNC_TOKEN:latest,PIPELINE_SERVICE_ACCOUNT=PIPELINE_SERVICE_ACCOUNT:latest,GOOGLE_GENERATIVE_AI_API_KEY=GOOGLE_GENERATIVE_AI_API_KEY:latest" \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --quiet

echo ""
echo "[5/6] Cloud SQL connection string reminder..."
echo "  Set DATABASE_URL secret or env to:"
echo "  postgresql://pipeline:\${PIPELINE_DB_PASSWORD}@/pipeline?host=/cloudsql/${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"

echo ""
echo "[6/6] Post-deploy checklist..."
echo "  1. Cloud Run → Manage Custom Domains → add ${DOMAIN}"
echo "  2. Cloud DNS (phoenician-tech-zone) → CNAME/A per GCP instructions"
echo "  3. GCP Managed Certificate (auto-provisioned)"
echo "  4. Google OAuth redirect: https://${DOMAIN}/api/auth/callback"
echo "  5. Cloud Scheduler jobs → POST https://${DOMAIN}/api/internal/sync/all"
echo "     Header: x-pipeline-sync-token: <PIPELINE_INTERNAL_SYNC_TOKEN>"
echo "  6. Workspace Admin → DWD for service account (gmail/drive/calendar readonly)"
echo "  7. Run db:migrate against Cloud SQL (Cloud Run job or local proxy)"

echo ""
echo "══════════════════════════════════════════════════════════════════════"
echo "✅ DEPLOY SCRIPT COMPLETE"
echo "══════════════════════════════════════════════════════════════════════"
