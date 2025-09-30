import { useEffect, useRef } from 'react';
import socket from '../lib/socket';
export const useRealtimeAnalytics = (rooms, onEvent) => {
    const callbackRef = useRef(onEvent);
    useEffect(() => {
        callbackRef.current = onEvent;
    }, [onEvent]);
    useEffect(() => {
        if (!rooms.length)
            return;
        if (!socket.connected)
            socket.connect();
        socket.emit('join', rooms);
        const handler = (event) => callbackRef.current(event);
        socket.on('analytics:event', handler);
        return () => {
            socket.off('analytics:event', handler);
        };
    }, [rooms.join('|')]);
};
