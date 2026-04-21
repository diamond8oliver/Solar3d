import { useMemo } from 'react';
import { Euler } from 'three';
import type { PanelPosition } from '@solar3d/shared';

interface Props {
  panel: PanelPosition;
  width: number;
  height: number;
}

/** A single solar panel rendered as a thin box sitting on the roof surface. */
export default function PanelMesh({ panel, width, height }: Props) {
  const rotation = useMemo(
    () => new Euler(panel.tiltX, panel.rotationZ, 0, 'YXZ'),
    [panel.tiltX, panel.rotationZ]
  );

  return (
    <mesh position={[panel.centerX, panel.centerY, panel.centerZ]} rotation={rotation}>
      <boxGeometry args={[width, height, 0.04]} />
      <meshStandardMaterial color="#1e3a5f" metalness={0.7} roughness={0.3} />
    </mesh>
  );
}
