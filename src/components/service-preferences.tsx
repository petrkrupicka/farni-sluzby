"use client";

import { formatTime, weekdayName } from "@/lib/dates";
import { useParish } from "@/lib/store";
import type { Service } from "@/lib/types";

export function ServicePreferences({ service }: { service: Service }) {
  const { state, currentUser, dispatch } = useParish();
  const member = state.memberships.some(
    (m) => m.serviceId === service.id && m.userId === currentUser.id && m.status === "schvaleno",
  );
  const slots = state.slots.filter((s) => s.serviceId === service.id);

  if (service.assignmentMode === "tymy" || !member) return null;

  return (
    <div className="mt-4 border-t border-line pt-4">
      <h3 className="text-sm font-semibold">Podrobnosti</h3>
      <p className="mt-1 text-sm text-muted">Zaškrtněte termíny, kdy můžete sloužit.</p>
      <div className="mt-3 space-y-2">
        {slots.length === 0 ? (
          <p className="text-sm text-muted">Zatím není žádný slot.</p>
        ) : (
          slots.map((slot) => {
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
          })
        )}
      </div>
    </div>
  );
}
