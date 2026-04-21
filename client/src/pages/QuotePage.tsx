import { useParams } from 'react-router-dom';
import { useProject } from '../hooks/useProject';
import { useAnimation } from '../hooks/useAnimation';
import AddressForm from '../components/AddressForm';
import SolarViewer from '../components/three/SolarViewer';
import StatsPanel from '../components/StatsPanel';

export default function QuotePage() {
  const { id, token } = useParams<{ id?: string; token?: string }>();
  const { project, loading, error, create } = useProject(id, token);
  const { playing, toggle } = useAnimation();

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  // Show form if no project loaded yet
  if (!project) {
    return (
      <div className="max-w-lg mx-auto mt-16">
        <AddressForm onSubmit={create} loading={loading} />
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

      {/* Stats sidebar */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <StatsPanel project={project} />
      </div>
    </div>
  );
}
