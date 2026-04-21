import { useMemo } from 'react';
import { DoubleSide, Euler } from 'three';
import type { RoofPlane } from '@solar3d/shared';

interface Props {
  plane: RoofPlane;
}

/**
 * Renders a single roof plane as a tilted rectangle.
 * Pitch tilts the plane away from horizontal; azimuth rotates it to face
 * the correct compass direction (180 = south, 270 = west, etc.).
 */
export default function RoofMesh({ plane }: Props) {
  const rotation = useMemo(() => {
    const pitchRad = (plane.pitchDegrees * Math.PI) / 180;
    const azRad = (plane.azimuthDegrees * Math.PI) / 180;
    // Start flat (facing up), tilt by pitch around X, then rotate around Y for azimuth
    return new Euler(pitchRad, -azRad, 0, 'YXZ');
  }, [plane.pitchDegrees, plane.azimuthDegrees]);

  return (
    <mesh
      position={[plane.centerX, plane.centerY, plane.centerZ]}
      rotation={rotation}
    >
      <planeGeometry args={[plane.widthMeters, plane.heightMeters]} />
      <meshStandardMaterial color="#78716c" side={DoubleSide} />
    </mesh>
  );
}
