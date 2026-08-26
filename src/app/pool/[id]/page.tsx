"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useLocalStorageValue } from "@/lib/useLocalStorageValue";
import { useRouteParams } from "@/lib/useRouteParams";
import { POOL_STATUS_LABEL } from "@/lib/poolStatusLabel";
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
  FORBIDDEN: "Bạn không có quyền quản lý lì xì này trên thiết bị này.",
  ENVELOPES_FETCH_FAILED: "Không thể tải danh sách bao lì xì.",
  POOL_NOT_ACTIVE: "Phòng lì xì này không còn đang mở.",
  CLOSE_FAILED: "Không thể đóng phòng, vui lòng thử lại.",
};

/** Pure fetch + parse, no state — callers apply the result via .then(). */
async function fetchPoolData(id: string, hostToken: string): Promise<{ ok: boolean; json: PoolData & { error?: string } }> {
  const res = await fetch(`/api/pools/${id}?host_token=${hostToken}`);
  const json = await res.json();
  return { ok: res.ok, json };
}

function buildClaimUrl(qrToken: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/claim/${qrToken}`;
}

export default function PoolHostPage() {
  const params = useRouteParams<{ id: string }>();
  const hostToken = useLocalStorageValue(`lucky_host_token_${params.id}`);
  const [data, setData] = useState<PoolData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hostToken) return;
    fetchPoolData(params.id, hostToken).then(({ ok, json }) => {
      if (!ok) {
        setError((json.error && ERROR_MESSAGES[json.error]) ?? "Không thể tải dữ liệu, vui lòng thử lại.");
        return;
      }
      setData(json);
    });
  }, [hostToken, params.id]);

  useEffect(() => {
    if (!data) return;
    QRCode.toDataURL(buildClaimUrl(data.pool.qr_token), { width: 260, margin: 1 }).then(setQrDataUrl);
  }, [data]);

  useEffect(() => {
    if (!hostToken) return;
    const channel = supabaseBrowser
      .channel(`pool-${params.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "envelopes", filter: `pool_id=eq.${params.id}` },
        () => {
          fetchPoolData(params.id, hostToken).then(({ ok, json }) => {
            if (!ok) {
              setError((json.error && ERROR_MESSAGES[json.error]) ?? "Không thể tải dữ liệu, vui lòng thử lại.");
              return;
            }
            setData(json);
          });
        }
      )
      .subscribe();
    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [hostToken, params.id]);

  if (hostToken === undefined) {
    return <p className="p-6 text-sm text-gray-600">Đang tải...</p>;
  }
  if (hostToken === null) {
    return (
      <main className="flex-1 p-6">
        <p className="text-red-600">
          Không tìm thấy quyền quản lý cho lì xì này trên thiết bị này. Bạn cần mở đúng liên kết được tạo ra khi tạo lì xì.
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
    if (!hostToken) return;
    if (!window.confirm("Đóng phòng lì xì này ngay? Các bao chưa nhận sẽ không thể nhận được nữa.")) {
      return;
    }
    const res = await fetch(`/api/pools/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host_token: hostToken }),
    });
    if (res.ok) {
      fetchPoolData(params.id, hostToken).then(({ ok, json }) => {
        if (ok) setData(json);
      });
    } else {
      const json = await res.json();
      alert((json.error && ERROR_MESSAGES[json.error]) ?? "Không thể đóng phòng, vui lòng thử lại.");
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
