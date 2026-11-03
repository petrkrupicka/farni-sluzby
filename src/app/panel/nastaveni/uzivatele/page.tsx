"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ROLE_LABEL } from "@/lib/labels";
import { addRole, ASSIGNABLE_ROLES, hasRole, isMainAdmin, removeRole } from "@/lib/roles";
import { sendTemplate } from "@/lib/mail";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { servicesManagedBy, teamsManagedBy, useParish } from "@/lib/store";
import type { AppRole, ParishState, Profile } from "@/lib/types";

type RemovalBlock = {
  role: AppRole;
  names: string[];
  href: string;
  linkLabel: string;
};

function removalBlock(state: ParishState, userId: string, role: AppRole): RemovalBlock | null {
  if (role === "spravce_sluzby") {
    const names = servicesManagedBy(state, userId).map((service) => service.name);
    if (names.length === 0) return null;
    return {
      role,
      names,
      href: "/panel/nastaveni/sluzby",
      linkLabel: "Správa služeb",
    };
  }
  if (role === "spravce_tymu") {
    const names = teamsManagedBy(state, userId).map((team) => {
      const service = state.services.find((item) => item.id === team.serviceId);
      return service ? `${team.name} (${service.name})` : team.name;
    });
    if (names.length === 0) return null;
    return {
      role,
      names,
      href: "/panel/nastaveni/tymy",
      linkLabel: "nastavení týmů",
    };
  }
  return null;
}

export default function UsersSettingsPage() {
  const { state, currentUser, dispatch } = useParish();
  const [warning, setWarning] = useState<{ userId: string; role: AppRole } | null>(null);

  if (!isMainAdmin(currentUser)) {
    return <p className="card p-5">Role může měnit jen hlavní správce.</p>;
  }

  const otherAdminExists = (userId: string) =>
    state.profiles.some((p) => p.id !== userId && hasRole(p, "hlavni_spravce"));

  const persistRoles = async (person: Profile, roles: AppRole[]) => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const primary = roles.find((role) => role !== "dobrovolnik") ?? "dobrovolnik";
    await client.from("profiles").update({ roles, role: primary }).eq("id", person.id);
  };

  const add = async (person: Profile, role: AppRole) => {
    dispatch({ type: "ADD_ROLE", userId: person.id, role });
    await persistRoles(person, addRole(person.roles, role));
  };

  const remove = async (person: Profile, role: AppRole) => {
    if (role === "dobrovolnik") return;
    if (role === "hlavni_spravce" && !otherAdminExists(person.id)) return;
    const blocked = removalBlock(state, person.id, role);
    if (blocked) {
      setWarning({ userId: person.id, role });
      return;
    }
    setWarning((current) =>
      current?.userId === person.id && current.role === role ? null : current,
    );
    dispatch({ type: "REMOVE_ROLE", userId: person.id, role });
    await persistRoles(person, removeRole(person.roles, role));
  };

  const removeUser = async (person: Profile) => {
    if (person.id === currentUser.id) return;
    if (hasRole(person, "hlavni_spravce") && !otherAdminExists(person.id)) return;
    const serviceBlock = removalBlock(state, person.id, "spravce_sluzby");
    const teamBlock = removalBlock(state, person.id, "spravce_tymu");
    if (serviceBlock || teamBlock) {
      alert(
        `Účet nelze odstranit, dokud spravuje ${[...(serviceBlock?.names ?? []), ...(teamBlock?.names ?? [])].join(", ")}. Nejdřív správu převeďte.`,
      );
      return;
    }
    if (!window.confirm(`Odstranit uživatele ${person.fullName}? Dostane e-mailové upozornění.`)) {
      return;
    }
    void sendTemplate(state, "admin_removed_user", [person], {
      spravce: currentUser.fullName,
    });
    dispatch({ type: "DELETE_USER", userId: person.id });
    const client = getSupabaseBrowserClient();
    if (client) {
      await client.from("profiles").delete().eq("id", person.id);
    }
  };

  return (
    <div>
      <PageHeader
        title="Uživatelé a role"
        subtitle="Po registraci má každý roli Dobrovolník. Další role přidává hlavní správce. Dobrovolníka nelze odebrat."
      />
      <div className="space-y-3">
        {state.profiles.map((person) => {
          const available = ASSIGNABLE_ROLES.filter((role) => !hasRole(person, role));
          const shownWarning =
            warning?.userId === person.id ? removalBlock(state, person.id, warning.role) : null;
          return (
            <article key={person.id} className="card space-y-3 p-4">
              <div>
                <p className="font-semibold">{person.fullName}</p>
                <p className="text-sm text-muted">{person.email}</p>
              </div>
              <div>
                <p className="text-sm font-semibold">Role</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {person.roles.map((role) => {
                    const locked =
                      role === "dobrovolnik" ||
                      (role === "hlavni_spravce" && !otherAdminExists(person.id));
                    return (
                      <li
                        key={role}
                        className="flex min-h-10 items-center gap-1 rounded-full border border-line bg-[#f6f1e6] px-3 text-sm"
                      >
                        {ROLE_LABEL[role]}
                        {locked ? null : (
                          <button
                            type="button"
                            className="grid h-7 w-7 place-items-center rounded-full hover:bg-white"
                            aria-label={`Odebrat roli ${ROLE_LABEL[role]}`}
                            onClick={() => remove(person, role)}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
              {shownWarning ? (
                <p className="rounded-2xl border border-[#efd3d3] bg-[#f8ecec] p-3 text-sm text-rose">
                  Roli {ROLE_LABEL[shownWarning.role]} nelze odebrat, dokud spravuje{" "}
                  {shownWarning.role === "spravce_sluzby"
                    ? shownWarning.names.length === 1
                      ? "službu"
                      : "služby"
                    : shownWarning.names.length === 1
                      ? "tým"
                      : "týmy"}{" "}
                  <strong>{shownWarning.names.join(", ")}</strong>. Nejdřív správu převeďte na jiného
                  uživatele v{" "}
                  <Link className="font-semibold underline" href={shownWarning.href}>
                    {shownWarning.linkLabel}
                  </Link>
                  .
                </p>
              ) : null}
              {person.id !== currentUser.id &&
              !(hasRole(person, "hlavni_spravce") && !otherAdminExists(person.id)) ? (
                <button type="button" className="btn btn-danger" onClick={() => void removeUser(person)}>
                  Odstranit uživatele
                </button>
              ) : null}
              {available.length > 0 ? (
                <label className="block text-sm font-semibold">
                  Přidat roli
                  <select
                    className="mt-1 w-full rounded-xl border border-line p-3"
                    value=""
                    onChange={(e) => {
                      const role = e.target.value as AppRole;
                      if (!role) return;
                      void add(person, role);
                    }}
                  >
                    <option value="">Vyberte roli…</option>
                    {available.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABEL[role]}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
