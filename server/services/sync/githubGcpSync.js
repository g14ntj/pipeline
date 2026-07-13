const { GoogleAuth } = require('google-auth-library');
const { query } = require('../../db');

const REPO_SERVICE_ALIASES = {
  phoenician_web: 'phoeniciantech-web',
  'phoenician-web': 'phoeniciantech-web',
  phoenician_compliance: 'phoenician-compliance-portal',
  'phoenician-compliance': 'phoenician-compliance-portal',
  vio_peptides: 'vio-peptides',
  house_of_facial_plastics: 'hofp',
  'house-of-facial-plastics': 'hofp',
};

const INTERNAL_REPO_NAMES = new Set([
  'pipeline', 'phoenician_web', 'phoenician-web', 'phoenician_compliance',
  'phoenician-global-agents', 'phoenician-chief-knowledge-officer',
  'phoenician-beacon', 'phoenician_questions', 'phoenician_watchtower',
  'rfp_response_engine', 'receipt-engine', 'chief_of_staff', 'synapse',
]);

function normalizeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\.git$/, '')
    .replace(/-production$/, '');
}

function serviceSlugForRepo(repoName) {
  const norm = normalizeSlug(repoName);
  return REPO_SERVICE_ALIASES[norm] || REPO_SERVICE_ALIASES[repoName] || norm;
}

function repoMatchesService(repoName, serviceName) {
  const repoSlug = serviceSlugForRepo(repoName);
  const serviceSlug = normalizeSlug(serviceName);

  if (repoSlug === serviceSlug) return true;
  if (serviceSlug.includes(repoSlug) || repoSlug.includes(serviceSlug)) return true;

  const repoCore = repoSlug.replace(/^phoenician-/, '');
  const svcCore = serviceSlug.replace(/^phoeniciantech-/, '').replace(/^phoenician-/, '');
  if (repoCore && svcCore && (svcCore.includes(repoCore) || repoCore.includes(svcCore))) return true;

  return false;
}

