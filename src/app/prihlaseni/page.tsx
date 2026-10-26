"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, configured, user, ready } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (ready && user) {
    router.replace("/panel");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-6 font-serif text-2xl">
        Farní služby
      </Link>
      <h1 className="font-serif text-3xl">Přihlášení</h1>
      <p className="mt-2 text-muted">Přihlaste se e-mailem a heslem, které jste zadali při registraci.</p>
      {!configured ? (
        <p className="card mt-6 p-4 text-sm">
          Chybí nastavení Supabase. Doplňte <code>NEXT_PUBLIC_SUPABASE_URL</code> a{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> do <code>.env.local</code> a spusťte{" "}
          <code>supabase/schema.sql</code>.
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
