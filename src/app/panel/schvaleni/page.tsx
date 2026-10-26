"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ROLE_LABEL } from "@/lib/labels";
import { isOnServiceTeam, useParish } from "@/lib/store";

export default function TeamPlacementPage() {
  const { state, currentUser, canAccessTeamSettings, dispatch } = useParish();
  const isMain = currentUser.role === "hlavni_spravce";

  if (!canAccessTeamSettings) {
    return (
      <p className="card p-5">
        Zařazení do týmů je jen pro hlavního správce a správce alespoň jednoho týmu.
      </p>
    );
  }

  const waiting = state.memberships.filter((m) => {
    const service = state.services.find((s) => s.id === m.serviceId);
    if (!service || service.assignmentMode !== "tymy") return false;
    if (m.status !== "schvaleno") return false;
    return !isOnServiceTeam(state, m.userId, m.serviceId);
  });

  const assignableTeams = (serviceId: string) =>
    isMain
      ? state.teams.filter((t) => t.serviceId === serviceId)
      : state.teams.filter((t) => t.serviceId === serviceId && t.managerId === currentUser.id);

  return (
    <div>
      <PageHeader
        title="Zařazení do týmů"
        subtitle="U týmových služeb (úklid, kavárna) musí správce týmu nebo hlavní správce dobrovolníka zařadit do čety."
      />
      <p className="card mb-4 p-4 text-sm text-muted">
        Nový tým založíte v{" "}
        <Link className="font-semibold text-forest underline" href="/panel/nastaveni/tymy">
          Nastavení týmů
        </Link>
        .
      </p>
      <div className="space-y-3">
        {waiting.length === 0 ? (
          <p className="card p-5 text-muted">Nikdo teď nečeká na zařazení do týmu.</p>
        ) : (
          waiting.map((m) => {
            const person = state.profiles.find((p) => p.id === m.userId);
            const service = state.services.find((s) => s.id === m.serviceId);
            const teams = assignableTeams(m.serviceId);
            return (
              <UnassignedCard
                key={m.id}
                name={person?.fullName ?? "Dobrovolník"}
                serviceName={service?.name ?? ""}
                userId={m.userId}
                teams={teams.map((t) => ({ id: t.id, name: t.name }))}
                canCreate={isMain}
                profiles={state.profiles
                  .filter((p) => p.role !== "hlavni_spravce")
                  .map((p) => ({ id: p.id, label: `${p.fullName} · ${ROLE_LABEL[p.role]}` }))}
                onAssign={(teamId) => {
                  const team = state.teams.find((t) => t.id === teamId);
                  if (!team) return;
                  dispatch({
                    type: "SET_TEAM_MEMBERS",
                    teamId,
                    memberIds: Array.from(new Set([...team.memberIds, m.userId])),
                  });
                }}
                onCreate={(name, managerId) =>
                  dispatch({
                    type: "ADD_TEAM",
                    serviceId: m.serviceId,
                    name,
                    managerId,
                    extraMemberIds: [m.userId],
                  })
                }
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function UnassignedCard({
  name,
  serviceName,
  userId,
  teams,
  canCreate,
  profiles,
  onAssign,
  onCreate,
}: {
  name: string;
  serviceName: string;
  userId: string;
  teams: { id: string; name: string }[];
  canCreate: boolean;
  profiles: { id: string; label: string }[];
  onAssign: (teamId: string) => void;
  onCreate: (name: string, managerId: string) => void;
}) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [newName, setNewName] = useState("");
  const [managerId, setManagerId] = useState(userId);

  return (
    <article className="card space-y-3 p-4">
      <div>
        <p className="font-semibold">{name}</p>
        <p className="text-sm text-muted">{serviceName} · čeká na zařazení do týmu</p>
      </div>
      {teams.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            className="w-full rounded-xl border border-line p-3"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" type="button" onClick={() => teamId && onAssign(teamId)}>
            Přiřadit do týmu
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted">Pro tuto službu zatím nemáte tým, do kterého by šlo člověka zařadit.</p>
      )}
      {canCreate ? (
        <form
          className="grid gap-2 rounded-2xl bg-[#f6f1e6] p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim() || !managerId) return;
            onCreate(newName.trim(), managerId);
            setNewName("");
          }}
        >
          <p className="text-sm font-semibold">Nebo založit nový tým</p>
          <input
            className="w-full rounded-xl border border-line bg-white p-3"
            placeholder="Název týmu"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <select
            className="w-full rounded-xl border border-line bg-white p-3"
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost" type="submit">
            Vytvořit tým a zařadit
          </button>
        </form>
      ) : null}
    </article>
  );
}
