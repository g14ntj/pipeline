-- Discovery (GitHub/GCP) + auto-curation support

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check CHECK (status IN (
  'active', 'in_process', 'production', 'completed', 'on_hold'
));

ALTER TABLE projects ADD COLUMN IF NOT EXISTS external_ref TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_external_ref ON projects(external_ref) WHERE external_ref IS NOT NULL;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS domain TEXT;
CREATE INDEX IF NOT EXISTS idx_organizations_domain ON organizations(LOWER(domain));

ALTER TABLE sync_state DROP CONSTRAINT IF EXISTS sync_state_sync_type_check;
ALTER TABLE sync_state ADD CONSTRAINT sync_state_sync_type_check CHECK (sync_type IN (
  'gmail', 'drive', 'calendar', 'calendar_events', 'github_gcp'
));
