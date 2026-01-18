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

  // Ensure hooks are called unconditionally
  // We use "internal" state to hold the data, but expose "derived" state consistent with the user presence.
  const [internalActivities, setInternalActivities] = useState<ActivityLog[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);

  // Derived state: If no user, we are effectively "not loading" and have "no activities".
  // This avoids setting state synchronously in useEffect to clear data on logout.
  const activities = user ? internalActivities : [];
  const loading = user ? internalLoading : false;

  useEffect(() => {
    if (!user) {
      return;
    }

    // Reset loading state for new user interaction?
    // Note: Setting this here might trigger the same lint if done synchronously.
    // However, usually we want to start loading.
    // Let's rely on the subscription to update state quickly.

    const logsRef = collection(db, 'users', user.uid, 'logs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityLog[];
      setInternalActivities(logs);
      setInternalLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { activities, loading };
};
