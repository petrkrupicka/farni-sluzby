"use client";

import { Clock, Users } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime, formatTime } from "@/lib/dates";
import { KIND_LABEL } from "@/lib/labels";
import { useParish } from "@/lib/store";
import type { PlanAssignment } from "@/lib/types";

export function AssignmentCard({
  assignment,
  actions,
}: {
  assignment: PlanAssignment;
  actions?: React.ReactNode;
}) {
  const { state, assigneeLabel, isMine } = useParish();
  const service = state.services.find((s) => s.id === assignment.serviceId);
  const mine = isMine(assignment);

  return (
    <article className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-forest font-semibold">{service?.name}</p>
          <h3 className="font-serif text-lg leading-tight">{assignment.title}</h3>
        </div>
        <StatusBadge status={assignment.status} mine={mine} />
      </div>
      <p className="text-sm text-muted flex items-center gap-2">
        <Clock size={16} />
        {formatDateTime(assignment.startsAt)} – {formatTime(assignment.endsAt)}
      </p>
      <p className="text-sm flex items-center gap-2">
        <Users size={16} className="text-forest" />
        <strong>{assigneeLabel(assignment)}</strong>
        <span className="text-muted">· {KIND_LABEL[assignment.kind]}</span>
      </p>
      {assignment.notes ? <p className="text-sm text-muted">{assignment.notes}</p> : null}
      {assignment.status === "ceka_na_vymenu" ? (
        <p className="text-sm text-amber">
          Čeká se na:{" "}
          <strong>
            {state.profiles.find(
              (p) =>
                p.id ===
                state.swaps.find(
                  (s) =>
                    s.status === "ceka" &&
                    (s.fromAssignmentId === assignment.id || s.toAssignmentId === assignment.id),
                )?.targetId,
            )?.fullName ?? "druhou stranu"}
          </strong>
        </p>
      ) : null}
      {assignment.status === "volny_zaskok" ? (
        <p className="text-sm text-sky">
          Čeká se na: <strong>převzetí záskoku</strong>
        </p>
      ) : null}
      {actions ? <div className="flex flex-col sm:flex-row gap-2 pt-1">{actions}</div> : null}
    </article>
  );
}
