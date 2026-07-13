import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { api } from '@/lib/api';

type Contact = {
  id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  organization_name?: string;
  role?: string;
};

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.contacts().then((res) => {
      setContacts(res.contacts);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="page-shell text-muted">Loading contacts…</div>;

  return (
    <div className="page-shell">
      <h1 className="page-title mb-6">Contacts</h1>
      <div className="data-table overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Organization</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/contacts/${c.id}`} className="link-accent font-medium">
                    {c.first_name} {c.last_name}
                  </Link>
                </td>
                <td className="text-muted">{c.email || '—'}</td>
                <td className="text-muted">{c.organization_name || '—'}</td>
                <td className="text-muted">{c.role || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
