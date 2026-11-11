// ==UserScript==
// @name         TikTok Live Chat Bridge -> Ôn Thi Lý Thuyết Lái Xe B2/C
// @namespace    http://localhost:3000/
// @version      1.1.0
// @description  Cầu nối trực tiếp bình luận TikTok Live vào ứng dụng Lái Xe (Vượt tường lửa 100%)
// @match        https://www.tiktok.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  if (window.__TIKTOK_DRIVING_BRIDGE_LOADED__) {
    console.log('[TikTok Bridge] Cầu nối đã được nạp. Đang kích hoạt lại...');
    if (window.__TIKTOK_DRIVING_BRIDGE_SHOW__) {
      window.__TIKTOK_DRIVING_BRIDGE_SHOW__();
    }
    if (window.__TIKTOK_DRIVING_BRIDGE_RESCAN__) {
      window.__TIKTOK_DRIVING_BRIDGE_RESCAN__();
    }
    return;
  }
  window.__TIKTOK_DRIVING_BRIDGE_LOADED__ = true;

  const SERVER_URL = 'http://localhost:3000';
  let isConnected = false;
  let bridgedCount = 0;
  let lastCommentText = 'Đang đợi bình luận...';
  let observer = null;
  let heartbeatTimer = null;
  let scanTimer = null;
  let flushTimer = null;
  const pendingComments = [];
  const processedElements = new WeakSet();

  console.log('[TikTok Bridge v1.1] 🚀 Khởi động Cầu nối Live Chat -> Game Lái Xe...');

  // 1. Tạo HUD nổi hiển thị trạng thái trên trang TikTok
  const hud = document.createElement('div');
  hud.id = 'tiktok-driving-bridge-hud';
  hud.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(12px);
    border: 1.5px solid rgba(20, 184, 166, 0.6);
    border-radius: 16px;
    padding: 14px 18px;
    color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(20, 184, 166, 0.25);
    width: 330px;
    transition: all 0.25s ease;
    user-select: none;
  `;

  hud.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
      <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px; color: #5eead4;">
        <span>🚗</span>
        <span>Cầu Nối Lái Xe B2/C</span>
        <span style="font-size: 10px; background: rgba(20, 184, 166, 0.2); color: #2dd4bf; padding: 1px 6px; border-radius: 6px; font-weight: 600;">v1.1</span>
      </div>
      <div style="display: flex; gap: 6px;">
        <button id="tt-bridge-min-btn" title="Thu nhỏ" style="background: rgba(255,255,255,0.1); border: none; color: #fff; width: 22px; height: 22px; border-radius: 6px; cursor: pointer; font-size: 11px; display: flex; align-items: center; justify-content: center;">_</button>
        <button id="tt-bridge-close-btn" title="Tắt cầu nối" style="background: rgba(244,63,94,0.2); border: none; color: #fda4af; width: 22px; height: 22px; border-radius: 6px; cursor: pointer; font-size: 11px; display: flex; align-items: center; justify-content: center;">✕</button>
      </div>
    </div>

    <div id="tt-bridge-status-row" style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 12px; background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: 8px;">
      <span id="tt-bridge-dot" style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #eab308; box-shadow: 0 0 8px #eab308;"></span>
      <span id="tt-bridge-status-text" style="color: #cbd5e1; font-weight: 500;">Đang kết nối localhost:3000...</span>
    </div>

    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; color: #94a3b8;">
      <span>Bình luận đã chuyển:</span>
      <span id="tt-bridge-count" style="font-weight: 700; color: #38bdf8; font-size: 14px;">0</span>
    </div>

    <div style="font-size: 11px; background: rgba(0,0,0,0.35); padding: 7px 10px; border-radius: 8px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border: 1px solid rgba(255,255,255,0.06);">
      <span>Gần nhất: </span>
      <span id="tt-bridge-last-msg" style="color: #5eead4; font-weight: 600;">(Đang đợi chat...)</span>
    </div>
  `;

  document.body.appendChild(hud);

  const miniBadge = document.createElement('div');
  miniBadge.id = 'tiktok-driving-bridge-mini';
  miniBadge.style.cssText = `
    display: none;
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    background: #0f172a;
    border: 1px solid #14b8a6;
    border-radius: 20px;
    padding: 8px 14px;
    color: #5eead4;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    align-items: center;
    gap: 6px;
  `;
  miniBadge.innerHTML = `<span>🚗 Cầu Nối: </span><span id="tt-bridge-mini-count">0</span>`;
  miniBadge.onclick = () => {
    miniBadge.style.display = 'none';
    hud.style.display = 'block';
  };
  document.body.appendChild(miniBadge);

  document.getElementById('tt-bridge-min-btn').onclick = () => {
    hud.style.display = 'none';
    miniBadge.style.display = 'flex';
  };

  document.getElementById('tt-bridge-close-btn').onclick = () => {
    destroyBridge();
  };

  window.__TIKTOK_DRIVING_BRIDGE_SHOW__ = () => {
    hud.style.display = 'block';
    miniBadge.style.display = 'none';
  };

  function updateHUD(connected, count, lastMsg) {
    const dot = document.getElementById('tt-bridge-dot');
    const statusText = document.getElementById('tt-bridge-status-text');
    const countEl = document.getElementById('tt-bridge-count');
    const miniCountEl = document.getElementById('tt-bridge-mini-count');
    const lastMsgEl = document.getElementById('tt-bridge-last-msg');

    if (dot && statusText) {
      if (connected) {
        dot.style.background = '#10b981';
        dot.style.boxShadow = '0 0 10px #10b981';
        statusText.style.color = '#34d399';
        statusText.textContent = '🟢 Đã kết nối App Lái Xe';
      } else {
        dot.style.background = '#f43f5e';
        dot.style.boxShadow = '0 0 10px #f43f5e';
        statusText.style.color = '#fda4af';
        statusText.textContent = '🔴 Mất nối localhost:3000';
      }
    }

    if (countEl) countEl.textContent = String(count);
    if (miniCountEl) miniCountEl.textContent = String(count);
    if (lastMsgEl && lastMsg) lastMsgEl.textContent = lastMsg;
  }

  function flashHUDSuccess() {
    hud.style.borderColor = '#10b981';
    hud.style.boxShadow = '0 0 25px rgba(16, 185, 129, 0.4)';
    setTimeout(() => {
      hud.style.borderColor = 'rgba(20, 184, 166, 0.6)';
      hud.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(20, 184, 166, 0.25)';
    }, 400);
  }

  // 2. Lấy thông tin kênh
  function getStreamerUsername() {
    const m = window.location.pathname.match(/@([^/?#]+)/);
    if (m) return m[1];
    return 'thaythoaidaylaixe.oto';
  }

  function getViewerCount() {
    const countEl = document.querySelector('[data-e2e="live-user-count"], [class*="DivUserCount"], [class*="ViewerCount"]');
    if (countEl) {
      const text = countEl.textContent.trim().replace(/,/g, '');
      if (text.endsWith('K') || text.endsWith('k')) {
        return Math.round(parseFloat(text) * 1000);
      }
      const num = parseInt(text, 10);
      if (!isNaN(num)) return num;
    }
    return 0;
  }

  // 3. Heartbeat
  function sendHeartbeat() {
    fetch(`${SERVER_URL}/api/tiktok/bridge_heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: getStreamerUsername(),
        viewerCount: getViewerCount(),
        url: window.location.href,
      }),
    })
      .then((res) => res.json())
      .then(() => {
        isConnected = true;
        updateHUD(true, bridgedCount, lastCommentText);
      })
      .catch(() => {
        isConnected = false;
        updateHUD(false, bridgedCount, 'Không thể gọi localhost:3000 (Hãy bật BAT-LIVE.bat)');
      });
  }

  // 4. Gửi bình luận về Backend
  function flushPendingComments() {
    if (pendingComments.length === 0) return;
    const batch = pendingComments.splice(0, 30);

    fetch(`${SERVER_URL}/api/tiktok/bridge_comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: getStreamerUsername(),
        comments: batch,
        viewerCount: getViewerCount(),
      }),
    })
      .then((res) => res.json())
      .then(() => {
        isConnected = true;
        flashHUDSuccess();
        updateHUD(true, bridgedCount, lastCommentText);
      })
      .catch((err) => {
        console.warn('[TikTok Bridge] Lỗi gửi bình luận:', err);
      });
  }

  function queueComment(commentData) {
    bridgedCount++;
    lastCommentText = `${commentData.nickname || commentData.username}: ${commentData.comment}`;
    updateHUD(isConnected, bridgedCount, lastCommentText);
    flashHUDSuccess();

    console.log(
      `%c[TikTok Bridge] 💬 [${commentData.nickname || commentData.username}]: ${commentData.comment}`,
      'color: #10b981; font-weight: bold;'
    );

    pendingComments.push(commentData);
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        flushPendingComments();
      }, 100);
    }
  }

  // 5. Trích xuất bình luận từ bất kỳ DOM Element nào của TikTok Live
  const BADGE_REGEX = /^(chủ phòng|host|quản trị viên|moderator|hạng\s*\d+|top\s*\d+|người đăng ký|subscriber|bạn bè|fan cứng|cấp\s*\d+)$/i;

  function extractCommentFromRow(row) {
    if (!row || row.nodeType !== 1) return null;
    if (row.dataset && row.dataset.ttBridgeProcessed) return null;
    if (processedElements.has(row)) return null;

    if (row.id && row.id.startsWith('tiktok-driving-bridge')) return null;
    if (row.closest && row.closest('#tiktok-driving-bridge-hud, #tiktok-driving-bridge-mini')) return null;

    const rawText = (row.innerText || row.textContent || '').trim();
    if (!rawText) return null;

    // Bỏ qua các dòng thông báo hệ thống không chứa câu trả lời
    const lower = rawText.toLowerCase();
    if (
      lower.includes('đã tham gia') ||
      lower.includes('joined') ||
      lower.includes('đã theo dõi') ||
      lower.includes('followed') ||
      lower.includes('chia sẻ live') ||
      lower.includes('shared the live') ||
      lower.includes('nguyên tắc cộng đồng') ||
      lower.includes('sáng tạo phải đủ 18') ||
      lower.includes('community guidelines')
    ) {
      if (row.dataset) row.dataset.ttBridgeProcessed = '1';
      processedElements.add(row);
      return null;
    }

    // Tách dòng
    const rawLines = rawText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s !== '⋮' && s !== '...');

    if (rawLines.length === 0) return null;

    let username = '';
    let nickname = '';
    let comment = '';
    let avatar = '';

    // Lấy avatar nếu có
    const img = row.querySelector('img');
    if (img && img.src && !img.src.includes('data:image/svg')) {
      avatar = img.src;
    }

    if (rawLines.length === 1) {
      const single = rawLines[0];
      const colonIdx = single.indexOf(':');
      if (colonIdx !== -1) {
        username = single.substring(0, colonIdx).trim();
        comment = single.substring(colonIdx + 1).trim();
      } else {
        const voteMatch = single.match(/^(.*?)\s+([1-4])$/);
        if (voteMatch) {
          username = voteMatch[1].trim();
          comment = voteMatch[2].trim();
        } else if (/^[1-4]$/.test(single)) {
          username = 'khach_live';
          comment = single;
        } else {
          const parts = single.split(/\s+/);
          if (parts.length >= 2) {
            username = parts[0];
            comment = parts.slice(1).join(' ');
          } else {
            comment = single;
            username = 'khach_live';
          }
        }
      }
    } else {
      // Dòng 1 là tên người dùng (lọc bỏ các danh hiệu ở cuối tên như Chủ phòng, Hạng 1...)
      username = rawLines[0]
        .replace(/\s*(chủ phòng|host|quản trị viên|moderator|hạng\s*\d+|top\s*\d+|người đăng ký).*$/i, '')
        .trim();

      // Dòng cuối là nội dung bình luận (nếu dòng cuối là badge thì lùi lại)
      let commentIdx = rawLines.length - 1;
      while (commentIdx > 0 && BADGE_REGEX.test(rawLines[commentIdx])) {
        commentIdx--;
      }
      comment = rawLines[commentIdx > 0 ? commentIdx : rawLines.length - 1].trim();
    }

    username = username.replace(/^@/, '').trim();
    nickname = username;
    if (!username) username = 'khach_live';
    if (!nickname) nickname = username;

    if (!comment) return null;

    // Đánh dấu đã xử lý phần tử này để không bị đọc lại
    if (row.dataset) row.dataset.ttBridgeProcessed = '1';
    processedElements.add(row);

    return { username, nickname, comment, avatar };
  }

  // 6. Tìm tất cả các dòng chat đang có trên màn hình
  function findVisibleChatRows() {
    const rows = [];
    const imgs = document.querySelectorAll('img');

    for (const img of imgs) {
      if (!img.src || img.src.includes('data:image/svg')) continue;
      const rect = img.getBoundingClientRect();

      // Avatar trong khung chat TikTok thường có kích thước 18px - 60px
      if (rect.width >= 16 && rect.width <= 64 && rect.height >= 16 && rect.height <= 64) {
        let p = img.parentElement;
        let candidate = null;

        for (let depth = 0; depth < 5 && p && p !== document.body; depth++) {
          if (p.id && p.id.startsWith('tiktok-driving-bridge')) {
            candidate = null;
            break;
          }
          const txt = (p.innerText || '').trim();
          if (txt.length > 0 && txt.length < 350) {
            const r = p.getBoundingClientRect();
            // Chiều cao một dòng chat đơn lẻ thường từ 18px đến 160px
            if (r.height >= 18 && r.height <= 180) {
              candidate = p;
            }
          }
          p = p.parentElement;
        }

        if (candidate && !rows.includes(candidate)) {
          rows.push(candidate);
        }
      }
    }

    return rows;
  }

  // Quét toàn bộ khung chat để tìm bình luận mới chưa đọc
  function scanAndProcessChat() {
    const rows = findVisibleChatRows();
    for (const row of rows) {
      const data = extractCommentFromRow(row);
      if (data) {
        queueComment(data);
      }
    }
  }

  window.__TIKTOK_DRIVING_BRIDGE_RESCAN__ = scanAndProcessChat;

  // Lệnh test thủ công trong Console: window.__TEST_BRIDGE__('hh3d', '1')
  window.__TEST_BRIDGE__ = (user, msg) => {
    queueComment({
      username: user || 'hh3d',
      nickname: user || 'hh3d',
      comment: String(msg || '1'),
      avatar: '',
    });
  };

  // 7. Khởi tạo quan sát và chu kỳ quét
  function startObserver() {
    // Quét ngay các tin nhắn đang có trên màn hình
    scanAndProcessChat();

    // 1. Quét định kỳ mỗi 500ms (Fail-safe đảm bảo không bao giờ sót bình luận)
    scanTimer = setInterval(scanAndProcessChat, 500);

    // 2. MutationObserver lắng nghe DOM theo thời gian thực (0ms)
    observer = new MutationObserver((mutations) => {
      for (const mut of mutations) {
        if (mut.addedNodes && mut.addedNodes.length > 0) {
          for (let i = 0; i < mut.addedNodes.length; i++) {
            const node = mut.addedNodes[i];
            if (node.nodeType === 1) {
              const data = extractCommentFromRow(node);
              if (data) {
                queueComment(data);
              } else {
                // Kiểm tra xem node có chứa avatar img bên trong không
                const innerImgs = node.querySelectorAll ? node.querySelectorAll('img') : [];
                if (innerImgs.length > 0 && innerImgs.length <= 4) {
                  const subRows = findVisibleChatRows();
                  for (const sub of subRows) {
                    const subData = extractCommentFromRow(sub);
                    if (subData) queueComment(subData);
                  }
                }
              }
            }
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log('[TikTok Bridge v1.1] ✅ Đã kích hoạt cả MutationObserver + Quét chu kỳ 500ms!');
  }

  function destroyBridge() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (scanTimer) {
      clearInterval(scanTimer);
      scanTimer = null;
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (hud && hud.parentNode) hud.parentNode.removeChild(hud);
    if (miniBadge && miniBadge.parentNode) miniBadge.parentNode.removeChild(miniBadge);
    window.__TIKTOK_DRIVING_BRIDGE_LOADED__ = false;
    console.log('[TikTok Bridge] Đã tắt cầu nối.');
  }

  sendHeartbeat();
  heartbeatTimer = setInterval(sendHeartbeat, 4000);
  startObserver();
})();
