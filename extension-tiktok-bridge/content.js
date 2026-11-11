// TikTok Live Chat Bridge -> Ôn Thi Lý Thuyết Lái Xe B2/C (Content Script)
(function () {
  'use strict';

  const SERVER_URL = 'http://localhost:3000';
  let isBridgeRunning = false;
  let observer = null;
  let heartbeatTimer = null;
  let flushTimer = null;
  let bridgedCount = 0;
  let lastCommentText = 'Đang chờ bình luận...';
  const pendingComments = [];
  const processedNodes = new WeakSet();
  const recentDeduplicationKeys = new Set();

  function isLivePage() {
    return window.location.pathname.includes('/live') ||
           document.querySelector('[data-e2e="chat-room"], [class*="ChatRoom"], [class*="chat-room"]') !== null;
  }

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

  function createHUD() {
    if (document.getElementById('tiktok-driving-bridge-hud')) return;

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
          <button id="tt-bridge-close-btn" title="Tắt cầu nối" style="background: rgba(244,63,94,0.2); border: none; color: #fda4af; width: 22px; height: 22px; border-radius: 6px; cursor: pointer; font-size: 11px; display: flex; align-items: center; justify-content: center;">✕</button>
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
      stopBridge();
    };
  }

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
        updateHUD(true, bridgedCount, lastCommentText);
      })
      .catch(() => {
        updateHUD(false, bridgedCount, 'Không thể gọi localhost:3000 (Hãy bật BAT-LIVE.bat)');
      });
  }

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
        updateHUD(true, bridgedCount, lastCommentText);
      })
      .catch((err) => {
        console.warn('[TikTok Bridge Extension] Lỗi gửi comment:', err);
      });
  }

  function queueComment(commentData) {
    bridgedCount++;
    lastCommentText = `${commentData.nickname || commentData.username}: ${commentData.comment}`;
    updateHUD(true, bridgedCount, lastCommentText);
    console.log(`[TikTok Bridge Extension] 💬 [${commentData.nickname || commentData.username}]: ${commentData.comment}`);

    pendingComments.push(commentData);
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        flushPendingComments();
      }, 150);
    }
  }

  function parseChatElement(el) {
    if (!el || el.nodeType !== 1) return null;
    if (processedNodes.has(el)) return null;

    if (el.id && el.id.startsWith('tiktok-driving-bridge')) return null;
    if (el.closest && el.closest('#tiktok-driving-bridge-hud, #tiktok-driving-bridge-mini')) return null;

    let itemEl = null;
    if (
      el.matches && (
        el.matches('[data-e2e="chat-message"]') ||
        el.matches('div[class*="ChatMessage"]') ||
        el.matches('div[class*="chat-message"]') ||
        el.matches('div[class*="CommentItem"]') ||
        el.matches('div[class*="ChatItem"]') ||
        el.matches('div[class*="chat-item"]') ||
        el.matches('div[class*="DivItemContainer"]')
      )
    ) {
      itemEl = el;
    } else if (el.querySelector) {
      itemEl = el.querySelector(
        '[data-e2e="chat-message"], div[class*="ChatMessage"], div[class*="chat-message"], div[class*="CommentItem"], div[class*="ChatItem"], div[class*="chat-item"], div[class*="DivItemContainer"]'
      );
    }

    if (!itemEl && el.closest) {
      const inChat = el.closest('[data-e2e="chat-room"], [class*="ChatRoom"], [class*="ChatList"], [class*="chat-list"], [class*="DivChat"]');
      if (inChat && el.querySelector && el.querySelector('a[href*="/@"]')) {
        itemEl = el;
      }
    }

    if (!itemEl) return null;
    if (processedNodes.has(itemEl)) return null;
    processedNodes.add(itemEl);

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

    let avatar = '';
    const imgEl = itemEl.querySelector('img[src*="tiktok"], img[src*="byteoversea"], img');
    if (imgEl && imgEl.src && !imgEl.src.includes('data:image/svg')) {
      avatar = imgEl.src;
    }

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

  function startBridge() {
    if (isBridgeRunning) return;
    isBridgeRunning = true;
    console.log('[TikTok Bridge Extension] 🚀 Đang kích hoạt Cầu nối Live...');

    createHUD();

    // Bỏ qua tin nhắn cũ ban đầu
    const existing = document.querySelectorAll(
      '[data-e2e="chat-message"], div[class*="ChatMessage"], div[class*="CommentItem"], div[class*="ChatItem"]'
    );
    existing.forEach((node) => processedNodes.add(node));

    sendHeartbeat();
    heartbeatTimer = setInterval(sendHeartbeat, 4000);

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
  }

  function stopBridge() {
    if (!isBridgeRunning) return;
    isBridgeRunning = false;
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    const hud = document.getElementById('tiktok-driving-bridge-hud');
    if (hud) hud.remove();
    const mini = document.getElementById('tiktok-driving-bridge-mini');
    if (mini) mini.remove();
    console.log('[TikTok Bridge Extension] Đã tắt cầu nối.');
  }

  // Tự động kiểm tra URL & trạng thái trang
  setInterval(() => {
    if (isLivePage()) {
      if (!isBridgeRunning) {
        startBridge();
      }
    }
  }, 2000);

  if (isLivePage()) {
    startBridge();
  }
})();
