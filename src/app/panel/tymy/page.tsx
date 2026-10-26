"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParish } from "@/lib/store";

export default function TeamsRedirectPage() {
  const router = useRouter();
  const { canAccessTeamSettings } = useParish();

  useEffect(() => {
    router.replace(canAccessTeamSettings ? "/panel/nastaveni/tymy" : "/panel");
  }, [canAccessTeamSettings, router]);

  return <p className="card p-5 text-muted">Přesměrování…</p>;
}
