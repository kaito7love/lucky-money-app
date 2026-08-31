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

1. Tạo project trên [Supabase](https://supabase.com), lấy `Project URL` và
   `service_role key`. (`anon key` không còn dùng — trình duyệt không nói
   chuyện trực tiếp với Supabase nữa.)
2. Copy `.env.example` thành `.env.local` và điền các giá trị trên.
3. Chạy lần lượt các migration trong `supabase/migrations/` (theo đúng thứ
   tự `0001` → `0007`) trong SQL Editor của Supabase — tạo bảng `pools`,
   `envelopes`, `wallet_transactions`, `users`, `sessions`, `chat_messages`,
   `rate_limit_attempts`, và hàm `claim_envelope()`.
4. Cài dependencies và chạy dev server:

   ```bash
   npm install
   npm run dev
   ```

5. Mở `http://localhost:3000`.

## Triển khai

**Chạy migration trước, deploy sau.** Code đọc/ghi `sessions.expires_at`; nếu
deploy trước khi chạy `0006`, mọi người đang đăng nhập sẽ bị văng ra và không
đăng nhập lại được cho tới khi migration chạy xong.

Đặt thêm biến `CRON_SECRET` trên project Vercel (chuỗi ngẫu nhiên từ 16 ký
tự). Vercel gửi nó dưới dạng `Authorization: Bearer <giá trị>` khi chạy cron;
thiếu biến này thì `/api/cron/keepalive` từ chối mọi request, kể cả của
Vercel.

### Vì sao cần cron

Supabase gói Free **tạm dừng** project khi hoạt động database thấp trong 7
ngày, và project bị dừng thì không truy cập được cho tới khi tự vào dashboard
bấm khôi phục. `vercel.json` khai báo một cron chạy mỗi ngày gọi
`/api/cron/keepalive`, thực hiện vài truy vấn thật để giữ project thức, đồng
thời dọn session hết hạn và bản ghi rate-limit cũ.

Cron chỉ **phòng ngừa**, không đánh thức được project đã bị dừng — việc đó
phải làm tay trên dashboard. Nếu database chết hoặc bị dừng, endpoint trả
503 kèm lý do để thấy ngay trong log cron của Vercel, thay vì báo thành công
giả mỗi ngày.

Lưu ý gói Hobby của Vercel chỉ cho cron chạy **một lần mỗi ngày** và có thể
lệch tới 59 phút so với giờ khai báo — đủ dùng, vì ngưỡng của Supabase là 7
ngày.

Toàn bộ state của app (tài khoản, session, tin nhắn chat, pool, ví) nằm
trong Postgres — không còn file JSON cục bộ nào — nên app deploy được lên
hosting serverless (không có ổ đĩa bền vững) mà không mất dữ liệu.

## Deploy (free)

1. Push code lên GitHub (repo này đã có sẵn).
2. Tạo project Supabase Cloud (free tier) riêng cho production, chạy đủ cả 7
   migration (`0001` → `0007`) như bước "Cài đặt" ở trên. Thiếu migration nào
   thì endpoint tương ứng sẽ lỗi 500 — ví dụ thiếu `0006` là đăng ký/đăng
   nhập hỏng vì code ghi `sessions.expires_at`.
3. Import repo vào [Vercel](https://vercel.com) (đăng nhập bằng GitHub cho
   nhanh), điền 3 biến môi trường trong Project Settings → Environment
   Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` (lấy từ project Supabase Cloud ở bước 2).
4. Deploy. Các lần push sau lên `main` sẽ tự deploy lại.

**Lưu ý gói free:** Vercel không "ngủ" — chỉ có cold start vài trăm ms sau
một thời gian không ai truy cập. Supabase free tier thì khác: project sẽ tự
**pause sau ~7 ngày không có request nào** và cần vào dashboard bấm
"Restore" thủ công mới dùng lại được — đáng chú ý vì app này dùng theo mùa
(rộ dịp Tết, vắng quanh năm).

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
