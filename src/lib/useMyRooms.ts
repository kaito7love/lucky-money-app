"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/SessionContext";

export interface MyRoom {
    id: string;
    name: string;
    hostName: string;
    status: string;
    totalEnvelopes: number;
    claimedCount: number;
    createdAt: string;
}

const HOST_TOKEN_PREFIX = "lucky_host_token_";

async function fetchRoom(url: string): Promise<MyRoom | null> {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const json = await res.json();
        return {
            id: json.pool.id,
            name: json.pool.name,
            hostName: json.pool.host_name,
            status: json.pool.status,
            totalEnvelopes: json.total_envelopes,
            claimedCount: json.claims.length,
            createdAt: json.pool.created_at,
        };
    } catch {
        return null;
    }
}

/**
 * A host's proof of ownership is either the host_token this browser stored
 * in localStorage when it created the pool (fast, single-device path), or
 * being logged in as the account whose phone matches the pool's host_phone
 * (recovery path — surfaces rooms created on a different device).
 */
export function useMyRooms() {
    const { token: sessionToken } = useSession();
    const [rooms, setRooms] = useState<MyRoom[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            const localEntries: { id: string; token: string }[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key?.startsWith(HOST_TOKEN_PREFIX)) continue;
                const token = localStorage.getItem(key);
                if (token) localEntries.push({ id: key.slice(HOST_TOKEN_PREFIX.length), token });
            }

            const localResults = await Promise.all(
                localEntries.map((e) => fetchRoom(`/api/pools/${e.id}?host_token=${e.token}`))
            );

            let recoveredResults: (MyRoom | null)[] = [];
            if (sessionToken) {
                try {
                    const res = await fetch(`/api/pools/mine?session_token=${sessionToken}`);
                    if (res.ok) {
                        const { pools } = await res.json();
                        const localIds = new Set(localEntries.map((e) => e.id));
                        const missing = (pools as { id: string }[]).filter((p) => !localIds.has(p.id));
                        recoveredResults = await Promise.all(
                            missing.map((p) => fetchRoom(`/api/pools/${p.id}?session_token=${sessionToken}`))
                        );
                    }
                } catch {
                    // Recovery path is best-effort; local rooms still show if this fails.
                }
            }

            if (cancelled) return;
            const valid = [...localResults, ...recoveredResults].filter((r): r is MyRoom => r !== null);
            valid.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setRooms(valid);
            setLoading(false);
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [sessionToken]);

    return { rooms, loading };
}
