import { ActivityMetadata } from '@smart-spotify-curator/shared';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { MOCK_ACTIVITIES } from '../mocks/activity-mock-data';
import { db } from '../services/firebase';

const IS_DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === 'true' && import.meta.env.MODE !== 'test';

export interface ActivityLog {
  deleted?: boolean;
  id: string;
  message: string;
  metadata?: ActivityMetadata;
  read: boolean;
  timestamp: string; // ISO string
  type: 'error' | 'info' | 'success' | 'warning';
}

/**
 * Hook to fetch and stream real-time activity logs for the current user from Firestore.
 * Handles conditional subscription based on user authentication status.
 * @returns Object containing activities array and loading state
 */
export const useActivityFeed = () => {
  const { user } = useAuth();

  const [internalActivities, setInternalActivities] = useState<ActivityLog[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);

  const activities = user ? internalActivities.filter((a) => !a.deleted) : [];
  const loading = user ? internalLoading : false;

  useEffect(() => {
    if (!user) {
      return;
    }

    const logsRef = collection(db, 'users', user.uid, 'logs');
    const q = query(
      logsRef,
      where('deleted', '==', false),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

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

  // Debug Mode: Return mock activities after all hooks
  if (IS_DEBUG_MODE) {
    return {
      activities: MOCK_ACTIVITIES.map((activity) => ({
        ...activity,
        read: false
      })) as ActivityLog[],
      loading: false
    };
  }

  return { activities, loading };
};
