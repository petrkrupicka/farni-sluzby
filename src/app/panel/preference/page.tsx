"use client";

import { PageHeader } from "@/components/page-header";
import { formatTime } from "@/lib/dates";
import { weekdayName } from "@/lib/dates";
import { useParish } from "@/lib/store";

export default function PreferencesPage() {
  const { state, currentUser, dispatch } = useParish();
  const individualServices = state.services.filter((s) => s.assignmentMode === "jednotlivci");
  const myServices = individualServices.filter((s) =>
    state.memberships.some(
      (m) => m.serviceId === s.id && m.userId === currentUser.id && m.status === "schvaleno",
    ),
  );

  return (
    <div>
      <PageHeader
        title="Preference dostupnosti"
        subtitle="Platí jen u služeb pro jednotlivce (kostelník, lektor, varhaník). Týmové služby se střídají jako celek."
      />
      {myServices.length === 0 ? (
        <p className="card p-5 text-muted">
          Nejprve se přihlaste ke službě typu jednotlivci (kostelník, lektor, varhaník).
        </p>
      ) : null}
      <div className="space-y-4">
        {myServices.map((service) => {
          const slots = state.slots.filter((s) => s.serviceId === service.id);
          return (
            <section key={service.id} className="card p-5">
              <h2 className="font-serif text-2xl">{service.name}</h2>
              <div className="mt-3 space-y-2">
                {slots.map((slot) => {
                  const pref = state.preferences.find(
                    (p) => p.userId === currentUser.id && p.slotId === slot.id,
                  );
                  const on = pref?.available ?? true;
                  return (
                    <label
                      key={slot.id}
                      className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-line px-3"
                    >
                      <span>
                        <strong>{slot.label}</strong>
                        <span className="block text-sm text-muted">
                          {weekdayName(slot.weekday)} {formatTime(slot.startTime)}–
                          {formatTime(slot.endTime)}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        className="h-6 w-6 accent-[color:var(--forest)]"
                        checked={on}
                        onChange={(e) =>
                          dispatch({
                            type: "SET_PREFERENCE",
                            slotId: slot.id,
                            available: e.target.checked,
                          })
                        }
                      />
                    </label>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
