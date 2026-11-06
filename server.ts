import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { extractChosenOption } from './src/utils/voteParser';

dotenv.config();

const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
let projectRoot = process.env.PROJECT_ROOT || '';
if (!projectRoot || !fs.existsSync(path.join(projectRoot, 'public'))) {
  if (fs.existsSync(path.join(currentDir, 'public'))) {
    projectRoot = currentDir;
  } else if (fs.existsSync(path.join(currentDir, '..', 'public'))) {
    projectRoot = path.join(currentDir, '..');
  } else {
    projectRoot = currentDir;
  }
}

const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());
app.use('/assets', express.static(path.join(projectRoot, 'public', 'assets')));

// TikTok LIVE Integration State
interface TikTokStats {
  isConnected: boolean;
  isConnecting: boolean;
  username: string;
  roomId: string;
  viewerCount: number;
  totalLikes: number;
  error?: string;
}

let activeTikTokConn: InstanceType<typeof TikTokLiveConnection> | null = null;
let sseClients: express.Response[] = [];
let liveStats: TikTokStats = {
  isConnected: false,
  isConnecting: false,
  username: '',
  roomId: '',
  viewerCount: 0,
  totalLikes: 0,
  error: '',
};

function broadcastSSE(eventType: string, data: unknown) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.write(payload);
    } catch {
      // client disconnected
    }
  });
}

// Driving Live Game Settings persisted on server outside public/ and src/ to prevent Vite full-reload loops
const DATA_DIR = path.join(projectRoot, '.data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DRIVING_SETTINGS_FILE = path.join(DATA_DIR, 'driving_settings.json');
const DEFAULT_DRIVING_SETTINGS = {
  countdownSeconds: 15,
  autoNextDelay: 10,
  autoPlay: true,
  enableTTS: true,
  voiceId: 'zerotts-maichi',
  voiceGender: 'female',
  voiceRate: 1.30,
  voiceVolume: 1.0,
  soundEffectsEnabled: true,
  marqueeText: '🚗 ÔN THI LÝ THUYẾT LÁI XE B2/C • 600 CÂU HỎI CHUẨN BỘ GTVT • GÕ COMMENT 1, 2, 3, 4 ĐỂ CHỌN ĐÁP ÁN • CHÚC BẠN THI ĐẬU 100%! 🚗',
  marqueeSpeed: 45,
  showTipTiming: 'revealed',
  enableInteractiveVoice: true,
  enableLikeFollowPopup: true,
  likeFollowIntervalMinutes: 2,
  likeFollowText: '❤️ Nhấn thả tim liên tục vào màn hình & Bấm Follow để không bỏ lỡ buổi học tiếp theo nhé!',
  enableZaloCoursePopup: true,
  zaloCourseIntervalMinutes: 3,
  zaloCourseText: '👉 Bấm vào Avatar / Trang cá nhân để lấy Zalo tư vấn học bằng lái B2/C trọn gói nhé cả nhà!',
  zaloContactPhone: '09xx.xxx.xxx',
  enableRandomQuestions: false,
};

let currentDrivingSettings = { ...DEFAULT_DRIVING_SETTINGS };
try {
  if (fs.existsSync(DRIVING_SETTINGS_FILE)) {
    const raw = fs.readFileSync(DRIVING_SETTINGS_FILE, 'utf8');
    currentDrivingSettings = { ...DEFAULT_DRIVING_SETTINGS, ...JSON.parse(raw) };
  }
} catch (e) {
  console.warn('[Server] Could not read driving_settings.json:', e);
}

// Load 600 Questions on Server for central authoritative validation & scoring
const QUESTIONS_FILE = path.join(projectRoot, 'public', 'data', 'questions.json');
let questionsData: any[] = [];
try {
  if (fs.existsSync(QUESTIONS_FILE)) {
    questionsData = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf-8'));
    console.log(`[Server] Loaded ${questionsData.length} questions from questions.json`);
  }
} catch (err) {
  console.error('[Server] Could not load questions.json:', err);
}

export interface UserVote {
  username: string;
  nickname: string;
  avatar: string;
  option: number;
  timestamp: number;
}

export interface LeaderboardUser {
  username: string;
  nickname: string;
  avatar: string;
  correctCount: number;
  totalAnswered: number;
  streak: number;
  lastCorrectTime: number;
}

// Driving Session State (Central Source of Truth synced via Socket.io & SSE)
export interface DrivingLiveSession {
  state: 'idle' | 'running' | 'paused' | 'ended';
  currentIndex: number;
  phase: 'reading' | 'countdown' | 'revealed';
  timeLeft: number;
  revealDelayLeft: number;
  updatedAt: number;
  votes: UserVote[];
  recentVotes: UserVote[];
  leaderboard: LeaderboardUser[];
  playedCount: number;
  enableRandom: boolean;
}

const playedQuestionIndices: Set<number> = new Set<number>([0]);
const questionHistory: number[] = [0];

let currentDrivingSession: DrivingLiveSession = {
  state: 'idle',
  currentIndex: 0,
  phase: 'reading',
  timeLeft: currentDrivingSettings.countdownSeconds || 15,
  revealDelayLeft: currentDrivingSettings.autoNextDelay || 3,
  updatedAt: Date.now(),
  votes: [],
  recentVotes: [],
  leaderboard: [],
  playedCount: 1,
  enableRandom: false,
};

let countdownInterval: NodeJS.Timeout | null = null;
let revealInterval: NodeJS.Timeout | null = null;
let safetyReadingTimeout: NodeJS.Timeout | null = null;

function clearAllTimers() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  if (revealInterval) {
    clearInterval(revealInterval);
    revealInterval = null;
  }
  if (safetyReadingTimeout) {
    clearTimeout(safetyReadingTimeout);
    safetyReadingTimeout = null;
  }
}

