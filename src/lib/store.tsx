"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth";
import { fillEmptyAssignments, generatePlan } from "./algorithms";
import { hoursUntil, overlaps } from "./dates";
import { createSeedState } from "./seed";
import { getSupabaseBrowserClient } from "./supabase/client";
import type {
  AppRole,
  MembershipStatus,
  ParishState,
  PlanAlgorithm,
  PlanAssignment,
  Profile,
  Service,
} from "./types";

const STORAGE_KEY = "farni-sluzby-demo-v1";

type Action =
  | { type: "HYDRATE"; state: ParishState }
  | { type: "RESET" }
  | { type: "SET_USER"; userId: string }
  | { type: "ENSURE_USER"; profile: Profile }
  | { type: "SET_ROLE"; userId: string; role: AppRole }
  | { type: "SET_MEMBERSHIP"; id: string; status: MembershipStatus }
  | { type: "REGISTER"; serviceId: string }
  | { type: "UPDATE_SERVICE"; serviceId: string; patch: Partial<Service> }
  | { type: "SET_PREFERENCE"; slotId: string; available: boolean }
  | { type: "SET_TEAM_MEMBERS"; teamId: string; memberIds: string[] }
  | { type: "SET_SERVICE_MANAGER"; serviceId: string; userId: string }
  | { type: "SET_TEAM_MANAGER"; teamId: string; userId: string }
  | { type: "ADD_SERVICE"; name: string; assignmentMode: Service["assignmentMode"] }
  | { type: "ADD_SLOT"; serviceId: string; weekday: number; startTime: string; endTime: string; label: string }
  | {
      type: "UPDATE_SLOT";
      slotId: string;
      patch: { weekday: number; startTime: string; endTime: string; label: string };
    }
  | { type: "DELETE_SLOT"; slotId: string }
  | { type: "ADD_TEAM"; serviceId: string; name: string; managerId: string; extraMemberIds?: string[] }
  | { type: "GENERATE"; payload: GeneratePayload; overwrite: boolean }
  | { type: "FILL_EMPTY"; payload: GeneratePayload }
  | { type: "ADD_EVENT"; assignment: PlanAssignment }
  | { type: "MANAGER_PATCH"; assignmentId: string; volunteerId?: string; teamId?: string; clear?: boolean }
  | { type: "DELETE_ASSIGNMENT"; assignmentId: string }
  | { type: "REQUEST_SWAP"; fromId: string; toId: string }
  | { type: "RESOLVE_SWAP"; swapId: string; accept: boolean }
  | { type: "REQUEST_SUB"; assignmentId: string }
  | { type: "CLAIM_SUB"; listingId: string };

type GeneratePayload = {
  serviceId: string;
  startsOn: string;
  endsOn: string;
  algorithm: PlanAlgorithm;
};

type Result = { ok: true } | { ok: false; message: string };

function loadState(): ParishState {
  if (typeof window === "undefined") return createSeedState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    return migrateState({ ...createSeedState(), ...JSON.parse(raw) });
  } catch {
    return createSeedState();
  }
}

