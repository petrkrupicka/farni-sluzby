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
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { createSeedState } from "@/lib/seed";
import type { Profile } from "@/lib/types";

const LOCAL_USER_KEY = "farni-sluzby-local-user";

export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string };
};

type AuthContextValue = {
  ready: boolean;
  session: Session | null;
  user: AuthUser | null;
  configured: boolean;
  localDebug: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  signInLocal: (profile: Profile) => void;
  signUp: (
    fullName: string,
    email: string,
    password: string,
  ) => Promise<{ ok: true; needsEmail: boolean } | { ok: false; message: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function isLocalDebugAuthEnabled() {
  // Jen `next dev`. V publikovaném buildu (NODE_ENV=production) se ukázkové účty
  // a banner nesmí objevit, ani kdyby v hostingu zbyla NEXT_PUBLIC_DEV_AUTH.
  return process.env.NODE_ENV === "development";
}

export function localDebugProfiles(): Profile[] {
  return createSeedState().profiles;
}

function profileToUser(profile: Profile): AuthUser {
  return {
    id: profile.id,
    email: profile.email,
    user_metadata: { full_name: profile.fullName },
  };
}

function loadLocalUser(): AuthUser | null {
  if (typeof window === "undefined" || !isLocalDebugAuthEnabled()) return null;
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

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
  const [localUser, setLocalUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    setLocalUser(loadLocalUser());
    const client = getSupabaseBrowserClient();
    if (!client) {
      setReady(true);
      return;
    }
    client.auth
      .getSession()
      .then(({ data }) => {
        if (!loadLocalUser()) setSession(data.session);
      })
      .catch(() => {
        /* neplatný klíč / síť — lokální ladění dál funguje */
      })
      .finally(() => setReady(true));
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      if (loadLocalUser()) return;
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const client = getSupabaseBrowserClient();
    if (!client) return { ok: false as const, message: "Supabase není nastavené. Doplňte URL a anon klíč." };
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { ok: false as const, message: czechAuthMessage(error.message) };
    localStorage.removeItem(LOCAL_USER_KEY);
    setLocalUser(null);
    return { ok: true as const };
  }, []);

  const signInLocal = useCallback((profile: Profile) => {
    const user = profileToUser(profile);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
    setLocalUser(user);
    setSession(null);
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
    localStorage.removeItem(LOCAL_USER_KEY);
    setLocalUser(null);
    const client = getSupabaseBrowserClient();
    await client?.auth.signOut();
    setSession(null);
  }, []);

  const user = localUser ?? (session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        user_metadata: {
          full_name:
            typeof session.user.user_metadata?.full_name === "string"
              ? session.user.user_metadata.full_name
              : undefined,
        },
      }
    : null);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      session,
      user,
      configured,
      localDebug: Boolean(localUser) && isLocalDebugAuthEnabled(),
      signIn,
      signInLocal,
      signUp,
      signOut,
    }),
    [ready, session, user, configured, localUser, signIn, signInLocal, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth musí být uvnitř AuthProvider");
  return ctx;
}
