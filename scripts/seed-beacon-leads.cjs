#!/usr/bin/env node
/**
 * One-time import of Firestore checklist_leads into Pipeline CRM.
 * Usage: npm run seed:beacon
 */
const path = require('path');

const serverModules = path.join(__dirname, '..', 'server', 'node_modules');
const { Pool } = require(path.join(serverModules, 'pg'));
require(path.join(serverModules, 'dotenv')).config({ path: path.join(__dirname, '..', '.env') });

function getProjectId() {
  return (
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    null
  );
}

async function getFirestore() {
  const projectId = getProjectId();
  if (!projectId) {
    console.warn('[seed] GCP project not set — cannot read Firestore');
    return null;
  }
  const { Firestore } = require(path.join(serverModules, '@google-cloud/firestore'));
  return new Firestore({ projectId });
}

async function main() {
  const db = await getFirestore();
  if (!db) {
    console.log('[seed] Skipped (no Firestore access). Set GCP_PROJECT and credentials.');
    process.exit(0);
  }

  const collection =
    process.env.CHECKLIST_FIRESTORE_COLLECTION || 'checklist_leads';

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const snapshot = await db.collection(collection).get();
    console.log(`[seed] Found ${snapshot.size} checklist leads`);

    let imported = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const email = (data.email || '').trim().toLowerCase();
      const orgName = (data.organization || 'Unknown').trim();
      const firstName = (data.firstName || '').trim() || 'Unknown';
      const lastName = (data.lastName || '').trim();

      if (!email && !orgName) continue;

      await client.query('BEGIN');
      try {
        const org = await client.query(
          `INSERT INTO organizations (name, sector, tags)
           VALUES ($1, 'public', ARRAY['beacon', 'checklist'])
           RETURNING id`,
          [orgName],
        );

        const contact = await client.query(
          `INSERT INTO contacts (organization_id, first_name, last_name, email)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [org.rows[0].id, firstName, lastName || null, email || null],
        );

        await client.query(
          `INSERT INTO leads (organization_id, contact_id, title, stage, source, notes)
           VALUES ($1, $2, $3, 'new', 'beacon_checklist', $4)`,
          [
            org.rows[0].id,
            contact.rows[0].id,
            `${firstName} ${lastName} — ${orgName}`.trim(),
            `Imported from Firestore ${doc.id}. Checklist: ${data.checklist || 'unknown'}`,
          ],
        );

        await client.query('COMMIT');
        imported++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.warn(`[seed] Skip ${doc.id}:`, err.message);
      }
    }

    console.log(`[seed] Imported ${imported} leads`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[seed] failed:', err.message);
  process.exit(1);
});
