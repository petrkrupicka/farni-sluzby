"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { MODE_LABEL, ROLE_LABEL, WEEKDAYS } from "@/lib/labels";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useParish } from "@/lib/store";
import type { AssignmentMode } from "@/lib/types";

export default function ServiceSettingsPage() {
  const { state, currentUser, canManageService, canAccessServiceSettings, dispatch } = useParish();
  const services = state.services.filter(
    (s) => currentUser.role === "hlavni_spravce" || canManageService(s.id),
  );
  const [newName, setNewName] = useState("");
  const [newMode, setNewMode] = useState<AssignmentMode>("jednotlivci");

  if (!canAccessServiceSettings) {
    return (
      <p className="card p-5">
        Nastavení služeb je jen pro hlavního správce a správce alespoň jedné služby.
      </p>
    );
  }

  return (
    <div>
      <PageHeader
        title="Služby"
        subtitle="Správce služby, typ přiřazení a rozvrhové sloty."
      />
      <p className="card mb-4 p-4 text-sm text-muted">
        Ke službě se přihlásíte v{" "}
        <Link className="font-semibold text-forest underline" href="/panel/sluzby">
          přihlášení ke službám
        </Link>
        .
      </p>
      <p className="card mb-4 p-4 text-sm text-muted">
        Databáze Supabase:{" "}
        {isSupabaseConfigured()
          ? "připojena"
          : "zatím demo režim (data v prohlížeči). Doplňte NEXT_PUBLIC_SUPABASE_URL a NEXT_PUBLIC_SUPABASE_ANON_KEY a spusťte supabase/schema.sql."}
      </p>

      {currentUser.role === "hlavni_spravce" ? (
        <form
          className="card mb-4 space-y-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            dispatch({ type: "ADD_SERVICE", name: newName.trim(), assignmentMode: newMode });
            setNewName("");
          }}
        >
          <h2 className="font-serif text-2xl">Nová služba</h2>
          <label className="block text-sm font-semibold">
            Název
            <input
              className="mt-1 w-full rounded-xl border border-line p-3"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="např. Ministrant"
            />
          </label>
          <label className="block text-sm font-semibold">
            Typ přiřazení
            <select
              className="mt-1 w-full rounded-xl border border-line p-3"
              value={newMode}
              onChange={(e) => setNewMode(e.target.value as AssignmentMode)}
            >
              <option value="jednotlivci">{MODE_LABEL.jednotlivci}</option>
              <option value="tymy">{MODE_LABEL.tymy}</option>
            </select>
          </label>
          <button className="btn btn-primary" type="submit">
            Založit službu
          </button>
        </form>
      ) : null}

      <div className="space-y-4">
        {services.map((service) => {
          const slots = state.slots.filter((s) => s.serviceId === service.id);
          const canEdit = currentUser.role === "hlavni_spravce" || canManageService(service.id);
          return (
            <section key={service.id} className="card space-y-3 p-5">
              <h2 className="font-serif text-2xl">{service.name}</h2>
              {currentUser.role === "hlavni_spravce" ? (
                <label className="block text-sm font-semibold">
                  Správce služby
                  <select
                    className="mt-1 w-full rounded-xl border border-line p-3"
                    value={service.managerIds[0] ?? ""}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_SERVICE_MANAGER",
                        serviceId: service.id,
                        userId: e.target.value,
                      })
                    }
                  >
                    <option value="">Bez správce služby</option>
                    {state.profiles
                      .filter((p) => p.role !== "hlavni_spravce")
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} · {ROLE_LABEL[p.role]}
                        </option>
                      ))}
                  </select>
                </label>
              ) : (
                <p className="text-sm">
                  Správce služby:{" "}
                  <strong>
                    {service.managerIds
                      .map((id) => state.profiles.find((p) => p.id === id)?.fullName)
                      .filter(Boolean)
                      .join(", ") || "není přiřazen"}
                  </strong>
                </p>
              )}
              <label className="block text-sm font-semibold">
                Přiřazení
                <select
                  className="mt-1 w-full rounded-xl border border-line p-3"
                  value={service.assignmentMode}
                  onChange={(e) =>
                    dispatch({
                      type: "UPDATE_SERVICE",
                      serviceId: service.id,
                      patch: { assignmentMode: e.target.value as AssignmentMode },
                    })
                  }
                >
                  <option value="jednotlivci">{MODE_LABEL.jednotlivci}</option>
                  <option value="tymy">{MODE_LABEL.tymy}</option>
                </select>
              </label>
              <div>
                <h3 className="text-sm font-semibold">Rozvrhové sloty</h3>
                <ul className="mt-2 space-y-2">
                  {slots.length === 0 ? (
                    <li className="text-sm text-muted">Zatím není žádný slot.</li>
                  ) : (
                    slots.map((slot) => <SlotRow key={slot.id} slot={slot} canEdit={canEdit} />)
                  )}
                </ul>
                {canEdit ? <AddSlotForm serviceId={service.id} /> : null}
              </div>
            </section>
          );
        })}
      </div>
      <button className="btn btn-ghost mt-4" onClick={() => dispatch({ type: "RESET" })}>
        Obnovit ukázková data
      </button>
    </div>
  );
}

