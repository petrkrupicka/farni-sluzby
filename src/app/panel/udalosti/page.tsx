"use client";

import { useState } from "react";
import { AssignmentCard } from "@/components/assignment-card";
import { PageHeader } from "@/components/page-header";
import { toIso } from "@/lib/dates";
import { useParish } from "@/lib/store";

export default function EventsPage() {
  const { state, currentUser, canManageService, dispatch } = useParish();
  const services = state.services.filter(
    (s) => currentUser.role === "hlavni_spravce" || canManageService(s.id),
  );
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [title, setTitle] = useState("Vánoční bohoslužba");
  const [starts, setStarts] = useState("2026-12-24T16:00");
  const [ends, setEnds] = useState("2026-12-24T18:00");
  const [assignee, setAssignee] = useState("");
  const service = state.services.find((s) => s.id === serviceId);
  const options =
    service?.assignmentMode === "tymy"
      ? state.teams.filter((t) => t.serviceId === serviceId).map((t) => ({ id: t.id, label: t.name, kind: "team" as const }))
      : state.memberships
          .filter((m) => m.serviceId === serviceId && m.status === "schvaleno")
          .map((m) => ({
            id: m.userId,
            label: state.profiles.find((p) => p.id === m.userId)?.fullName ?? "",
            kind: "person" as const,
          }));

  if (currentUser.role !== "hlavni_spravce" && currentUser.role !== "spravce_sluzby") {
    return <p className="card p-5">Jednorázové události smí vkládat jen správci.</p>;
  }

  return (
    <div>
      <PageHeader
        title="Plánování událostí"
        subtitle="Mimořádné termíny mimo běžný rozvrh, například vánoční nebo velikonoční bohoslužba."
      />
      <form
        className="card space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const option = options.find((o) => o.id === assignee);
          dispatch({
            type: "ADD_EVENT",
            assignment: {
              id: crypto.randomUUID(),
              serviceId,
              title,
              startsAt: toIso(new Date(starts)),
              endsAt: toIso(new Date(ends)),
              kind: "mimoradna",
              volunteerId: option?.kind === "person" ? option.id : undefined,
              teamId: option?.kind === "team" ? option.id : undefined,
              status: "prirazeno",
            },
          });
        }}
      >
        <label className="block text-sm font-semibold">
          Název
          <input className="mt-1 w-full rounded-xl border border-line p-3" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block text-sm font-semibold">
          Služba
          <select className="mt-1 w-full rounded-xl border border-line p-3" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Začátek
            <input type="datetime-local" className="mt-1 w-full rounded-xl border border-line p-3" value={starts} onChange={(e) => setStarts(e.target.value)} />
          </label>
          <label className="text-sm font-semibold">
            Konec
            <input type="datetime-local" className="mt-1 w-full rounded-xl border border-line p-3" value={ends} onChange={(e) => setEnds(e.target.value)} />
          </label>
        </div>
        <label className="block text-sm font-semibold">
          Přiřazení
          <select className="mt-1 w-full rounded-xl border border-line p-3" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Vyberte</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </label>
        <button className="btn btn-primary" type="submit">Vložit událost</button>
      </form>

      <h2 className="mt-8 font-serif text-2xl">Plán služeb</h2>
      <p className="mb-3 text-sm text-muted">
        Hlavní správce a správce služby mohou kohokoliv okamžitě přepsat, smazat nebo uvolnit.
      </p>
      <div className="space-y-3">
        {state.assignments
          .filter((a) => canManageService(a.serviceId))
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
          .map((a) => {
            const svc = state.services.find((s) => s.id === a.serviceId);
            const choices =
              svc?.assignmentMode === "tymy"
                ? state.teams.filter((t) => t.serviceId === a.serviceId)
                : state.memberships
                    .filter((m) => m.serviceId === a.serviceId && m.status === "schvaleno")
                    .map((m) => state.profiles.find((p) => p.id === m.userId))
                    .filter(Boolean);
            return (
              <AssignmentCard
                key={a.id}
                assignment={a}
                actions={
                  <>
                    <select
                      className="btn btn-ghost"
                      value={a.teamId ?? a.volunteerId ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (!value) return;
                        if (svc?.assignmentMode === "tymy") {
                          dispatch({ type: "MANAGER_PATCH", assignmentId: a.id, teamId: value });
                        } else {
                          dispatch({ type: "MANAGER_PATCH", assignmentId: a.id, volunteerId: value });
                        }
                      }}
                    >
                      <option value="" disabled>
                        Změnit přiřazení
                      </option>
                      {svc?.assignmentMode === "tymy"
                        ? state.teams
                            .filter((t) => t.serviceId === a.serviceId)
                            .map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))
                        : choices.map((p) =>
                            p && "fullName" in p ? (
                              <option key={p.id} value={p.id}>{p.fullName}</option>
                            ) : null,
                          )}
                    </select>
                    <button className="btn btn-ghost" onClick={() => dispatch({ type: "MANAGER_PATCH", assignmentId: a.id, clear: true })}>
                      Uvolnit
                    </button>
                    <button className="btn btn-danger" onClick={() => dispatch({ type: "DELETE_ASSIGNMENT", assignmentId: a.id })}>
                      Smazat
                    </button>
                  </>
                }
              />
            );
          })}
      </div>
    </div>
  );
}
