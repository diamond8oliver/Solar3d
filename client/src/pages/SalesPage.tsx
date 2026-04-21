import { useParams } from 'react-router-dom';
import { useProject } from '../hooks/useProject';
import { useAnimation } from '../hooks/useAnimation';
import ProjectList from '../components/ProjectList';
import SolarViewer from '../components/three/SolarViewer';
import StatsPanel from '../components/StatsPanel';
import ShareLinkButton from '../components/ShareLinkButton';

export default function SalesPage() {
  const { id } = useParams<{ id?: string }>();
  const { project, loading, error } = useProject(id);
  const { playing, toggle } = useAnimation();

  // List view when no project selected
  if (!id) {
    return (
      <div className="max-w-2xl mx-auto mt-8 px-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Projects</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <ProjectList />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-gray-500">Loading project...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <p className="text-red-600 text-sm">{error || 'Project not found'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 h-[calc(100vh-57px)]">
      {/* 3D viewer */}
      <div className="flex-1 min-h-[400px] relative">
        <SolarViewer project={project} flythrough={playing} />
        <button
          onClick={toggle}
          className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-sm font-medium text-gray-700 px-3 py-1.5 rounded-md shadow transition-colors"
        >
          {playing ? 'Stop Tour' : 'Flythrough'}
        </button>
      </div>

      {/* Side panel */}
      <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
        <StatsPanel project={project} />
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Sales Tools</h4>
          <ShareLinkButton projectId={project.id} />
        </div>
      </div>
    </div>
  );
}
