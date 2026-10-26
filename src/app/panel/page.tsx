"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AssignmentCard } from "@/components/assignment-card";
import { PageHeader } from "@/components/page-header";
import { ROLE_LABEL } from "@/lib/labels";
import { useParish } from "@/lib/store";

export default function DashboardPage() {
  const { state, currentUser, isMine, canAccessTeamSettings } = useParish();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  const mine = state.assignments
    .filter((a) => isMine(a) && (now === null || new Date(a.startsAt).getTime() >= now))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 4);
  const pendingSwaps = state.swaps.filter(
    (s) => s.status === "ceka" && s.targetId === currentUser.id,
  ).length;
  const openSubs = state.listings.filter((l) => !l.claimedBy).length;
  const waiting = state.memberships.filter((m) => {
    const service = state.services.find((s) => s.id === m.serviceId);
    return (
      m.status === "schvaleno" &&
      service?.assignmentMode === "tymy" &&
      !state.teams.some((t) => t.serviceId === m.serviceId && t.memberIds.includes(m.userId))
    );
  }).length;

  return (
    <div>
      <PageHeader
        title={`Pokoj s vámi, ${currentUser.fullName.split(" ")[0]}`}
        subtitle={ROLE_LABEL[currentUser.role]}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/panel/vymeny" className="card p-4">
          <p className="text-sm text-muted">Čekající výměny</p>
          <p className="font-serif text-3xl text-amber">{pendingSwaps}</p>
        </Link>
        <Link href="/panel/burza" className="card p-4">
          <p className="text-sm text-muted">Volné záskoky</p>
          <p className="font-serif text-3xl text-sky">{openSubs}</p>
        </Link>
        {canAccessTeamSettings ? (
          <Link href="/panel/schvaleni" className="card p-4">
            <p className="text-sm text-muted">Čeká na zařazení do týmu</p>
            <p className="font-serif text-3xl text-forest">{waiting}</p>
          </Link>
        ) : (
          <Link href="/panel/sluzby" className="card p-4">
            <p className="text-sm text-muted">Farní služby</p>
            <p className="font-serif text-3xl text-forest">{state.services.length}</p>
          </Link>
        )}
      </div>
      <h2 className="mt-8 font-serif text-2xl">Moje nejbližší služby</h2>
      <div className="mt-3 grid gap-3">
        {mine.length === 0 ? (
          <p className="card p-5 text-muted">Zatím nemáte žádný nadcházející termín.</p>
        ) : (
          mine.map((a) => <AssignmentCard key={a.id} assignment={a} />)
        )}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/panel/kalendar" className="btn btn-primary">
          Otevřít kalendář
        </Link>
        <Link href="/panel/sluzby" className="btn btn-ghost">
          Registrovat se ke službě
        </Link>
      </div>
    </div>
  );
}
