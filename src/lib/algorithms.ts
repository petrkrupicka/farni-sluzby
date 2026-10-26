import { eachDateInRange, fromDateAndTime, overlaps, toIso } from "./dates";
import type {
  PlanAlgorithm,
  PlanAssignment,
  Preference,
  ScheduleSlot,
  Service,
  Team,
} from "./types";

type GenerateInput = {
  service: Service;
  slots: ScheduleSlot[];
  startsOn: string;
  endsOn: string;
  algorithm: PlanAlgorithm;
  volunteerIds: string[];
  teams: Team[];
  preferences: Preference[];
  existing: PlanAssignment[];
  periodId: string;
};

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function hasConflict(
  existing: PlanAssignment[],
  assignee: { volunteerId?: string; teamId?: string },
  start: string,
  end: string,
) {
  return existing.some((a) => {
    if (a.status === "volny_zaskok") return false;
    if (!overlaps(a.startsAt, a.endsAt, start, end)) return false;
    if (assignee.volunteerId && a.volunteerId === assignee.volunteerId) return true;
    if (assignee.teamId && a.teamId === assignee.teamId) return true;
    return false;
  });
}

export function generatePlan(input: GenerateInput): PlanAssignment[] {
  const created: PlanAssignment[] = [];
  const tally = new Map<string, number>();
  const bump = (key: string) => tally.set(key, (tally.get(key) ?? 0) + 1);

  for (const slot of input.slots.filter((s) => s.serviceId === input.service.id)) {
    const dates = eachDateInRange(input.startsOn, input.endsOn, slot.weekday);
    let seq = 0;
    const orderedVolunteers = [...input.volunteerIds];
    const orderedTeams = input.teams.filter((t) => t.serviceId === input.service.id);

    for (const date of dates) {
      const starts = fromDateAndTime(
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
        slot.startTime,
      );
      const ends = fromDateAndTime(
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
        slot.endTime,
      );
      const startsAt = toIso(starts);
      const endsAt = toIso(ends);
      const pool = [...input.existing, ...created];

      let volunteerId: string | undefined;
      let teamId: string | undefined;

      if (input.service.assignmentMode === "tymy") {
        const eligible = orderedTeams.filter(
          (t) => !hasConflict(pool, { teamId: t.id }, startsAt, endsAt),
        );
        if (eligible.length === 0) {
          seq += 1;
          continue;
        }
        if (input.algorithm === "posloupnost") {
          teamId = eligible[seq % eligible.length].id;
        } else {
          const min = Math.min(...eligible.map((t) => tally.get(t.id) ?? 0));
          const lowest = eligible.filter((t) => (tally.get(t.id) ?? 0) === min);
          teamId = shuffle(lowest)[0].id;
        }
        bump(teamId);
      } else {
        const preferred = orderedVolunteers.filter((id) => {
          const pref = input.preferences.find((p) => p.userId === id && p.slotId === slot.id);
          if (pref && !pref.available) return false;
          return !hasConflict(pool, { volunteerId: id }, startsAt, endsAt);
        });
        if (preferred.length === 0) {
          seq += 1;
          continue;
        }
        if (input.algorithm === "posloupnost") {
          volunteerId = preferred[seq % preferred.length];
        } else {
          const min = Math.min(...preferred.map((id) => tally.get(id) ?? 0));
          const lowest = preferred.filter((id) => (tally.get(id) ?? 0) === min);
          volunteerId = shuffle(lowest)[0];
        }
        bump(volunteerId);
      }

      created.push({
        id: crypto.randomUUID(),
        serviceId: input.service.id,
        slotId: slot.id,
        periodId: input.periodId,
        startsAt,
        endsAt,
        kind: "standardni",
        title: slot.label,
        volunteerId,
        teamId,
        status: volunteerId || teamId ? "prirazeno" : "volny_zaskok",
      });
      seq += 1;
    }
  }

  return created;
}

export function fillEmptyAssignments(
  empty: PlanAssignment[],
  input: Omit<GenerateInput, "startsOn" | "endsOn" | "slots"> & { slots: ScheduleSlot[] },
): PlanAssignment[] {
  const result: PlanAssignment[] = [];
  const tally = new Map<string, number>();
  for (const a of input.existing) {
    const key = a.volunteerId ?? a.teamId;
    if (key) tally.set(key, (tally.get(key) ?? 0) + 1);
  }

  const orderedVolunteers = [...input.volunteerIds];
  const orderedTeams = input.teams.filter((t) => t.serviceId === input.service.id);
  let seq = 0;

  for (const assignment of empty) {
    const pool = [...input.existing, ...result];
    const slot = input.slots.find((s) => s.id === assignment.slotId);
    let volunteerId = assignment.volunteerId;
    let teamId = assignment.teamId;

    if (input.service.assignmentMode === "tymy") {
      const eligible = orderedTeams.filter(
        (t) => !hasConflict(pool, { teamId: t.id }, assignment.startsAt, assignment.endsAt),
      );
      if (eligible.length) {
        if (input.algorithm === "posloupnost") {
          teamId = eligible[seq % eligible.length].id;
        } else {
          const min = Math.min(...eligible.map((t) => tally.get(t.id) ?? 0));
          teamId = eligible.find((t) => (tally.get(t.id) ?? 0) === min)?.id;
        }
        if (teamId) tally.set(teamId, (tally.get(teamId) ?? 0) + 1);
      }
    } else {
      const preferred = orderedVolunteers.filter((id) => {
        const pref = slot
          ? input.preferences.find((p) => p.userId === id && p.slotId === slot.id)
          : undefined;
        if (pref && !pref.available) return false;
        return !hasConflict(pool, { volunteerId: id }, assignment.startsAt, assignment.endsAt);
      });
      if (preferred.length) {
        if (input.algorithm === "posloupnost") {
          volunteerId = preferred[seq % preferred.length];
        } else {
          const min = Math.min(...preferred.map((id) => tally.get(id) ?? 0));
          volunteerId = preferred.find((id) => (tally.get(id) ?? 0) === min);
        }
        if (volunteerId) tally.set(volunteerId, (tally.get(volunteerId) ?? 0) + 1);
      }
    }

    result.push({
      ...assignment,
      volunteerId,
      teamId,
      status: volunteerId || teamId ? "prirazeno" : assignment.status,
    });
    seq += 1;
  }

  return result;
}
