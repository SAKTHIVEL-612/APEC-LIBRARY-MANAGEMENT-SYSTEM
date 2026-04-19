import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Notification } from '../types';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  socket: Socket | null;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  socket: null,
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!user) return;

    // Initialize Socket.io
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    // Join room based on user role or UID
    if (isAdmin) {
      newSocket.emit('join-room', 'admin');
    }
    newSocket.emit('join-room', user.uid);

    newSocket.on('notification', (data) => {
      console.log('New real-time notification:', data);
      // In a real app, we might want to update the local state or fetch from Firestore
    });

    // Firestore real-time listener for notifications
    const q = isAdmin 
      ? query(
          collection(db, 'notifications'),
          where('userUid', 'in', [user.uid, 'admin']),
          orderBy('createdAt', 'desc'),
          limit(20)
        )
      : query(
          collection(db, 'notifications'),
          where('userUid', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(20)
        );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.isRead).length);
    }, (error) => {
      console.error("Notifications onSnapshot error:", error);
    });

    return () => {
      newSocket.disconnect();
      unsubscribe();
    };
  }, [user, isAdmin]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, socket }}>
      {children}
    </NotificationContext.Provider>
  );
};
