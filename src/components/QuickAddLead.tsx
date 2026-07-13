import { useState } from 'react';
import { api } from '@/lib/api';

const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'nurture'];

export function QuickAddLead({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    contact_first_name: '',
    contact_last_name: '',
    contact_email: '',
    organization_name: '',
    stage: 'new',
    notes: '',
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const title = `${form.contact_first_name} ${form.contact_last_name}`.trim() || form.organization_name;
      await api.createLead({ ...form, title });
      setForm({
        contact_first_name: '',
        contact_last_name: '',
        contact_email: '',
        organization_name: '',
        stage: 'new',
        notes: '',
      });
      setOpen(false);
      onCreated?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-primary fixed bottom-6 right-6 z-50 rounded-full px-5 py-3 shadow-lg shadow-cerulean/20"
      >
        + Quick Add Lead
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-absolute-dark/70 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="glass-card w-full max-w-md space-y-4 p-6">
        <h2 className="font-display text-lg font-bold text-paper">Quick Add Lead</h2>
        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="First name *"
            required
            value={form.contact_first_name}
            onChange={(e) => setForm({ ...form, contact_first_name: e.target.value })}
            className="input-field"
          />
          <input
            placeholder="Last name"
            value={form.contact_last_name}
            onChange={(e) => setForm({ ...form, contact_last_name: e.target.value })}
            className="input-field"
          />
        </div>
        <input
          placeholder="Email"
          type="email"
          value={form.contact_email}
          onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
          className="input-field"
        />
        <input
          placeholder="Organization"
          value={form.organization_name}
          onChange={(e) => setForm({ ...form, organization_name: e.target.value })}
          className="input-field"
        />
        <select
          value={form.stage}
          onChange={(e) => setForm({ ...form, stage: e.target.value })}
          className="input-field"
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <textarea
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="input-field h-20 resize-none"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving…' : 'Save Lead'}
          </button>
        </div>
      </form>
    </div>
  );
}
