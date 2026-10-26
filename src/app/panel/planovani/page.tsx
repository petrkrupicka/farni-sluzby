"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { formatDate, nextPlanningWindow, toDateInput } from "@/lib/dates";
import { ALGORITHM_LABEL } from "@/lib/labels";
import { useParish } from "@/lib/store";
import type { PlanAlgorithm } from "@/lib/types";

export default function PlanningPage() {
  const { state, currentUser, canManageService, periodExists, generate, dispatch } = useParish();
  const services = state.services.filter(
    (s) => currentUser.role === "hlavni_spravce" || canManageService(s.id),
  );
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [algorithm, setAlgorithm] = useState<PlanAlgorithm>("posloupnost");
  const [warning, setWarning] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const existingPeriods = useMemo(() => {
    const fromPeriods = state.periods
      .filter((p) => p.serviceId === serviceId)
      .map((p) => ({ startsOn: p.startsOn, endsOn: p.endsOn, algorithm: p.algorithm }));
    const assignmentDays = state.assignments
      .filter((a) => a.serviceId === serviceId && a.kind === "standardni")
      .map((a) => toDateInput(new Date(a.startsAt)))
      .sort();
    if (fromPeriods.length === 0 && assignmentDays.length > 0) {
      return [
        {
          startsOn: assignmentDays[0],
          endsOn: assignmentDays[assignmentDays.length - 1],
          algorithm: undefined as PlanAlgorithm | undefined,
        },
      ];
    }
    return fromPeriods.sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  }, [state.periods, state.assignments, serviceId]);

  const lastPlannedOn = useMemo(() => {
    let last: string | null = null;
    for (const period of existingPeriods) {
      if (!last || period.endsOn > last) last = period.endsOn;
    }
    for (const assignment of state.assignments) {
      if (assignment.serviceId !== serviceId || assignment.kind !== "standardni") continue;
      const day = toDateInput(new Date(assignment.startsAt));
      if (!last || day > last) last = day;
    }
    return last;
  }, [existingPeriods, state.assignments, serviceId]);

  useEffect(() => {
    if (lastPlannedOn) {
      const window = nextPlanningWindow(new Date(`${lastPlannedOn}T00:00:00`));
      setStartsOn(window.startsOn);
      setEndsOn(window.endsOn);
      return;
    }
    const today = new Date();
    const window = nextPlanningWindow(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));
    setStartsOn(window.startsOn);
    setEndsOn(window.endsOn);
  }, [serviceId, lastPlannedOn]);

  const payload = { serviceId, startsOn, endsOn, algorithm };
  const exists = startsOn && endsOn ? periodExists(serviceId, startsOn, endsOn) : false;

  if (currentUser.role !== "hlavni_spravce" && currentUser.role !== "spravce_sluzby") {
    return <p className="card p-5">Plánování je dostupné jen správcům.</p>;
  }

  return (
    <div>
      <PageHeader
        title="Plánování služeb"
        subtitle="Plán se sestaví jen pro zvolené období. Pokud už existuje, zobrazí se varování před přepsáním."
      />

      <section className="card mb-4 space-y-2 p-5">
        <h2 className="font-serif text-xl">Už naplánovaná období</h2>
        {existingPeriods.length === 0 ? (
          <p className="text-sm text-muted">Pro tuto službu zatím není naplánovaný žádný plán.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {existingPeriods.map((period) => (
              <li key={`${period.startsOn}-${period.endsOn}`}>
                {formatDate(`${period.startsOn}T12:00:00`)} – {formatDate(`${period.endsOn}T12:00:00`)}
                {period.algorithm ? ` · ${ALGORITHM_LABEL[period.algorithm]}` : ""}
              </li>
            ))}
          </ul>
        )}
        {lastPlannedOn ? (
          <p className="text-sm text-muted">
            Poslední naplánovaný den: {formatDate(`${lastPlannedOn}T12:00:00`)}
          </p>
        ) : null}
      </section>

      <form
        className="card space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (exists && !warning) {
            setWarning(true);
            return;
          }
          generate(payload, exists);
          setWarning(false);
          setInfo("Plán byl naplánován.");
        }}
      >
        <label className="block text-sm font-semibold">
          Služba
          <select
            className="mt-1 w-full rounded-xl border border-line bg-white p-3"
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setWarning(false);
              setInfo(null);
            }}
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Od
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-line p-3"
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
            />
          </label>
          <label className="text-sm font-semibold">
            Do
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-line p-3"
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
            />
          </label>
        </div>
        <fieldset>
          <legend className="text-sm font-semibold">Algoritmus</legend>
          {(Object.keys(ALGORITHM_LABEL) as PlanAlgorithm[]).map((key) => (
            <label key={key} className="mt-2 flex min-h-12 items-start gap-3">
              <input
                type="radio"
                name="algo"
                checked={algorithm === key}
                onChange={() => setAlgorithm(key)}
                className="mt-1"
              />
              <span>
                <strong>{ALGORITHM_LABEL[key]}</strong>
                <span className="block text-sm text-muted">
                  {key === "posloupnost"
                    ? "Střídá týmy nebo jednotlivce v pevném pořadí."
                    : "Bere ohled na preference a upřednostní ty s nejmenším počtem služeb."}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        {warning ? (
          <p className="rounded-2xl bg-[#f8ebd4] p-3 text-sm">
            Pro toto období už plán existuje. Odesláním formuláře se standardní termíny
            přepíšou. Jednorázové mimořádné události zůstanou.
          </p>
        ) : exists ? (
          <p className="text-sm text-amber">Plán pro zvolené období už existuje.</p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button className="btn btn-primary" type="submit">
            {exists ? "Přepsat a naplánovat" : "Naplánovat"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              dispatch({ type: "FILL_EMPTY", payload });
              setInfo("Prázdné termíny byly doplněny.");
            }}
          >
            Hromadně doplnit prázdné
          </button>
        </div>
        {info ? <p className="text-sm text-forest">{info}</p> : null}
      </form>
    </div>
  );
}
