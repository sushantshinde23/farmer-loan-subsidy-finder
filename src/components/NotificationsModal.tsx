import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  FolderOpen,
  Check,
  Clock,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { NotificationItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { realtimeService } from '../services/realtimeService';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const { user, refreshAuth } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifs();
    }
  }, [isOpen]);

  // Real-time synchronization when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const unsubNotif = realtimeService.on('NOTIFICATION_CREATED', (ev) => {
      const newNotif = ev.payload?.notification as NotificationItem | undefined;
      const targetUserId = ev.payload?.userId || newNotif?.userId;
      const currentId = user?.id || 'USER-FARMER-1';

      if (newNotif && (!targetUserId || targetUserId === currentId)) {
        setNotifications((prev) => {
          if (prev.some((n) => n.id === newNotif.id)) return prev;
          return [newNotif, ...prev];
        });
      }
    });

    const unsubStatus = realtimeService.on('APPLICATION_STATUS_UPDATED', () => {
      fetchNotifs();
    });

    const unsubUpdated = realtimeService.on('NOTIFICATION_UPDATED', () => {
      fetchNotifs();
    });

    return () => {
      unsubNotif();
      unsubStatus();
      unsubUpdated();
    };
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      await refreshAuth();
    } catch (err) {
      console.error('Mark read failed:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      await refreshAuth();
    } catch (err) {
      console.error('Mark all read failed:', err);
    }
  };

  const handleItemClick = (n: NotificationItem) => {
    handleMarkRead(n.id);
    onClose();
    if (n.relatedEntity === 'APPLICATION') {
      onNavigate('applications');
    } else if (n.relatedEntity === 'DOCUMENT') {
      onNavigate('vault');
    } else {
      onNavigate('schemes');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Notifications & Scheme Alerts
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleItemClick(n)}
              className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                n.read
                  ? 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 opacity-80'
                  : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
              }`}
            >
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5">
                {n.relatedEntity === 'APPLICATION' ? (
                  <FileCheck2 className="w-4 h-4" />
                ) : n.relatedEntity === 'DOCUMENT' ? (
                  <FolderOpen className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {n.title}
                  </h4>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                  {n.message}
                </p>
                <div className="text-[10px] text-slate-400 mt-1">
                  {new Date(n.timestamp || n.createdAt || Date.now()).toLocaleDateString()} at {new Date(n.timestamp || n.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {notifications.length === 0 && !loading && (
            <div className="p-8 text-center text-xs text-slate-400">
              No notifications yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
