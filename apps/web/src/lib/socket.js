import { io } from 'socket.io-client';
const socket = io(import.meta.env.VITE_API_URL ?? 'http://localhost:4000', {
    transports: ['websocket'],
    autoConnect: false
});
export default socket;
