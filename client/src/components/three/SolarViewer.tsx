import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Project } from '@solar3d/shared';
import RoofMesh from './RoofMesh';
import PanelArray from './PanelArray';
import CameraFlythrough from './CameraFlythrough';

interface Props {
  project: Project;
  flythrough?: boolean;
}

/**
 * Top-level 3D scene: renders the roof planes, solar panels,
 * ground plane, lighting, and camera controls.
 */
export default function SolarViewer({ project, flythrough = false }: Props) {
  return (
    <Canvas
      camera={{ position: [20, 15, 20], fov: 50 }}
      className="rounded-lg"
      style={{ background: '#e0ecf8' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1.0} castShadow />

      {/* Roof segments */}
      {project.roofPlanes.map((plane) => (
        <RoofMesh key={plane.segmentIndex} plane={plane} />
      ))}

      {/* Solar panels */}
      <PanelArray layout={project.panelLayout} />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#d6d3d1" />
      </mesh>

      <OrbitControls
        target={[0, 3, 0]}
        minDistance={5}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2.1}
        enabled={!flythrough}
      />

      <CameraFlythrough playing={flythrough} />
    </Canvas>
  );
}
