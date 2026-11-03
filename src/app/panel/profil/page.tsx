"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useParish } from "@/lib/store";

export default function ProfilePage() {
  const { currentUser, dispatch } = useParish();
  const [firstName, setFirstName] = useState(currentUser.firstName);
  const [lastName, setLastName] = useState(currentUser.lastName);
  const [street, setStreet] = useState(currentUser.street);
  const [city, setCity] = useState(currentUser.city);
  const [zip, setZip] = useState(currentUser.zip);
  const [phone, setPhone] = useState(currentUser.phone);
  const [notifyNewPlan, setNotifyNewPlan] = useState(currentUser.notifyNewPlan);
  const [notifyNewSubstitute, setNotifyNewSubstitute] = useState(currentUser.notifyNewSubstitute);
  const [notifyNewSwap, setNotifyNewSwap] = useState(currentUser.notifyNewSwap);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFirstName(currentUser.firstName);
    setLastName(currentUser.lastName);
    setStreet(currentUser.street);
    setCity(currentUser.city);
    setZip(currentUser.zip);
    setPhone(currentUser.phone);
    setNotifyNewPlan(currentUser.notifyNewPlan);
    setNotifyNewSubstitute(currentUser.notifyNewSubstitute);
    setNotifyNewSwap(currentUser.notifyNewSwap);
  }, [currentUser]);

  return (
    <div>
      <PageHeader
        title="Profil"
        subtitle="Osobní údaje a nastavení synchronizace s Google kalendářem."
      />
      <form
        className="card space-y-3 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaved(false);
          if (!firstName.trim() || !lastName.trim()) {
            setError("Vyplňte jméno i příjmení.");
            return;
          }
          setError(null);
          const patch = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            street: street.trim(),
            city: city.trim(),
            zip: zip.trim(),
            phone: phone.trim(),
            googleCalendarSync: false,
            googleEmail: "",
          };
          const prefs = { notifyNewPlan, notifyNewSubstitute, notifyNewSwap };
          dispatch({ type: "UPDATE_PROFILE", userId: currentUser.id, patch });
          dispatch({ type: "SET_NOTIFICATION_PREFS", userId: currentUser.id, prefs });
          const client = getSupabaseBrowserClient();
          if (client) {
            await client
              .from("profiles")
              .update({
                full_name: `${patch.firstName} ${patch.lastName}`,
                first_name: patch.firstName,
                last_name: patch.lastName,
                street: patch.street,
                city: patch.city,
                zip: patch.zip,
                phone: patch.phone,
                google_calendar_sync: patch.googleCalendarSync,
                google_email: patch.googleEmail,
                notify_new_plan: prefs.notifyNewPlan,
                notify_new_substitute: prefs.notifyNewSubstitute,
                notify_new_swap: prefs.notifyNewSwap,
              })
              .eq("id", currentUser.id);
          }
          setSaved(true);
        }}
      >
        <label className="block text-sm font-semibold">
          Jméno
          <input
            className="mt-1 w-full rounded-xl border border-line p-3"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-semibold">
          Příjmení
          <input
            className="mt-1 w-full rounded-xl border border-line p-3"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-semibold">
          Ulice a číslo
          <input
            className="mt-1 w-full rounded-xl border border-line p-3"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
          />
        </label>
        <label className="block text-sm font-semibold">
          Město
          <input
            className="mt-1 w-full rounded-xl border border-line p-3"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </label>
        <label className="block text-sm font-semibold">
          PSČ
          <input
            className="mt-1 w-full rounded-xl border border-line p-3"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <label className="block text-sm font-semibold">
          Telefon
          <input
            className="mt-1 w-full rounded-xl border border-line p-3"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
          />
        </label>
        <label className="flex min-h-12 items-center gap-3 text-sm font-semibold text-muted">
          <input
            type="checkbox"
            className="h-6 w-6 accent-[color:var(--forest)]"
            checked={false}
            disabled
            readOnly
          />
          Synchronizace Google kalendáře
        </label>
        <label className="block text-sm font-semibold text-muted">
          Gmail
          <input
            className="mt-1 w-full rounded-xl border border-line p-3 disabled:bg-[#f3eee2] disabled:text-muted"
            type="email"
            value=""
            disabled
            readOnly
            placeholder="například jmeno@gmail.com"
          />
        </label>
        <p className="text-sm text-muted">
          Synchronizace do Google kalendáře je zvažována a v přípravě
        </p>
        <h2 className="pt-2 font-serif text-2xl">Upozornění</h2>
        <p className="text-sm text-muted">
          Vyberte, o kterých událostech chcete dostávat e-mail. Nový dobrovolník má vše zapnuté.
        </p>
        <label className="flex min-h-12 items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            className="h-6 w-6 accent-[color:var(--forest)]"
            checked={notifyNewPlan}
            onChange={(e) => setNotifyNewPlan(e.target.checked)}
          />
          Nový plán služeb
        </label>
        <label className="flex min-h-12 items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            className="h-6 w-6 accent-[color:var(--forest)]"
            checked={notifyNewSubstitute}
            onChange={(e) => setNotifyNewSubstitute(e.target.checked)}
          />
          Nová žádost o záskok
        </label>
        <label className="flex min-h-12 items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            className="h-6 w-6 accent-[color:var(--forest)]"
            checked={notifyNewSwap}
            onChange={(e) => setNotifyNewSwap(e.target.checked)}
          />
          Nová žádost o výměnu
        </label>
        {error ? <p className="text-sm text-rose">{error}</p> : null}
        {saved ? <p className="text-sm text-forest">Údaje jsou uložené.</p> : null}
        <button className="btn btn-primary" type="submit">
          Uložit profil
        </button>
      </form>
    </div>
  );
}
