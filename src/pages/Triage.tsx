import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { format } from 'date-fns';

type TriageItem = {
  id: string;
  summary?: string;
  occurred_at: string;
  mailbox?: string;
  metadata?: { subject?: string; from?: string };
};

export function TriagePage() {
  const [items, setItems] = useState<TriageItem[]>([]);

  async function load() {
    const res = await api.triage();
    setItems(res.items);
  }

  useEffect(() => {
    load();
  }, []);

  async function dismiss(id: string) {
    await api.dismissTriage(id);
    load();
  }

  return (
    <div className="page-shell">
      <h1 className="page-title mb-2">Triage Queue</h1>
      <p className="page-subtitle mb-6">Unmatched emails from Gmail sync</p>

      {items.length === 0 ? (
        <p className="text-muted">No items in triage</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="glass-card p-4 text-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-paper">{item.metadata?.subject || 'No subject'}</p>
                  <p className="text-xs text-muted">
                    From: {item.metadata?.from} · {item.mailbox} · {format(new Date(item.occurred_at), 'MMM d, yyyy')}
                  </p>
                  <p className="mt-2 text-muted">{item.summary}</p>
                </div>
                <button
                  onClick={() => dismiss(item.id)}
                  className="btn-ghost shrink-0 text-xs text-muted hover:text-fragmented-red"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
