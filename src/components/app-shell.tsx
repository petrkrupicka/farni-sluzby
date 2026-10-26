"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  Church,
  ClipboardList,
  Handshake,
  LayoutDashboard,
  Menu,
  Settings,
  Store,
  Users,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { ROLE_LABEL } from "@/lib/labels";
import { useAuth } from "@/lib/auth";
import { useParish } from "@/lib/store";

type NavShow = "always" | "service_admin" | "team_settings" | "main_admin";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  show: NavShow;
};

const PRIMARY_NAV: NavItem[] = [
  { href: "/panel", label: "Přehled", icon: LayoutDashboard, show: "always" },
  { href: "/panel/kalendar", label: "Kalendář", icon: CalendarDays, show: "always" },
  { href: "/panel/burza", label: "Burza záskoků", icon: Store, show: "always" },
  { href: "/panel/vymeny", label: "Výměny", icon: Handshake, show: "always" },
  { href: "/panel/schvaleni", label: "Zařazení do týmů", icon: UserCheck, show: "team_settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentUser, canAccessServiceSettings, canAccessTeamSettings } = useParish();
  const { signOut } = useAuth();

  const allowed = (show: NavShow) => {
    if (show === "always") return true;
    if (show === "service_admin") return canAccessServiceSettings;
    if (show === "team_settings") return canAccessTeamSettings;
    if (show === "main_admin") return currentUser.role === "hlavni_spravce";
    return false;
  };

  const primary = PRIMARY_NAV.filter((item) => allowed(item.show));
  const settingsItems: NavItem[] = (
    [
      { href: "/panel/preference", label: "Preference", icon: Sparkles, show: "always" },
      {
        href: "/panel/nastaveni/tymy",
        label: "Týmy",
        icon: Users,
        show: "team_settings",
      },
      {
        href: canAccessServiceSettings ? "/panel/nastaveni/sluzby" : "/panel/sluzby",
        label: "Služby",
        icon: Church,
        show: "always",
      },
      {
        href: "/panel/planovani",
        label: "Plánování služeb",
        icon: ClipboardList,
        show: "service_admin",
      },
      {
        href: "/panel/udalosti",
        label: "Plánování událostí",
        icon: CalendarPlus,
        show: "service_admin",
      },
      {
        href: "/panel/nastaveni/uzivatele",
        label: "Uživatelé a role",
        icon: UserCheck,
        show: "main_admin",
      },
    ] as NavItem[]
  ).filter((item) => allowed(item.show));

  const settingsActive = settingsItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const [settingsOpen, setSettingsOpen] = useState(true);
  const open = settingsOpen || settingsActive;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-line bg-[color:var(--card)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/panel" className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-forest text-white">
              <Church size={20} />
            </span>
            <span>
              <span className="block font-serif text-lg leading-none">Farní služby</span>
              <span className="text-xs text-muted">Správa dobrovolníků</span>
            </span>
          </Link>
          <div className="flex max-w-[60%] items-center gap-2">
            <span className="truncate text-right text-sm">
              <span className="block font-semibold leading-tight">{currentUser.fullName}</span>
              <span className="text-xs text-muted">{ROLE_LABEL[currentUser.role]}</span>
            </span>
            <button
              type="button"
              className="btn btn-ghost min-h-11 px-3 text-sm"
              onClick={() => signOut()}
            >
              Odhlásit
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-5 pb-28 md:pb-8">
        <aside className="hidden w-64 shrink-0 md:block">
          <nav className="card sticky top-24 space-y-1 p-2">
            {primary.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSettingsOpen((value) => !value)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
                  settingsActive ? "bg-[#e4f1eb] text-forest" : "hover:bg-[#f3eee2]"
                }`}
              >
                <Settings size={18} />
                <span className="flex-1">Nastavení</span>
                <ChevronDown size={16} className={`transition ${open ? "rotate-0" : "-rotate-90"}`} />
              </button>
              {open ? (
                <div className="mt-1 space-y-1 border-l border-line ml-5 pl-2">
                  {settingsItems.map((item) => (
                    <NavLink key={item.href + item.label} item={item} pathname={pathname} nested />
                  ))}
                </div>
              ) : null}
            </div>
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-[color:var(--card)] md:hidden">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {[
            { href: "/panel", label: "Přehled", icon: LayoutDashboard },
            { href: "/panel/kalendar", label: "Kalendář", icon: CalendarDays },
            { href: "/panel/burza", label: "Burza", icon: Store },
            { href: "/panel/vymeny", label: "Výměny", icon: Handshake },
            { href: "/panel/vice", label: "Více", icon: Menu },
          ].map((item) => {
            const active =
              item.href === "/panel"
                ? pathname === "/panel"
                : pathname === item.href ||
                  (item.href === "/panel/vice" &&
                    !["/panel", "/panel/kalendar", "/panel/burza", "/panel/vymeny"].includes(pathname));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-12 flex-col items-center justify-center rounded-xl text-[11px] ${
                  active ? "bg-forest text-white" : "text-muted"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function NavLink({
  item,
  pathname,
  nested = false,
}: {
  item: NavItem;
  pathname: string;
  nested?: boolean;
}) {
  const active = pathname === item.href;
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${
        nested ? "py-2" : ""
      } ${active ? "bg-forest text-white" : "hover:bg-[#f3eee2]"}`}
    >
      <Icon size={18} />
      {item.label}
    </Link>
  );
}
