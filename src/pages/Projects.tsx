import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Project = {
  id: string;
  name: string;
  status: string;
  product_line?: string;
  organization_name?: string;
};

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    api.projects().then((res) => setProjects(res.projects));
  }, []);

  return (
    <div className="page-shell">
      <h1 className="page-title mb-6">Projects</h1>
      <div className="data-table overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Product</th>
              <th>Organization</th>
            </tr>
          </thead>
          <tbody>
              {projects.map((p) => (
              <tr key={p.id}>
                <td className="font-medium text-paper">{p.name}</td>
                <td>
                  <span className={p.status === 'production' ? 'chip' : 'capitalize text-muted'}>
                    {p.status}
                  </span>
                </td>
                <td className="text-muted">{p.product_line || '—'}</td>
                <td className="text-muted">{p.organization_name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
