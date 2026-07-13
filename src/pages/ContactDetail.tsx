import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { api } from '@/lib/api';
import { format } from 'date-fns';

type TimelineItem = {
  id: string;
  type: string;
  summary?: string;
  occurred_at: string;
  metadata?: { subject?: string };
};

export function ContactDetailPage() {
  const [, params] = useRoute('/contacts/:id');
  const [contact, setContact] = useState<Record<string, string> | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);

  useEffect(() => {
    if (!params?.id) return;
    api.contact(params.id).then((res) => {
      setContact(res.contact);
      setTimeline(res.timeline);
    });
  }, [params?.id]);

  if (!contact) return <div className="page-shell text-muted">Loading…</div>;

  return (
    <div className="page-shell max-w-3xl">
      <h1 className="page-title">
        {contact.first_name} {contact.last_name}
      </h1>
      <p className="page-subtitle mb-6">
        {contact.email} {contact.organization_name && `· ${contact.organization_name}`}
      </p>

      <h2 className="mb-3 font-display text-lg font-semibold text-paper">Communication Timeline</h2>
      {timeline.length === 0 ? (
        <p className="text-sm text-muted">No activities yet</p>
      ) : (
        <ul className="space-y-3">
          {timeline.map((item) => (
            <li key={item.id} className="glass-card p-4 text-sm">
              <div className="mb-1 flex justify-between text-xs text-muted">
                <span className="capitalize">{item.type}</span>
                <span>{format(new Date(item.occurred_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
              {item.metadata?.subject && <p className="font-medium text-paper">{item.metadata.subject}</p>}
              <p className="text-muted">{item.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
