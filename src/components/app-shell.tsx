"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Church, Menu, Settings } from "lucide-react";
import { APP_VERSION } from "@/lib/about-content";
import { isNavActive, navAllowed, PRIMARY_NAV, SETTINGS_NAV, type NavItem } from "@/lib/nav";
import { isMainAdmin, rolesLabel } from "@/lib/roles";
import { useAuth } from "@/lib/auth";
import { useParish } from "@/lib/store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentUser, canAccessServiceSettings, canAccessTeamSettings } = useParish();
  const { signOut, localDebug } = useAuth();
  const access = {
    canAccessServiceSettings,
    canAccessTeamSettings,
    isMainAdmin: isMainAdmin(currentUser),
  };

  const primary = PRIMARY_NAV.filter((item) => navAllowed(item.show, access));
  const settingsItems = SETTINGS_NAV.filter((item) => navAllowed(item.show, access));
  const showSettings = settingsItems.length > 0;

  const settingsActive = settingsItems.some((item) => isNavActive(pathname, item.href));
  const [settingsOpen, setSettingsOpen] = useState(true);
  const open = settingsOpen || settingsActive;

  const mobileTabs = [
    { href: "/panel", label: "Přehled", icon: PRIMARY_NAV[0].icon },
    { href: "/panel/kalendar", label: "Kalendář", icon: PRIMARY_NAV[1].icon },
    { href: "/panel/sluzby", label: "Služby", icon: PRIMARY_NAV[2].icon },
    { href: "/panel/burza", label: "Burza", icon: PRIMARY_NAV[3].icon },
    { href: "/panel/vice", label: "Více", icon: Menu },
  ];

  return (
    <div className="min-h-screen bg-background">
      {localDebug ? (
        <p className="bg-gold/30 px-4 py-2 text-center text-xs font-medium text-foreground">
          Lokální ladění — bez Supabase. V produkci se tato volba nezobrazí.
        </p>
      ) : null}
      <header className="sticky top-0 z-20 border-b border-line bg-[color:var(--card)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/panel" className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-forest text-white">
              <Church size={20} />
            </span>
            <span>
              <span className="block font-serif text-lg leading-none">
                Farní služby, verze {APP_VERSION}
              </span>
              <span className="text-xs text-muted">Správa dobrovolníků</span>
            </span>
          </Link>
          <div className="flex max-w-[60%] items-center gap-2">
            <span className="truncate text-right text-sm">
              <span className="block font-semibold leading-tight">{currentUser.fullName}</span>
              <span className="text-xs text-muted">{rolesLabel(currentUser)}</span>
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
            {showSettings ? (
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
            ) : null}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-[color:var(--card)] md:hidden">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {mobileTabs.map((item) => {
            const active =
              item.href === "/panel/vice"
                ? pathname === "/panel/vice" ||
                  pathname === "/panel/vymeny" ||
                  pathname === "/panel/o-aplikaci" ||
                  pathname === "/panel/profil" ||
                  settingsItems.some((setting) => isNavActive(pathname, setting.href))
                : isNavActive(pathname, item.href);
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
  const active = isNavActive(pathname, item.href);
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
