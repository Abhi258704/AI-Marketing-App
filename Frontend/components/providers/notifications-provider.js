"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth-provider";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";

const NotificationsContext = createContext(null);

// There is no push channel in the backend, so we poll lightly while the tab is visible.
const POLL_MS = 60_000;

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState({ notifications: [], unreadCount: 0, loaded: false, error: null });
  const [limit, setLimit] = useState(30);

  const refresh = useCallback(async () => {
    try {
      const data = await listNotifications(limit);
      setState({
        notifications: data.notifications || [],
        unreadCount: data.unreadCount ?? 0,
        loaded: true,
        error: null,
      });
    } catch (error) {
      setState((s) => ({ ...s, loaded: true, error }));
    }
  }, [limit]);

  useEffect(() => {
    if (!userId) return undefined;
    Promise.resolve().then(refresh);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId, refresh]);

  const markRead = useCallback(async (id) => {
    await markNotificationRead(id);
    setState((s) => {
      const target = s.notifications.find((n) => n._id === id);
      const wasUnread = target && !target.isRead;
      return {
        ...s,
        notifications: s.notifications.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
        unreadCount: wasUnread ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
      };
    });
  }, []);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  }, []);

  const value = useMemo(
    () => ({ ...state, limit, setLimit, refresh, markRead, markAllRead }),
    [state, limit, refresh, markRead, markAllRead]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
};
