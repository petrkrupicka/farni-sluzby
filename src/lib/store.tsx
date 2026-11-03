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
import { formatDate, formatDateTime, hoursUntil, overlaps } from "./dates";
import { mergeAboutPage, type AboutPageContent } from "./about-content";
import { sendTemplate } from "./mail";
import { mergeEmailTemplates, type EmailTemplateId, type NotificationPrefs } from "./mail-templates";
import { joinFullName, migrateProfile } from "./profile";
import { addRole, hasRole, isMainAdmin, removeRole } from "./roles";
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
  | { type: "ADD_ROLE"; userId: string; role: AppRole }
  | { type: "REMOVE_ROLE"; userId: string; role: AppRole }
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
  | { type: "CLAIM_SUB"; listingId: string }
  | { type: "DELETE_LISTING"; listingId: string }
  | { type: "DELETE_SWAP"; swapId: string }
  | { type: "DELETE_USER"; userId: string }
  | {
      type: "UPDATE_EMAIL_TEMPLATE";
      id: EmailTemplateId;
      patch: { subject: string; bodyHtml: string };
    }
  | { type: "SET_NOTIFICATION_PREFS"; userId: string; prefs: NotificationPrefs }
  | { type: "SET_ABOUT_PAGE"; page: AboutPageContent }
  | {
      type: "UPDATE_PROFILE";
      userId: string;
      patch: Pick<
        Profile,
        | "firstName"
        | "lastName"
        | "street"
        | "city"
        | "zip"
        | "phone"
        | "googleCalendarSync"
        | "googleEmail"
      >;
    };

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
    profiles: state.profiles.map((profile) => migrateProfile(profile)),
    memberships: state.memberships.map((m) =>
      m.status === "ceka" ? { ...m, status: "schvaleno" } : m,
    ),
    emailTemplates: mergeEmailTemplates(state.emailTemplates),
    aboutPage: mergeAboutPage(state.aboutPage),
  };
}

function peopleOnService(state: ParishState, serviceId: string) {
  const ids = new Set([
    ...approvedIds(state, serviceId),
    ...state.teams.filter((team) => team.serviceId === serviceId).flatMap((team) => team.memberIds),
  ]);
  return state.profiles.filter((profile) => ids.has(profile.id));
}

function assignmentVars(state: ParishState, assignment: PlanAssignment) {
  const service = state.services.find((item) => item.id === assignment.serviceId);
  return {
    sluzba: service?.name ?? "",
    termin: formatDateTime(assignment.startsAt),
    nazev: assignment.title,
  };
}

export function isOnServiceTeam(state: ParishState, userId: string, serviceId: string) {
  return state.teams.some(
    (t) => t.serviceId === serviceId && t.memberIds.includes(userId),
  );
}

export function servicesManagedBy(state: ParishState, userId: string) {
  return state.services.filter((service) => service.managerIds.includes(userId));
}

