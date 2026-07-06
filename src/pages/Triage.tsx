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

  useEffect(() => { load(); }, []);

  async function dismiss(id: string) {
    await api.dismissTriage(id);
    load();
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[var(--brand)] mb-2">Triage Queue</h1>
      <p className="text-sm text-gray-500 mb-6">Unmatched emails from Gmail sync</p>

      {items.length === 0 ? (
        <p className="text-gray-400">No items in triage</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white border rounded-xl p-4 text-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{item.metadata?.subject || 'No subject'}</p>
                  <p className="text-gray-400 text-xs">
                    From: {item.metadata?.from} · {item.mailbox} · {format(new Date(item.occurred_at), 'MMM d, yyyy')}
                  </p>
                  <p className="mt-2 text-gray-600">{item.summary}</p>
                </div>
                <button
                  onClick={() => dismiss(item.id)}
                  className="text-xs text-gray-400 hover:text-red-600 shrink-0"
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
