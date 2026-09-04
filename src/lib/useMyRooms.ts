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

async function fetchRoom(url: string, headers: HeadersInit): Promise<MyRoom | null> {
    try {
        const res = await fetch(url, { headers });
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

/** Pools whose host_phone is the logged-in account's, wherever they were made. */
async function fetchAccountRooms(sessionToken: string): Promise<(MyRoom | null)[]> {
    const headers = { Authorization: `Bearer ${sessionToken}` };
    try {
        const res = await fetch("/api/pools/mine", { headers });
        if (!res.ok) return [];
        const { pools } = await res.json();
        return await Promise.all(
            (pools as { id: string }[]).map((p) => fetchRoom(`/api/pools/${p.id}`, headers))
        );
    } catch {
        return [];
    }
}

/** Pools this browser created, proven by the host_token it stored at the time. */
async function fetchLocalRooms(): Promise<(MyRoom | null)[]> {
    const entries: { id: string; token: string }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(HOST_TOKEN_PREFIX)) continue;
        const token = localStorage.getItem(key);
        if (token) entries.push({ id: key.slice(HOST_TOKEN_PREFIX.length), token });
    }
    return Promise.all(
        entries.map((e) => fetchRoom(`/api/pools/${e.id}`, { "X-Host-Token": e.token }))
    );
}

/**
 * "Your rooms" means one thing at a time, on purpose.
 *
 * Signed in, it is the pools hosted by this account's phone number. A
 * host_token this browser happens to hold for someone else's number does not
 * make that pool the account's, and listing it under the account's own rooms
 * only reads as a mistake — the card says "Host: <someone else>" right under
 * the heading. Those pools stay fully manageable through their direct link;
 * the token is not lost, just not advertised here.
 *
 * Signed out there is no account to scope by, so the stored host_tokens are
 * the only ownership proof available and all of them count.
 */
export function useMyRooms() {
    const { user, token: sessionToken, loading: sessionLoading } = useSession();
    // Depend on the id, not the object: a re-rendered SessionProvider hands back
    // a new `user` object for the same person, which would refetch every room.
    const userId = user?.id;
    const [rooms, setRooms] = useState<MyRoom[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Which list is the right one depends on whether a session exists, so
        // wait for that to settle. Choosing early would flash this browser's
        // host_token rooms at someone who is in fact signed in.
        if (sessionLoading) return;

        let cancelled = false;

        async function load() {
            // Keyed off the resolved user, not the raw token: a stale token that
            // no longer identifies anyone means signed out, and falling back to
            // the stored host_tokens beats showing an empty page to someone who
            // still owns rooms.
            const results =
                userId && sessionToken
                    ? await fetchAccountRooms(sessionToken)
                    : await fetchLocalRooms();

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
    }, [sessionToken, userId, sessionLoading]);

    return { rooms, loading };
}
