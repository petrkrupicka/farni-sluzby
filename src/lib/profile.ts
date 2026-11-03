import { DEFAULT_NOTIFICATION_PREFS } from "./mail-templates";
import { migrateProfileRoles } from "./roles";
import type { AppRole, Profile } from "./types";

export function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function joinFullName(firstName: string, lastName: string) {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

export function emptyProfileFields(): Pick<
  Profile,
  | "street"
  | "city"
  | "zip"
  | "phone"
  | "googleCalendarSync"
  | "googleEmail"
  | "notifyNewPlan"
  | "notifyNewSubstitute"
  | "notifyNewSwap"
> {
  return {
    street: "",
    city: "",
    zip: "",
    phone: "",
    googleCalendarSync: false,
    googleEmail: "",
    ...DEFAULT_NOTIFICATION_PREFS,
  };
}

export function migrateProfile(profile: {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  roles?: AppRole[];
  role?: AppRole;
  firstName?: string;
  lastName?: string;
  street?: string;
  city?: string;
  zip?: string;
  googleCalendarSync?: boolean;
  googleEmail?: string;
  notifyNewPlan?: boolean;
  notifyNewSubstitute?: boolean;
  notifyNewSwap?: boolean;
}): Profile {
  const withRoles = migrateProfileRoles(profile);
  const split = splitFullName(withRoles.fullName);
  const firstName = profile.firstName?.trim() || split.firstName;
  const lastName = profile.lastName?.trim() || split.lastName;
  return {
    ...withRoles,
    firstName,
    lastName,
    fullName: joinFullName(firstName, lastName) || withRoles.fullName,
    street: profile.street ?? "",
    city: profile.city ?? "",
    zip: profile.zip ?? "",
    phone: profile.phone ?? "",
    googleCalendarSync: Boolean(profile.googleCalendarSync),
    googleEmail: profile.googleEmail ?? "",
    notifyNewPlan: profile.notifyNewPlan !== false,
    notifyNewSubstitute: profile.notifyNewSubstitute !== false,
    notifyNewSwap: profile.notifyNewSwap !== false,
  };
}
