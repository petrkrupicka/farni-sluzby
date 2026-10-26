import type {
  AppRole,
  AssignmentMode,
  AssignmentStatus,
  EventKind,
  MembershipStatus,
  PlanAlgorithm,
  RequestStatus,
} from "./types";

export const ROLE_LABEL: Record<AppRole, string> = {
  hlavni_spravce: "Hlavní správce",
  spravce_sluzby: "Správce služby",
  spravce_tymu: "Správce týmu",
  dobrovolnik: "Dobrovolník",
};

export const MODE_LABEL: Record<AssignmentMode, string> = {
  jednotlivci: "Jednotlivci",
  tymy: "Týmy",
};

export const STATUS_LABEL: Record<AssignmentStatus, string> = {
  prirazeno: "Přiřazeno",
  ceka_na_vymenu: "Čeká na schválení výměny",
  volny_zaskok: "Volný záskok v burze",
};

export const KIND_LABEL: Record<EventKind, string> = {
  standardni: "Standardní plán",
  mimoradna: "Jednorázová událost",
};

export const MEMBERSHIP_LABEL: Record<MembershipStatus, string> = {
  ceka: "Čeká na zařazení do týmu",
  schvaleno: "Člen služby",
  odmitnuto: "Odmítnuto",
};

export const REQUEST_LABEL: Record<RequestStatus, string> = {
  ceka: "Čeká na schválení",
  schvaleno: "Schváleno",
  odmitnuto: "Odmítnuto",
  zruseno: "Zrušeno",
};

export const ALGORITHM_LABEL: Record<PlanAlgorithm, string> = {
  posloupnost: "Opakující se posloupnost",
  ferovy_nahodny: "Náhodný výběr s hlídáním férovosti",
};

export const WEEKDAYS = [
  "Neděle",
  "Pondělí",
  "Úterý",
  "Středa",
  "Čtvrtek",
  "Pátek",
  "Sobota",
];
