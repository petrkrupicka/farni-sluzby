"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isLocalDebugAuthEnabled, localDebugProfiles, useAuth } from "@/lib/auth";
import { rolesLabel } from "@/lib/roles";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signInLocal, configured, user, ready } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const localEnabled = isLocalDebugAuthEnabled();

  useEffect(() => {
    if (ready && user) router.replace("/panel");
  }, [ready, user, router]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-6 font-serif text-2xl">
        Farní služby
      </Link>
      <h1 className="font-serif text-3xl">Přihlášení</h1>
      <p className="mt-2 text-muted">Přihlaste se e-mailem a heslem, které jste zadali při registraci.</p>

      {localEnabled ? (
        <section className="card mt-6 space-y-3 p-5">
          <h2 className="font-serif text-xl">Lokální ladění</h2>
          <p className="text-sm text-muted">
            Supabase Auth teď není potřeba. Vyberte ukázkový účet a hned ladíte funkce verze 2.0. V produkčním
            nasazení se tato sekce nezobrazí.
          </p>
          <div className="grid gap-2">
            {localDebugProfiles().map((profile) => (
              <button
                key={profile.id}
                type="button"
                className="btn btn-ghost min-h-12 justify-between px-3 text-left"
                onClick={() => {
                  signInLocal(profile);
                  router.replace("/panel");
                }}
              >
                <span>
                  <span className="block font-semibold">{profile.fullName}</span>
                  <span className="text-xs text-muted">{profile.email}</span>
                </span>
                <span className="text-xs text-muted">{rolesLabel(profile)}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!configured ? (
        <p className="card mt-6 p-4 text-sm">
          {localEnabled
            ? "Supabase Auth teď není připojené. Pro ostré přihlášení doplňte URL a anon klíč do .env.local a v dashboardu vypněte potvrzení e-mailu, pokud chcete zkoušet i reálné účty."
            : (
              <>
                Chybí nastavení Supabase. Doplňte <code>NEXT_PUBLIC_SUPABASE_URL</code> a{" "}
                <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> do <code>.env.local</code> a spusťte{" "}
                <code>supabase/schema.sql</code>.
              </>
            )}
        </p>
      ) : (
        <form
          className="card mt-6 space-y-3 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setError(null);
            const res = await signIn(email.trim(), password);
            setPending(false);
            if (!res.ok) {
              setError(res.message);
              return;
            }
            router.replace("/panel");
          }}
        >
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
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-xl border border-line p-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error ? <p className="text-sm text-rose">{error}</p> : null}
          <button className="btn btn-primary w-full min-h-12" disabled={pending} type="submit">
            {pending ? "Přihlašuji…" : "Přihlásit se"}
          </button>
        </form>
      )}
      <p className="mt-4 text-sm text-muted">
        Nemáte účet?{" "}
        <Link className="font-semibold text-forest underline" href="/registrace">
          Zaregistrujte se
        </Link>
      </p>
    </div>
  );
}
