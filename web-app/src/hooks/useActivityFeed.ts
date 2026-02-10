import { ActivityLogSchema, ActivityMetadata } from '@smart-spotify-curator/shared';
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
  const [internalLoading, setInternalLoading] = useState(!IS_DEBUG_MODE);

  useEffect(() => {
    if (!user || IS_DEBUG_MODE) {
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
      const logs = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          const parseResult = ActivityLogSchema.safeParse({ id: doc.id, ...data });

          if (!parseResult.success) {
            console.error('Invalid activity log data:', parseResult.error);
            return null;
          }

          const validData = parseResult.data;
          // Map to internal ActivityLog format
          return {
            deleted: validData.deleted,
            id: doc.id,
            message: validData.metadata.step || 'Activity logged',
            metadata: validData.metadata,
            read: false, // Default to unread
            timestamp: validData.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
            type: (validData.metadata.state === 'error' ? 'error' : 'info') as ActivityLog['type']
          };
        })
        .filter(Boolean) as ActivityLog[];

      setInternalActivities(logs);
      setInternalLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const activities = IS_DEBUG_MODE
    ? (MOCK_ACTIVITIES.map((activity) => ({
        ...activity,
        read: false
      })) as ActivityLog[])
    : user
      ? internalActivities.filter((a) => !a.deleted)
      : [];

  const loading = IS_DEBUG_MODE ? false : user ? internalLoading : false;

  return { activities, loading };
};
