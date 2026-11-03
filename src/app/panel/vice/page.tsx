"use client";

import Link from "next/link";
import { Handshake, Info, Settings, UserRound } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { navAllowed, PRIMARY_NAV, SETTINGS_NAV } from "@/lib/nav";
import { isMainAdmin } from "@/lib/roles";
import { useParish } from "@/lib/store";

export default function MorePage() {
  const { currentUser, canAccessServiceSettings, canAccessTeamSettings } = useParish();
  const access = {
    canAccessServiceSettings,
    canAccessTeamSettings,
    isMainAdmin: isMainAdmin(currentUser),
  };
  const settings = SETTINGS_NAV.filter((item) => navAllowed(item.show, access));
  const vymeny = PRIMARY_NAV.find((item) => item.href === "/panel/vymeny");
  const profile = PRIMARY_NAV.find((item) => item.href === "/panel/profil");
  const about = PRIMARY_NAV.find((item) => item.href === "/panel/o-aplikaci");

  return (
    <div>
      <PageHeader
        title="Další nabídka"
        subtitle="Další položky, které se nevešly do dolní lišty."
      />
      <div className="mb-6 grid gap-3">
        {vymeny ? (
          <Link href={vymeny.href} className="card flex min-h-16 items-center gap-4 p-4">
            <Handshake className="text-forest" />
            <span>
              <span className="block font-semibold">{vymeny.label}</span>
              <span className="text-sm text-muted">Adresné výměny termínů</span>
            </span>
          </Link>
        ) : null}
        {profile ? (
          <Link href={profile.href} className="card flex min-h-16 items-center gap-4 p-4">
            <UserRound className="text-forest" />
            <span>
              <span className="block font-semibold">{profile.label}</span>
              <span className="text-sm text-muted">Osobní údaje a kalendář</span>
            </span>
          </Link>
        ) : null}
        {about ? (
          <Link href={about.href} className="card flex min-h-16 items-center gap-4 p-4">
            <Info className="text-forest" />
            <span>
              <span className="block font-semibold">{about.label}</span>
              <span className="text-sm text-muted">K čemu aplikace slouží a jak začít</span>
            </span>
          </Link>
        ) : null}
      </div>
      {settings.length > 0 ? (
        <>
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
        </>
      ) : null}
    </div>
  );
}
