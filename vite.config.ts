import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
    return {
      define: {
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      },
      assetsInclude: ['**/*.py']
    };
});
