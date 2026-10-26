"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ROLE_LABEL } from "@/lib/labels";
import { isOnServiceTeam, useParish } from "@/lib/store";

export default function TeamSettingsPage() {
  const { state, currentUser, canAccessTeamSettings, dispatch } = useParish();
  const isMain = currentUser.role === "hlavni_spravce";
  const teams = isMain
    ? state.teams
    : state.teams.filter((t) => t.managerId === currentUser.id);
  const [name, setName] = useState("");
  const [serviceId, setServiceId] = useState(
    state.services.find((s) => s.assignmentMode === "tymy")?.id ?? "",
  );
  const [managerId, setManagerId] = useState("");

  if (!canAccessTeamSettings) {
    return (
      <p className="card p-5">
        Nastavení týmů je jen pro hlavního správce a správce alespoň jednoho týmu.
      </p>
    );
  }

  return (
    <div>
      <PageHeader
        title="Týmy"
        subtitle="Správce týmu mění členy své čety a při výměnách i záskocích jedná za celý tým."
      />
      {isMain ? (
        <p className="mb-4 text-sm text-muted">Vidíte všechny týmy farnosti.</p>
      ) : (
        <p className="mb-4 text-sm text-muted">Vidíte jen týmy, které spravujete.</p>
      )}

      {isMain ? (
        <form
          className="card mb-4 space-y-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || !serviceId || !managerId) return;
            dispatch({ type: "ADD_TEAM", serviceId, name: name.trim(), managerId });
            setName("");
          }}
        >
          <h2 className="font-serif text-xl">Nový tým</h2>
          <input
            className="w-full rounded-xl border border-line p-3"
            placeholder="např. Úklidová četa C"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="w-full rounded-xl border border-line p-3"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            {state.services
              .filter((s) => s.assignmentMode === "tymy")
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
          <select
            className="w-full rounded-xl border border-line p-3"
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
          >
            <option value="">Správce týmu</option>
            {state.profiles
              .filter((p) => p.role !== "hlavni_spravce")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} · {ROLE_LABEL[p.role]}
                </option>
              ))}
          </select>
          <button className="btn btn-primary" type="submit">
            Založit tým
          </button>
        </form>
      ) : null}

      <div className="space-y-3">
        {teams.length === 0 ? (
          <p className="card p-5 text-muted">Nemáte přiřazený žádný tým.</p>
        ) : (
          teams.map((team) => {
            const service = state.services.find((s) => s.id === team.serviceId);
            const manager = state.profiles.find((p) => p.id === team.managerId);
            const candidates = state.memberships
              .filter((m) => m.serviceId === team.serviceId && m.status === "schvaleno")
              .map((m) => state.profiles.find((p) => p.id === m.userId))
              .filter(Boolean);
            return (
              <article key={team.id} className="card p-5">
                <h2 className="font-serif text-2xl">{team.name}</h2>
                <p className="text-sm text-muted">
                  {service?.name} · správce týmu: {manager?.fullName}
                </p>
                {isMain ? (
                  <label className="mt-3 block text-sm font-semibold">
                    Správce týmu
                    <select
                      className="mt-1 w-full rounded-xl border border-line p-3"
                      value={team.managerId}
                      onChange={(e) =>
                        dispatch({
                          type: "SET_TEAM_MANAGER",
                          teamId: team.id,
                          userId: e.target.value,
                        })
                      }
                    >
                      {state.profiles
                        .filter((p) => p.role !== "hlavni_spravce")
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.fullName} · {ROLE_LABEL[p.role]}
                          </option>
                        ))}
                    </select>
                  </label>
                ) : null}
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-semibold">Členové týmu</p>
                  {candidates.map((person) => {
                    if (!person) return null;
                    const checked = team.memberIds.includes(person.id);
                    return (
                      <label key={person.id} className="flex min-h-12 items-center gap-3">
                        <input
                          type="checkbox"
                          className="h-5 w-5 accent-[color:var(--forest)]"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...team.memberIds, person.id]
                              : team.memberIds.filter((id) => id !== person.id);
                            dispatch({ type: "SET_TEAM_MEMBERS", teamId: team.id, memberIds: next });
                          }}
                        />
                        {person.fullName}
                        {!isOnServiceTeam(state, person.id, team.serviceId) ? (
                          <span className="badge badge-swap">Čeká na zařazení</span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
