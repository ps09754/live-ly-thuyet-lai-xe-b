# 🚗 Hệ Thống TikTok LIVE 600 Câu Lý Thuyết Lái Xe B2/C

Hệ thống livestream tương tác tự động dành cho TikTok LIVE Studio / OBS với bộ đề 600 câu hỏi sát hạch lý thuyết lái xe ô tô hạng B2, C chuẩn Cục Đường bộ & Bộ GTVT.

Tích hợp **Socket.io Realtime**, **Trợ giảng AI tương tác Cô Ngân 💖**, **TTS giọng đọc AI**, **Tự động bắt comment vote đáp án**, **Bảng xếp hạng trực tiếp** và **Banner tương tác kêu gọi Thả tim / Zalo Khóa học**.

---

## ⚡ Hướng Dẫn Cài Đặt 1 Bước (Dành Cho Máy Mới)

Khi clone dự án về một máy tính hoàn toàn mới (yêu cầu đã cài [Node.js](https://nodejs.org) >= 18):

```bash
# 1. Clone repository
git clone https://github.com/ps09754/live-ly-thuyet-lai-xe-b.git
cd live-ly-thuyet-lai-xe-b

# 2. Cài đặt tất cả thư viện (1 câu lệnh duy nhất)
npm run setup

# 3. Khởi động ứng dụng
npm run dev
```

### 🚀 Khởi động nhanh bằng 1 click:
- **Windows:** Bấm đúp vào file `BAT-LIVE.bat` (tự động cài thư viện nếu chưa có và mở trình duyệt).
- **macOS / Linux:** Mở terminal chạy `./RUN-LIVE.sh`.

---

## 🖥️ Các Đường Link Sử Dụng

1. **Bảng điều khiển Streamer Deck:**
   `http://localhost:3000`
   - Dùng để chọn câu hỏi, bấm Bắt đầu / Tạm dừng, chỉnh thời gian đếm ngược, chọn giọng đọc AI, chỉnh banner và trợ giảng ảo.

2. **Màn hình Live (Stage 9:16) cho TikTok LIVE Studio / OBS:**
   `http://lvh.me:3000/?view=stage`
   *(Tên miền `lvh.me` trỏ về `127.0.0.1` giúp TikTok LIVE Studio nhận diện liên kết mượt mà).*
   - **Độ phân giải chuẩn:** 1080 x 1920 (Tỷ lệ 9:16).

---

## ✨ Các Tính Năng Nổi Bật

- 👩‍🏫 **Trợ Giảng AI Cô Ngân 💖 (Góc Dưới Phải):**
  - Avatar hoạt hình sinh động, thở nhẹ 60fps và hiệu ứng ngôi sao lấp lánh.
  - Bong bóng thoại thông minh: Nhắc học viên comment, đọc đề, cổ vũ tinh thần, và vỗ tay cảm ơn khi có người comment vote.
  - Tùy chỉnh tên trợ giảng, kích cỡ (Nhỏ / Chuẩn / Lớn), định dạng GIF/ảnh ngay trên bảng điều khiển.

- 💬 **Tự Động Bắt Comment TikTok LIVE:**
  - Kết nối trực tiếp phòng live bằng username TikTok (không cần password/token).
  - Tự động nhận diện comment `1`, `2`, `3`, `4` để ghi nhận vote của khán giả và tính điểm bảng xếp hạng.

- 🔊 **Hệ Thống Giọng Đọc AI TTS Đa Dạng:**
  - Hỗ trợ ZeroTTS AI (Mai Chi, Bảo Trang, Quang Minh, Gia Huy) với bộ cache âm thanh sẵn.
  - Tự động fallback sang Edge TTS mượt mà nếu chạy trên máy không có ZeroTTS.
  - Hiệu ứng âm thanh tick-tắc đếm ngược và chuông báo kết quả chuẩn phòng thi.

- 📣 **Banner Tương Tác Nổi Dưới Đáy:**
  - Banner 1: Nhắc khán giả thả tim và bấm follow phòng live.
  - Banner 2: Chỉ dẫn học viên vào trang cá nhân kết nối Zalo đăng ký khóa học lái xe.
  - Tự động ẩn hiện theo chu kỳ và hiển thị nhanh 3 giây không che câu hỏi.

- 🔄 **Kiến Trúc Máy Chủ Socket.io Trung Tâm:**
  - Đồng bộ tuyệt đối giữa Streamer Deck và màn hình Stage, không giật lag.

---

## 🛠️ Cấu Trúc Thư Mục

```text
├── public/
│   ├── co-ngan.gif            # Avatar hoạt hình trợ giảng Cô Ngân
│   ├── co-ngan-full.png        # Ảnh sắc nét trợ giảng
│   └── data/
│       ├── questions.json      # 600 câu hỏi chuẩn Bộ GTVT
│       ├── images/             # Hình ảnh biển báo, sa hình (300+ ảnh)
│       └── audio_cache/        # Bộ nhớ đệm giọng đọc câu hỏi
├── src/
│   ├── components/
│   │   ├── DrivingStage.tsx            # Màn hình Live 9:16 chính
│   │   ├── DrivingStreamerDeck.tsx     # Bàn điều khiển của Streamer
│   │   ├── InteractiveTeacherAvatar.tsx# Trợ giảng ảo tương tác Cô Ngân
│   │   ├── FloatingOverlayBanners.tsx  # Banner Thả tim & Zalo
│   │   └── FloatingVoteBubbles.tsx     # Bong bóng hiển thị vote khán giả
│   └── services/
│       ├── socketService.ts    # Kết nối Socket.io client
│       └── liveVoiceInteractions.ts # Tương tác giọng nói & xướng tên khán giả
├── server.ts                   # Backend Node.js Express + Socket.io Server
├── BAT-LIVE.bat                # File khởi động Windows 1-click
├── RUN-LIVE.sh                 # File khởi động macOS/Linux 1-click
└── package.json
```

---

## 📄 License
MIT License.
