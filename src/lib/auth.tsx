"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AuthContextValue = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  signUp: (
    fullName: string,
    email: string,
    password: string,
  ) => Promise<{ ok: true; needsEmail: boolean } | { ok: false; message: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function czechAuthMessage(error: string) {
  const text = error.toLowerCase();
  if (text.includes("invalid login")) return "E-mail nebo heslo nesouhlasí.";
  if (text.includes("already registered") || text.includes("already been registered")) {
    return "Tento e-mail už je registrovaný. Přihlaste se.";
  }
  if (text.includes("password")) return "Heslo je příliš krátké. Použijte alespoň 6 znaků.";
  if (text.includes("email")) return "Zkontrolujte zadaný e-mail.";
  return "Přihlášení se nepodařilo. Zkuste to znovu.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setReady(true);
      return;
    }
    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const client = getSupabaseBrowserClient();
    if (!client) return { ok: false as const, message: "Supabase není nastavené. Doplňte URL a anon klíč." };
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { ok: false as const, message: czechAuthMessage(error.message) };
    return { ok: true as const };
  }, []);

  const signUp = useCallback(async (fullName: string, email: string, password: string) => {
    const client = getSupabaseBrowserClient();
    if (!client) return { ok: false as const, message: "Supabase není nastavené. Doplňte URL a anon klíč." };
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/prihlaseni`,
      },
    });
    if (error) return { ok: false as const, message: czechAuthMessage(error.message) };
    return { ok: true as const, needsEmail: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    const client = getSupabaseBrowserClient();
    await client?.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      configured,
      signIn,
      signUp,
      signOut,
    }),
    [ready, session, configured, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth musí být uvnitř AuthProvider");
  return ctx;
}
