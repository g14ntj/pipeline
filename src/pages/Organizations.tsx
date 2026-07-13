import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Org = { id: string; name: string; sector?: string; website?: string; tags?: string[] };

export function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);

  useEffect(() => {
    api.organizations().then((res) => setOrgs(res.organizations));
  }, []);

  return (
    <div className="page-shell">
      <h1 className="page-title mb-6">Organizations</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {orgs.map((org) => (
          <div key={org.id} className="glass-card glass-card-hover p-5">
            <h3 className="font-display text-lg font-semibold text-paper">{org.name}</h3>
            {org.sector && <p className="text-xs capitalize text-muted">{org.sector}</p>}
            {org.website && (
              <a href={org.website} target="_blank" rel="noreferrer" className="link-accent mt-2 inline-block text-xs">
                {org.website}
              </a>
            )}
            {org.tags?.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {org.tags.map((t) => (
                  <span key={t} className="chip">
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
