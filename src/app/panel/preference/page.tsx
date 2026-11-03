"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PreferencesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/panel/sluzby");
  }, [router]);

  return <p className="card p-5 text-muted">Preference jsou teď u každé služby. Přesměrování…</p>;
}
