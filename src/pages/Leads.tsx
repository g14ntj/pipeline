import { useEffect, useState } from 'react';
import { api, type Lead } from '@/lib/api';
import { QuickAddLead } from '@/components/QuickAddLead';
import { cn } from '@/lib/cn';

const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'nurture'];

const stageColors: Record<string, string> = {
  new: 'border-cerulean/20 bg-navy/40',
  contacted: 'border-cerulean/25 bg-cerulean/5',
  qualified: 'border-cerulean/30 bg-cerulean/10',
  proposal: 'border-cerulean/35 bg-navy/50',
  negotiation: 'border-cerulean/40 bg-cerulean/15',
  won: 'border-emerald-500/30 bg-emerald-500/10',
  lost: 'border-fragmented-red/30 bg-fragmented-red/10',
  nurture: 'border-cerulean/20 bg-chip-bg',
};

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.leads();
      setLeads(res.leads);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function moveLead(id: string, stage: string) {
    await api.updateLead(id, { stage });
    load();
  }

  if (loading) return <div className="page-shell text-muted">Loading leads…</div>;

  return (
    <div className="page-shell">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="page-title">Leads</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView('kanban')}
            className={cn(view === 'kanban' ? 'btn-primary' : 'btn-secondary')}
          >
            Kanban
          </button>
          <button
            onClick={() => setView('list')}
            className={cn(view === 'list' ? 'btn-primary' : 'btn-secondary')}
          >
            List
          </button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <div key={stage} className={cn('min-w-[240px] rounded-2xl border p-3', stageColors[stage])}>
              <h3 className="mb-3 text-sm font-semibold capitalize text-paper">
                {stage} ({leads.filter((l) => l.stage === stage).length})
              </h3>
              <div className="space-y-2">
                {leads
                  .filter((l) => l.stage === stage)
                  .map((lead) => (
                    <div key={lead.id} className="glass-card p-3 text-sm">
                      <p className="font-medium text-paper">{lead.title}</p>
                      {lead.organization_name && (
                        <p className="text-xs text-muted">{lead.organization_name}</p>
                      )}
                      <select
                        value={lead.stage}
                        onChange={(e) => moveLead(lead.id, e.target.value)}
                        className="input-field mt-2 text-xs"
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="data-table overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th>Title</th>
                <th>Org</th>
                <th>Stage</th>
                <th>Owner</th>
                <th>Next Action</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="font-medium text-paper">{lead.title}</td>
                  <td className="text-muted">{lead.organization_name || '—'}</td>
                  <td className="capitalize">{lead.stage}</td>
                  <td className="text-muted">{lead.owner_email || '—'}</td>
                  <td className="text-muted">{lead.next_action_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <QuickAddLead onCreated={load} />
    </div>
  );
}
