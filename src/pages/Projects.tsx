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
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[var(--brand)] mb-6">Projects</h1>
      <table className="w-full bg-white rounded-xl shadow-sm border text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="p-3">Name</th>
            <th className="p-3">Status</th>
            <th className="p-3">Product</th>
            <th className="p-3">Organization</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} className="border-b hover:bg-gray-50">
              <td className="p-3 font-medium">{p.name}</td>
              <td className="p-3 capitalize">{p.status.replace('_', ' ')}</td>
              <td className="p-3 text-gray-500">{p.product_line || '—'}</td>
              <td className="p-3 text-gray-500">{p.organization_name || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