export function teamsManagedBy(state: ParishState, userId: string) {
  return state.teams.filter((team) => team.managerId === userId);
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
      return migrateState(action.state);
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
                  email: p.email || action.profile.email,
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
          migrateProfile({
            ...action.profile,
            roles: ["dobrovolnik"],
          }),
        ],
      };
    }
    case "UPDATE_PROFILE":
      return {
        ...state,
        profiles: state.profiles.map((p) =>
          p.id === action.userId
            ? {
                ...p,
                ...action.patch,
                fullName: joinFullName(action.patch.firstName, action.patch.lastName),
              }
            : p,
        ),
      };
    case "ADD_ROLE":
      return {
        ...state,
        profiles: state.profiles.map((p) =>
          p.id === action.userId ? { ...p, roles: addRole(p.roles, action.role) } : p,
        ),
      };
    case "REMOVE_ROLE": {
      if (action.role === "dobrovolnik") return state;
      if (action.role === "hlavni_spravce") {
        const otherAdmin = state.profiles.some(
          (p) => p.id !== action.userId && hasRole(p, "hlavni_spravce"),
        );
        if (!otherAdmin) return state;
      }
      if (action.role === "spravce_sluzby" && servicesManagedBy(state, action.userId).length > 0) {
        return state;
      }
      if (action.role === "spravce_tymu" && teamsManagedBy(state, action.userId).length > 0) {
        return state;
      }
      return {
        ...state,
        profiles: state.profiles.map((p) =>
          p.id === action.userId ? { ...p, roles: removeRole(p.roles, action.role) } : p,
        ),
      };
    }
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
          if (p.id === action.userId) return { ...p, roles: addRole(p.roles, "spravce_sluzby") };
          if (previous.includes(p.id) && hasRole(p, "spravce_sluzby") && !stillManages(p.id)) {
            return { ...p, roles: removeRole(p.roles, "spravce_sluzby") };
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
          p.id === action.userId ? { ...p, roles: addRole(p.roles, "spravce_tymu") } : p,
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
          p.id === action.managerId ? { ...p, roles: addRole(p.roles, "spravce_tymu") } : p,
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
    case "DELETE_LISTING": {
      const listing = state.listings.find((item) => item.id === action.listingId);
      if (!listing) return state;
      return {
        ...state,
        listings: state.listings.filter((item) => item.id !== listing.id),
        assignments: state.assignments.map((item) =>
          item.id === listing.assignmentId
            ? { ...item, volunteerId: listing.requestedBy, status: "prirazeno" }
            : item,
        ),
      };
    }
    case "DELETE_SWAP": {
      const swap = state.swaps.find((item) => item.id === action.swapId);
      if (!swap) return state;
      return {
        ...state,
        swaps: state.swaps.filter((item) => item.id !== swap.id),
        assignments:
          swap.status === "ceka"
            ? state.assignments.map((item) =>
                item.id === swap.fromAssignmentId || item.id === swap.toAssignmentId
                  ? { ...item, status: "prirazeno" }
                  : item,
              )
            : state.assignments,
      };
    }
    case "DELETE_USER": {
      if (action.userId === state.currentUserId) return state;
      const person = state.profiles.find((item) => item.id === action.userId);
      if (!person) return state;
      if (
        hasRole(person, "hlavni_spravce") &&
        !state.profiles.some((item) => item.id !== person.id && hasRole(item, "hlavni_spravce"))
      ) {
        return state;
      }
      return {
        ...state,
        profiles: state.profiles.filter((item) => item.id !== person.id),
        memberships: state.memberships.filter((item) => item.userId !== person.id),
        listings: state.listings.filter(
          (item) => item.requestedBy !== person.id && item.claimedBy !== person.id,
        ),
        swaps: state.swaps.filter(
          (item) => item.requesterId !== person.id && item.targetId !== person.id,
        ),
        services: state.services.map((item) => ({
          ...item,
          managerIds: item.managerIds.filter((id) => id !== person.id),
        })),
        teams: state.teams.map((item) => ({
          ...item,
          memberIds: item.memberIds.filter((id) => id !== person.id),
        })),
        assignments: state.assignments.map((item) =>
          item.volunteerId === person.id ? { ...item, volunteerId: undefined } : item,
        ),
      };
    }
    case "UPDATE_EMAIL_TEMPLATE":
      return {
        ...state,
        emailTemplates: {
          ...state.emailTemplates,
          [action.id]: {
            ...state.emailTemplates[action.id],
            subject: action.patch.subject,
            bodyHtml: action.patch.bodyHtml,
          },
        },
      };
    case "SET_NOTIFICATION_PREFS":
      return {
        ...state,
        profiles: state.profiles.map((item) =>
          item.id === action.userId ? { ...item, ...action.prefs } : item,
        ),
      };
    case "SET_ABOUT_PAGE":
      return { ...state, aboutPage: mergeAboutPage(action.page) };
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

const GUEST: Profile = migrateProfile({
  id: "guest",
  fullName: "Host",
  email: "",
  roles: ["dobrovolnik"],
});

export function ParishProvider({ children }: { children: ReactNode }) {
  const { user, ready, localDebug } = useAuth();
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
      profile: migrateProfile({
        id: user.id,
        fullName,
        email: user.email ?? "",
        roles: ["dobrovolnik"],
      }),
    });
    if (localDebug) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase();
    const bootstrapAdmin = Boolean(adminEmail && user.email?.toLowerCase() === adminEmail);
    void Promise.resolve(
      client
        .from("profiles")
        .select("role, roles, full_name, email, notify_new_plan, notify_new_substitute, notify_new_swap")
        .eq("id", user.id)
        .maybeSingle(),
    )
      .then(async ({ data }) => {
        const volunteerRoles: AppRole[] = ["dobrovolnik"];
        const adminRoles: AppRole[] = ["hlavni_spravce", "dobrovolnik"];
        if (!data) {
          await client.from("profiles").insert({
            id: user.id,
            full_name: fullName,
            email: user.email ?? "",
            role: bootstrapAdmin ? "hlavni_spravce" : "dobrovolnik",
            roles: bootstrapAdmin ? adminRoles : volunteerRoles,
            notify_new_plan: true,
            notify_new_substitute: true,
            notify_new_swap: true,
          });
        } else {
          dispatch({
            type: "SET_NOTIFICATION_PREFS",
            userId: user.id,
            prefs: {
              notifyNewPlan: data.notify_new_plan !== false,
              notifyNewSubstitute: data.notify_new_substitute !== false,
              notifyNewSwap: data.notify_new_swap !== false,
            },
          });
        }
        const remoteRoles = Array.isArray(data?.roles) ? (data.roles as AppRole[]) : [];
        const legacy = data?.role as AppRole | undefined;
        if (bootstrapAdmin) {
          await client
            .from("profiles")
            .update({ role: "hlavni_spravce", roles: adminRoles })
            .eq("id", user.id);
          dispatch({ type: "ADD_ROLE", userId: user.id, role: "hlavni_spravce" });
          return;
        }
        for (const role of [...remoteRoles, ...(legacy ? [legacy] : [])]) {
          if (role !== "dobrovolnik") {
            dispatch({ type: "ADD_ROLE", userId: user.id, role });
          }
        }
      })
      .catch(() => {
        /* lokální data dál stačí */
      });
    void Promise.resolve(client.from("email_templates").select("id, subject, body_html")).then(({ data }) => {
      for (const row of data ?? []) {
        if (!row?.id) continue;
        dispatch({
          type: "UPDATE_EMAIL_TEMPLATE",
          id: row.id as EmailTemplateId,
          patch: { subject: row.subject ?? "", bodyHtml: row.body_html ?? "" },
        });
      }
    });
    void Promise.resolve(client.from("about_page").select("payload").eq("id", "about").maybeSingle()).then(
      ({ data }) => {
        if (data?.payload) {
          dispatch({ type: "SET_ABOUT_PAGE", page: mergeAboutPage(data.payload) });
        }
      },
    );
  }, [hydrated, ready, user, localDebug]);

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
      if (isMainAdmin(currentUser)) return true;
      const service = state.services.find((s) => s.id === serviceId);
      return Boolean(service?.managerIds.includes(currentUser.id));
    };

    const managedTeamIds = () =>
      state.teams.filter((t) => t.managerId === currentUser.id).map((t) => t.id);

    const canAccessServiceSettings =
      isMainAdmin(currentUser) ||
      hasRole(currentUser, "spravce_sluzby") ||
      state.services.some((s) => s.managerIds.includes(currentUser.id));
    const canAccessTeamSettings =
      isMainAdmin(currentUser) ||
      hasRole(currentUser, "spravce_tymu") ||
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
      generate: (payload, overwrite) => {
        dispatch({ type: "GENERATE", payload, overwrite });
        const service = state.services.find((item) => item.id === payload.serviceId);
        void sendTemplate(
          state,
          "new_plan",
          peopleOnService(state, payload.serviceId).filter((person) => person.notifyNewPlan),
          {
            sluzba: service?.name ?? "",
            obdobi: `${formatDate(`${payload.startsOn}T12:00:00`)} – ${formatDate(`${payload.endsOn}T12:00:00`)}`,
          },
        );
      },
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
        const targetId = actorFor(state, to);
        const target = state.profiles.find((person) => person.id === targetId);
        if (target?.notifyNewSwap) {
          void sendTemplate(state, "new_swap", [target], {
            ...assignmentVars(state, to),
            nabidka: formatDateTime(from.startsAt),
            zadatel: currentUser.fullName,
          });
        }
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
        void sendTemplate(
          state,
          "new_substitute",
          peopleOnService(state, assignment.serviceId).filter(
            (person) => person.notifyNewSubstitute && person.id !== currentUser.id,
          ),
          {
            ...assignmentVars(state, assignment),
            zadatel: currentUser.fullName,
          },
        );
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
        if (!member && !teamMember && !canManageService(assignment.serviceId)) {
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

export function useHasRole(role: AppRole) {
  return hasRole(useParish().currentUser, role);
}
