import { Suspense } from "react";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/app-shell";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-8 text-muted">Načítání panelu…</div>}>
      <AuthGate>
        <AppShell>{children}</AppShell>
      </AuthGate>
    </Suspense>
  );
}
