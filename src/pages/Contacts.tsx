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

  if (loading) return <div className="p-8 text-gray-500">Loading contacts…</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[var(--brand)] mb-6">Contacts</h1>
      <table className="w-full bg-white rounded-xl shadow-sm border text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="p-3">Name</th>
            <th className="p-3">Email</th>
            <th className="p-3">Organization</th>
            <th className="p-3">Role</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((c) => (
            <tr key={c.id} className="border-b hover:bg-gray-50">
              <td className="p-3">
                <Link href={`/contacts/${c.id}`} className="font-medium text-[var(--brand-light)] hover:underline">
                  {c.first_name} {c.last_name}
                </Link>
              </td>
              <td className="p-3 text-gray-500">{c.email || '—'}</td>
              <td className="p-3 text-gray-500">{c.organization_name || '—'}</td>
              <td className="p-3 text-gray-500">{c.role || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