function SlotRow({
  slot,
  canEdit,
}: {
  slot: { id: string; weekday: number; startTime: string; endTime: string; label: string };
  canEdit: boolean;
}) {
  const { dispatch } = useParish();
  const [editing, setEditing] = useState(false);
  const [weekday, setWeekday] = useState(slot.weekday);
  const [startTime, setStartTime] = useState(slot.startTime);
  const [endTime, setEndTime] = useState(slot.endTime);
  const [label, setLabel] = useState(slot.label);

  if (!canEdit) {
    return (
      <li className="rounded-xl border border-line px-3 py-2 text-sm text-muted">
        {WEEKDAYS[slot.weekday]} {slot.startTime}–{slot.endTime} · {slot.label}
      </li>
    );
  }

  if (editing) {
    return (
      <li className="rounded-xl border border-line p-3">
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            dispatch({
              type: "UPDATE_SLOT",
              slotId: slot.id,
              patch: {
                weekday,
                startTime,
                endTime,
                label: label.trim() || slot.label,
              },
            });
            setEditing(false);
          }}
        >
          <select
            className="rounded-xl border border-line p-3"
            value={weekday}
            onChange={(e) => setWeekday(Number(e.target.value))}
          >
            {WEEKDAYS.map((day, i) => (
              <option key={day} value={i}>
                {day}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              className="rounded-xl border border-line p-3"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <input
              type="time"
              className="rounded-xl border border-line p-3"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <input
            className="rounded-xl border border-line p-3"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="btn btn-primary" type="submit">
              Uložit slot
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setEditing(false)}>
              Zrušit
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-line p-3">
      <p className="text-sm">
        {WEEKDAYS[slot.weekday]} {slot.startTime}–{slot.endTime} · {slot.label}
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => {
            setWeekday(slot.weekday);
            setStartTime(slot.startTime);
            setEndTime(slot.endTime);
            setLabel(slot.label);
            setEditing(true);
          }}
        >
          Editovat čas/den
        </button>
        <button
          className="btn btn-danger"
          type="button"
          onClick={() => dispatch({ type: "DELETE_SLOT", slotId: slot.id })}
        >
          Smazat slot
        </button>
      </div>
    </li>
  );
}

function AddSlotForm({ serviceId }: { serviceId: string }) {
  const { dispatch } = useParish();
  const [weekday, setWeekday] = useState(0);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [label, setLabel] = useState("");

  return (
    <form
      className="mt-3 grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!label.trim()) return;
        dispatch({
          type: "ADD_SLOT",
          serviceId,
          weekday,
          startTime,
          endTime,
          label: label.trim(),
        });
        setLabel("");
      }}
    >
      <select
        className="rounded-xl border border-line p-3"
        value={weekday}
        onChange={(e) => setWeekday(Number(e.target.value))}
      >
        {WEEKDAYS.map((day, i) => (
          <option key={day} value={i}>
            {day}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="time"
          className="rounded-xl border border-line p-3"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
        <input
          type="time"
          className="rounded-xl border border-line p-3"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
      </div>
      <input
        className="rounded-xl border border-line p-3"
        placeholder="Popisek slotu"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <button className="btn btn-ghost" type="submit">
        Přidat slot do rozvrhu
      </button>
    </form>
  );
}