function broadcastSessionState() {
  currentDrivingSession.playedCount = playedQuestionIndices.size;
  currentDrivingSession.enableRandom = !!currentDrivingSettings.enableRandomQuestions;
  io.emit('session:state', currentDrivingSession);
  broadcastSSE('session', currentDrivingSession);
}

function updateLeaderboardOnServer(vote: UserVote, isCorrect: boolean) {
  const username = vote.username;
  let user = currentDrivingSession.leaderboard.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );

  if (!user) {
    user = {
      username,
      nickname: vote.nickname || username,
      avatar: vote.avatar,
      correctCount: isCorrect ? 1 : 0,
      totalAnswered: 1,
      streak: isCorrect ? 1 : 0,
      lastCorrectTime: isCorrect ? Date.now() : 0,
    };
    currentDrivingSession.leaderboard.push(user);
  } else {
    user.totalAnswered += 1;
    if (isCorrect) {
      user.correctCount += 1;
      user.streak = (user.streak || 0) + 1;
      user.lastCorrectTime = Date.now();
    } else {
      user.streak = 0;
    }
    if (vote.avatar) user.avatar = vote.avatar;
    if (vote.nickname) user.nickname = vote.nickname;
  }

  currentDrivingSession.leaderboard.sort((a, b) => {
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    if (b.streak !== a.streak) return b.streak - a.streak;
    return a.lastCorrectTime - b.lastCorrectTime;
  });
}

function handleVoteOnServer(option: number, username: string, nickname: string, avatar = '') {
  if (currentDrivingSession.state !== 'running' || currentDrivingSession.phase === 'revealed') {
    return;
  }

  const newVote: UserVote = {
    username,
    nickname: nickname || username,
    avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
    option,
    timestamp: Date.now(),
  };

  const existsIdx = currentDrivingSession.votes.findIndex(
    (v) => v.username.toLowerCase() === username.toLowerCase()
  );
  if (existsIdx >= 0) {
    currentDrivingSession.votes[existsIdx] = newVote;
  } else {
    currentDrivingSession.votes.push(newVote);
  }

  currentDrivingSession.recentVotes.push(newVote);
  if (currentDrivingSession.recentVotes.length > 25) {
    currentDrivingSession.recentVotes.shift();
  }

  io.emit('vote:new', newVote);
  io.emit('votes:update', {
    votes: currentDrivingSession.votes,
    recentVotes: currentDrivingSession.recentVotes,
  });
}

function startCountdown(customSecs?: number) {
  clearAllTimers();
  const secs = typeof customSecs === 'number' ? customSecs : currentDrivingSettings.countdownSeconds || 15;
  currentDrivingSession.phase = 'countdown';
  currentDrivingSession.timeLeft = secs;
  currentDrivingSession.updatedAt = Date.now();
  broadcastSessionState();

  countdownInterval = setInterval(() => {
    if (currentDrivingSession.state !== 'running') {
      if (countdownInterval) clearInterval(countdownInterval);
      countdownInterval = null;
      return;
    }

    currentDrivingSession.timeLeft -= 1;
    io.emit('session:tick', { timeLeft: currentDrivingSession.timeLeft, phase: 'countdown' });

    if (currentDrivingSession.timeLeft <= 0) {
      if (countdownInterval) clearInterval(countdownInterval);
      countdownInterval = null;
      revealAnswer();
    }
  }, 1000);
}

function revealAnswer() {
  clearAllTimers();
  currentDrivingSession.phase = 'revealed';
  currentDrivingSession.updatedAt = Date.now();

  const currQ = questionsData[currentDrivingSession.currentIndex];
  if (currQ) {
    const correctOpt = currQ.correctAnswer;
    currentDrivingSession.votes.forEach((v) => {
      updateLeaderboardOnServer(v, v.option === correctOpt);
    });
  }

  const delaySecs = Math.max(currentDrivingSettings.autoNextDelay || 3, 2);
  currentDrivingSession.revealDelayLeft = delaySecs;
  broadcastSessionState();
  io.emit('leaderboard:update', { leaderboard: currentDrivingSession.leaderboard });

  if (currentDrivingSettings.autoPlay && currentDrivingSession.state === 'running') {
    let currentDelay = delaySecs;
    revealInterval = setInterval(() => {
      if (currentDrivingSession.state !== 'running') {
        if (revealInterval) clearInterval(revealInterval);
        revealInterval = null;
        return;
      }
      currentDelay -= 1;
      currentDrivingSession.revealDelayLeft = Math.max(0, currentDelay);
      io.emit('session:reveal_delay_tick', { revealDelayLeft: currentDrivingSession.revealDelayLeft });

      if (currentDelay <= 0) {
        if (revealInterval) clearInterval(revealInterval);
        revealInterval = null;
        nextQuestion();
      }
    }, 1000);
  }
}

