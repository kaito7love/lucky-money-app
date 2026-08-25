"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useLocalStorageValue } from "@/lib/useLocalStorageValue";
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

const STATUS_LABEL: Record<string, string> = {
  active: "Đang mở",
  completed: "Đã hết bao",
  expired: "Đã hết hạn",
};

/** Pure fetch + parse, no state — callers apply the result via .then(). */
async function fetchPoolData(id: string, hostToken: string): Promise<{ ok: boolean; json: PoolData & { error?: string } }> {
  const res = await fetch(`/api/pools/${id}?host_token=${hostToken}`);
  const json = await res.json();
  return { ok: res.ok, json };
}

export default function PoolHostPage() {
  const params = useParams<{ id: string }>()!;
  const hostToken = useLocalStorageValue(`lucky_host_token_${params.id}`);
  const [data, setData] = useState<PoolData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hostToken) return;
    fetchPoolData(params.id, hostToken).then(({ ok, json }) => {
      if (!ok) {
        setError(json.error ?? "Không thể tải dữ liệu");
        return;
      }
      setData(json);
    });
  }, [hostToken, params.id]);

  useEffect(() => {
    if (!data) return;
    const claimUrl = `${window.location.origin}/claim/${data.pool.qr_token}`;
    QRCode.toDataURL(claimUrl, { width: 260, margin: 1 }).then(setQrDataUrl);
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
              setError(json.error ?? "Không thể tải dữ liệu");
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

  const claimUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/claim/${data.pool.qr_token}`;

  return (
    <ShareRoom
      poolName={data.pool.name}
      hostName={data.pool.host_name}
      statusText={STATUS_LABEL[data.pool.status] ?? data.pool.status}
      qrDataUrl={qrDataUrl}
      claimUrl={claimUrl}
      remaining={data.remaining}
      totalEnvelopes={data.total_envelopes}
      claims={data.claims}
    />
  );
}
