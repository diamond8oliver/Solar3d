import { motion } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * Edge-paneled 3D layout. The Cesium canvas owns the full background;
 * children float on top with subtle entry animations.
 */
export default function ThreeLayoutShell({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative w-full h-[calc(100vh-57px)] overflow-hidden bg-black"
    >
      {children}
    </motion.div>
  );
}
