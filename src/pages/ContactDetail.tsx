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

  if (!contact) return <div className="p-8 text-gray-500">Loading…</div>;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-[var(--brand)]">
        {contact.first_name} {contact.last_name}
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        {contact.email} {contact.organization_name && `· ${contact.organization_name}`}
      </p>

      <h2 className="font-semibold mb-3">Communication Timeline</h2>
      {timeline.length === 0 ? (
        <p className="text-sm text-gray-400">No activities yet</p>
      ) : (
        <ul className="space-y-3">
          {timeline.map((item) => (
            <li key={item.id} className="bg-white border rounded-lg p-4 text-sm">
              <div className="flex justify-between text-gray-400 text-xs mb-1">
                <span className="capitalize">{item.type}</span>
                <span>{format(new Date(item.occurred_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
              {item.metadata?.subject && <p className="font-medium">{item.metadata.subject}</p>}
              <p className="text-gray-600">{item.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