function goToQuestion(index: number, addToHistory: boolean = true) {
  if (questionsData.length === 0) return;
  const safeIdx = Math.max(0, Math.min(questionsData.length - 1, index));
  clearAllTimers();

  playedQuestionIndices.add(safeIdx);
  if (addToHistory) {
    if (questionHistory.length === 0 || questionHistory[questionHistory.length - 1] !== safeIdx) {
      questionHistory.push(safeIdx);
    }
  }

  currentDrivingSession.state = 'running';
  currentDrivingSession.currentIndex = safeIdx;
  currentDrivingSession.phase = 'reading';
  currentDrivingSession.timeLeft = currentDrivingSettings.countdownSeconds || 15;
  currentDrivingSession.revealDelayLeft = currentDrivingSettings.autoNextDelay || 3;
  currentDrivingSession.votes = [];
  currentDrivingSession.recentVotes = [];
  currentDrivingSession.updatedAt = Date.now();
  currentDrivingSession.playedCount = playedQuestionIndices.size;
  currentDrivingSession.enableRandom = !!currentDrivingSettings.enableRandomQuestions;

  broadcastSessionState();
  io.emit('votes:update', { votes: [], recentVotes: [] });

  // Safety fallback: if stage doesn't call stage:reading_finished within 14s, start countdown
  if (!currentDrivingSettings.enableTTS) {
    startCountdown();
  } else {
    safetyReadingTimeout = setTimeout(() => {
      if (currentDrivingSession.state === 'running' && currentDrivingSession.phase === 'reading') {
        startCountdown();
      }
    }, 14000);
  }
}

function nextQuestion() {
  if (currentDrivingSettings.enableRandomQuestions) {
    // 1. Tìm các câu hỏi chưa đọc
    let unplayed: number[] = [];
    for (let i = 0; i < questionsData.length; i++) {
      if (!playedQuestionIndices.has(i)) {
        unplayed.push(i);
      }
    }

    // 2. Nếu đã hoàn thành toàn bộ 600 câu -> Tự động reset và bắt đầu vòng random mới
    if (unplayed.length === 0) {
      console.log('[Server] 🎉 Đã đọc hết toàn bộ 600 câu hỏi! Tự động reset và bắt đầu vòng random mới.');
      playedQuestionIndices.clear();
      for (let i = 0; i < questionsData.length; i++) {
        unplayed.push(i);
      }
      io.emit('session:random_cycle_reset', { totalQuestions: questionsData.length });
    }

    // 3. Bốc ngẫu nhiên 1 câu chưa đọc trong chu kỳ này
    const randomIdx = unplayed[Math.floor(Math.random() * unplayed.length)];
    console.log(`[Server] 🎲 [RANDOM] Bốc ngẫu nhiên câu: ${randomIdx + 1}/${questionsData.length} (Đã hoàn thành: ${playedQuestionIndices.size + 1}/${questionsData.length})`);
    goToQuestion(randomIdx, true);
  } else {
    // Chế độ tuần tự
    if (currentDrivingSession.currentIndex < questionsData.length - 1) {
      goToQuestion(currentDrivingSession.currentIndex + 1, true);
    } else {
      goToQuestion(0, true);
    }
  }
}

function prevQuestion() {
  if (currentDrivingSettings.enableRandomQuestions) {
    if (questionHistory.length > 1) {
      questionHistory.pop(); // Loại bỏ câu hiện tại
      const prevIdx = questionHistory[questionHistory.length - 1];
      console.log(`[Server] ⏪ [RANDOM] Trở về câu hỏi trước đó: ${prevIdx + 1}`);
      goToQuestion(prevIdx, false);
      return;
    }
  }
  if (currentDrivingSession.currentIndex > 0) {
    goToQuestion(currentDrivingSession.currentIndex - 1, true);
  }
}

function pauseSession() {
  clearAllTimers();
  currentDrivingSession.state = 'paused';
  currentDrivingSession.updatedAt = Date.now();
  broadcastSessionState();
}

function resumeSession() {
  goToQuestion(currentDrivingSession.currentIndex);
}

// TikTok Live SSE Stream
app.get('/api/tiktok/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send current status & server settings right away
  res.write(`event: status\ndata: ${JSON.stringify(liveStats)}\n\n`);
  res.write(`event: settings\ndata: ${JSON.stringify(currentDrivingSettings)}\n\n`);
  res.write(`event: session\ndata: ${JSON.stringify(currentDrivingSession)}\n\n`);
  if (lastRateControl) res.write(`event: control\ndata: ${JSON.stringify(lastRateControl)}\n\n`);

  if (lastNameControl) res.write(`event: control\ndata: ${JSON.stringify(lastNameControl)}\n\n`);
  sseClients.push(res);

  // Keep-alive heartbeat every 20s
  const heartbeat = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter((c) => c !== res);
  });
});

// TikTok Live Current Status
app.get('/api/tiktok/status', (_req, res) => {
  return res.json({ success: true, data: liveStats });
});

