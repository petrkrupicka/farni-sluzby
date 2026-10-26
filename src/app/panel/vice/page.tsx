"use client";

import Link from "next/link";
import {
  CalendarPlus,
  Church,
  ClipboardList,
  Settings,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useParish } from "@/lib/store";

export default function MorePage() {
  const { currentUser, canAccessServiceSettings, canAccessTeamSettings } = useParish();

  const operations = canAccessTeamSettings
    ? [
        {
          href: "/panel/schvaleni",
          label: "Zařazení do týmů",
          text: "Dobrovolníci čekající na četu",
          icon: UserCheck,
        },
      ]
    : [];

  const settings = [
    {
      href: "/panel/preference",
      label: "Preference",
      text: "Dostupnost u služeb pro jednotlivce",
      icon: Sparkles,
    },
    ...(canAccessTeamSettings
      ? [
          {
            href: "/panel/nastaveni/tymy",
            label: "Týmy",
            text: "Správce týmu a členové čety",
            icon: Users,
          },
        ]
      : []),
    {
      href: canAccessServiceSettings ? "/panel/nastaveni/sluzby" : "/panel/sluzby",
      label: "Služby",
      text: canAccessServiceSettings
        ? "Výměny, záskoky, správce služby a rozvrh"
        : "Přihlášení k farní službě",
      icon: Church,
    },
    ...(canAccessServiceSettings
      ? [
          {
            href: "/panel/planovani",
            label: "Plánování služeb",
            text: "Plánování rozvrhu na období",
            icon: ClipboardList,
          },
          {
            href: "/panel/udalosti",
            label: "Plánování událostí",
            text: "Jednorázové termíny a manažerské změny",
            icon: CalendarPlus,
          },
        ]
      : []),
    ...(currentUser.role === "hlavni_spravce"
      ? [
          {
            href: "/panel/nastaveni/uzivatele",
            label: "Uživatelé a role",
            text: "Změna role dobrovolníka",
            icon: UserCheck,
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader title="Další nabídka" subtitle="Stejná hierarchická struktura jako v levém menu." />
      {operations.length > 0 ? (
        <div className="mb-6 grid gap-3">
          {operations.map((item) => (
            <Link key={item.href} href={item.href} className="card flex min-h-16 items-center gap-4 p-4">
              <item.icon className="text-forest" />
              <span>
                <span className="block font-semibold">{item.label}</span>
                <span className="text-sm text-muted">{item.text}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : null}
      <h2 className="mb-3 flex items-center gap-2 font-serif text-2xl">
        <Settings className="text-forest" size={22} />
        Nastavení
      </h2>
      <div className="grid gap-3">
        {settings.map((item) => (
          <Link key={item.href} href={item.href} className="card flex min-h-16 items-center gap-4 p-4">
            <item.icon className="text-forest" />
            <span>
              <span className="block font-semibold">{item.label}</span>
              <span className="text-sm text-muted">{item.text}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
