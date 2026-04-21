import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Project } from '@solar3d/shared';
import { listProjects } from '../api/client';
import { formatKw } from '../lib/utils';

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-gray-500 py-4">Loading projects...</p>;
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-sm">No projects yet.</p>
        <p className="text-xs mt-1">
          Create one from the <Link to="/quote" className="text-blue-600 underline">Quote</Link> page.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {projects.map((p) => (
        <Link
          key={p.id}
          to={`/sales/${p.id}`}
          className="flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-md transition-colors"
        >
          <div>
            <p className="text-sm font-medium text-gray-800">{p.address}</p>
            <p className="text-xs text-gray-500">
              {new Date(p.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-700">
              {formatKw(p.panelLayout.totalCapacityKw)}
            </p>
            <p className="text-xs text-gray-500">
              {p.panelLayout.totalPanelCount} panels
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
