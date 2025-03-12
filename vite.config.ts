import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'fs';

// Determine which entry point to build based on environment variable
const entryPoint = process.env.ENTRY_POINT || 'code';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ...(entryPoint === 'ui' ? [viteSingleFile()] : []),
    // Custom plugin to copy and rename the UI HTML file
    {
      name: 'copy-html-to-root',
      writeBundle: {
        sequential: true,
        order: 'post',
        handler: async () => {
          if (entryPoint === 'ui') {
            try {
              // Check if the generated HTML exists
              const sourceFile = resolve(__dirname, 'dist/src/ui/index.html');
              const targetFile = resolve(__dirname, 'dist/ui.html');
              
              if (fs.existsSync(sourceFile)) {
                // Copy the file to the root
                fs.copyFileSync(sourceFile, targetFile);
                // Remove the original
                fs.unlinkSync(sourceFile);
                // Remove the empty directory if it exists
                const uiDir = resolve(__dirname, 'dist/src/ui');
                if (fs.existsSync(uiDir)) {
                  fs.rmdirSync(uiDir);
                }
                const srcDir = resolve(__dirname, 'dist/src');
                if (fs.existsSync(srcDir)) {
                  fs.rmdirSync(srcDir);
                }
                console.log('✅ Copied HTML file to dist/ui.html');
              }
            } catch (error) {
              console.error('Error copying HTML file:', error);
            }
          }
        }
      }
    }
  ],
  build: {
    target: 'es2017',
    sourcemap: 'inline',
    outDir: 'dist',
    minify: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    rollupOptions: {
      input: entryPoint === 'ui' 
        ? resolve(__dirname, 'src/ui/index.html')
        : resolve(__dirname, 'src/code.ts'),
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
    // Only empty out directory on code build to avoid removing the other build
    emptyOutDir: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
}); 