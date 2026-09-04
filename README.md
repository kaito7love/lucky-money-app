# Lucky Money — Lì Xì Nhóm

Web app lì xì nhóm dịp Tết. Host tạo một phòng lì xì (tổng tiền + số bao),
chia sẻ mã QR, người nhận quét QR và nhập số điện thoại để mở một bao ngẫu
nhiên. Host theo dõi ai đã nhận bao nhiêu ngay trên trang quản lý.

Next.js 16 (App Router) + Supabase Postgres. Toàn bộ dữ liệu nằm trong
Postgres, không có file cục bộ nào, nên chạy được trên hosting serverless.

## Tính năng

- **Tạo phòng lì xì** với hai cách chia tiền:
  - *Ngẫu nhiên (min/max)* — nhập tổng tiền, số bao, khoảng giá trị; app tự
    chia sao cho mỗi bao rơi vào mệnh giá tròn.
  - *Tự nhập từng bao* — chọn mệnh giá thật (5k → 500k) bằng các chip, tăng
    giảm số lượng, hoặc bấm "Tự động điền" để app chia sẵn rồi tinh chỉnh.
- **Chia sẻ bằng QR** hoặc link. Người nhận không cần cài app, không cần
  đăng ký.
- **Phòng riêng tư** — bật PIN 4–6 số, chỉ ai biết PIN mới mở được bao.
- **Hạn nhận** — đặt số giờ, hết hạn thì phòng tự đóng.
- **Tài khoản** (tùy chọn) — đăng ký bằng SĐT + mật khẩu để xem lại mọi
  phòng đã tạo trên bất kỳ thiết bị nào.
- **Chat nhóm** — nhắn tin trong các phòng chat và gửi lì xì thẳng vào
  khung chat.
- **Ví** — tra cứu tổng số tiền đã nhận theo số điện thoại.

## Yêu cầu

- **Node.js 22 trở lên** — bộ test dùng `node:test` và chạy TypeScript trực
  tiếp, cả hai cần Node 22.
