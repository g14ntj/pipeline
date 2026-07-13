const { query } = require('../db');

const INTERNAL_DOMAINS = ['phoeniciantech.com', 'gmail.com', 'google.com', 'googlemail.com'];
const SKIP_LOCAL_PARTS = [
  'noreply', 'no-reply', 'donotreply', 'mailer-daemon', 'postmaster',
  'notifications', 'calendar-notification', 'bounce', 'daemon',
];

function parseEmailAddress(raw) {
  if (!raw) return null;
  const match = String(raw).match(/<([^>]+)>/);
  const email = (match ? match[1] : raw).trim().toLowerCase();
  return email.includes('@') ? email : null;
}

function parseDisplayName(raw) {
  if (!raw) return { firstName: '', lastName: '' };
  const name = String(raw).replace(/<[^>]+>/, '').replace(/"/g, '').trim();
  if (!name || name.includes('@')) return { firstName: '', lastName: '' };
  const parts = name.split(/\s+/);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '' };
}

function emailDomain(email) {
  return email?.split('@')[1]?.toLowerCase() || null;
}

function isInternalEmail(email) {
  const domain = emailDomain(email);
  return domain ? INTERNAL_DOMAINS.includes(domain) : true;
}

function shouldSkipEmail(email) {
  if (!email || isInternalEmail(email)) return true;
  const local = email.split('@')[0] || '';
  return SKIP_LOCAL_PARTS.some((p) => local.includes(p));
}