function repoToDisplayName(repoName) {
  return repoName
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function inferProductLine(repoName, description) {
  const text = `${repoName} ${description || ''}`.toLowerCase();
  if (text.includes('beacon') || text.includes('flsa') || text.includes('w-2')) return 'Beacon';
  if (text.includes('nexus') || text.includes('erp')) return 'Nexus';
  if (text.includes('lumina') || text.includes('practice')) return 'Lumina';
  return 'other';
}

function inferClientOrg(repo) {
  const name = repo.name || '';
  if (INTERNAL_REPO_NAMES.has(name) || name.startsWith('phoenician')) {
    return { name: 'Phoenician, LLC', sector: 'private', tags: ['internal'] };
  }
  if (name.includes('facial') || name.includes('ufp') || name.includes('upp')) {
    return { name: 'Utah Facial Plastics', sector: 'private', tags: ['client', 'healthcare'] };
  }
  if (name.includes('sammamish')) {
    return { name: 'City of Sammamish', sector: 'public', tags: ['client', 'municipal'] };
  }
  if (name.includes('waiverflow')) {
    return { name: 'WaiverFlow', sector: 'private', tags: ['product'] };
  }
  if (name.includes('vio')) {
    return { name: 'VIO Peptides', sector: 'private', tags: ['client'] };
  }
  return { name: repoToDisplayName(name), sector: 'private', tags: ['github'] };
}

async function listCloudRunServices(project, region) {
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const parent = `projects/${project}/locations/${region}`;
  const services = [];
  let pageToken;

  do {
    const url = new URL(`https://run.googleapis.com/v2/${parent}/services`);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await client.request({ url: url.toString() });
    for (const svc of res.data.services || []) {
      const shortName = svc.name?.split('/').pop();
      services.push({
        name: shortName,
        uri: svc.uri,
        description: svc.description || '',
        latestReadyRevision: svc.latestReadyRevisionName?.split('/').pop(),
      });
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return services;
}

async function listGitHubRepos(owner, token) {
  if (!token) return [];

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // Prefer org listing when PIPELINE_GITHUB_OWNER is an organization (e.g. phoeniciantech).
  if (owner) {
    const orgRepos = [];
    let page = 1;
    let orgExists = false;

    while (page <= 10) {
      const url = `https://api.github.com/orgs/${encodeURIComponent(owner)}/repos?per_page=100&page=${page}&sort=updated&type=all`;
      const res = await fetch(url, { headers });
      if (res.status === 404) break; // not an org — fall back to user repos
      if (!res.ok) {
        console.warn('[GITHUB-GCP] GitHub org repos error:', res.status, await res.text());
        break;
      }
      orgExists = true;
      const batch = await res.json();
      if (!batch.length) break;
      orgRepos.push(...batch);
      if (batch.length < 100) break;
      page++;
    }

    if (orgExists) {
      return orgRepos.map(mapGithubRepo);
    }
  }

  const repos = [];
  let page = 1;

  while (page <= 5) {
    const url = `https://api.github.com/user/repos?per_page=100&page=${page}&affiliation=owner,organization_member&sort=updated`;

    const res = await fetch(url, { headers });

    if (!res.ok) {
      console.warn('[GITHUB-GCP] GitHub API error:', res.status, await res.text());
      break;
    }

    const batch = await res.json();
    if (!batch.length) break;

    const filtered = owner
      ? batch.filter((r) => r.owner?.login?.toLowerCase() === owner.toLowerCase())
      : batch;

    repos.push(...filtered);
    if (batch.length < 100) break;
    page++;
  }

  return repos.map(mapGithubRepo);
}

function mapGithubRepo(r) {
  return {
    name: r.name,
    fullName: r.full_name,
    description: r.description || '',
    htmlUrl: r.html_url,
    updatedAt: r.updated_at,
    private: r.private,
  };
}

async function findOrCreateOrg({ name, sector, tags }) {
  const existing = await query(
    `SELECT * FROM organizations WHERE LOWER(name) = LOWER($1) LIMIT 1`,
    [name],
  );
  if (existing.rows[0]) return existing.rows[0];

  const result = await query(
    `INSERT INTO organizations (name, sector, tags) VALUES ($1, $2, $3) RETURNING *`,
    [name, sector, tags],
  );
  return result.rows[0];
}

async function upsertProject({ name, orgId, status, productLine, description, externalRef, metadata }) {
  const existing = await query(
    `SELECT id FROM projects WHERE external_ref = $1`,
    [externalRef],
  );

  if (existing.rows[0]) {
    await query(
      `UPDATE projects SET name = $2, organization_id = $3, status = $4, product_line = $5,
       description = $6, metadata = $7, updated_at = NOW() WHERE external_ref = $1`,
      [externalRef, name, orgId, status, productLine, description, JSON.stringify(metadata)],
    );
    return { updated: true };
  }

  await query(
    `INSERT INTO projects (name, organization_id, status, product_line, description, external_ref, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [name, orgId, status, productLine, description, externalRef, JSON.stringify(metadata)],
  );
  return { created: true };
}

async function runGithubGcpSync() {
  const project = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'phoenician-production';
  const region = process.env.PIPELINE_GCP_REGION || 'us-west1';
  // Default to the Phoenician GitHub org — never fall back to a personal account.
  const githubOwner = (process.env.PIPELINE_GITHUB_OWNER || 'phoeniciantech').trim();
  const githubToken = (process.env.PIPELINE_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '').trim();

  const [services, repos] = await Promise.all([
    listCloudRunServices(project, region).catch((err) => {
      console.warn('[GITHUB-GCP] Cloud Run list failed:', err.message);
      return [];
    }),
    listGitHubRepos(githubOwner, githubToken),
  ]);

  const serviceNames = new Set(services.map((s) => s.name));
  let projectsUpserted = 0;
  let productionCount = 0;

  const orgCache = new Map();

  async function getOrg(repo) {
    const key = repo.name;
    if (orgCache.has(key)) return orgCache.get(key);
    const spec = inferClientOrg(repo);
    const org = await findOrCreateOrg(spec);
    orgCache.set(key, org);
    return org;
  }

  if (repos.length) {
    for (const repo of repos) {
      const matchedService = services.find((s) => repoMatchesService(repo.name, s.name));
      const inProduction = Boolean(matchedService);
      const status = inProduction ? 'production' : 'in_process';
      if (inProduction) productionCount++;

      const org = await getOrg(repo);
      const externalRef = `github:${repo.fullName}`;

      await upsertProject({
        name: repoToDisplayName(repo.name),
        orgId: org.id,
        status,
        productLine: inferProductLine(repo.name, repo.description),
        description: repo.description || null,
        externalRef,
        metadata: {
          github_repo: repo.fullName,
          github_url: repo.htmlUrl,
          cloud_run_service: matchedService?.name || null,
          cloud_run_url: matchedService?.uri || null,
          deployed: inProduction,
          last_github_push: repo.updatedAt,
        },
      });
      projectsUpserted++;
    }
  }

  // Cloud Run services without a matched GitHub repo
  for (const service of services) {
    const hasRepo = repos.some((r) => repoMatchesService(r.name, service.name));
    if (hasRepo) continue;

    const phoenicianOrg = await findOrCreateOrg({
      name: 'Phoenician, LLC',
      sector: 'private',
      tags: ['internal'],
    });

    const externalRef = `cloudrun:${project}/${service.name}`;
    await upsertProject({
      name: repoToDisplayName(service.name),
      orgId: phoenicianOrg.id,
      status: 'production',
      productLine: 'other',
      description: service.description || `Cloud Run service in ${project}`,
      externalRef,
      metadata: {
        cloud_run_service: service.name,
        cloud_run_url: service.uri,
        deployed: true,
        github_repo: null,
      },
    });
    projectsUpserted++;
    productionCount++;
  }

  await query(
    `INSERT INTO sync_state (mailbox, sync_type, last_sync_at, metadata)
     VALUES ($1, 'github_gcp', NOW(), $2)
     ON CONFLICT (mailbox) DO UPDATE SET last_sync_at = NOW(), sync_type = 'github_gcp', metadata = EXCLUDED.metadata`,
    [
      `discovery:${project}`,
      JSON.stringify({
        repos: repos.length,
        cloudRunServices: services.length,
        productionCount,
        githubConfigured: Boolean(githubToken),
      }),
    ],
  );

  return {
    ok: true,
    repos: repos.length,
    cloudRunServices: services.length,
    projectsUpserted,
    productionCount,
    githubConfigured: Boolean(githubToken),
    services: [...serviceNames],
  };
}

module.exports = { runGithubGcpSync, repoMatchesService, normalizeSlug };
