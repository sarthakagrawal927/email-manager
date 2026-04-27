"use client";

import { useState, useEffect } from "react";
import { getSession, type Session } from "./auth-client";

export function useSession() {
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getSession().then((s) => {
      if (mounted) {
        setSession(s);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { session, loading };
}
