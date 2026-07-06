import { useEffect, useState } from 'react';
import { api, type Lead } from '@/lib/api';
import { QuickAddLead } from '@/components/QuickAddLead';

const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'nurture'];

const stageColors: Record<string, string> = {
  new: 'bg-slate-100',
  contacted: 'bg-blue-50',
  qualified: 'bg-indigo-50',
  proposal: 'bg-purple-50',
  negotiation: 'bg-amber-50',
  won: 'bg-green-50',
  lost: 'bg-red-50',
  nurture: 'bg-teal-50',
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

  useEffect(() => { load(); }, []);

  async function moveLead(id: string, stage: string) {
    await api.updateLead(id, { stage });
    load();
  }

  if (loading) return <div className="p-8 text-gray-500">Loading leads…</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--brand)]">Leads</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView('kanban')}
            className={`px-3 py-1.5 text-sm rounded-lg ${view === 'kanban' ? 'bg-[var(--brand)] text-white' : 'bg-white border'}`}
          >
            Kanban
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 text-sm rounded-lg ${view === 'list' ? 'bg-[var(--brand)] text-white' : 'bg-white border'}`}
          >
            List
          </button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <div key={stage} className={`min-w-[220px] rounded-xl p-3 ${stageColors[stage]}`}>
              <h3 className="text-sm font-semibold capitalize mb-2 text-gray-700">
                {stage} ({leads.filter((l) => l.stage === stage).length})
              </h3>
              <div className="space-y-2">
                {leads.filter((l) => l.stage === stage).map((lead) => (
                  <div key={lead.id} className="bg-white rounded-lg p-3 shadow-sm text-sm">
                    <p className="font-medium">{lead.title}</p>
                    {lead.organization_name && (
                      <p className="text-gray-400 text-xs">{lead.organization_name}</p>
                    )}
                    <select
                      value={lead.stage}
                      onChange={(e) => moveLead(lead.id, e.target.value)}
                      className="mt-2 text-xs border rounded w-full"
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <table className="w-full bg-white rounded-xl shadow-sm border text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="p-3">Title</th>
              <th className="p-3">Org</th>
              <th className="p-3">Stage</th>
              <th className="p-3">Owner</th>
              <th className="p-3">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{lead.title}</td>
                <td className="p-3 text-gray-500">{lead.organization_name || '—'}</td>
                <td className="p-3 capitalize">{lead.stage}</td>
                <td className="p-3 text-gray-500">{lead.owner_email || '—'}</td>
                <td className="p-3 text-gray-500">{lead.next_action_date || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <QuickAddLead onCreated={load} />
    </div>
  );
}
