import {
  CalendarDays,
  CalendarPlus,
  Church,
  ClipboardList,
  Handshake,
  Info,
  LayoutDashboard,
  UserRound,
  Store,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavShow = "always" | "service_admin" | "team_settings" | "main_admin";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  show: NavShow;
  text?: string;
};

export const PRIMARY_NAV: NavItem[] = [
  { href: "/panel", label: "Přehled", icon: LayoutDashboard, show: "always" },
  { href: "/panel/kalendar", label: "Kalendář", icon: CalendarDays, show: "always" },
  { href: "/panel/sluzby", label: "Moje služby", icon: Church, show: "always" },
  { href: "/panel/burza", label: "Burza záskoků", icon: Store, show: "always" },
  { href: "/panel/vymeny", label: "Výměny", icon: Handshake, show: "always" },
  { href: "/panel/profil", label: "Profil", icon: UserRound, show: "always" },
  { href: "/panel/o-aplikaci", label: "O aplikaci", icon: Info, show: "always" },
];

export const SETTINGS_NAV: NavItem[] = [
  {
    href: "/panel/nastaveni/sluzby",
    label: "Správa služeb",
    icon: Church,
    show: "service_admin",
    text: "Rozvrh, správce služby a sloty",
  },
  {
    href: "/panel/schvaleni",
    label: "Správa týmů",
    icon: Users,
    show: "team_settings",
    text: "Zařazení dobrovolníků do čet",
  },
  {
    href: "/panel/planovani",
    label: "Plánování služeb",
    icon: ClipboardList,
    show: "service_admin",
    text: "Plánování rozvrhu na období",
  },
  {
    href: "/panel/udalosti",
    label: "Plánování událostí",
    icon: CalendarPlus,
    show: "service_admin",
    text: "Jednorázové termíny a manažerské změny",
  },
  {
    href: "/panel/nastaveni/uzivatele",
    label: "Uživatelé a role",
    icon: UserCheck,
    show: "main_admin",
    text: "Přidávání rolí k dobrovolníkovi",
  },
];

export function navAllowed(
  show: NavShow,
  access: {
    canAccessServiceSettings: boolean;
    canAccessTeamSettings: boolean;
    isMainAdmin: boolean;
  },
) {
  if (show === "always") return true;
  if (show === "service_admin") return access.canAccessServiceSettings;
  if (show === "team_settings") return access.canAccessTeamSettings;
  if (show === "main_admin") return access.isMainAdmin;
  return false;
}

export function isNavActive(pathname: string, href: string) {
  if (href === "/panel") return pathname === "/panel";
  return pathname === href || pathname.startsWith(`${href}/`);
}
