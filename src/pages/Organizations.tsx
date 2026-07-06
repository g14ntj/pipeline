import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Org = { id: string; name: string; sector?: string; website?: string; tags?: string[] };

export function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);

  useEffect(() => {
    api.organizations().then((res) => setOrgs(res.organizations));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[var(--brand)] mb-6">Organizations</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orgs.map((org) => (
          <div key={org.id} className="bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold">{org.name}</h3>
            {org.sector && <p className="text-xs text-gray-400 capitalize">{org.sector}</p>}
            {org.website && (
              <a href={org.website} target="_blank" rel="noreferrer" className="text-xs text-blue-600">
                {org.website}
              </a>
            )}
            {org.tags?.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {org.tags.map((t) => (
                  <span key={t} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded">{t}</span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
