import { useEffect, useState } from 'react';
import { api, type DashboardData } from '@/lib/api';
import { QuickAddLead } from '@/components/QuickAddLead';
import { format } from 'date-fns';

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setData(await api.dashboard());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="page-shell text-muted">Loading dashboard…</div>;
  if (!data) return <div className="page-shell text-fragmented-red">Failed to load dashboard</div>;

  const funnelTotal = Object.values(data.funnel).reduce((a, b) => a + b, 0);

  return (
    <div className="page-shell space-y-6">
      <header>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          {funnelTotal} leads · {data.counts.projects} projects ({data.counts.production_projects} in production) ·{' '}
          {data.counts.contacts} contacts
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        {Object.entries(data.funnel).map(([stage, count]) => (
          <div key={stage} className="glass-card glass-card-hover p-4">
            <p className="text-xs capitalize text-muted">{stage}</p>
            <p className="font-display text-2xl font-bold text-cerulean">{count}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass-card p-5">
          <h2 className="mb-3 font-display text-lg font-semibold text-paper">Stale Leads</h2>
          {data.staleLeads.length === 0 ? (
            <p className="text-sm text-muted">No stale leads</p>
          ) : (
            <ul className="space-y-3">
              {data.staleLeads.map((l) => (
                <li key={l.id} className="border-b border-cerulean/10 pb-3 text-sm last:border-0">
                  <span className="font-medium text-paper">{l.title}</span>
                  <span className="ml-2 capitalize text-muted">{l.stage}</span>
                  {l.organization_name && <span className="text-muted"> — {l.organization_name}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass-card p-5">
          <h2 className="mb-3 font-display text-lg font-semibold text-paper">Projects</h2>
          {data.activeProjects.length === 0 ? (
            <p className="text-sm text-muted">No projects — run sync to import from GitHub &amp; Cloud Run</p>
          ) : (
            <ul className="space-y-3">
              {data.activeProjects.map((p) => (
                <li key={p.id} className="border-b border-cerulean/10 pb-3 text-sm last:border-0">
                  <span className="font-medium text-paper">{p.name}</span>
                  <span className={p.status === 'production' ? 'chip ml-2' : 'ml-2 text-muted'}>
                    {p.status}
                  </span>
                  {p.organization_name && <span className="text-muted"> — {p.organization_name}</span>}
                  {p.metadata?.github_repo && (
                    <p className="mt-1 text-xs text-muted">{p.metadata.github_repo}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="glass-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold text-paper">Outreach Queue</h2>
        {data.outreachQueue.length === 0 ? (
          <p className="text-sm text-muted">No outreach items due</p>
        ) : (
          <div className="space-y-3">
            {data.outreachQueue.map((item) => (
              <div key={item.id} className="rounded-xl border border-cerulean/15 bg-navy/30 p-4 text-sm">
                <p className="font-medium text-paper">{item.lead_title}</p>
                <p className="text-muted">{item.reason}</p>
                {item.suggested_slots?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.suggested_slots.slice(0, 3).map((slot) => (
                      <a
                        key={slot.start}
                        href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=Follow-up: ${encodeURIComponent(item.lead_title)}&dates=${slot.start.replace(/[-:]/g, '').split('.')[0]}Z/${slot.end.replace(/[-:]/g, '').split('.')[0]}Z`}
                        target="_blank"
                        rel="noreferrer"
                        className="chip hover:border-cerulean/50"
                      >
                        {format(new Date(slot.start), 'EEE MMM d h:mm a')}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {data.syncStatus.length > 0 && (
        <section className="glass-card p-4 text-xs text-muted">
          <p className="mb-2 font-medium text-paper">Sync status</p>
          <ul className="space-y-1">
            {data.syncStatus.map((s) => (
              <li key={`${s.mailbox}-${s.sync_type}`}>
                {s.sync_type}: {s.mailbox}
                {s.last_sync_at && ` · ${format(new Date(s.last_sync_at), 'MMM d h:mm a')}`}
              </li>
            ))}
          </ul>
          {data.triageCount > 0 && (
            <p className="mt-2 text-cerulean">{data.triageCount} items awaiting triage review</p>
          )}
        </section>
      )}

      <QuickAddLead onCreated={load} />
    </div>
  );
}
