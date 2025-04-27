import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/main.ts'),
            name: '@kithinji/tlugha-browser',
            formats: ['es', 'cjs'],
            fileName: (format) => `main.${format}.js`,
        },
        rollupOptions: {
            external: [],
        },
    }
});