function saveState(state: ParishState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function migrateState(state: ParishState): ParishState {
  return {
    ...state,
    memberships: state.memberships.map((m) =>
      m.status === "ceka" ? { ...m, status: "schvaleno" } : m,
    ),
  };
}

export function isOnServiceTeam(state: ParishState, userId: string, serviceId: string) {
  return state.teams.some(
    (t) => t.serviceId === serviceId && t.memberIds.includes(userId),
  );
}

function approvedIds(state: ParishState, serviceId: string) {
  return state.memberships
    .filter((m) => m.serviceId === serviceId && m.status === "schvaleno")
    .map((m) => m.userId);
}

function actorFor(state: ParishState, assignment: PlanAssignment): string | undefined {
  if (assignment.volunteerId) return assignment.volunteerId;
  if (assignment.teamId) {
    return state.teams.find((t) => t.id === assignment.teamId)?.managerId;
  }
  return undefined;
}

function isMine(state: ParishState, assignment: PlanAssignment, userId: string) {
  if (assignment.volunteerId === userId) return true;
  const team = state.teams.find((t) => t.id === assignment.teamId);
  if (!team) return false;
  return team.managerId === userId || team.memberIds.includes(userId);
}

function canRequestAbsence(state: ParishState, assignment: PlanAssignment, userId: string) {
  if (assignment.volunteerId === userId) return true;
  const team = state.teams.find((t) => t.id === assignment.teamId);
  return Boolean(team && team.managerId === userId);
}

function reducer(state: ParishState, action: Action): ParishState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;
    case "RESET": {
      const seed = createSeedState();
      const me = state.profiles.find((p) => p.id === state.currentUserId);
      if (!me || me.id.startsWith("u-")) return seed;
      return {
        ...seed,
        currentUserId: me.id,
        profiles: [...seed.profiles.filter((p) => p.id !== me.id), me],
      };
    }
    case "SET_USER":
      return { ...state, currentUserId: action.userId };
    case "ENSURE_USER": {
      const found = state.profiles.find((p) => p.id === action.profile.id);
      if (found) {
        return {
          ...state,
          currentUserId: found.id,
          profiles: state.profiles.map((p) =>
            p.id === found.id
              ? {
                  ...p,
                  fullName: action.profile.fullName || p.fullName,
                  email: action.profile.email || p.email,
                }
              : p,
          ),
        };
      }
      return {
        ...state,
        currentUserId: action.profile.id,
        profiles: [
          ...state.profiles,
          {
            ...action.profile,
            role: "dobrovolnik",
          },
        ],
      };
    }
    case "SET_ROLE":
      return {
        ...state,
        profiles: state.profiles.map((p) =>
          p.id === action.userId ? { ...p, role: action.role } : p,
        ),
      };
    case "SET_MEMBERSHIP":
      return {
        ...state,
        memberships: state.memberships.map((m) =>
          m.id === action.id ? { ...m, status: action.status } : m,
        ),
      };
    case "REGISTER": {
      const userId = state.currentUserId;
      if (state.memberships.some((m) => m.serviceId === action.serviceId && m.userId === userId)) {
        return state;
      }
      return {
        ...state,
        memberships: [
          ...state.memberships,
          {
            id: crypto.randomUUID(),
            serviceId: action.serviceId,
            userId,
            status: "schvaleno",
          },
        ],
      };
    }
    case "UPDATE_SERVICE":
      return {
        ...state,
        services: state.services.map((s) =>
          s.id === action.serviceId ? { ...s, ...action.patch } : s,
        ),
      };
    case "SET_PREFERENCE": {
      const userId = state.currentUserId;
      const rest = state.preferences.filter(
        (p) => !(p.userId === userId && p.slotId === action.slotId),
      );
      return {
        ...state,
        preferences: [...rest, { userId, slotId: action.slotId, available: action.available }],
      };
    }
    case "SET_TEAM_MEMBERS":
      return {
        ...state,
        teams: state.teams.map((t) =>
          t.id === action.teamId ? { ...t, memberIds: action.memberIds } : t,
        ),
      };
    case "SET_SERVICE_MANAGER": {
      const previous = state.services.find((s) => s.id === action.serviceId)?.managerIds ?? [];
      const nextIds = action.userId ? [action.userId] : [];
      const stillManages = (userId: string) =>
        state.services.some(
          (s) =>
            s.id !== action.serviceId && s.managerIds.includes(userId),
        ) || nextIds.includes(userId);
      return {
        ...state,
        services: state.services.map((s) =>
          s.id === action.serviceId ? { ...s, managerIds: nextIds } : s,
        ),
        profiles: state.profiles.map((p) => {
          if (p.role === "hlavni_spravce") return p;
          if (p.id === action.userId) return { ...p, role: "spravce_sluzby" };
          if (previous.includes(p.id) && p.role === "spravce_sluzby" && !stillManages(p.id)) {
            const leadsTeam = state.teams.some((t) => t.managerId === p.id);
            return { ...p, role: leadsTeam ? "spravce_tymu" : "dobrovolnik" };
          }
          return p;
        }),
      };
    }
    case "SET_TEAM_MANAGER":
      return {
        ...state,
        teams: state.teams.map((t) =>
          t.id === action.teamId
            ? {
                ...t,
                managerId: action.userId,
                memberIds: Array.from(new Set([...t.memberIds, action.userId])),
              }
            : t,
        ),
        profiles: state.profiles.map((p) =>
          p.id === action.userId && p.role === "dobrovolnik"
            ? { ...p, role: "spravce_tymu" }
            : p,
        ),
      };
    case "ADD_SERVICE": {
      const slug = action.name
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      if (state.services.some((s) => s.slug === slug)) return state;
      return {
        ...state,
        services: [
          ...state.services,
          {
            id: crypto.randomUUID(),
            name: action.name,
            slug: slug || crypto.randomUUID(),
            assignmentMode: action.assignmentMode,
            allowDirectedSwaps: false,
            allowPublicSubstitutes: false,
            substituteLeadTimeHours: 24,
            managerIds: [],
          },
        ],
      };
    }
    case "ADD_SLOT":
      return {
        ...state,
        slots: [
          ...state.slots,
          {
            id: crypto.randomUUID(),
            serviceId: action.serviceId,
            weekday: action.weekday,
            startTime: action.startTime,
            endTime: action.endTime,
            label: action.label,
          },
        ],
      };
    case "UPDATE_SLOT":
      return {
        ...state,
        slots: state.slots.map((slot) =>
          slot.id === action.slotId ? { ...slot, ...action.patch } : slot,
        ),
      };
    case "DELETE_SLOT":
      return {
        ...state,
        slots: state.slots.filter((slot) => slot.id !== action.slotId),
        preferences: state.preferences.filter((p) => p.slotId !== action.slotId),
      };
    case "ADD_TEAM": {
      const memberIds = Array.from(
        new Set([action.managerId, ...(action.extraMemberIds ?? [])]),
      );
      const extraMemberships = memberIds
        .filter(
          (id) =>
            !state.memberships.some((m) => m.serviceId === action.serviceId && m.userId === id),
        )
        .map((id) => ({
          id: crypto.randomUUID(),
          serviceId: action.serviceId,
          userId: id,
          status: "schvaleno" as const,
        }));
      return {
        ...state,
        teams: [
          ...state.teams,
          {
            id: crypto.randomUUID(),
            serviceId: action.serviceId,
            name: action.name,
            managerId: action.managerId,
            memberIds,
          },
        ],
        memberships: [...state.memberships, ...extraMemberships],
        profiles: state.profiles.map((p) =>
          p.id === action.managerId && p.role === "dobrovolnik"
            ? { ...p, role: "spravce_tymu" }
            : p,
        ),
      };
    }
    case "GENERATE": {
      const service = state.services.find((s) => s.id === action.payload.serviceId);
      if (!service) return state;
      const periodId = crypto.randomUUID();
      const generated = generatePlan({
        service,
        slots: state.slots,
        startsOn: action.payload.startsOn,
        endsOn: action.payload.endsOn,
        algorithm: action.payload.algorithm,
        volunteerIds: approvedIds(state, service.id),
        teams: state.teams,
        preferences: state.preferences,
        existing: action.overwrite ? [] : state.assignments,
        periodId,
      });
      const remaining = action.overwrite
        ? state.assignments.filter(
            (a) =>
              a.serviceId !== service.id ||
              a.kind === "mimoradna" ||
              a.startsAt < `${action.payload.startsOn}T00:00:00.000Z` ||
              a.startsAt > `${action.payload.endsOn}T23:59:59.999Z`,
          )
        : state.assignments;
      return {
        ...state,
        periods: [
          ...state.periods.filter(
            (p) =>
              !(
                p.serviceId === service.id &&
                p.startsOn === action.payload.startsOn &&
                p.endsOn === action.payload.endsOn
              ),
          ),
          {
            id: periodId,
            serviceId: service.id,
            startsOn: action.payload.startsOn,
            endsOn: action.payload.endsOn,
            algorithm: action.payload.algorithm,
            generatedAt: new Date().toISOString(),
          },
        ],
        assignments: [...remaining, ...generated],
      };
    }
    case "FILL_EMPTY": {
      const service = state.services.find((s) => s.id === action.payload.serviceId);
      if (!service) return state;
      const empty = state.assignments.filter(
        (a) =>
          a.serviceId === service.id &&
          !a.volunteerId &&
          !a.teamId &&
          a.startsAt >= `${action.payload.startsOn}T00:00:00.000Z` &&
          a.startsAt <= `${action.payload.endsOn}T23:59:59.999Z`,
      );
      const filled = fillEmptyAssignments(empty, {
        service,
        slots: state.slots,
        algorithm: action.payload.algorithm,
        volunteerIds: approvedIds(state, service.id),
        teams: state.teams,
        preferences: state.preferences,
        existing: state.assignments.filter((a) => !empty.includes(a)),
        periodId: crypto.randomUUID(),
      });
      return {
        ...state,
        assignments: state.assignments.map((a) => filled.find((f) => f.id === a.id) ?? a),
      };
    }
    case "ADD_EVENT":
      return { ...state, assignments: [...state.assignments, action.assignment] };
    case "MANAGER_PATCH": {
      return {
        ...state,
        assignments: state.assignments.map((a) => {
          if (a.id !== action.assignmentId) return a;
          if (action.clear) {
            return { ...a, volunteerId: undefined, teamId: undefined, status: "volny_zaskok" };
          }
          return {
            ...a,
            volunteerId: action.volunteerId,
            teamId: action.teamId,
            status: "prirazeno",
          };
        }),
        listings: state.listings.filter((l) => l.assignmentId !== action.assignmentId),
        swaps: state.swaps.map((s) =>
          s.fromAssignmentId === action.assignmentId || s.toAssignmentId === action.assignmentId
            ? { ...s, status: "zruseno" as const }
            : s,
        ),
      };
    }
    case "DELETE_ASSIGNMENT":
      return {
        ...state,
        assignments: state.assignments.filter((a) => a.id !== action.assignmentId),
        listings: state.listings.filter((l) => l.assignmentId !== action.assignmentId),
      };
    case "REQUEST_SWAP": {
      const from = state.assignments.find((a) => a.id === action.fromId);
      const to = state.assignments.find((a) => a.id === action.toId);
      if (!from || !to) return state;
      const target = actorFor(state, to);
      if (!target) return state;
      return {
        ...state,
        assignments: state.assignments.map((a) =>
          a.id === from.id || a.id === to.id ? { ...a, status: "ceka_na_vymenu" } : a,
        ),
        swaps: [
          ...state.swaps,
          {
            id: crypto.randomUUID(),
            serviceId: from.serviceId,
            fromAssignmentId: from.id,
            toAssignmentId: to.id,
            requesterId: state.currentUserId,
            targetId: target,
            status: "ceka",
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }
    case "RESOLVE_SWAP": {
      const swap = state.swaps.find((s) => s.id === action.swapId);
      if (!swap) return state;
      if (!action.accept) {
        return {
          ...state,
          swaps: state.swaps.map((s) =>
            s.id === swap.id ? { ...s, status: "odmitnuto" } : s,
          ),
          assignments: state.assignments.map((a) =>
            a.id === swap.fromAssignmentId || a.id === swap.toAssignmentId
              ? { ...a, status: "prirazeno" }
              : a,
          ),
        };
      }
      const from = state.assignments.find((a) => a.id === swap.fromAssignmentId);
      const to = state.assignments.find((a) => a.id === swap.toAssignmentId);
      if (!from || !to) return state;
      return {
        ...state,
        swaps: state.swaps.map((s) =>
          s.id === swap.id ? { ...s, status: "schvaleno" } : s,
        ),
        assignments: state.assignments.map((a) => {
          if (a.id === from.id) {
            return {
              ...a,
              volunteerId: to.volunteerId,
              teamId: to.teamId,
              status: "prirazeno",
            };
          }
          if (a.id === to.id) {
            return {
              ...a,
              volunteerId: from.volunteerId,
              teamId: from.teamId,
              status: "prirazeno",
            };
          }
          return a;
        }),
      };
    }
    case "REQUEST_SUB": {
      const assignment = state.assignments.find((a) => a.id === action.assignmentId);
      if (!assignment) return state;
      return {
        ...state,
        assignments: state.assignments.map((a) =>
          a.id === assignment.id
            ? { ...a, status: "volny_zaskok", volunteerId: undefined, teamId: undefined }
            : a,
        ),
        listings: [
          ...state.listings.filter((l) => l.assignmentId !== assignment.id),
          {
            id: crypto.randomUUID(),
            assignmentId: assignment.id,
            requestedBy: state.currentUserId,
            listedAt: new Date().toISOString(),
          },
        ],
      };
    }
    case "CLAIM_SUB": {
      const listing = state.listings.find((l) => l.id === action.listingId);
      if (!listing) return state;
      const user = state.profiles.find((p) => p.id === state.currentUserId);
      const assignment = state.assignments.find((a) => a.id === listing.assignmentId);
      if (!assignment || !user) return state;
      const service = state.services.find((s) => s.id === assignment.serviceId);
      const patch: Partial<PlanAssignment> =
        service?.assignmentMode === "tymy"
          ? {
              teamId: state.teams.find((t) => t.managerId === user.id && t.serviceId === service.id)?.id,
              volunteerId: undefined,
            }
          : { volunteerId: user.id, teamId: undefined };
      if (service?.assignmentMode === "tymy" && !patch.teamId) {
        const myTeam = state.teams.find(
          (t) => t.serviceId === service.id && t.memberIds.includes(user.id),
        );
        patch.teamId = myTeam?.id;
      }
      return {
        ...state,
        listings: state.listings.map((l) =>
          l.id === listing.id
            ? { ...l, claimedBy: user.id, claimedAt: new Date().toISOString() }
            : l,
        ),
        assignments: state.assignments.map((a) =>
          a.id === assignment.id
            ? { ...a, ...patch, status: "prirazeno" }
            : a,
        ),
      };
    }
    default:
      return state;
  }
}

type Store = {
  state: ParishState;
  currentUser: Profile;
  dispatch: (action: Action) => void;
  canManageService: (serviceId: string) => boolean;
  managedTeamIds: () => string[];
  canAccessServiceSettings: boolean;
  canAccessTeamSettings: boolean;
  requestSwap: (fromId: string, toId: string) => Result;
  requestSubstitute: (assignmentId: string) => Result;
  claimSubstitute: (listingId: string) => Result;
  periodExists: (serviceId: string, startsOn: string, endsOn: string) => boolean;
  generate: (payload: GeneratePayload, overwrite: boolean) => void;
  isMine: (assignment: PlanAssignment) => boolean;
  canRequestAbsence: (assignment: PlanAssignment) => boolean;
  actorFor: (assignment: PlanAssignment) => Profile | undefined;
  assigneeLabel: (assignment: PlanAssignment) => string;
};

const StoreContext = createContext<Store | null>(null);

const GUEST: Profile = {
  id: "guest",
  fullName: "Host",
  email: "",
  role: "dobrovolnik",
};

export function ParishProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const [state, dispatch] = useReducer(reducer, undefined, createSeedState);
  const skipSave = useRef(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    dispatch({ type: "HYDRATE", state: loadState() });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !ready || !user) return;
    const fullName =
      (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
      user.email?.split("@")[0] ||
      "Dobrovolník";
    dispatch({
      type: "ENSURE_USER",
      profile: {
        id: user.id,
        fullName,
        email: user.email ?? "",
        role: "dobrovolnik",
      },
    });
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase();
    const bootstrapAdmin = Boolean(adminEmail && user.email?.toLowerCase() === adminEmail);
    client
      .from("profiles")
      .select("role, full_name, email")
      .eq("id", user.id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) {
          await client.from("profiles").insert({
            id: user.id,
            full_name: fullName,
            email: user.email ?? "",
            role: bootstrapAdmin ? "hlavni_spravce" : "dobrovolnik",
          });
        }
        const role = bootstrapAdmin
          ? "hlavni_spravce"
          : ((data?.role as AppRole | undefined) ?? "dobrovolnik");
        if (bootstrapAdmin && data?.role !== "hlavni_spravce") {
          await client.from("profiles").update({ role: "hlavni_spravce" }).eq("id", user.id);
        }
        dispatch({ type: "SET_ROLE", userId: user.id, role });
      });
  }, [hydrated, ready, user]);

  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    saveState(state);
  }, [state]);

  const currentUser = state.profiles.find((p) => p.id === state.currentUserId) ?? GUEST;

  const value = useMemo<Store>(() => {
    const canManageService = (serviceId: string) => {
      if (currentUser.role === "hlavni_spravce") return true;
      const service = state.services.find((s) => s.id === serviceId);
      return Boolean(service?.managerIds.includes(currentUser.id));
    };

    const managedTeamIds = () =>
      state.teams.filter((t) => t.managerId === currentUser.id).map((t) => t.id);

    const canAccessServiceSettings =
      currentUser.role === "hlavni_spravce" ||
      state.services.some((s) => s.managerIds.includes(currentUser.id));
    const canAccessTeamSettings =
      currentUser.role === "hlavni_spravce" ||
      state.teams.some((t) => t.managerId === currentUser.id);

    return {
      state,
      currentUser,
      dispatch,
      canManageService,
      managedTeamIds,
      canAccessServiceSettings,
      canAccessTeamSettings,
      periodExists: (serviceId, startsOn, endsOn) =>
        state.periods.some(
          (p) => p.serviceId === serviceId && p.startsOn === startsOn && p.endsOn === endsOn,
        ) ||
        state.assignments.some(
          (a) =>
            a.serviceId === serviceId &&
            a.kind === "standardni" &&
            a.startsAt >= `${startsOn}T00:00:00.000Z` &&
            a.startsAt <= `${endsOn}T23:59:59.999Z`,
        ),
      generate: (payload, overwrite) => dispatch({ type: "GENERATE", payload, overwrite }),
      isMine: (assignment) => isMine(state, assignment, currentUser.id),
      canRequestAbsence: (assignment) => canRequestAbsence(state, assignment, currentUser.id),
      actorFor: (assignment) => {
        const id = actorFor(state, assignment);
        return state.profiles.find((p) => p.id === id);
      },
      assigneeLabel: (assignment) => {
        if (assignment.teamId) {
          return state.teams.find((t) => t.id === assignment.teamId)?.name ?? "Tým";
        }
        if (assignment.volunteerId) {
          return state.profiles.find((p) => p.id === assignment.volunteerId)?.fullName ?? "Dobrovolník";
        }
        return "Neobsazeno";
      },
      requestSwap: (fromId, toId) => {
        const from = state.assignments.find((a) => a.id === fromId);
        const to = state.assignments.find((a) => a.id === toId);
        if (!from || !to) return { ok: false, message: "Termín se nepodařilo najít." };
        if (from.serviceId !== to.serviceId) {
          return { ok: false, message: "Výměna je možná jen v rámci stejné služby." };
        }
        const service = state.services.find((s) => s.id === from.serviceId);
        if (!service?.allowDirectedSwaps) {
          return { ok: false, message: "Adresné výměny u této služby nejsou zapnuté." };
        }
        if (new Date(to.startsAt) <= new Date()) {
          return { ok: false, message: "Cílový termín musí být v budoucnu." };
        }
        const canFrom =
          canRequestAbsence(state, from, currentUser.id) || canManageService(from.serviceId);
        if (!canFrom) {
          return { ok: false, message: "Tento termín nemůžete vyměnit. U týmové služby žádá správce týmu." };
        }
        dispatch({ type: "REQUEST_SWAP", fromId, toId });
        return { ok: true };
      },
      requestSubstitute: (assignmentId) => {
        const assignment = state.assignments.find((a) => a.id === assignmentId);
        if (!assignment) return { ok: false, message: "Termín se nepodařilo najít." };
        const service = state.services.find((s) => s.id === assignment.serviceId);
        if (!service?.allowPublicSubstitutes) {
          return { ok: false, message: "Veřejné záskoky u této služby nejsou zapnuté." };
        }
        const canFrom =
          canRequestAbsence(state, assignment, currentUser.id) || canManageService(assignment.serviceId);
        if (!canFrom) {
          return { ok: false, message: "U týmové služby uvolňuje termín správce týmu." };
        }
        const remaining = hoursUntil(assignment.startsAt);
        if (remaining < service.substituteLeadTimeHours) {
          return {
            ok: false,
            message: `Limit pro záskok vypršel. Žádost je potřeba podat alespoň ${service.substituteLeadTimeHours} h před začátkem služby.`,
          };
        }
        dispatch({ type: "REQUEST_SUB", assignmentId });
        return { ok: true };
      },
      claimSubstitute: (listingId) => {
        const listing = state.listings.find((l) => l.id === listingId);
        if (!listing || listing.claimedBy) {
          return { ok: false, message: "Tento záskok už není volný." };
        }
        const assignment = state.assignments.find((a) => a.id === listing.assignmentId);
        if (!assignment) return { ok: false, message: "Termín se nepodařilo najít." };
        const member = state.memberships.find(
          (m) =>
            m.serviceId === assignment.serviceId &&
            m.userId === currentUser.id &&
            m.status === "schvaleno",
        );
        const teamMember = state.teams.some(
          (t) => t.serviceId === assignment.serviceId && t.memberIds.includes(currentUser.id),
        );
        if (!member && !teamMember && currentUser.role === "dobrovolnik") {
          return { ok: false, message: "Záskok může převzít jen člen této služby." };
        }
        const busy = state.assignments.some(
          (a) =>
            a.id !== assignment.id &&
            a.status !== "volny_zaskok" &&
            isMine(state, a, currentUser.id) &&
            overlaps(a.startsAt, a.endsAt, assignment.startsAt, assignment.endsAt),
        );
        if (busy) {
          return { ok: false, message: "V tomto čase už máte jinou službu." };
        }
        dispatch({ type: "CLAIM_SUB", listingId });
        return { ok: true };
      },
    };
  }, [state, currentUser]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useParish() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useParish musí být uvnitř ParishProvider");
  return ctx;
}

export function useRole(): AppRole {
  return useParish().currentUser.role;
}
