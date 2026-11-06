#!/bin/bash
cd "$(dirname "$0")"
if [ ! -d "node_modules" ]; then
  echo "🚀 Lần đầu chạy: Đang tự động cài đặt tất cả thư viện (npm install)..."
  npm install
fi
echo "✨ Đang bật hệ thống TikTok LIVE 600 Câu Lý Thuyết Lái Xe B2/C..."
echo "👉 Màn hình Streamer Deck: http://localhost:3000"
echo "👉 Màn hình Stage cho OBS / TikTok Studio: http://lvh.me:3000/?view=stage"
npm run dev