// Connect to TikTok Live room by username
app.post('/api/tiktok/connect', async (req, res) => {
  const { username } = req.body;
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ success: false, error: 'Thiếu tên tài khoản TikTok (username)' });
  }

  const cleanUser = username.replace(/^@/, '').trim();
  if (!cleanUser) {
    return res.status(400).json({ success: false, error: 'Tên tài khoản không hợp lệ' });
  }

  try {
    // If already connected to another room, disconnect first
    if (activeTikTokConn) {
      try {
        activeTikTokConn.disconnect();
      } catch {
        // ignore
      }
      activeTikTokConn = null;
    }

    liveStats = {
      isConnected: false,
      isConnecting: true,
      username: cleanUser,
      roomId: '',
      viewerCount: 0,
      totalLikes: 0,
      error: '',
    };
    broadcastSSE('status', liveStats);

    const conn = new TikTokLiveConnection(cleanUser, {
      processInitialData: true,
      // The gift-list fetch behind this option needs a paid Euler Stream plan; gift events already carry name and diamonds
      enableExtendedGiftInfo: false,
    });

    conn.on(ControlEvent.CONNECTED, (state: { roomId?: string }) => {
      console.log(`[TikTok LIVE] Connected to @${cleanUser}, room ID: ${state?.roomId}`);
      liveStats = {
        isConnected: true,
        isConnecting: false,
        username: cleanUser,
        roomId: state?.roomId || '',
        viewerCount: liveStats.viewerCount,
        totalLikes: liveStats.totalLikes,
        error: '',
      };
      broadcastSSE('status', liveStats);
      broadcastSSE('connected', { username: cleanUser, roomId: state?.roomId });
    });

    conn.on(ControlEvent.DISCONNECTED, () => {
      console.log(`[TikTok LIVE] Disconnected from @${cleanUser}`);
      liveStats.isConnected = false;
      liveStats.isConnecting = false;
      broadcastSSE('status', liveStats);
      broadcastSSE('disconnected', { username: cleanUser });
      io.emit('tiktok:status', liveStats);
    });

    conn.on(WebcastEvent.STREAM_END, () => {
      console.log(`[TikTok LIVE] Stream ended for @${cleanUser}`);
      liveStats.isConnected = false;
      liveStats.isConnecting = false;
      liveStats.error = 'Phiên Live trên TikTok đã kết thúc';
      broadcastSSE('status', liveStats);
      broadcastSSE('streamEnd', { username: cleanUser });
      io.emit('tiktok:status', liveStats);
    });

    conn.on(WebcastEvent.CHAT, (data: any) => {
      const chatEvent = {
        username: data?.user?.displayId || data?.user?.uniqueId || data?.uniqueId || 'devotee',
        nickname: data?.user?.nickname || data?.nickname || data?.uniqueId || 'Phật tử',
        // tiktok-live-proto v3 puts the text in `content` (v1 used `comment`)
        comment: data?.content || data?.comment || '',
        avatar: data?.user?.avatarThumb?.urlList?.[0] || "",
        timestamp: Date.now(),
      };
      broadcastSSE('chat', chatEvent);
      io.emit('tiktok:chat', chatEvent);

      if (currentDrivingSession.state === 'running' && currentDrivingSession.phase !== 'revealed') {
        const currQ = questionsData[currentDrivingSession.currentIndex];
        const maxOpts = currQ?.options?.length || 4;
        const opt = extractChosenOption(chatEvent.comment, maxOpts);
        if (opt && opt >= 1 && opt <= maxOpts) {
          handleVoteOnServer(opt, chatEvent.username, chatEvent.nickname, chatEvent.avatar);
        }
      }
    });

    // TikTok resends streak gifts with a cumulative repeatCount; only forward the new units
    const streakCounts = new Map<string, number>();

    conn.on(WebcastEvent.GIFT, (data: any) => {
      const username = data?.user?.displayId || data?.user?.uniqueId || data?.uniqueId || 'devotee';
      const giftId = data?.giftId || 0;
      const streakKey = `${username}_${giftId}`;
      const total = data?.repeatCount || 1;
      const delta = total - (streakCounts.get(streakKey) || 0);
      const isStreakable = (data?.gift?.type ?? data?.giftDetails?.giftType ?? data?.giftType) === 1;
      if (isStreakable && !data?.repeatEnd) streakCounts.set(streakKey, total);
      else streakCounts.delete(streakKey);
      if (delta <= 0) return;

      const giftEvent = {
        username,
        nickname: data?.user?.nickname || data?.nickname || data?.uniqueId || 'Thí chủ',
        giftName: data?.gift?.name || data?.giftDetails?.giftName || data?.giftName || 'Hoa Sen',
        giftId,
        diamondCount: data?.gift?.diamondCount || data?.diamondCount || data?.giftDetails?.diamondCount || 1,
        repeatCount: delta,
        repeatEnd: data?.repeatEnd ?? 1,
        avatar: data?.user?.avatarThumb?.urlList?.[0] || "",
        timestamp: Date.now(),
      };
      broadcastSSE('gift', giftEvent);
      io.emit('tiktok:gift', giftEvent);
    });

    conn.on(WebcastEvent.MEMBER, (data: any) => {
      const memberEvent = {
        username: data?.user?.displayId || data?.user?.uniqueId || data?.uniqueId || 'devotee',
        nickname: data?.user?.nickname || data?.nickname || data?.uniqueId || 'Phật tử',
        avatar: data?.user?.avatarThumb?.urlList?.[0] || "",
        timestamp: Date.now(),
      };
      broadcastSSE('member', memberEvent);
    });

    conn.on(WebcastEvent.FOLLOW, (data: any) => {
      broadcastSSE('follow', {
        username: data?.user?.displayId || data?.user?.uniqueId || data?.uniqueId || 'devotee',
        nickname: data?.user?.nickname || data?.nickname || data?.uniqueId || 'Phật tử',
        timestamp: Date.now(),
      });
    });

    conn.on(WebcastEvent.ROOM_USER, (data: any) => {
      if (typeof data?.viewerCount === 'number') {
        liveStats.viewerCount = data.viewerCount;
        broadcastSSE('roomUser', { viewerCount: data.viewerCount });
        io.emit('tiktok:roomUser', { viewerCount: data.viewerCount });
      }
    });

    conn.on(WebcastEvent.LIKE, (data: any) => {
      if (typeof data?.totalLikeCount === 'number') {
        liveStats.totalLikes = data.totalLikeCount;
      }
      broadcastSSE('like', {
        username: data?.user?.displayId || data?.user?.uniqueId || data?.uniqueId || '',
        likeCount: data?.likeCount || 1,
        totalLikes: liveStats.totalLikes,
      });
      io.emit('tiktok:like', { totalLikes: liveStats.totalLikes });
    });

    conn.on(ControlEvent.ERROR, (err: unknown) => {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[TikTok LIVE] Error for @${cleanUser}:`, errMsg);
      liveStats.error = errMsg;
      broadcastSSE('status', liveStats);
      io.emit('tiktok:status', liveStats);
    });

    activeTikTokConn = conn;

    // Connect to room (note: user might not be live right now)
    conn
      .connect()
      .then((state: { roomId?: string }) => {
        return res.json({
          success: true,
          message: `Đang kết nối phòng live @${cleanUser}`,
          roomId: state.roomId,
        });
      })
      .catch((err: unknown) => {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[TikTok LIVE] Connect error for @${cleanUser}:`, errMsg);
        liveStats.isConnecting = false;
        liveStats.isConnected = false;
        liveStats.error = errMsg;
        broadcastSSE('status', liveStats);
        return res.status(400).json({
          success: false,
          error: `Không thể kết nối với @${cleanUser}: ${errMsg}. Hãy đảm bảo tài khoản đang bấm Phát trực tiếp (LIVE) trên TikTok!`,
        });
      });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    liveStats.isConnecting = false;
    liveStats.isConnected = false;
    liveStats.error = errMsg;
    broadcastSSE('status', liveStats);
    return res.status(500).json({ success: false, error: errMsg });
  }
});

