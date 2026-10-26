"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, configured, user, ready } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (ready && user) {
    router.replace("/panel");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-6 font-serif text-2xl">
        Farní služby
      </Link>
      <h1 className="font-serif text-3xl">Registrace</h1>
      <p className="mt-2 text-muted">
        Vytvoříte si účet dobrovolníka. Hlavní správce vám později může v nastavení změnit roli.
      </p>
      {!configured ? (
        <p className="card mt-6 p-4 text-sm">
          Chybí nastavení Supabase. Doplňte klíče do <code>.env.local</code> a spusťte SQL skript.
        </p>
      ) : (
        <form
          className="card mt-6 space-y-3 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setError(null);
            setInfo(null);
            const res = await signUp(fullName.trim(), email.trim(), password);
            setPending(false);
            if (!res.ok) {
              setError(res.message);
              return;
            }
            if (res.needsEmail) {
              setInfo("Účet je založený. Potvrďte e-mail a poté se přihlaste.");
              return;
            }
            router.replace("/panel");
          }}
        >
          <label className="block text-sm font-semibold">
            Jméno a příjmení
            <input
              required
              className="mt-1 w-full rounded-xl border border-line p-3"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold">
            E-mail
            <input
              type="email"
              autoComplete="email"
              required
              className="mt-1 w-full rounded-xl border border-line p-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold">
            Heslo
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className="mt-1 w-full rounded-xl border border-line p-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error ? <p className="text-sm text-rose">{error}</p> : null}
          {info ? <p className="text-sm text-forest">{info}</p> : null}
          <button className="btn btn-primary w-full min-h-12" disabled={pending} type="submit">
            {pending ? "Zakládám účet…" : "Zaregistrovat se"}
          </button>
        </form>
      )}
      <p className="mt-4 text-sm text-muted">
        Už účet máte?{" "}
        <Link className="font-semibold text-forest underline" href="/prihlaseni">
          Přihlaste se
        </Link>
      </p>
    </div>
  );
}
