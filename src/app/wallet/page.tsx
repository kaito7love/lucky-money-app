"use client";

import { useState } from "react";
import { formatVnd } from "@/lib/formatVnd";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  pool_id: string | null;
  balance_after: number;
  created_at: string;
}

export default function WalletPage() {
  const [phone, setPhone] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/wallet/${encodeURIComponent(phone.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError("Có lỗi xảy ra, vui lòng thử lại.");
        setLoading(false);
        return;
      }
      setBalance(data.balance);
      setTransactions(data.transactions);
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 p-6">
      <button
        onClick={() => window.history.back()}
        className="w-10 h-10 -ml-2 mb-3 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"
        aria-label="Quay lại"
      >
        <span className="material-symbols-outlined">arrow_back</span>
      </button>

      <h1 className="text-2xl font-bold text-envelope mb-1">🧧 Ví lì xì</h1>
      <p className="text-sm text-gray-600 mb-6">Nhập số điện thoại bạn đã dùng để nhận lì xì.</p>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-envelope/20 focus:border-envelope"
          placeholder="09xxxxxxxx"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-envelope text-white rounded-full px-6 py-3 font-semibold shadow-lg shadow-envelope/30 disabled:opacity-50"
        >
          Tra cứu
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {balance !== null && (
        <>
          <div className="bg-envelope-gold/20 rounded-2xl p-4 text-center mb-6">
            <p className="text-xs text-gray-600">Tổng đã nhận</p>
            <p className="text-3xl font-bold text-envelope">{formatVnd(balance)}</p>
          </div>

          <h2 className="font-semibold mb-2">Lịch sử</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-gray-500">Chưa có giao dịch nào.</p>
          ) : (
            <ul className="space-y-2">
              {transactions.map((t) => (
                <li key={t.id} className="flex justify-between items-center bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm shadow-sm">
                  <span className="text-gray-500">{new Date(t.created_at).toLocaleString("vi-VN")}</span>
                  <span className="font-semibold text-envelope">+{formatVnd(t.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
