const API_BASE = '';

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  me: () => request('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  dashboard: () => request('/api/dashboard'),
  leads: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params)}` : '';
    return request(`/api/leads${q}`);
  },
  createLead: (data: Record<string, unknown>) =>
    request('/api/leads', { method: 'POST', body: JSON.stringify(data) }),
  updateLead: (id: string, data: Record<string, unknown>) =>
    request(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  contacts: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params)}` : '';
    return request(`/api/contacts${q}`);
  },
  contact: (id: string) => request(`/api/contacts/${id}`),
  organizations: () => request('/api/organizations'),
  organization: (id: string) => request(`/api/organizations/${id}`),
  projects: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params)}` : '';
    return request(`/api/projects${q}`);
  },
  triage: () => request('/api/triage'),
  matchTriage: (id: string, data: Record<string, unknown>) =>
    request(`/api/triage/${id}/match`, { method: 'POST', body: JSON.stringify(data) }),
  dismissTriage: (id: string) =>
    request(`/api/triage/${id}/dismiss`, { method: 'POST' }),
  outreach: () => request('/api/outreach'),
};

export type User = { id: string; email: string; name: string; picture?: string };

export type Lead = {
  id: string;
  title: string;
  stage: string;
  organization_name?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  contact_email?: string;
  owner_email?: string;
  notes?: string;
  next_action_date?: string;
  warmth_score?: number;
  last_activity_at?: string;
};

export type DashboardData = {
  funnel: Record<string, number>;
  staleLeads: Lead[];
  activeProjects: Array<{
    id: string;
    name: string;
    status: string;
    organization_name?: string;
    metadata?: { github_repo?: string; cloud_run_service?: string; cloud_run_url?: string };
  }>;
  outreachQueue: Array<{
    id: string;
    lead_title: string;
    reason: string;
    suggested_slots?: Array<{ start: string; end: string }>;
    contact_email?: string;
    first_name?: string;
    last_name?: string;
  }>;
  openActionItems: Array<{ id: string; title: string; action_items: unknown[] }>;
  syncStatus: Array<{ mailbox: string; sync_type: string; last_sync_at?: string; metadata?: Record<string, unknown> }>;
  triageCount: number;
  counts: { leads: number; contacts: number; organizations: number; projects: number; production_projects: number };
};