- Một project [Supabase](https://supabase.com) (gói Free là đủ).

## Cài đặt

1. Tạo project Supabase, vào **Project Settings → API** lấy `Project URL` và
   `service_role key`.

2. Copy `.env.example` thành `.env.local` rồi điền. App chỉ đọc đúng **ba**
   biến:

   | Biến | Dùng để làm gì |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Địa chỉ project Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server gọi database. **Không bao giờ để lộ ra client** |
   | `CRON_SECRET` | Chuỗi ngẫu nhiên ≥16 ký tự, bảo vệ endpoint cron |

   `anon key` **không dùng** — trình duyệt không nói chuyện trực tiếp với
   Supabase nữa, mọi truy vấn đều đi qua API route.

3. Chạy lần lượt **cả 8 migration** trong `supabase/migrations/` theo đúng
   thứ tự `0001` → `0008`, bằng SQL Editor của Supabase.

4. Cài dependencies và chạy dev server:

   ```bash
   npm install
   npm run dev
   ```

5. Mở `http://localhost:3000`.

## Lệnh

```bash
npm run dev        # dev server
npm run build      # build production
npm test           # 30 unit test, chạy dưới 1 giây
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

Cả hai bộ test dùng `node:test` có sẵn trong Node 22, không thêm
dependency nào.

**Unit test** (`npm test`) — chạy được mọi lúc, không cần server hay
database. Phủ phần tính tiền (`src/lib/envelopes.ts`,
`src/lib/fillFromDenominations.ts`) và các helper trên đường xác thực.

**Integration test** (`npm run test:integration`) — cần dev server **và**
Supabase đang chạy, vì nó gọi API thật và đọc database thật. Hiện phủ cron
keep-alive: đây là cách duy nhất chứng minh endpoint thật sự truy vấn
Postgres, thứ mà mock không bao giờ kiểm được. Thiếu server hoặc database
thì nó **báo lỗi kèm hướng dẫn**, không im lặng bỏ qua.

```bash
npm run test:integration

# hoặc trỏ vào deployment (env file phải là credentials của chính nó)
TEST_BASE_URL=https://<app>.vercel.app npm run test:integration
```

Chưa có test cho các API route khác, hàm Postgres `claim_envelope()`, và
React component.

## Cấu trúc

```
src/app/api/      API route (pools, claim, auth, chat, wallet, cron)
src/app/          Trang: /create /pool/[id] /claim/[token] /chat /wallet /auth /profile
src/components/   UI theo từng màn
src/lib/          Logic thuần: chia tiền, định dạng, session, truy vấn DB
supabase/migrations/  0001 → 0008
```

## Quyết định thiết kế chính

- **Người nhận không cần tài khoản.** Chỉ cần tên + SĐT là mở được bao —
  bỏ đăng ký là cách duy nhất để một người được lì xì trong 10 giây. SĐT
  đóng vai trò định danh cho ví. Ai muốn quản lý phòng lâu dài thì đăng ký
  tài khoản có mật khẩu; session sống 30 ngày rồi hết hạn.

- **Host quản lý phòng qua `host_token`** — chuỗi bí mật sinh lúc tạo phòng,
  lưu trong `localStorage`. Mất token là mất quyền quản lý, trừ khi phòng đó
  gắn với một tài khoản đã đăng nhập.

- **Chia tiền luôn rơi vào mệnh giá tròn.** Thuật toán chọn bước chia thô
  nhất mà vẫn còn dư địa để random, rồi rải phần dư ngẫu nhiên vào các bao.
  Sinh nhiều phương án, chấm điểm theo độ đa dạng, chọn ngẫu nhiên trong
  nhóm tốt nhất. Không bao giờ ra số lẻ kiểu 17.342đ, và không bao giờ ra
  30 bao giống hệt nhau.

- **Chế độ tự nhập không được âm thầm bỏ mệnh giá host đã chọn.** Mỗi mệnh
  giá được cấp trước 1 bao như ràng buộc cứng, phần còn lại giải bằng quy
  hoạch động. Kết quả nghiêng về hình chuông (mệnh giá giữa nhiều, hai đầu
  ít), và mỗi lần bấm "Chia lại" cho ra một cách chia khác.

- **Giá trị các bao tính một lần lúc tạo phòng** rồi lưu thành từng dòng
  trong bảng `envelopes`. Lúc nhận chỉ việc bốc ngẫu nhiên một dòng chưa ai
  lấy — không tính lại, nên tổng tiền không thể sai lệch theo thời gian.

- **Chống trùng bao khi nhiều người quét cùng lúc**: hàm `claim_envelope()`
  trong Postgres khoá dòng của phòng (`FOR UPDATE`) trước khi bốc bao, nên
  các lượt nhận trong cùng một phòng được xử lý tuần tự — hai người bấm cùng
  giây chắc chắn nhận hai bao khác nhau. Đúng đắn được ưu tiên hơn thông
  lượng, phù hợp quy mô vài chục đến vài trăm người một phòng.

- **Ví là ledger (append-only)** ở `wallet_transactions` thay vì một cột
  `balance`, để sau này thêm quy đổi ra tiền thật hoặc voucher mà không phải
  viết lại.

- **Giới hạn số lần thử** ở `/api/claim` và `/api/auth/login`. PIN chỉ có
  4–6 chữ số nên nếu không chặn, người cầm link QR có thể dò hết phòng. Bộ đếm
  nằm trong database chứ không nằm trong RAM, vì trên Vercel mỗi lambda là
  một tiến trình riêng không chia sẻ bộ nhớ.

- **Trang host dùng polling, không dùng realtime.** Đơn giản hơn, và không
  cần mở kết nối Supabase từ trình duyệt.

- **Tra cứu ví bằng SĐT không cần mật khẩu** — đánh đổi có chủ đích: ai biết
  số của bạn thì xem được tổng bạn đã nhận.

## Deploy

Cả Vercel lẫn Supabase đều dùng được gói free.

> **Chạy migration trước, deploy sau.** Thiếu migration nào là endpoint
> tương ứng lỗi 500. Ví dụ thiếu `0006`, code vẫn ghi `sessions.expires_at`
> nên đăng ký và đăng nhập hỏng hoàn toàn, người đang đăng nhập bị văng ra.

1. Push code lên GitHub.
2. Tạo project Supabase Cloud riêng cho production, chạy đủ cả 8 migration
   `0001` → `0008`.
3. Import repo vào [Vercel](https://vercel.com), rồi vào **Project Settings
   → Environment Variables** điền đúng ba biến ở mục "Cài đặt":
   `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.
4. Deploy. Các lần push lên `main` sau đó tự deploy lại.

### Vì sao cần cron

Supabase gói Free **tạm dừng project** sau ~7 ngày không có hoạt động
database, và project đã dừng thì phải tự vào dashboard bấm "Restore" mới
chạy lại. `vercel.json` khai báo một cron chạy mỗi ngày gọi
`/api/cron/keepalive`, thực hiện vài truy vấn thật để giữ project thức, đồng
thời dọn session hết hạn và bản ghi rate-limit cũ.

Cron chỉ **phòng ngừa**, không đánh thức được project đã bị dừng. Nếu
database chết hoặc bị dừng, endpoint trả 503 kèm lý do để nhìn thấy ngay
trong log cron của Vercel, thay vì báo thành công giả mỗi ngày.

Gói Hobby của Vercel chỉ cho cron chạy **một lần mỗi ngày** và có thể lệch
tới 59 phút so với giờ khai báo — vẫn đủ, vì ngưỡng của Supabase là 7 ngày.

Vercel thì không "ngủ", chỉ có cold start vài trăm ms sau một thời gian
vắng. Điều này đáng lưu ý vì app dùng theo mùa: rộ dịp Tết, vắng quanh năm.

### Kiểm tra cron có thật sự chạy không

> ⚠️ **Quên `CRON_SECRET` trên Vercel là hỏng âm thầm.** Vercel chỉ gắn header
> `Authorization: Bearer …` khi biến đó tồn tại. Thiếu nó, cron vẫn chạy
> đúng giờ mỗi ngày nhưng bị endpoint trả 401, không hề chạm vào database —
> và Supabase vẫn cứ pause sau 7 ngày. Trên giao diện không có dấu hiệu gì.

Cách kiểm tra sau khi deploy:

1. Vercel → project → tab **Cron Jobs**, xem lần chạy gần nhất trả **200**.
   Nếu là **401** thì thiếu `CRON_SECRET`; nếu là **503** thì database đang
   chết hoặc đã bị pause.
2. Hoặc gọi tay bằng chính secret đã đặt:

   ```bash
   curl -i -H "Authorization: Bearer $CRON_SECRET" \
     https://<app>.vercel.app/api/cron/keepalive
   ```

   Kết quả đúng trông như thế này — `ping` phải kèm số phòng thật, đó là
   bằng chứng nó đã truy vấn Postgres chứ không trả JSON tĩnh:

   ```json
   { "ok": true, "ranAt": "...", "results": {
       "ping": "ok (25 pools)",
       "expiredSessions": "swept",
       "staleRateLimits": "swept" } }
   ```

3. Supabase → project → **Reports**, thấy có hoạt động database mỗi ngày là
   yên tâm không bị pause.

## Hạn chế đã biết

- **Danh sách phòng chat là cố định** trong `src/lib/chatRooms.ts`, chưa tạo
  được phòng chat mới từ giao diện.
- **Mất `host_token` mà phòng không gắn tài khoản** thì không khôi phục được
  quyền quản lý.
- **Chưa có test** cho API route, hàm Postgres `claim_envelope()`, và React
  component.

## Chưa làm (để sau)

- OTP/OAuth cho người nhận
- Rút hoặc quy đổi ra tiền thật/voucher (schema ví đã sẵn sàng)
- Mời theo danh sách SĐT/email
- Gamification: vòng quay, streak điểm danh, level
