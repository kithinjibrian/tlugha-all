import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/main.ts'],
    outDir: 'dist',
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'esnext',
});
