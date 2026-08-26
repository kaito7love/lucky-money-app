"use client";

import { useEffect, useState } from "react";

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

/**
 * There are no accounts — a host's only proof of ownership is the
 * host_token this browser stored in localStorage when it created the
 * pool. This scans those keys and re-fetches each pool's current state,
 * standing in for a real "my pools" list.
 */
export function useMyRooms() {
    const [rooms, setRooms] = useState<MyRoom[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            const entries: { id: string; token: string }[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key?.startsWith(HOST_TOKEN_PREFIX)) continue;
                const token = localStorage.getItem(key);
                if (token) entries.push({ id: key.slice(HOST_TOKEN_PREFIX.length), token });
            }

            const results = await Promise.all(
                entries.map(async ({ id, token }): Promise<MyRoom | null> => {
                    try {
                        const res = await fetch(`/api/pools/${id}?host_token=${token}`);
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
                })
            );

            if (cancelled) return;
            const valid = results.filter((r): r is MyRoom => r !== null);
            valid.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setRooms(valid);
            setLoading(false);
        }

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    return { rooms, loading };
}
