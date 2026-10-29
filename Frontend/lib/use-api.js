"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Declarative data fetching with loading / error / reload.
 *
 * `deps` must be an array of primitives (they are serialised into the request key).
 * Loading is derived (`result.key !== key`), so no state is set synchronously in effects
 * and stale responses for an old key are ignored.
 */
export function useApi(fetcher, deps = [], { enabled = true } = {}) {
  const [result, setResult] = useState({ key: null, data: null, error: null });
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const key = `${JSON.stringify(deps)}#${nonce}`;

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    Promise.resolve()
      .then(() => fetcherRef.current())
      .then((data) => {
        if (!cancelled) setResult({ key, data, error: null });
      })
      .catch((error) => {
        if (!cancelled) setResult({ key, data: null, error });
      });
    return () => {
      cancelled = true;
    };
  }, [key, enabled]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const mutate = useCallback(
    (updater) => setResult((r) => ({ ...r, data: updater(r.data) })),
    []
  );

  const settled = result.key === key;
  return {
    data: result.data,
    error: settled ? result.error : null,
    loading: enabled && !settled,
    reload,
    mutate,
  };
}
