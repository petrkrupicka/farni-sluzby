"use client";

import { PageHeader } from "@/components/page-header";
import { ROLE_LABEL } from "@/lib/labels";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useParish } from "@/lib/store";
import type { AppRole } from "@/lib/types";

export default function UsersSettingsPage() {
  const { state, currentUser, dispatch } = useParish();

  if (currentUser.role !== "hlavni_spravce") {
    return <p className="card p-5">Role může měnit jen hlavní správce.</p>;
  }

  const changeRole = async (userId: string, role: AppRole) => {
    dispatch({ type: "SET_ROLE", userId, role });
    const client = getSupabaseBrowserClient();
    if (!client) return;
    await client.from("profiles").update({ role }).eq("id", userId);
  };

  return (
    <div>
      <PageHeader
        title="Uživatelé a role"
        subtitle="Nový účet má vždy roli Dobrovolník. Zde ji můžete změnit."
      />
      <div className="space-y-3">
        {state.profiles
          .filter((p) => /^[0-9a-f-]{36}$/i.test(p.id))
          .map((person) => (
            <article key={person.id} className="card space-y-2 p-4">
              <p className="font-semibold">{person.fullName}</p>
              <p className="text-sm text-muted">{person.email}</p>
              <label className="block text-sm font-semibold">
                Role
                <select
                  className="mt-1 w-full rounded-xl border border-line p-3"
                  value={person.role}
                  onChange={(e) => changeRole(person.id, e.target.value as AppRole)}
                >
                  {(Object.keys(ROLE_LABEL) as AppRole[]).map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </option>
                  ))}
                </select>
              </label>
            </article>
          ))}
      </div>
    </div>
  );
}
