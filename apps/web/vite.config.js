import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        open: false,
        allowedHosts: ['p-42.fr', 'url-p42.fr', 'url.p42.fr']
    }
});
