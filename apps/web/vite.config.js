import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        open: false,
        host: true,
        allowedHosts: ['p-42.fr', 'url.p-42.fr', 'url-p-42.fr']
    }
});
