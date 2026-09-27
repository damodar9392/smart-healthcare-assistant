import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getToken } from '../utils/token';

const URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const useLiveNotifications = (enabled = true) => {
  const [toasts, setToasts] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const token = getToken();
    if (!token) return undefined;

    const socket = io(URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('notification:new', (payload) => {
      const item = payload?.data;
      if (!item) return;
      setToasts((prev) => [
        ...prev.slice(-3),
        { id: `${Date.now()}-${Math.random()}`, title: item.title, message: item.message },
      ]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);

  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return { toasts, dismiss, socket: socketRef.current };
};

export default useLiveNotifications;