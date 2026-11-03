import { ROLE_LABEL } from "./labels";
import type { AppRole, Profile } from "./types";

export const ROLE_ORDER: AppRole[] = [
  "hlavni_spravce",
  "spravce_sluzby",
  "spravce_tymu",
  "dobrovolnik",
];

export const ASSIGNABLE_ROLES: AppRole[] = ROLE_ORDER.filter((role) => role !== "dobrovolnik");

export function normalizeRoles(roles: AppRole[]): AppRole[] {
  const set = new Set(roles);
  set.add("dobrovolnik");
  return ROLE_ORDER.filter((role) => set.has(role));
}

export function isDemoProfileId(id: string) {
  return id.startsWith("u-");
}

export function hasRole(profile: Pick<Profile, "roles">, role: AppRole) {
  return profile.roles.includes(role);
}

export function isMainAdmin(profile: Pick<Profile, "roles">) {
  return hasRole(profile, "hlavni_spravce");
}

export function addRole(roles: AppRole[], role: AppRole) {
  return normalizeRoles([...roles, role]);
}

export function removeRole(roles: AppRole[], role: AppRole) {
  if (role === "dobrovolnik") return normalizeRoles(roles);
  return normalizeRoles(roles.filter((item) => item !== role));
}

export function rolesLabel(profile: Pick<Profile, "roles">) {
  return profile.roles.map((role) => ROLE_LABEL[role]).join(" · ");
}

export function migrateProfileRoles(
  profile: { id: string; fullName: string; email: string; phone?: string; roles?: AppRole[]; role?: AppRole },
) {
  const fromArray = Array.isArray(profile.roles) ? profile.roles : [];
  const fromLegacy = profile.role ? [profile.role] : [];
  return {
    id: profile.id,
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    roles: normalizeRoles([...fromArray, ...fromLegacy]),
  };
}
