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

  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-8 text-gray-500">Loading dashboard…</div>;
  if (!data) return <div className="p-8 text-red-600">Failed to load dashboard</div>;

  const funnelTotal = Object.values(data.funnel).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[var(--brand)]">Dashboard</h1>
        <p className="text-sm text-gray-500">{funnelTotal} leads across the funnel</p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {Object.entries(data.funnel).map(([stage, count]) => (
          <div key={stage} className="bg-white rounded-lg p-3 shadow-sm border">
            <p className="text-xs text-gray-500 capitalize">{stage}</p>
            <p className="text-2xl font-bold text-[var(--brand)]">{count}</p>
          </div>
        ))}
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl shadow-sm border p-4">
          <h2 className="font-semibold text-[var(--brand)] mb-3">Stale Leads</h2>
          {data.staleLeads.length === 0 ? (
            <p className="text-sm text-gray-400">No stale leads</p>
          ) : (
            <ul className="space-y-2">
              {data.staleLeads.map((l) => (
                <li key={l.id} className="text-sm border-b pb-2">
                  <span className="font-medium">{l.title}</span>
                  <span className="text-gray-400 ml-2 capitalize">{l.stage}</span>
                  {l.organization_name && <span className="text-gray-400"> — {l.organization_name}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-sm border p-4">
          <h2 className="font-semibold text-[var(--brand)] mb-3">Active Projects</h2>
          {data.activeProjects.length === 0 ? (
            <p className="text-sm text-gray-400">No active projects</p>
          ) : (
            <ul className="space-y-2">
              {data.activeProjects.map((p) => (
                <li key={p.id} className="text-sm border-b pb-2">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-gray-400 ml-2">{p.status}</span>
                  {p.organization_name && <span className="text-gray-400"> — {p.organization_name}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="bg-white rounded-xl shadow-sm border p-4">
        <h2 className="font-semibold text-[var(--brand)] mb-3">Outreach Queue</h2>
        {data.outreachQueue.length === 0 ? (
          <p className="text-sm text-gray-400">No outreach items due</p>
        ) : (
          <div className="space-y-3">
            {data.outreachQueue.map((item) => (
              <div key={item.id} className="border rounded-lg p-3 text-sm">
                <p className="font-medium">{item.lead_title}</p>
                <p className="text-gray-500">{item.reason}</p>
                {item.suggested_slots?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.suggested_slots.slice(0, 3).map((slot) => (
                      <a
                        key={slot.start}
                        href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=Follow-up: ${encodeURIComponent(item.lead_title)}&dates=${slot.start.replace(/[-:]/g, '').split('.')[0]}Z/${slot.end.replace(/[-:]/g, '').split('.')[0]}Z`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
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
        <section className="text-xs text-gray-400">
          Last sync: {data.syncStatus.map((s) => `${s.mailbox} (${s.sync_type})`).join(', ')}
        </section>
      )}

      <QuickAddLead onCreated={load} />
    </div>
  );
}
