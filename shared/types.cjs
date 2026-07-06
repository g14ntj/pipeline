/** @typedef {'new'|'contacted'|'qualified'|'proposal'|'negotiation'|'won'|'lost'|'nurture'} LeadStage */

/** @typedef {'active'|'in_process'|'completed'|'on_hold'} ProjectStatus */

/** @typedef {'email'|'meeting'|'call'|'note'|'drive_doc'} ActivityType */

/** @typedef {'public'|'private'} OrgSector */

const LEAD_STAGES = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
  'nurture',
];

const PROJECT_STATUSES = ['active', 'in_process', 'completed', 'on_hold'];

const ACTIVITY_TYPES = ['email', 'meeting', 'call', 'note', 'drive_doc'];

const ORG_SECTORS = ['public', 'private'];

const PRODUCT_LINES = ['Beacon', 'Nexus', 'consulting', 'other'];

const ALLOWED_DOMAIN = 'phoeniciantech.com';

const STALE_LEAD_DAYS = 14;

module.exports = {
  LEAD_STAGES,
  PROJECT_STATUSES,
  ACTIVITY_TYPES,
  ORG_SECTORS,
  PRODUCT_LINES,
  ALLOWED_DOMAIN,
  STALE_LEAD_DAYS,
};
