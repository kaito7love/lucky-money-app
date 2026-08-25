export type PoolMode = "fixed" | "random";
export type PoolStatus = "active" | "completed" | "expired";

export interface Pool {
  id: string;
  name: string;
  host_name: string;
  host_token: string;
  total_amount: number;
  envelope_count: number;
  mode: PoolMode;
  min_value: number | null;
  max_value: number | null;
  qr_token: string;
  status: PoolStatus;
  expires_at: string | null;
  created_at: string;
}

/** Fields safe to show to guests/anyone with the link — no host_token. */
export type PublicPool = Omit<Pool, "host_token">;

export interface Envelope {
  id: string;
  pool_id: string;
  value: number;
  is_claimed: boolean;
  claimed_name: string | null;
  claimed_phone: string | null;
  claimed_at: string | null;
}

export interface WalletTransaction {
  id: string;
  phone_number: string;
  amount: number;
  type: "envelope_claim" | "adjustment";
  pool_id: string | null;
  envelope_id: string | null;
  balance_after: number;
  created_at: string;
}

export interface CreatePoolInput {
  name: string;
  host_name: string;
  total_amount: number;
  envelope_count: number;
  mode: PoolMode;
  min_value?: number;
  max_value?: number;
  fixed_values?: number[];
  expires_in_hours?: number;
}
