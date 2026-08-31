"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useLocalStorageValue } from "@/lib/useLocalStorageValue";
import { useRouteParams } from "@/lib/useRouteParams";
import { useSession } from "@/lib/SessionContext";
import { POOL_STATUS_LABEL } from "@/lib/poolStatusLabel";
import { apiErrorMessage, readJson, type ApiErrorBody } from "@/lib/apiError";
import ShareRoom from "@/components/share/ShareRoom";

interface Claim {
  id: string;
  value: number;
  name: string | null;
  phone_masked: string | null;
  claimed_at: string | null;
}

interface PoolData {
  pool: {
    id: string;
    name: string;
    host_name: string;
    total_amount: number;
    envelope_count: number;
    mode: string;
    qr_token: string;
    status: string;
    expires_at: string | null;
  };
  remaining: number;
  total_envelopes: number;
  claims: Claim[];
}

const ERROR_MESSAGES: Record<string, string> = {
  MISSING_HOST_TOKEN: "Thiếu quyền quản lý cho lì xì này.",
  POOL_NOT_FOUND: "Không tìm thấy lì xì này.",
  FORBIDDEN: "Bạn không có quyền quản lý lì xì này.",
  ENVELOPES_FETCH_FAILED: "Không thể tải danh sách bao lì xì.",
  POOL_NOT_ACTIVE: "Phòng lì xì này không còn đang mở.",
  CLOSE_FAILED: "Không thể đóng phòng, vui lòng thử lại.",
  POOL_LOOKUP_FAILED: "Không thể tải lì xì này, vui lòng thử lại.",
};

/** Pure fetch + parse, no state — callers apply the result via .then(). authQuery is
 * either "host_token=..." (this device created the pool) or "session_token=..."
 * (recovered by logging in as the account whose phone matches the pool's host).
 * The response comes back alongside the body so callers can word a failure from
 * its status; parsing through readJson keeps a bodiless 500 from rejecting here,
 * where nothing is watching for it and the page would just sit on "Đang tải...". */
async function fetchPoolData(id: string, authQuery: string): Promise<{ res: Response; json: PoolData & ApiErrorBody }> {
  const res = await fetch(`/api/pools/${id}?${authQuery}`);
  const json = await readJson<PoolData & ApiErrorBody>(res);
  return { res, json };
}

/** Fast enough that a host watching guests scan sees names appear as they go,
 * slow enough that a pool left open on a screen all evening stays cheap. */
const POLL_INTERVAL_MS = 5000;

function buildClaimUrl(qrToken: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/claim/${qrToken}`;
}

export default function PoolHostPage() {
  const params = useRouteParams<{ id: string }>();
  const hostToken = useLocalStorageValue(`lucky_host_token_${params.id}`);
  const { token: sessionToken, loading: sessionLoading } = useSession();
  const [data, setData] = useState<PoolData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const authReady = hostToken !== undefined && !sessionLoading;
  const authQuery = hostToken ? `host_token=${hostToken}` : sessionToken ? `session_token=${sessionToken}` : null;

  useEffect(() => {
    if (!authQuery) return;
    fetchPoolData(params.id, authQuery).then(({ res, json }) => {
      if (!res.ok) {
        setError(apiErrorMessage(res, json, ERROR_MESSAGES));
        return;
      }
      setData(json);
    });
  }, [authQuery, params.id]);

  useEffect(() => {
    if (!data) return;
    QRCode.toDataURL(buildClaimUrl(data.pool.qr_token), { width: 260, margin: 1 }).then(setQrDataUrl);
  }, [data]);

  // Polled rather than subscribed. The Supabase realtime path this replaced
  // never fired: postgres_changes needs the subscribing role to hold select on
  // the table, and the browser connects as anon, which is granted nothing (see
  // 0002_grants.sql). Granting anon select would have made it work by exposing
  // every envelope's claimed_phone and value over the REST API, so the live
  // view is driven from the host-authenticated endpoint instead.
  useEffect(() => {
    if (!authQuery) return;

    let cancelled = false;
    const refresh = () => {
      // A backgrounded tab would otherwise keep polling for nothing.
      if (document.visibilityState !== "visible") return;
      fetchPoolData(params.id, authQuery).then(({ res, json }) => {
        if (cancelled || !res.ok) return;
        setData(json);
      });
    };

    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [authQuery, params.id]);

  if (!authReady) {
    return <p className="p-6 text-sm text-gray-600">Đang tải...</p>;
  }
  if (!authQuery) {
    return (
      <main className="flex-1 p-6">
        <p className="text-red-600">
          Không tìm thấy quyền quản lý cho lì xì này trên thiết bị này. Bạn cần mở đúng liên kết được tạo ra khi tạo lì xì, hoặc đăng nhập bằng số điện thoại đã dùng để tạo phòng.
        </p>
      </main>
    );
  }
  if (error) {
    return <p className="p-6 text-sm text-red-600">{error}</p>;
  }
  if (!data) {
    return <p className="p-6 text-sm text-gray-600">Đang tải...</p>;
  }

  const claimUrl = buildClaimUrl(data.pool.qr_token);

  async function handleClosePool() {
    if (!authQuery) return;
    if (!window.confirm("Đóng phòng lì xì này ngay? Các bao chưa nhận sẽ không thể nhận được nữa.")) {
      return;
    }
    const res = await fetch(`/api/pools/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hostToken ? { host_token: hostToken } : { session_token: sessionToken }),
    });
    if (res.ok) {
      fetchPoolData(params.id, authQuery).then(({ res: refreshed, json }) => {
        if (refreshed.ok) setData(json);
      });
    } else {
      const json = await readJson<ApiErrorBody>(res);
      alert(apiErrorMessage(res, json, ERROR_MESSAGES));
    }
  }

  return (
    <ShareRoom
      poolName={data.pool.name}
      hostName={data.pool.host_name}
      statusText={POOL_STATUS_LABEL[data.pool.status] ?? data.pool.status}
      qrDataUrl={qrDataUrl}
      claimUrl={claimUrl}
      remaining={data.remaining}
      totalEnvelopes={data.total_envelopes}
      claims={data.claims}
      onClosePool={data.pool.status === "active" ? handleClosePool : undefined}
    />
  );
}
