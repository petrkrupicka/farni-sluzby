"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParish } from "@/lib/store";

export default function SettingsIndexPage() {
  const router = useRouter();
  const { canAccessServiceSettings, canAccessTeamSettings } = useParish();

  useEffect(() => {
    if (canAccessServiceSettings) {
      router.replace("/panel/nastaveni/sluzby");
      return;
    }
    if (canAccessTeamSettings) {
      router.replace("/panel/nastaveni/tymy");
      return;
    }
    router.replace("/panel");
  }, [canAccessServiceSettings, canAccessTeamSettings, router]);

  return <p className="card p-5 text-muted">Přesměrování do nastavení…</p>;
}
