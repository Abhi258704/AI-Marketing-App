"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth-provider";
import { useApi } from "@/lib/use-api";
import { listBusinesses } from "@/lib/api/businesses";
import { getActiveBusinessId, setActiveBusinessId } from "@/lib/local-store";

const BusinessContext = createContext(null);

export function BusinessProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const { data, loading, error, reload } = useApi(() => listBusinesses(), [userId], {
    enabled: Boolean(userId),
  });

  const [preferredId, setPreferredId] = useState(null);

  // Load the remembered selection once we know who the user is.
  useEffect(() => {
    if (!userId) return;
    Promise.resolve().then(() => setPreferredId(getActiveBusinessId(userId)));
  }, [userId]);

  const businesses = data?.businesses;
  const list = useMemo(() => businesses || [], [businesses]);

  // Selected business must belong to the list returned by the API (ownership-aware).
  const activeBusiness = useMemo(
    () => list.find((b) => b._id === preferredId) || list[0] || null,
    [list, preferredId]
  );

  const selectBusiness = useCallback(
    (id) => {
      setPreferredId(id);
      if (userId) setActiveBusinessId(userId, id);
    },
    [userId]
  );

  const value = useMemo(
    () => ({
      businesses: list,
      activeBusiness,
      activeBusinessId: activeBusiness?._id || null,
      loading: loading || (Boolean(userId) && data === null && !error),
      error,
      selectBusiness,
      refreshBusinesses: reload,
    }),
    [list, activeBusiness, loading, userId, data, error, selectBusiness, reload]
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export const useBusiness = () => {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used inside BusinessProvider");
  return ctx;
};