// Streamer commands from the dashboard, relayed to the live stage page(s) that make the sound
const CONTROL_ACTIONS = [
  'speak',
  'shareReminder',
  'bell',
  'setRate',
  'setName',
  'nextQuestion',
  'prevQuestion',
  'setQuestion',
  'startTimer',
  'revealAnswer',
  'toggleAutoPlay',
  'resetLeaderboard',
];

// The channel name (title + what the voice says) survives restarts in settings.json next to this file
const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');
let lastNameControl: { action: string; text: string } | null = null;
try {
  const saved = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  if (typeof saved.channelName === 'string' && saved.channelName.trim()) lastNameControl = { action: 'setName', text: saved.channelName.trim() };
} catch {
  // no settings yet: the app's default name is used
}
// Last voice speed from the dashboard, replayed to stage pages that (re)load later
let lastRateControl: { action: string; text: string } | null = null;
app.post('/api/control', (req, res) => {
  const { action, text } = req.body || {};
  if (!CONTROL_ACTIONS.includes(action)) {
    return res.status(400).json({ success: false, error: 'Lệnh không hợp lệ' });
  }
  if (action === 'speak' && (typeof text !== 'string' || !text.trim())) {
    return res.status(400).json({ success: false, error: 'Chưa nhập nội dung cần đọc' });
  }
  const payload = { action, text: typeof text === 'string' ? text.trim().slice(0, 1000) : undefined };
  if (action === 'setRate' && payload.text) lastRateControl = { action, text: payload.text };
  if (action === 'setName') {
    // Plain name only: no control characters, at most 40 characters
    const name = (payload.text || '').replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 40);
    if (!name) return res.status(400).json({ success: false, error: 'Chưa nhập tên kênh' });
    payload.text = name;
    lastNameControl = { action, text: name };
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ channelName: name }, null, 2));
    } catch (err) {
      console.error('Could not save settings.json:', err);
    }
  }
  broadcastSSE('control', payload);
  return res.json({ success: true, stages: sseClients.length });
});

// Disconnect route
app.post('/api/tiktok/disconnect', (_req, res) => {
  try {
    if (activeTikTokConn) {
      activeTikTokConn.disconnect();
      activeTikTokConn = null;
    }
    liveStats = {
      isConnected: false,
      isConnecting: false,
      username: '',
      roomId: '',
      viewerCount: 0,
      totalLikes: 0,
      error: '',
    };
    broadcastSSE('status', liveStats);
    return res.json({ success: true, message: 'Đã ngắt kết nối TikTok LIVE' });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: errMsg });
  }
});

