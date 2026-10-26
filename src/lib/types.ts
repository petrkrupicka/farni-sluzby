export type AppRole =
  | "hlavni_spravce"
  | "spravce_sluzby"
  | "spravce_tymu"
  | "dobrovolnik";

export type AssignmentMode = "jednotlivci" | "tymy";
export type EventKind = "standardni" | "mimoradna";
export type AssignmentStatus = "prirazeno" | "ceka_na_vymenu" | "volny_zaskok";
export type MembershipStatus = "ceka" | "schvaleno" | "odmitnuto";
export type RequestStatus = "ceka" | "schvaleno" | "odmitnuto" | "zruseno";
export type PlanAlgorithm = "posloupnost" | "ferovy_nahodny";

export type Profile = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: AppRole;
};

export type Service = {
  id: string;
  name: string;
  slug: string;
  assignmentMode: AssignmentMode;
  allowDirectedSwaps: boolean;
  allowPublicSubstitutes: boolean;
  substituteLeadTimeHours: number;
  managerIds: string[];
};

export type Team = {
  id: string;
  serviceId: string;
  name: string;
  managerId: string;
  memberIds: string[];
};

export type ScheduleSlot = {
  id: string;
  serviceId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  label: string;
};

export type Membership = {
  id: string;
  serviceId: string;
  userId: string;
  status: MembershipStatus;
};

export type Preference = {
  userId: string;
  slotId: string;
  available: boolean;
};

export type PlanPeriod = {
  id: string;
  serviceId: string;
  startsOn: string;
  endsOn: string;
  algorithm: PlanAlgorithm;
  generatedAt: string;
};

export type PlanAssignment = {
  id: string;
  serviceId: string;
  slotId?: string;
  periodId?: string;
  startsAt: string;
  endsAt: string;
  kind: EventKind;
  title: string;
  volunteerId?: string;
  teamId?: string;
  status: AssignmentStatus;
  notes?: string;
};

export type SwapRequest = {
  id: string;
  serviceId: string;
  fromAssignmentId: string;
  toAssignmentId: string;
  requesterId: string;
  targetId: string;
  status: RequestStatus;
  createdAt: string;
};

export type SubstituteListing = {
  id: string;
  assignmentId: string;
  requestedBy: string;
  listedAt: string;
  claimedBy?: string;
  claimedAt?: string;
};

export type ParishState = {
  profiles: Profile[];
  services: Service[];
  teams: Team[];
  slots: ScheduleSlot[];
  memberships: Membership[];
  preferences: Preference[];
  periods: PlanPeriod[];
  assignments: PlanAssignment[];
  swaps: SwapRequest[];
  listings: SubstituteListing[];
  currentUserId: string;
};
