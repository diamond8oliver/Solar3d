import { useState, useCallback } from 'react';

export function useAnimation() {
  const [playing, setPlaying] = useState(false);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => setPlaying((p) => !p), []);

  return { playing, play, pause, toggle };
}