function domainToOrgName(domain) {
  if (!domain) return 'Unknown';
  const base = domain.split('.')[0] || domain;
  return base
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function findOrganizationByDomain(domain) {
  if (!domain) return null;
  const result = await query(
    `SELECT * FROM organizations WHERE LOWER(domain) = LOWER($1) LIMIT 1`,
    [domain],
  );
  return result.rows[0] || null;
}

async function findOrCreateOrganization({ name, domain, sector = 'private', tags = [] }) {
  if (domain) {
    const existing = await findOrganizationByDomain(domain);
    if (existing) return existing;
  }

  const orgName = name || domainToOrgName(domain);
  const byName = await query(
    `SELECT * FROM organizations WHERE LOWER(name) = LOWER($1) LIMIT 1`,
    [orgName],
  );
  if (byName.rows[0]) return byName.rows[0];

  const website = domain ? `https://${domain}` : null;
  const result = await query(
    `INSERT INTO organizations (name, sector, website, domain, tags)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [orgName, sector, website, domain, tags],
  );
  return result.rows[0];
}

async function findContactByEmail(email) {
  const result = await query(
    `SELECT c.*, l.id AS lead_id FROM contacts c
     LEFT JOIN leads l ON l.contact_id = c.id
     WHERE LOWER(c.email) = LOWER($1)
     LIMIT 1`,
    [email],
  );
  return result.rows[0] || null;
}

async function findOrCreateContact({ email, firstName, lastName, organizationId, role }) {
  const existing = await findContactByEmail(email);
  if (existing) return existing;

  const result = await query(
    `INSERT INTO contacts (organization_id, first_name, last_name, email, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      organizationId,
      firstName || email.split('@')[0],
      lastName || null,
      email,
      role || null,
    ],
  );
  return result.rows[0];
}

async function findLeadForContact(contactId, organizationId) {
  const result = await query(
    `SELECT * FROM leads
     WHERE contact_id = $1 OR (organization_id = $2 AND contact_id IS NULL)
     ORDER BY updated_at DESC LIMIT 1`,
    [contactId, organizationId],
  );
  return result.rows[0] || null;
}

async function findOrCreateLead({
  contactId,
  organizationId,
  title,
  source,
  stage = 'new',
  ownerEmail,
  activityId,
}) {
  const existing = contactId
    ? await findLeadForContact(contactId, organizationId)
    : null;
  if (existing) {
    await query(
      `UPDATE leads SET last_activity_at = NOW(), updated_at = NOW(),
       stage = CASE WHEN stage = 'new' AND $2 = 'contacted' THEN 'contacted' ELSE stage END
       WHERE id = $1`,
      [existing.id, stage],
    );
    if (activityId) {
      await query(
        `INSERT INTO interactions (activity_id, contact_id, lead_id) VALUES ($1, $2, $3)`,
        [activityId, contactId, existing.id],
      );
    }
    return { lead: existing, created: false };
  }

  const result = await query(
    `INSERT INTO leads (organization_id, contact_id, title, stage, source, owner_email, last_activity_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
    [organizationId, contactId, title, stage, source, ownerEmail || null],
  );
  const lead = result.rows[0];

  if (activityId) {
    await query(
      `INSERT INTO interactions (activity_id, contact_id, lead_id) VALUES ($1, $2, $3)`,
      [activityId, contactId, lead.id],
    );
  }

  return { lead, created: true };
}

async function curateFromEmail({
  email,
  displayName,
  subject,
  summary,
  mailbox,
  activityId,
  fromHeader,
}) {
  const parsed = parseEmailAddress(email) || email;
  if (shouldSkipEmail(parsed)) return null;

  const domain = emailDomain(parsed);
  const { firstName, lastName } = displayName
    ? parseDisplayName(displayName)
    : parseDisplayName(fromHeader || '');

  const org = await findOrCreateOrganization({
    name: domainToOrgName(domain),
    domain,
    tags: ['auto-curated'],
  });

  const contact = await findOrCreateContact({
    email: parsed,
    firstName,
    lastName,
    organizationId: org.id,
  });

  const isOutbound = fromHeader?.includes('phoeniciantech.com');
  const stage = isOutbound ? 'contacted' : 'new';
  const title = subject ? `${org.name} — ${subject}`.slice(0, 200) : `${org.name} — ${parsed}`;

  const { lead, created } = await findOrCreateLead({
    contactId: contact.id,
    organizationId: org.id,
    title,
    source: 'gmail_auto',
    stage,
    ownerEmail: mailbox,
    activityId,
  });

  return { org, contact, lead, created };
}

async function curateFromAttendee({ email, displayName, subject, mailbox, activityId }) {
  const parsed = parseEmailAddress(email) || email;
  if (shouldSkipEmail(parsed)) return null;

  const domain = emailDomain(parsed);
  const { firstName, lastName } = parseDisplayName(displayName || '');

  const org = await findOrCreateOrganization({
    name: domainToOrgName(domain),
    domain,
    tags: ['auto-curated', 'calendar'],
  });

  const contact = await findOrCreateContact({
    email: parsed,
    firstName,
    lastName,
    organizationId: org.id,
  });

  const title = subject
    ? `${org.name} — ${subject}`.slice(0, 200)
    : `${org.name} — meeting`;

  const { lead, created } = await findOrCreateLead({
    contactId: contact.id,
    organizationId: org.id,
    title,
    source: 'calendar_auto',
    stage: 'contacted',
    ownerEmail: mailbox,
    activityId,
  });

  return { org, contact, lead, created };
}

async function curateFromOrganizationName({ organizationName, attendees = [], subject, mailbox, activityId }) {
  if (!organizationName) return null;

  const org = await findOrCreateOrganization({
    name: organizationName,
    tags: ['auto-curated', 'meeting-notes'],
  });

  let contact = null;
  for (const attendee of attendees) {
    const email = parseEmailAddress(attendee);
    if (!email || shouldSkipEmail(email)) continue;
    contact = await findOrCreateContact({
      email,
      firstName: parseDisplayName(attendee).firstName,
      lastName: parseDisplayName(attendee).lastName,
      organizationId: org.id,
    });
    break;
  }

  const title = subject || `${organizationName} — meeting notes`;
  const { lead, created } = await findOrCreateLead({
    contactId: contact?.id || null,
    organizationId: org.id,
    title: title.slice(0, 200),
    source: 'drive_auto',
    stage: 'contacted',
    ownerEmail: mailbox,
    activityId,
  });

  return { org, contact, lead, created };
}

module.exports = {
  parseEmailAddress,
  parseDisplayName,
  isInternalEmail,
  shouldSkipEmail,
  domainToOrgName,
  findOrCreateOrganization,
  findOrCreateContact,
  findOrCreateLead,
  curateFromEmail,
  curateFromAttendee,
  curateFromOrganizationName,
};
