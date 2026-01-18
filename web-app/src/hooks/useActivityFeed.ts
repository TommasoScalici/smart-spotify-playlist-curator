import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

export interface ActivityLog {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
  timestamp: string; // ISO string
  read: boolean;
  metadata?: Record<string, unknown>;
}

export const useActivityFeed = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActivities([]);
      setLoading(false);
      return;
    }

    const logsRef = collection(db, 'users', user.uid, 'logs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityLog[];
      setActivities(logs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { activities, loading };
};
