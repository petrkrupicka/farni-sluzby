"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { ready, user, configured } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!configured || !user) router.replace("/prihlaseni");
  }, [ready, configured, user, router]);

  if (!ready) {
    return <p className="p-8 text-muted">Ověřuji přihlášení…</p>;
  }
  if (!configured || !user) {
    return <p className="p-8 text-muted">Přesměrování k přihlášení…</p>;
  }
  return <>{children}</>;
}
