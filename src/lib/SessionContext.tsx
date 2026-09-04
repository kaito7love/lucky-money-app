"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocalStorageValue } from "@/lib/useLocalStorageValue";
import { readJson } from "@/lib/apiError";

export interface SessionUser {
    id: string;
    name: string;
    phone: string;
}

interface SessionContextValue {
    user: SessionUser | null;
    token: string | null;
    loading: boolean;
    login: (token: string, user: SessionUser) => void;
    logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);
const SESSION_TOKEN_KEY = "lucky_session_token";

/**
 * Single source of truth for the current session, shared by Sidebar/Profile/
 * ChatInput via context instead of each calling a standalone localStorage
 * hook — useLocalStorageValue only reacts to the cross-tab "storage" event,
 * so independent hook instances would go stale after a same-tab logout.
 *
 * `overrideToken` lets login()/logout() (event handlers, not effects) take
 * effect immediately instead of waiting on storedToken, which only updates
 * on cross-tab "storage" events. `undefined` means "no override yet, defer
 * to storedToken".
 */
export function SessionProvider({ children }: { children: ReactNode }) {
    const storedToken = useLocalStorageValue(SESSION_TOKEN_KEY);
    const [overrideToken, setOverrideToken] = useState<string | null | undefined>(undefined);
    const [user, setUser] = useState<SessionUser | null>(null);
    const [loading, setLoading] = useState(true);

    const token = overrideToken !== undefined ? overrideToken : storedToken;

    useEffect(() => {
        if (token === undefined) return;
        let cancelled = false;

        async function resolveUser(): Promise<SessionUser | null> {
            if (!token) return null;
            const res = await fetch("/api/auth/me", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return null;
            const data = await readJson<{ user?: SessionUser }>(res);
            return data.user ?? null;
        }

        resolveUser()
            .then((resolved) => {
                if (!cancelled) {
                    setUser(resolved);
                    setLoading(false);
                }
            })
            .catch(() => {
                // A request that never got an answer is not proof of being
                // signed out, so `user` is left alone rather than cleared —
                // a dropped connection should not log someone out. Clearing
                // `loading` is the part that must happen either way: it lived
                // only in the success path, so an unhandled rejection here
                // left every page gated on the session waiting for good.
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [token]);

    const login = useCallback((newToken: string, newUser: SessionUser) => {
        localStorage.setItem(SESSION_TOKEN_KEY, newToken);
        setOverrideToken(newToken);
        setUser(newUser);
    }, []);

    const logout = useCallback(async () => {
        if (token) {
            await fetch("/api/auth/logout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ session_token: token }),
            }).catch(() => undefined);
        }
        localStorage.removeItem(SESSION_TOKEN_KEY);
        setOverrideToken(null);
        setUser(null);
    }, [token]);

    return (
        <SessionContext.Provider
            value={{ user, token: token ?? null, loading: loading || token === undefined, login, logout }}
        >
            {children}
        </SessionContext.Provider>
    );
}

export function useSession(): SessionContextValue {
    const ctx = useContext(SessionContext);
    if (!ctx) throw new Error("useSession must be used within SessionProvider");
    return ctx;
}
