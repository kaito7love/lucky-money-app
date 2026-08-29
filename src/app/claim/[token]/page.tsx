"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocalStorageValue } from "@/lib/useLocalStorageValue";
import { useRouteParams } from "@/lib/useRouteParams";
import ClaimForm from "@/components/claim/ClaimForm/ClaimForm";
import EnvelopeRevealCard from "@/components/claim/EnvelopeRevealCard/EnvelopeRevealCard";
import styles from "./page.module.css";

interface PublicPool {
  id: string;
  name: string;
  host_name: string;
  envelope_count: number;
  remaining: number;
  status: string;
  expires_at: string | null;
  is_private: boolean;
}

interface Receipt {
  name: string;
  phone: string;
  value: number;
  claimed_at: string;
}

type Stage = "loading" | "form" | "closed" | "opened" | "unavailable";

export default function ClaimPage() {
  const params = useRouteParams<{ token: string }>();
  const storedReceiptRaw = useLocalStorageValue(`lucky_claim_${params.token}`);
  const storedReceipt = useMemo<Receipt | null>(() => {
    if (!storedReceiptRaw) return null;
    try {
      return JSON.parse(storedReceiptRaw) as Receipt;
    } catch {
      return null;
    }
  }, [storedReceiptRaw]);

  const [pool, setPool] = useState<PublicPool | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [freshReceipt, setFreshReceipt] = useState<Receipt | null>(null);

  const receipt = freshReceipt ?? storedReceipt;

  useEffect(() => {
    // storedReceiptRaw is undefined until the client-only localStorage read
    // resolves; wait for it so we don't briefly flash the claim form for
    // someone who already claimed on a previous visit.
    if (storedReceiptRaw === undefined) return;

    fetch(`/api/pools/by-qr/${params.token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          if (storedReceipt) {
            setStage("opened");
            return;
          }
          setError(json.error === "POOL_NOT_FOUND" ? "Không tìm thấy lì xì này." : "Có lỗi xảy ra.");
          setStage("unavailable");
          return;
        }
        setPool(json);
        if (storedReceipt) {
          setStage("opened");
        } else if (json.status !== "active" || json.remaining <= 0) {
          setStage("unavailable");
        } else {
          setStage("form");
        }
      })
      .catch(() => {
        if (storedReceipt) {
          setStage("opened");
          return;
        }
        setError("Không thể kết nối máy chủ.");
        setStage("unavailable");
      });
  }, [params.token, storedReceiptRaw, storedReceipt]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qr_token: params.token,
          name,
          phone,
          ...(pool?.is_private ? { pin } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Có lỗi xảy ra.");
        setSubmitting(false);
        if (data.error === "NO_ENVELOPES_LEFT" || data.error === "POOL_CLOSED") {
          setStage("unavailable");
        }
        return;
      }
      const newReceipt: Receipt = {
        name: data.name ?? name,
        phone,
        value: data.value,
        claimed_at: new Date().toISOString(),
      };
      localStorage.setItem(`lucky_claim_${params.token}`, JSON.stringify(newReceipt));
      setFreshReceipt(newReceipt);
      setStage("closed");
    } catch {
      setError("Không thể kết nối máy chủ.");
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <button
        className={styles.backButton}
        onClick={() => window.history.back()}
        aria-label="Quay lại"
      >
        <span className="material-symbols-outlined">arrow_back</span>
      </button>

      {pool && (
        <div className={styles.poolHeader}>
          <h1 className={styles.poolName}>{pool.name}</h1>
          <p className={styles.hostName}>Từ {pool.host_name}</p>
        </div>
      )}

      {stage === "loading" && <p className={styles.centerText}>Đang tải...</p>}

      {stage === "unavailable" && (
        <div className={styles.unavailable}>
          <p className={styles.unavailableEmoji}>🧧</p>
          <p className={styles.centerText}>
            {error ?? "Lì xì này đã hết hoặc đã đóng. Chúc bạn năm sau may mắn hơn!"}
          </p>
        </div>
      )}

      {stage === "form" && (
        <div className={styles.formArea}>
          <ClaimForm
            name={name}
            phone={phone}
            pin={pin}
            isPrivate={pool?.is_private ?? false}
            onNameChange={setName}
            onPhoneChange={setPhone}
            onPinChange={setPin}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={error}
          />
        </div>
      )}

      {(stage === "closed" || stage === "opened") && receipt && (
        <div className={styles.revealArea}>
          <EnvelopeRevealCard
            stage={stage === "closed" ? "closed" : "opened"}
            hostName={pool?.host_name ?? ""}
            claimedValue={receipt.value}
            claimantName={receipt.name}
            onOpen={() => setStage("opened")}
          />
        </div>
      )}
    </div>
  );
}
