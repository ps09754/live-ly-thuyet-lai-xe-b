// ==UserScript==
// @name         TikTok Live Chat Bridge -> Ôn Thi Lý Thuyết Lái Xe B2/C
// @namespace    http://localhost:3000/
// @version      1.0.0
// @description  Cầu nối trực tiếp bình luận TikTok Live vào ứng dụng Lái Xe (Vượt tường lửa 100%)
// @match        https://www.tiktok.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  if (window.__TIKTOK_DRIVING_BRIDGE_LOADED__) {
    console.log('[TikTok Bridge] Cầu nối đã được nạp trước đó.');
    if (window.__TIKTOK_DRIVING_BRIDGE_SHOW__) {
      window.__TIKTOK_DRIVING_BRIDGE_SHOW__();
    }
    return;
  }
  window.__TIKTOK_DRIVING_BRIDGE_LOADED__ = true;

  const SERVER_URL = 'http://localhost:3000';
  let isConnected = false;
  let bridgedCount = 0;
  let lastCommentText = 'Chưa có bình luận mới';
  let observer = null;
  let heartbeatTimer = null;
  let flushTimer = null;
  const pendingComments = [];
  const processedNodes = new WeakSet();
  const recentDeduplicationKeys = new Set();

  console.log('[TikTok Bridge] 🚀 Đang khởi động Cầu nối TikTok Live -> Game Lái Xe...');

  // 1. Tạo giao diện Floating HUD trên trang TikTok
  const hud = document.createElement('div');
  hud.id = 'tiktok-driving-bridge-hud';
  hud.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(20, 184, 166, 0.5);
    border-radius: 16px;
    padding: 14px 18px;
    color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 20px rgba(20, 184, 166, 0.2);
    width: 320px;
    transition: all 0.25s ease;
    user-select: none;
  `;

  hud.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
      <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px; color: #5eead4;">
        <span>🚗</span>
        <span>Cầu Nối Lái Xe B2/C</span>
      </div>
      <div style="display: flex; gap: 6px;">
        <button id="tt-bridge-min-btn" title="Thu nhỏ" style="background: rgba(255,255,255,0.1); border: none; color: #fff; width: 22px; height: 22px; border-radius: 6px; cursor: pointer; font-size: 11px; display: flex; align-items: center; justify-content: center;">_</button>
        <button id="tt-bridge-close-btn" title="Đóng cầu nối" style="background: rgba(244,63,94,0.2); border: none; color: #fda4af; width: 22px; height: 22px; border-radius: 6px; cursor: pointer; font-size: 11px; display: flex; align-items: center; justify-content: center;">✕</button>
      </div>
    </div>

    <div id="tt-bridge-status-row" style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 12px; background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: 8px;">
      <span id="tt-bridge-dot" style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #eab308; box-shadow: 0 0 8px #eab308;"></span>
      <span id="tt-bridge-status-text" style="color: #cbd5e1; font-weight: 500;">Đang kết nối localhost:3000...</span>
    </div>

    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; color: #94a3b8;">
      <span>Bình luận đã chuyển:</span>
      <span id="tt-bridge-count" style="font-weight: 700; color: #38bdf8;">0</span>
    </div>

    <div style="font-size: 11px; background: rgba(0,0,0,0.25); padding: 6px 10px; border-radius: 8px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
      <span>Gần nhất: </span>
      <span id="tt-bridge-last-msg" style="color: #f1f5f9; font-weight: 600;">(Đang đợi chat...)</span>
    </div>
  `;

  document.body.appendChild(hud);

  // Widget thu nhỏ
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

  // 2. Lấy thông tin kênh và số liệu phòng live
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

  // 3. Gửi Heartbeat định kỳ
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
      .then((data) => {
        isConnected = true;
        updateHUD(true, bridgedCount, lastCommentText);
      })
      .catch((err) => {
        isConnected = false;
        updateHUD(false, bridgedCount, 'Không thể gọi localhost:3000 (Hãy bật BAT-LIVE.bat)');
      });
  }

  // 4. Gửi bình luận về Backend
  function flushPendingComments() {
    if (pendingComments.length === 0) return;
    const batch = pendingComments.splice(0, 20);

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
        updateHUD(true, bridgedCount, lastCommentText);
      })
      .catch((err) => {
        console.warn('[TikTok Bridge] Lỗi gửi comment:', err);
      });
  }

  function queueComment(commentData) {
    bridgedCount++;
    lastCommentText = `${commentData.nickname || commentData.username}: ${commentData.comment}`;
    updateHUD(isConnected, bridgedCount, lastCommentText);
    console.log(`[TikTok Bridge] 💬 [${commentData.nickname || commentData.username}]: ${commentData.comment}`);

    pendingComments.push(commentData);
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        flushPendingComments();
      }, 150);
    }
  }

  // 5. Trích xuất bình luận từ DOM Node của TikTok Live
  function parseChatElement(el) {
    if (!el || el.nodeType !== 1) return null;
    if (processedNodes.has(el)) return null;

    // Bỏ qua các thành phần của chính Bridge HUD
    if (el.id && el.id.startsWith('tiktok-driving-bridge')) return null;
    if (el.closest && el.closest('#tiktok-driving-bridge-hud, #tiktok-driving-bridge-mini')) return null;

    // Tìm phần tử chứa tin nhắn
    let itemEl = null;
    if (
      (el.matches && (
        el.matches('[data-e2e="chat-message"]') ||
        el.matches('div[class*="ChatMessage"]') ||
        el.matches('div[class*="chat-message"]') ||
        el.matches('div[class*="CommentItem"]') ||
        el.matches('div[class*="ChatItem"]') ||
        el.matches('div[class*="chat-item"]') ||
        el.matches('div[class*="DivItemContainer"]')
      ))
    ) {
      itemEl = el;
    } else if (el.querySelector) {
      itemEl = el.querySelector(
        '[data-e2e="chat-message"], div[class*="ChatMessage"], div[class*="chat-message"], div[class*="CommentItem"], div[class*="ChatItem"], div[class*="chat-item"], div[class*="DivItemContainer"]'
      );
    }

    // Dự phòng: Nếu nằm trong khung chat và có thẻ user link
    if (!itemEl && el.closest) {
      const inChat = el.closest('[data-e2e="chat-room"], [class*="ChatRoom"], [class*="ChatList"], [class*="chat-list"], [class*="DivChat"]');
      if (inChat && el.querySelector && el.querySelector('a[href*="/@"]')) {
        itemEl = el;
      }
    }

    if (!itemEl) return null;
    if (processedNodes.has(itemEl)) return null;
    processedNodes.add(itemEl);

    // Lấy thông tin Tên / Username
    let username = '';
    let nickname = '';
    const userLink = itemEl.querySelector('a[href*="/@"]');
    if (userLink) {
      const href = userLink.getAttribute('href') || '';
      const m = href.match(/@([^/?#]+)/);
      if (m) username = m[1];
      nickname = userLink.textContent.trim().replace(/^@/, '');
    }

    if (!username) {
      const nameEl = itemEl.querySelector('[class*="UniqueId"], [class*="name"], [class*="Name"], [class*="Nickname"], [class*="author"]');
      if (nameEl) {
        username = nameEl.textContent.trim().replace(/^@/, '');
        nickname = username;
      }
    }

    // Lấy Avatar
    let avatar = '';
    const imgEl = itemEl.querySelector('img[src*="tiktok"], img[src*="byteoversea"], img');
    if (imgEl && imgEl.src && !imgEl.src.includes('data:image/svg')) {
      avatar = imgEl.src;
    }

    // Lấy nội dung comment
    let text = '';
    const textEl = itemEl.querySelector(
      '[data-e2e="comment-text"], [data-e2e="chat-message-text"], [class*="Text"], [class*="text"], [class*="Message"], [class*="content"]'
    );

    if (textEl && textEl !== userLink) {
      text = textEl.textContent.trim();
    } else {
      const fullText = (itemEl.innerText || itemEl.textContent || '').trim();
      if (nickname && fullText.startsWith(nickname)) {
        text = fullText.substring(nickname.length).replace(/^[:\s-]+/, '').trim();
      } else {
        const parts = fullText.split(/[:\n]/);
        if (parts.length >= 2) {
          if (!username) username = parts[0].trim();
          text = parts.slice(1).join(':').trim();
        } else {
          text = fullText;
        }
      }
    }

    text = text.replace(/[\r\n]+/g, ' ').trim();
    if (!text) return null;

    // Lọc các thông báo hệ thống không phải là câu trả lời (1, 2, 3, 4)
    const lower = text.toLowerCase();
    const isVoteOnly = /^[1-4]$/.test(text);
    if (!isVoteOnly) {
      if (
        lower.includes('đã tham gia') ||
        lower.includes('joined') ||
        lower.includes('đã theo dõi') ||
        lower.includes('followed') ||
        lower.includes('chia sẻ live') ||
        lower.includes('shared') ||
        lower.includes('gửi quà') ||
        lower.includes('sent')
      ) {
        return null;
      }
    }

    if (!username) username = 'khach_live';
    if (!nickname) nickname = username;

    // Chống trùng lặp tin nhắn trong 3 giây
    const dedupKey = `${username}_${text}`;
    if (recentDeduplicationKeys.has(dedupKey)) {
      return null;
    }
    recentDeduplicationKeys.add(dedupKey);
    setTimeout(() => {
      recentDeduplicationKeys.delete(dedupKey);
    }, 3000);

    return { username, nickname, comment: text, avatar };
  }

  // 6. Đánh dấu các tin nhắn cũ đang có trên màn hình để không gửi lại dồn dập
  function markExistingMessages() {
    const existing = document.querySelectorAll(
      '[data-e2e="chat-message"], div[class*="ChatMessage"], div[class*="CommentItem"], div[class*="ChatItem"]'
    );
    existing.forEach((node) => {
      processedNodes.add(node);
    });
    console.log(`[TikTok Bridge] Đã bỏ qua ${existing.length} tin nhắn cũ trước đó.`);
  }

  // 7. Khởi tạo MutationObserver theo dõi tin nhắn mới
  function startObserver() {
    markExistingMessages();

    observer = new MutationObserver((mutations) => {
      for (const mut of mutations) {
        if (mut.addedNodes && mut.addedNodes.length > 0) {
          for (let i = 0; i < mut.addedNodes.length; i++) {
            const node = mut.addedNodes[i];
            if (node.nodeType === 1) {
              const chatData = parseChatElement(node);
              if (chatData) {
                queueComment(chatData);
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

    console.log('[TikTok Bridge] ✅ Đã kích hoạt MutationObserver theo dõi Live Chat.');
  }

  // 8. Dọn dẹp cầu nối khi streamer tắt
  function destroyBridge() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (hud && hud.parentNode) {
      hud.parentNode.removeChild(hud);
    }
    if (miniBadge && miniBadge.parentNode) {
      miniBadge.parentNode.removeChild(miniBadge);
    }
    window.__TIKTOK_DRIVING_BRIDGE_LOADED__ = false;
    console.log('[TikTok Bridge] Đã tắt cầu nối.');
  }

  // Bắt đầu
  sendHeartbeat();
  heartbeatTimer = setInterval(sendHeartbeat, 4000);
  startObserver();
})();
