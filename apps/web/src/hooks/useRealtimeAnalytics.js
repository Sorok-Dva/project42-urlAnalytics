import { useEffect } from 'react';
import socket from '../lib/socket';
export const useRealtimeAnalytics = (rooms, onEvent) => {
    useEffect(() => {
        if (!rooms.length)
            return;
        if (!socket.connected)
            socket.connect();
        socket.emit('join', rooms);
        const handler = (event) => onEvent(event);
        socket.on('analytics:event', handler);
        return () => {
            socket.off('analytics:event', handler);
        };
    }, [rooms.join('|')]);
};
