"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AssignmentCard } from "@/components/assignment-card";
import { PageHeader } from "@/components/page-header";
import {
  addMonths,
  addWeeks,
  formatDate,
  monthLabel,
  sameDay,
  startOfMonth,
  startOfWeek,
  weekLabel,
} from "@/lib/dates";
import { useParish } from "@/lib/store";

export default function CalendarPage() {
  const { state, isMine, canRequestAbsence, requestSwap, requestSubstitute } = useParish();
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(() => new Date(2026, 9, 1));
  const [now, setNow] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [swapFrom, setSwapFrom] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    setCursor(today);
    setSelectedDay(today);
    setNow(Date.now());
  }, []);

  const days = useMemo(() => {
    if (view === "week") {
      const start = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
      });
    }
    const start = startOfMonth(cursor);
    const first = new Date(start);
    first.setDate(1 - ((start.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(first);
      d.setDate(first.getDate() + i);
      return d;
    });
  }, [cursor, view]);

  const dayAssignments = (day: Date) =>
    state.assignments
      .filter((a) => sameDay(new Date(a.startsAt), day))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const listed = selectedDay
    ? dayAssignments(selectedDay).filter((assignment) => {
        if (isMine(assignment)) return true;
        if (assignment.status === "volny_zaskok") return true;
        if (assignment.status !== "ceka_na_vymenu") return false;
        return state.swaps.some(
          (s) =>
            s.status === "ceka" &&
            (s.requesterId === state.currentUserId || s.targetId === state.currentUserId) &&
            (s.fromAssignmentId === assignment.id || s.toAssignmentId === assignment.id),
        );
      })
    : [];
  const swapSource = state.assignments.find((a) => a.id === swapFrom);
  const goToday = () => {
    const today = new Date();
    setCursor(today);
    setSelectedDay(today);
  };

  return (
    <div>
      <PageHeader
        title="Kalendář služeb"
        subtitle="Přepínejte měsíc a týden. U své služby se zobrazí jen její název."
      />
      <div className="card p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`btn min-h-11 ${view === "month" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => {
                setView("month");
                setCursor(new Date());
              }}
            >
              Aktuální měsíc
            </button>
            <button
              type="button"
              className={`btn min-h-11 ${view === "week" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => {
                setView("week");
                setCursor(new Date());
                setSelectedDay(new Date());
              }}
            >
              Aktuální týden
            </button>
          </div>
          <button type="button" className="btn btn-ghost min-h-11" onClick={goToday}>
            Dnes
          </button>
        </div>
        <div className="mb-3 flex items-center justify-between">
          <button
            className="btn btn-ghost min-h-11 px-3"
            onClick={() => setCursor(view === "week" ? addWeeks(cursor, -1) : addMonths(startOfMonth(cursor), -1))}
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="font-serif text-xl capitalize">
            {view === "week" ? weekLabel(cursor) : monthLabel(cursor)}
          </h2>
          <button
            className="btn btn-ghost min-h-11 px-3"
            onClick={() => setCursor(view === "week" ? addWeeks(cursor, 1) : addMonths(startOfMonth(cursor), 1))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
          {["Po", "Út", "St", "Čt", "Pá", "So", "Ne"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const items = dayAssignments(day);
            const myItems = items.filter(isMine);
            const outside = view === "month" && day.getMonth() !== cursor.getMonth();
            const swap = items.some((a) => a.status === "ceka_na_vymenu");
            const open = items.some((a) => a.status === "volny_zaskok");
            const selected = selectedDay ? sameDay(day, selectedDay) : false;
            return (
              <button
                key={day.toISOString()}
                onClick={() => {
                  setSelectedDay(day);
                  setSwapFrom(null);
                }}
                className={`rounded-xl border p-1 text-left ${
                  view === "week" ? "min-h-[6.5rem]" : "min-h-[4.5rem]"
                } ${
                  selected
                    ? "border-forest bg-[#e4f1eb]"
                    : outside
                      ? "border-transparent text-muted/50"
                      : "border-line bg-white"
                }`}
              >
                <span className="text-xs font-semibold">{day.getDate()}</span>
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {myItems.length ? <span className="h-2 w-2 rounded-full bg-forest" /> : null}
                  {swap ? <span className="h-2 w-2 rounded-full bg-amber" /> : null}
                  {open ? <span className="h-2 w-2 rounded-full bg-sky" /> : null}
                </div>
                {myItems.map((assignment) => {
                  const name = state.services.find((s) => s.id === assignment.serviceId)?.name;
                  return (
                    <p key={assignment.id} className="mt-0.5 truncate text-[10px] font-semibold leading-tight text-forest">
                      {name}
                    </p>
                  );
                })}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-forest" /> Moje služba</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber" /> Čeká na schválení výměny</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky" /> Volný záskok v burze</span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <h2 className="font-serif text-xl">
          {selectedDay ? formatDate(selectedDay) : "Vyberte den"}
        </h2>
        {listed.length === 0 ? (
          <p className="card p-5 text-muted">
            V tento den nemáte žádnou službu, čekající výměnu ani volný záskok.
          </p>
        ) : (
          listed.map((assignment) => {
            const service = state.services.find((s) => s.id === assignment.serviceId);
            const canAct = canRequestAbsence(assignment);
            return (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                actions={
                  canAct ? (
                    <>
                      {service?.allowDirectedSwaps ? (
                        <button
                          className="btn btn-ghost"
                          onClick={() => {
                            setSwapFrom(assignment.id);
                            setMessage("Vyberte cílový termín stejné služby níže.");
                          }}
                        >
                          Požádat o výměnu
                        </button>
                      ) : null}
                      {service?.allowPublicSubstitutes ? (
                        <button
                          className="btn btn-ghost"
                          onClick={() => {
                            const res = requestSubstitute(assignment.id);
                            setMessage(res.ok ? "Termín je v burze záskoků." : res.message);
                          }}
                        >
                          Uvolnit do burzy
                        </button>
                      ) : null}
                    </>
                  ) : null
                }
              />
            );
          })
        )}
        {message ? <p className="card p-3 text-sm">{message}</p> : null}
        {swapFrom && swapSource ? (
          <div className="space-y-2">
            <h3 className="font-serif text-xl">Kam chcete termín vyměnit?</h3>
            {state.assignments
              .filter(
                (a) =>
                  a.id !== swapFrom &&
                  a.serviceId === swapSource.serviceId &&
                  new Date(a.startsAt).getTime() > now &&
                  (a.volunteerId || a.teamId),
              )
              .map((a) => (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  actions={
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        const res = requestSwap(swapFrom, a.id);
                        setMessage(res.ok ? "Žádost o výměnu byla odeslána." : res.message);
                        if (res.ok) setSwapFrom(null);
                      }}
                    >
                      Navrhnout výměnu
                    </button>
                  }
                />
              ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
