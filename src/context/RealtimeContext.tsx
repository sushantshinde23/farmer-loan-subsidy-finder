import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { realtimeService, RealtimeEvent, RealtimeEventType } from '../services/realtimeService';
import { useAuth } from './AuthContext';
import { Application } from '../types';

interface RealtimeContextType {
  isConnected: boolean;
  lastEvent: RealtimeEvent | null;
  lastUpdatedApplication: Application | null;
  latestStatusToast: {
    applicationId: string;
    schemeName?: string;
    newStatus: string;
    remarks?: string;
    officerName?: string;
    timestamp: string;
  } | null;
  dismissStatusToast: () => void;
  sendRealtimeMessage: (data: any) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(realtimeService.isConnected);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [lastUpdatedApplication, setLastUpdatedApplication] = useState<Application | null>(null);
  const [latestStatusToast, setLatestStatusToast] = useState<{
    applicationId: string;
    schemeName?: string;
    newStatus: string;
    remarks?: string;
    officerName?: string;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    // Sync current user id for targeted subscriptions
    realtimeService.setUserId(user?.id || 'USER-FARMER-1');
  }, [user?.id]);

  useEffect(() => {
    // Initiate connection
    realtimeService.connect();

    const unsubConnected = realtimeService.on('CONNECTED', () => {
      setIsConnected(true);
    });

    const unsubAppUpdated = realtimeService.on('APPLICATION_STATUS_UPDATED', (event) => {
      setLastEvent(event);
      const app = event.payload?.application as Application | undefined;
      if (app) {
        setLastUpdatedApplication(app);
      }

      // Show toast if relevant to user or all
      const payload = event.payload;
      if (payload) {
        setLatestStatusToast({
          applicationId: payload.applicationId || app?.id || '',
          schemeName: app?.schemeName,
          newStatus: payload.status || app?.status || '',
          remarks: payload.remarks || app?.officerRemarks,
          officerName: payload.officer?.fullName,
          timestamp: payload.updatedAt || new Date().toISOString()
        });
      }
    });

    const unsubAppCreated = realtimeService.on('APPLICATION_CREATED', (event) => {
      setLastEvent(event);
    });

    const unsubNotifCreated = realtimeService.on('NOTIFICATION_CREATED', (event) => {
      setLastEvent(event);
    });

    // Check connection polling
    const interval = setInterval(() => {
      setIsConnected(realtimeService.isConnected);
    }, 2000);

    return () => {
      unsubConnected();
      unsubAppUpdated();
      unsubAppCreated();
      unsubNotifCreated();
      clearInterval(interval);
      realtimeService.disconnect();
    };
  }, []);

  const dismissStatusToast = useCallback(() => {
    setLatestStatusToast(null);
  }, []);

  const sendRealtimeMessage = useCallback((data: any) => {
    realtimeService.send(data);
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        lastEvent,
        lastUpdatedApplication,
        latestStatusToast,
        dismissStatusToast,
        sendRealtimeMessage
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
