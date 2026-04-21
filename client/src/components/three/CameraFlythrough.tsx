import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

interface Props {
  playing: boolean;
  radius?: number;
  height?: number;
  speed?: number;
}

/**
 * When playing, smoothly orbits the camera around the building center.
 * This is a stub for future video export — the camera path can be
 * captured frame-by-frame to produce an MP4 flythrough.
 */
export default function CameraFlythrough({
  playing,
  radius = 25,
  height = 15,
  speed = 0.2,
}: Props) {
  const elapsed = useRef(0);

  useFrame((state, delta) => {
    if (!playing) return;
    elapsed.current += delta * speed;
    const t = elapsed.current;
    state.camera.position.set(
      Math.cos(t) * radius,
      height,
      Math.sin(t) * radius
    );
    state.camera.lookAt(0, 3, 0);
  });

  return null;
}