// Driving Live Central Settings API (Get & Sync across Chrome/Safari/OBS/TikTok Studio)
app.get('/api/driving/settings', (_req, res) => {
  return res.json({ success: true, settings: currentDrivingSettings });
});

app.post('/api/driving/settings', (req, res) => {
  const incoming = req.body || {};
  currentDrivingSettings = { ...currentDrivingSettings, ...incoming };
  try {
    fs.writeFileSync(DRIVING_SETTINGS_FILE, JSON.stringify(currentDrivingSettings, null, 2));
  } catch (err) {
    console.warn('[Server] Could not save driving_settings.json:', err);
  }
  broadcastSSE('settings', currentDrivingSettings);
  return res.json({ success: true, settings: currentDrivingSettings });
});

// Driving Session State API (Get & Sync across tabs/OBS)
app.get('/api/driving/session', (_req, res) => {
  return res.json({ success: true, session: currentDrivingSession });
});

app.post('/api/driving/session', (req, res) => {
  const incoming = req.body || {};
  currentDrivingSession = { ...currentDrivingSession, ...incoming, updatedAt: Date.now() };
  broadcastSSE('session', currentDrivingSession);
  return res.json({ success: true, session: currentDrivingSession });
});

// Cross-App Remote Command API (Syncs commands between Streamer Deck and TikTok LIVE Studio)
app.post('/api/driving/cmd', (req, res) => {
  const cmdData = req.body || {};
  const { type, index } = cmdData;

  if (type === 'CMD_START' || type === 'CMD_RESUME' || type === 'CMD_REPLAY') {
    const idx = typeof index === 'number' ? index : currentDrivingSession.currentIndex;
    goToQuestion(idx);
  } else if (type === 'CMD_PAUSE') {
    pauseSession();
  } else if (type === 'CMD_NEXT') {
    nextQuestion();
  } else if (type === 'CMD_PREV') {
    prevQuestion();
  } else if (type === 'CMD_GOTO' && typeof index === 'number') {
    goToQuestion(index);
  } else if (type === 'CMD_REVEAL') {
    revealAnswer();
  } else if (type === 'CMD_END') {
    clearAllTimers();
    currentDrivingSession.state = 'ended';
    currentDrivingSession.phase = 'revealed';
    currentDrivingSession.updatedAt = Date.now();
    broadcastSessionState();
  }

  broadcastSSE('cmd', cmdData);
  return res.json({ success: true, session: currentDrivingSession });
});

// Socket.io Central Realtime Hub
io.on('connection', (socket) => {
  // Send full initial state immediately to connecting client
  socket.emit('sync:init', {
    session: currentDrivingSession,
    settings: currentDrivingSettings,
    tikTokStatus: liveStats,
    leaderboard: currentDrivingSession.leaderboard,
    votes: currentDrivingSession.votes,
    recentVotes: currentDrivingSession.recentVotes,
  });

  socket.on('cmd:start', (data) => {
    const idx = typeof data?.index === 'number' ? data.index : currentDrivingSession.currentIndex;
    goToQuestion(idx);
  });

  socket.on('cmd:pause', () => {
    pauseSession();
  });

  socket.on('cmd:resume', (data) => {
    const idx = typeof data?.index === 'number' ? data.index : currentDrivingSession.currentIndex;
    goToQuestion(idx);
  });

  socket.on('cmd:prev', () => {
    prevQuestion();
  });

  socket.on('cmd:next', () => {
    nextQuestion();
  });

  socket.on('cmd:goto', (data) => {
    if (typeof data?.index === 'number') {
      goToQuestion(data.index);
    }
  });

  socket.on('cmd:reveal', () => {
    revealAnswer();
  });

  socket.on('cmd:timer_start', (data) => {
    startCountdown(data?.seconds);
  });

  socket.on('cmd:end', () => {
    clearAllTimers();
    currentDrivingSession.state = 'ended';
    currentDrivingSession.phase = 'revealed';
    currentDrivingSession.updatedAt = Date.now();
    broadcastSessionState();
  });

  socket.on('cmd:update_settings', (newSettings) => {
    if (newSettings && typeof newSettings === 'object') {
      currentDrivingSettings = { ...currentDrivingSettings, ...newSettings };
      try {
        fs.writeFileSync(DRIVING_SETTINGS_FILE, JSON.stringify(currentDrivingSettings, null, 2));
      } catch {}
      currentDrivingSession.enableRandom = !!currentDrivingSettings.enableRandomQuestions;
      currentDrivingSession.playedCount = playedQuestionIndices.size;
      broadcastSessionState();
      io.emit('settings:update', { settings: currentDrivingSettings });
      broadcastSSE('settings', currentDrivingSettings);
      console.log(`[Server] ⚙️ Cập nhật cài đặt (Random: ${currentDrivingSettings.enableRandomQuestions ? 'BẬT' : 'TẮT'})`);
    }
  });

  socket.on('cmd:reset_leaderboard', () => {
    currentDrivingSession.leaderboard = [];
    io.emit('leaderboard:update', { leaderboard: [] });
  });

  socket.on('cmd:reset_random', () => {
    playedQuestionIndices.clear();
    if (currentDrivingSession.currentIndex >= 0) {
      playedQuestionIndices.add(currentDrivingSession.currentIndex);
    }
    questionHistory.length = 0;
    if (currentDrivingSession.currentIndex >= 0) {
      questionHistory.push(currentDrivingSession.currentIndex);
    }
    currentDrivingSession.playedCount = playedQuestionIndices.size;
    broadcastSessionState();
    io.emit('session:random_cycle_reset', { totalQuestions: questionsData.length });
    console.log('[Server] 🔄 Đã đặt lại vòng câu hỏi Random');
  });

  socket.on('cmd:simulate_vote', (data) => {
    handleVoteOnServer(
      data?.option || 1,
      data?.username || 'hocvien_test',
      data?.nickname || 'Học Viên Test'
    );
  });

  socket.on('overlay:trigger', (data) => {
    io.emit('overlay:trigger', data);
  });

  socket.on('avatar:speak', (data) => {
    io.emit('avatar:speak', data);
  });

  socket.on('stage:reading_finished', () => {
    if (safetyReadingTimeout) {
      clearTimeout(safetyReadingTimeout);
      safetyReadingTimeout = null;
    }
    if (currentDrivingSession.state === 'running' && currentDrivingSession.phase === 'reading') {
      startCountdown();
    }
  });
});


