# Lucky Money — Lì Xì Nhóm

MVP đầu tiên: Host tạo một pool lì xì (tổng tiền + số bao, chia cố định hoặc
random có min/max), chia sẻ QR, khách quét QR nhập tên + số điện thoại để
nhận một bao ngẫu nhiên. Host xem danh sách nhận trực tiếp (realtime).

## Quyết định thiết kế chính

- **Không có tài khoản đầy đủ.** Guest chỉ xác thực bằng tên + số điện
  thoại (không OTP/OAuth) — đây là lựa chọn có chủ đích để ưu tiên tốc độ
  cho bản đầu tiên. Số điện thoại đóng vai trò định danh cho ví điểm.
- **Host quản lý pool qua `host_token`** — một chuỗi bí mật được sinh khi
  tạo pool, lưu trong `localStorage` trình duyệt. Mất token = mất quyền
  quản lý (không có khôi phục ở bản này).
- **Ví là ledger (append-only)** ở `wallet_transactions`, không phải một
  cột `balance` đơn giản — chuẩn bị sẵn cho việc sau này thêm quy đổi ra
  tiền thật/voucher mà không phải viết lại hệ thống ví.
- **Random chia bao** dùng thuật toán kiểu WeChat hongbao
  (`src/lib/envelopes.ts`) — đảm bảo mọi bao đều nằm trong [min, max] và
  tổng đúng bằng tổng pool.
- **Chống trùng bao khi nhiều người quét cùng lúc**: hàm `claim_envelope()`
  trong Postgres khoá row của pool trước (`FOR UPDATE`), nên các lượt nhận
  trong cùng một pool được xử lý tuần tự — ưu tiên đúng đắn hơn thông lượng
  thô, phù hợp quy mô vài chục–vài trăm người/pool.
- **Tra cứu ví bằng số điện thoại** không cần mật khẩu — đây là đánh đổi
  quyền riêng tư đã thống nhất cho bản MVP (bất kỳ ai biết số điện thoại
  của bạn có thể xem tổng bạn đã nhận).

## Cài đặt

1. Tạo project trên [Supabase](https://supabase.com), lấy `Project URL`,
   `anon key`, `service_role key`.
2. Copy `.env.example` thành `.env.local` và điền các giá trị trên.
3. Chạy migration `supabase/migrations/0001_init.sql` trong SQL Editor của
   Supabase (tạo bảng `pools`, `envelopes`, `wallet_transactions`, hàm
   `claim_envelope()`, và bật realtime cho bảng `envelopes`).
4. Cài dependencies và chạy dev server:

   ```bash
   npm install
   npm run dev
   ```

5. Mở `http://localhost:3000`.

## Luồng sử dụng

- **Host**: `/create` → điền thông tin pool → nhận QR tại `/pool/[id]`.
- **Guest**: quét QR → `/claim/[qr_token]` → nhập tên + SĐT → nhận bao lì xì.
- **Tra cứu ví**: `/wallet` → nhập số điện thoại đã dùng để nhận lì xì.

## Ngoài phạm vi MVP này (để sau)

- OTP/OAuth xác thực mạnh hơn cho Guest
- Tính năng rút/quy đổi tiền thật hoặc voucher (schema đã sẵn sàng, chưa
  build tính năng)
- Giới hạn danh sách mời riêng theo số điện thoại/email
- Gamification khác (vòng quay, streak điểm danh, level...)
