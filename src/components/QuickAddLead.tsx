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
        className="fixed bottom-6 right-6 bg-[var(--accent)] text-[var(--brand)] font-semibold px-5 py-3 rounded-full shadow-lg hover:brightness-110 z-50"
      >
        + Quick Add Lead
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold text-[var(--brand)]">Quick Add Lead</h2>
        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="First name *"
            required
            value={form.contact_first_name}
            onChange={(e) => setForm({ ...form, contact_first_name: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Last name"
            value={form.contact_last_name}
            onChange={(e) => setForm({ ...form, contact_last_name: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <input
          placeholder="Email"
          type="email"
          value={form.contact_email}
          onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm w-full"
        />
        <input
          placeholder="Organization"
          value={form.organization_name}
          onChange={(e) => setForm({ ...form, organization_name: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm w-full"
        />
        <select
          value={form.stage}
          onChange={(e) => setForm({ ...form, stage: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm w-full"
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <textarea
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm w-full h-20"
        />
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-600">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm bg-[var(--brand)] text-white rounded-lg disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save Lead'}
          </button>
        </div>
      </form>
    </div>
  );
}