// Split at sentence/comma/space boundaries into pieces of at most `max` chars
function splitTtsText(text: string, max = 190): string[] {
  const chunks: string[] = [];
  let rest = text.trim();
  while (rest.length > max) {
    const window = rest.slice(0, max + 1);
    let cut = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '));
    if (cut < max / 2) cut = Math.max(window.lastIndexOf(', '), window.lastIndexOf('; '));
    if (cut < max / 2) cut = window.lastIndexOf(' ');
    if (cut <= 0) cut = max - 1;
    chunks.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

// Voice settings & ZeroTTS Integration
const ZEROTTS_PORT = 5005;
const ZEROTTS_URL = `http://127.0.0.1:${ZEROTTS_PORT}`;
let zeroTtsChild: ChildProcess | null = null;

async function checkZeroTtsHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${ZEROTTS_URL}/health`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureZeroTtsRunning() {
  const isHealthy = await checkZeroTtsHealth();
  if (isHealthy) {
    console.log('[ZeroTTS] Service is already running on', ZEROTTS_URL);
    return;
  }
  console.log('[ZeroTTS] Spawning local Python ZeroTTS service...');
  const scriptPath = path.join(projectRoot, 'scripts', 'zerotts_service.py');
  if (fs.existsSync(scriptPath)) {
    zeroTtsChild = spawn('python3', [scriptPath], {
      stdio: 'inherit',
      detached: false,
    });
    zeroTtsChild.on('error', (err) => {
      console.warn('[ZeroTTS] Không tìm thấy python3 hoặc lỗi khởi chạy (sẽ tự động dùng Edge TTS trực tuyến):', err.message);
      zeroTtsChild = null;
    });
    zeroTtsChild.on('exit', (code) => {
      console.log(`[ZeroTTS] Service exited with code ${code}`);
    });
  }
}

// Kill python microservice when node exits
process.on('SIGINT', () => {
  if (zeroTtsChild) zeroTtsChild.kill();
  process.exit(0);
});
process.on('SIGTERM', () => {
  if (zeroTtsChild) zeroTtsChild.kill();
  process.exit(0);
});

const DEFAULT_TTS_VOICE = 'zerotts-maichi';
const TTS_PITCH = '-2%';
const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function edgeTts(text: string, rate: number, voice: string = 'vi-VN-HoaiMyNeural'): Promise<Buffer> {
  const selectedVoice = voice.startsWith('vi-VN') ? voice : 'vi-VN-HoaiMyNeural';
  let lastErr: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    const tts = new MsEdgeTTS();
    try {
      await tts.setMetadata(selectedVoice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(escapeXml(text), {
        rate: `${Math.round((rate - 1) * 100)}%`,
        pitch: TTS_PITCH,
      });
      const chunks: Buffer[] = [];
      const read = (async () => {
        for await (const c of audioStream) chunks.push(c as Buffer);
      })();
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Edge TTS timeout')), 15000));
      await Promise.race([read, timeout]);
      if (chunks.length > 0) {
        return Buffer.concat(chunks);
      }
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 350));
    } finally {
      try {
        tts.close();
      } catch {
        // ignore
      }
    }
  }

  throw lastErr || new Error('Edge TTS failed after 3 attempts');
}

// Repeated lines are served from memory
const ttsCache = new Map<string, Buffer>();

app.get('/api/tts', async (req, res) => {
  try {
    const text = ((req.query.text as string) || '').trim().slice(0, 1500);
    if (!text) {
      return res.status(400).send('Missing text parameter');
    }
    const rate = Math.min(1.5, Math.max(0.5, Number(req.query.rate) || 1));
    const voice = ((req.query.voice as string) || DEFAULT_TTS_VOICE).trim();
    const qid = req.query.qid ? parseInt(String(req.query.qid), 10) : null;

    // 1. ZeroTTS Engine (e.g. zerotts-quangminh, zerotts-baotrang, zerotts-maichi)
    if (voice.startsWith('zerotts-')) {
      const cleanVoice = voice.replace('zerotts-', '').toLowerCase();
      const cacheDir = path.join(projectRoot, 'public', 'data', 'audio_cache', `zerotts-${cleanVoice}`);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      // 1a. Check pre-cached file by Question ID
      if (qid && qid > 0) {
        const qidFile = path.join(cacheDir, `q_${qid}.wav`);
        if (fs.existsSync(qidFile) && fs.statSync(qidFile).size > 1000) {
          res.setHeader('Content-Type', 'audio/wav');
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          return res.sendFile(qidFile);
        }
      }

      // 1b. Check pre-cached file by text MD5 hash
      const textHash = crypto.createHash('md5').update(`${cleanVoice}|${text}`).digest('hex');
      const hashFile = path.join(cacheDir, `h_${textHash}.wav`);
      if (fs.existsSync(hashFile) && fs.statSync(hashFile).size > 1000) {
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.sendFile(hashFile);
      }

      // 1c. Synthesize via local ZeroTTS microservice
      try {
        const url = `${ZEROTTS_URL}/synthesize?voice=${encodeURIComponent(cleanVoice)}&text=${encodeURIComponent(text)}`;
        const ttsRes = await fetch(url, { signal: AbortSignal.timeout(35000) });
        if (ttsRes.ok) {
          const arrayBuffer = await ttsRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          try {
            fs.writeFileSync(hashFile, buffer);
            if (qid && qid > 0) {
              const qidFile = path.join(cacheDir, `q_${qid}.wav`);
              fs.writeFileSync(qidFile, buffer);
            }
          } catch (writeErr) {
            console.warn('[ZeroTTS] Cache write error:', writeErr);
          }
          res.setHeader('Content-Type', 'audio/wav');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.send(buffer);
        }
      } catch (microErr) {
        console.warn('[ZeroTTS] Local service call failed, falling back to Edge TTS:', microErr);
      }
    }

    // 2. Edge TTS fallback / native (Female voice Hoai My)
    let edgeVoice = 'vi-VN-HoaiMyNeural';
    if (voice.startsWith('vi-VN')) {
      edgeVoice = voice;
    } else {
      edgeVoice = 'vi-VN-HoaiMyNeural';
    }
    const cacheKey = `${edgeVoice}|${rate}|${text}`;
    let audio = ttsCache.get(cacheKey);
    if (!audio) {
      audio = await edgeTts(text, rate, edgeVoice);
      ttsCache.set(cacheKey, audio);
      if (ttsCache.size > 500) ttsCache.delete(ttsCache.keys().next().value!);
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(audio);
  } catch (err) {
    console.error('TTS error:', err);
    return res.status(500).json({ error: 'TTS failed' });
  }
});

// Endpoint to fetch 600 questions
app.get('/api/questions', (_req, res) => {
  const questionsPath = path.join(projectRoot, 'public', 'data', 'questions.json');
  if (fs.existsSync(questionsPath)) {
    return res.sendFile(questionsPath);
  }
  return res.status(404).json({ error: 'questions.json not found' });
});

// Endpoint to simulate test chat comments (for testing offline without active TikTok Live)
app.post('/api/tiktok/test-chat', (req, res) => {
  const { username = 'hocvien_test', nickname = 'Học Viên 99', comment = '1', avatar = '' } = req.body || {};
  const chatEvent = {
    username,
    nickname,
    comment: String(comment),
    avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
    timestamp: Date.now(),
  };
  broadcastSSE('chat', chatEvent);
  io.emit('tiktok:chat', chatEvent);

  if (currentDrivingSession.state === 'running' && currentDrivingSession.phase !== 'revealed') {
    const currQ = questionsData[currentDrivingSession.currentIndex];
    const maxOpts = currQ?.options?.length || 4;
    const opt = extractChosenOption(chatEvent.comment, maxOpts);
    if (opt && opt >= 1 && opt <= maxOpts) {
      handleVoteOnServer(opt, chatEvent.username, chatEvent.nickname, chatEvent.avatar);
    }
  }

  return res.json({ success: true, event: chatEvent });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      // LIVE_MODE=1 (BAT-LIVE.bat): no hot reload, so editing code or a dropped dev socket never reloads the
      // stage page mid-live. Refresh the Link source by hand to pick up changes.
      server: {
        middlewareMode: true,
        hmr: process.env.LIVE_MODE === '1' ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(projectRoot, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(projectRoot, 'dist', 'index.html'));
    });
  }

  // Listen on 0.0.0.0 so localhost, 127.0.0.1, lvh.me, and OBS / TikTok LIVE Studio can connect freely
  const srv = httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`600 Câu Lý Thuyết Lái Xe LIVE server with Socket.io running on http://localhost:${PORT}`);
    ensureZeroTtsRunning().catch((err) => console.warn('[ZeroTTS] Init warning:', err));
  });

  srv.on('error', (err: any) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`[Server] Cổng ${PORT} đang bị chiếm bởi một tiến trình khác!`);
      process.exit(1);
    } else {
      console.error('[Server] Listen error:', err);
    }
  });
}

startServer();
