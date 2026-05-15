import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';
import path from 'path';
import { createRequire } from 'module';

// Resolve cesium's Build dir from the workspace root — `cesium` is hoisted to
// the root node_modules, but vite runs from `client/` so the plugin's default
// relative path ("node_modules/cesium/Build") misses and every /cesium/* asset
// (skybox textures, terrain bounds, widget css) gets the SPA HTML fallback,
// which Cesium fails to decode as an image → "InvalidStateError".
const require = createRequire(import.meta.url);
const cesiumPkgPath = require.resolve('cesium/package.json');
const cesiumBuildRoot = path.join(path.dirname(cesiumPkgPath), 'Build');

export default defineConfig({
  plugins: [
    react(),
    cesium({ cesiumBuildRootPath: cesiumBuildRoot }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
