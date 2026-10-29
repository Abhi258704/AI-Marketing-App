"use client";

import { useMemo } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { getPublicationRecord } from "@/lib/local-store";

/** Reads the local publish-result records (see lib/local-store.js) for a set of posts. */
export function usePublicationRecords(posts, version = 0) {
  const { user } = useAuth();
  return useMemo(() => {
    const map = {};
    if (!user?.id) return map;
    for (const p of posts || []) map[p._id] = getPublicationRecord(user.id, p._id);
    return map;
    // `version` lets callers force a re-read after a publish.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, user?.id, version]);
}
