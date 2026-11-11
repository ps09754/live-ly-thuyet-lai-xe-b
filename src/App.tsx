import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DrivingQuestion,
  GamePhase,
  GameSettings,
  LeaderboardUser,
  SessionState,
  TikTokLiveStatus,
  UserVote,
} from './types/driving';
import { drivingSoundEngine } from './services/drivingSoundEngine';
import {
  getRandomCountdownCallout,
  getRandomMidCountdownCallout,
  getRandomRevealCallout,
  getRandomTransitionCallout,
  getInstantVoteShoutout,
} from './services/liveVoiceInteractions';
import { socketService } from './services/socketService';
import { DrivingStage } from './components/DrivingStage';
import { DrivingStreamerDeck } from './components/DrivingStreamerDeck';
import { ExternalLink } from 'lucide-react';

const pageParams = new URLSearchParams(window.location.search);
const IS_STAGE_PAGE = pageParams.get('view') === 'stage' || pageParams.get('obs') === 'true';

const DEFAULT_SETTINGS: GameSettings = {
  countdownSeconds: 15,
  autoNextDelay: 3,
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
  stagePaddingX: 32,
  stageOffsetX: 0,
  stagePaddingTop: 80,
  stagePaddingBottom: 190,
  tiktokUsername: '',
  tiktokSessionId: '',
};

export default function App() {
  const [questions, setQuestions] = useState<DrivingQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const sessionStateRef = useRef<SessionState>('idle');
  sessionStateRef.current = sessionState;

  const [phase, setPhase] = useState<GamePhase>('reading');
  const phaseRef = useRef<GamePhase>('reading');
  phaseRef.current = phase;
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [revealDelayLeft, setRevealDelayLeft] = useState<number>(3);
  const [isReading, setIsReading] = useState<boolean>(false);
  const [playedCount, setPlayedCount] = useState<number>(1);

  const [votes, setVotes] = useState<UserVote[]>([]);
  const [recentVotes, setRecentVotes] = useState<UserVote[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);

  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef<GameSettings>(settings);
  settingsRef.current = settings;

  const [tikTokStatus, setTikTokStatus] = useState<TikTokLiveStatus>({
    isConnected: false,
    isConnecting: false,
    username: '',
    roomId: '',
    viewerCount: 0,
    totalLikes: 0,
    error: '',
  });

  const votesRef = useRef<UserVote[]>([]);
  votesRef.current = votes;

  const stopTtsRef = useRef<(() => void) | null>(null);
  const hasPlayedMidRef = useRef<boolean>(false);
  const lastReadIndexRef = useRef<number>(-1);

  // 1. Fetch 600 questions
  useEffect(() => {
    fetch('/data/questions.json')
      .then((res) => res.json())
      .then((data: DrivingQuestion[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setQuestions(data);
        }
      })
      .catch((err) => console.error('Error loading questions.json:', err));
  }, []);

  // 2. Initialize Socket.io Connection & Listen to Server State Hub
  useEffect(() => {
    const socket = socketService.init();

    socket.on('sync:init', (data: any) => {
      if (data?.session) {
        setSessionState(data.session.state || 'idle');
        if (typeof data.session.currentIndex === 'number') setCurrentIndex(data.session.currentIndex);
        if (data.session.phase) setPhase(data.session.phase);
        if (typeof data.session.timeLeft === 'number') setTimeLeft(data.session.timeLeft);
        if (typeof data.session.revealDelayLeft === 'number') setRevealDelayLeft(data.session.revealDelayLeft);
        if (typeof data.session.playedCount === 'number') setPlayedCount(data.session.playedCount);
        if (Array.isArray(data.session.votes)) setVotes(data.session.votes);
        if (Array.isArray(data.session.recentVotes)) setRecentVotes(data.session.recentVotes);
      }
      if (data?.settings) {
        setSettings((prev) => ({ ...prev, ...data.settings }));
        drivingSoundEngine.setMuted(!data.settings.soundEffectsEnabled);
      }
      if (data?.tikTokStatus) {
        setTikTokStatus((prev) => ({ ...prev, ...data.tikTokStatus }));
      }
      if (Array.isArray(data?.leaderboard)) {
        setLeaderboard(data.leaderboard);
      }
    });

    socket.on('session:state', (session: any) => {
      if (!session) return;
      setSessionState(session.state || 'idle');
      if (typeof session.currentIndex === 'number') setCurrentIndex(session.currentIndex);
      if (session.phase) setPhase(session.phase);
      if (typeof session.timeLeft === 'number') setTimeLeft(session.timeLeft);
      if (typeof session.revealDelayLeft === 'number') setRevealDelayLeft(session.revealDelayLeft);
      if (typeof session.playedCount === 'number') setPlayedCount(session.playedCount);

      if (session.state === 'paused' || session.state === 'ended') {
        if (stopTtsRef.current) {
          stopTtsRef.current();
          stopTtsRef.current = null;
        }
        drivingSoundEngine.stopTTS();
        setIsReading(false);
      }
    });

    socket.on('session:tick', (data: { timeLeft: number; phase: GamePhase }) => {
      setTimeLeft(data.timeLeft);
      if (IS_STAGE_PAGE && settingsRef.current.soundEffectsEnabled) {
        if (data.timeLeft <= 5) drivingSoundEngine.playWarningTick();
        else drivingSoundEngine.playTick();
      }

      // Mid-countdown interactive callout (e.g. at 10s left) - Đọc tên người vote và đáp án thực tế
      if (
        IS_STAGE_PAGE &&
        data.timeLeft <= 10 &&
        !hasPlayedMidRef.current &&
        settingsRef.current.enableTTS &&
        (settingsRef.current.enableInteractiveVoice ?? true)
      ) {
        if (!drivingSoundEngine.isSpeaking()) {
          hasPlayedMidRef.current = true;
          const midCallout = getRandomMidCountdownCallout({ votes: votesRef.current });
          const cancelMid = drivingSoundEngine.playTTS(midCallout, {
            rate: settingsRef.current.voiceRate,
            voiceId: settingsRef.current.voiceId || 'zerotts-maichi',
            voiceGender: settingsRef.current.voiceGender,
            volume: settingsRef.current.voiceVolume ?? 1.0,
          });
          stopTtsRef.current = cancelMid;
        }
      }
    });

    socket.on('session:reveal_delay_tick', (data: { revealDelayLeft: number }) => {
      setRevealDelayLeft(data.revealDelayLeft);
    });

    let lastVoteShoutoutTime = 0;
    socket.on('vote:new', (newVote: UserVote) => {
      if (IS_STAGE_PAGE && settingsRef.current.soundEffectsEnabled) {
        drivingSoundEngine.playVotePop();
      }

      // Thỉnh thoảng đọc tên trực tiếp cảm ơn người xem khi vừa vote (khi đang đếm ngược và không bận nói)
      const now = Date.now();
      if (
        IS_STAGE_PAGE &&
        phaseRef.current === 'countdown' &&
        settingsRef.current.enableTTS &&
        (settingsRef.current.enableInteractiveVoice ?? true) &&
        now - lastVoteShoutoutTime > 8000 &&
        !drivingSoundEngine.isSpeaking() &&
        newVote?.nickname
      ) {
        lastVoteShoutoutTime = now;
        const shoutout = getInstantVoteShoutout(newVote);
        const cancelShoutout = drivingSoundEngine.playTTS(shoutout, {
          rate: settingsRef.current.voiceRate,
          voiceId: settingsRef.current.voiceId || 'zerotts-maichi',
          voiceGender: settingsRef.current.voiceGender,
          volume: settingsRef.current.voiceVolume ?? 1.0,
        });
        stopTtsRef.current = cancelShoutout;
      }
    });

    socket.on('votes:update', (data: { votes: UserVote[]; recentVotes: UserVote[] }) => {
      setVotes(data.votes || []);
      setRecentVotes(data.recentVotes || []);
    });

    socket.on('leaderboard:update', (data: { leaderboard: LeaderboardUser[] }) => {
      setLeaderboard(data.leaderboard || []);
    });

    socket.on('settings:update', (data: { settings: GameSettings }) => {
      if (data?.settings) {
        setSettings((prev) => ({ ...prev, ...data.settings }));
        drivingSoundEngine.setMuted(!data.settings.soundEffectsEnabled);
      }
    });

    socket.on('tiktok:status', (data: TikTokLiveStatus) => {
      setTikTokStatus((prev) => ({ ...prev, ...data }));
    });

    socket.on('tiktok:roomUser', (data: { viewerCount: number }) => {
      setTikTokStatus((prev) => ({ ...prev, viewerCount: data.viewerCount }));
    });

    socket.on('tiktok:like', (data: { totalLikes: number }) => {
      setTikTokStatus((prev) => ({ ...prev, totalLikes: data.totalLikes }));
    });

    return () => {
      socket.off('sync:init');
      socket.off('session:state');
      socket.off('session:tick');
      socket.off('session:reveal_delay_tick');
      socket.off('vote:new');
      socket.off('votes:update');
      socket.off('leaderboard:update');
      socket.off('settings:update');
      socket.off('tiktok:status');
      socket.off('tiktok:roomUser');
      socket.off('tiktok:like');
    };
  }, []);

  // 3. Audio & Voice Coordinator on Stage Tab (Only executed on `?view=stage`)
  useEffect(() => {
    if (!IS_STAGE_PAGE) return;

    if (sessionState !== 'running') {
      if (stopTtsRef.current) {
        stopTtsRef.current();
        stopTtsRef.current = null;
      }
      drivingSoundEngine.stopTTS();
      setIsReading(false);
      return;
    }

    if (phase === 'reading') {
      try {
        drivingSoundEngine.unlockAudio();
        const q = questions[currentIndex];
        if (!q) return;

        lastReadIndexRef.current = currentIndex;
        hasPlayedMidRef.current = false;

        if (!settings.enableTTS) {
          socketService.emit('stage:reading_finished');
          return;
        }

        setIsReading(true);
        const speechText = `Câu ${q.id}. ${q.question}`;

        const cancelQuestion = drivingSoundEngine.playTTS(speechText, {
          rate: settings.voiceRate,
          voiceId: settings.voiceId || 'zerotts-maichi',
          questionId: q.id,
          voiceGender: settings.voiceGender,
          volume: settings.voiceVolume ?? 1.0,
          onStart: () => setIsReading(true),
          onEnd: () => {
            setIsReading(false);
            // Thông báo cho Server biết đã đọc xong -> Server bắt đầu đếm ngược 15s ngay
            socketService.emit('stage:reading_finished');

            if (settings.enableInteractiveVoice ?? true) {
              const calloutText = getRandomCountdownCallout(q.options?.length || 4);
              const cancelCallout = drivingSoundEngine.playTTS(calloutText, {
                rate: settings.voiceRate,
                voiceId: settings.voiceId || 'zerotts-maichi',
                voiceGender: settings.voiceGender,
                volume: settings.voiceVolume ?? 1.0,
              });
              stopTtsRef.current = cancelCallout;
            }
          },
        });

        stopTtsRef.current = cancelQuestion;

        // Pre-fetch audio câu kế tiếp
        const nextQ = questions[currentIndex + 1];
        if (nextQ) {
          drivingSoundEngine.prefetchTTS(`Câu ${nextQ.id}. ${nextQ.question}`, settings.voiceId || 'zerotts-maichi', nextQ.id);
        }
      } catch (err) {
        console.warn('[Audio] Phase reading error:', err);
      }
    } else if (phase === 'revealed') {
      try {
        drivingSoundEngine.unlockAudio();
        const q = questions[currentIndex];
        if (q && settings.soundEffectsEnabled) {
          drivingSoundEngine.playCorrectFanfare();
        }

        if (q && settings.enableTTS && (settings.enableInteractiveVoice ?? true)) {
          drivingSoundEngine.onCurrentAudioEnd(() => {
            try {
              const currentVotes = votesRef.current;
              const revealPhrase = getRandomRevealCallout({
                correctAnswer: q.correctAnswer,
                votes: currentVotes,
              });

              const cancelReveal = drivingSoundEngine.playTTS(revealPhrase, {
                rate: settings.voiceRate,
                voiceId: settings.voiceId || 'zerotts-maichi',
                voiceGender: settings.voiceGender,
                volume: settings.voiceVolume ?? 1.0,
                onEnd: () => {
                  if (!settings.autoPlay) return;
                  const transitionPhrase = getRandomTransitionCallout();
                  const cancelTransition = drivingSoundEngine.playTTS(transitionPhrase, {
                    rate: settings.voiceRate,
                    voiceId: settings.voiceId || 'zerotts-maichi',
                    voiceGender: settings.voiceGender,
                    volume: settings.voiceVolume ?? 1.0,
                  });
                  stopTtsRef.current = cancelTransition;
                },
              });
              stopTtsRef.current = cancelReveal;
            } catch (err) {
              console.warn('[Audio] Reveal callback error:', err);
            }
          });
        }
      } catch (err) {
        console.warn('[Audio] Phase revealed error:', err);
      }
    }
  }, [
    sessionState,
    phase,
    currentIndex,
    questions,
    settings.enableTTS,
    settings.voiceId,
    settings.voiceRate,
    settings.voiceGender,
    settings.voiceVolume,
    settings.enableInteractiveVoice,
    settings.soundEffectsEnabled,
    settings.autoPlay,
  ]);

  const currentQuestion = questions[currentIndex] || {
    id: 1,
    chapter: 'Chương 1: Quy định chung & quy tắc GTĐB',
    question: 'Đang tải câu hỏi...',
    image: null,
    options: ['Đang tải...'],
    correctAnswer: 1,
  };

  // Remote Streamer Deck Commands emitted to Node.js Backend Hub
  const handleStartSession = useCallback(() => {
    drivingSoundEngine.unlockAudio();
    socketService.emit('cmd:start', { index: currentIndex });
  }, [currentIndex]);

  const handlePauseSession = useCallback(() => {
    socketService.emit('cmd:pause');
  }, []);

  const handleResumeSession = useCallback(() => {
    drivingSoundEngine.unlockAudio();
    socketService.emit('cmd:resume', { index: currentIndex });
  }, [currentIndex]);

  const handleEndSession = useCallback(() => {
    socketService.emit('cmd:end');
  }, []);

  const handleNextQuestion = useCallback(() => {
    socketService.emit('cmd:next');
  }, []);

  const handlePrevQuestion = useCallback(() => {
    socketService.emit('cmd:prev');
  }, []);

  const handleJumpQuestion = useCallback((qid: number) => {
    const idx = Math.max(0, qid - 1);
    socketService.emit('cmd:goto', { index: idx });
  }, []);

  const handleStartTimer = useCallback(() => {
    socketService.emit('cmd:timer_start');
  }, []);

  const handleRevealAnswer = useCallback(() => {
    socketService.emit('cmd:reveal');
  }, []);

  const handleReplayAudio = useCallback(() => {
    drivingSoundEngine.unlockAudio();
    socketService.emit('cmd:resume', { index: currentIndex });
  }, [currentIndex]);

  const handleUpdateSettings = useCallback((newSet: Partial<GameSettings>) => {
    socketService.emit('cmd:update_settings', newSet);
  }, []);

  const handleResetLeaderboard = useCallback(() => {
    socketService.emit('cmd:reset_leaderboard');
  }, []);

  const handleSimulateTestVote = useCallback((option: number, username?: string) => {
    socketService.emit('cmd:simulate_vote', { option, username });
  }, []);

  // TikTok Live Connect / Disconnect API
  const handleConnectTikTok = useCallback(async (username: string) => {
    try {
      if (typeof window !== 'undefined' && username) {
        localStorage.setItem('driving_tiktok_user', username);
      }
      handleUpdateSettings({ tiktokUsername: username });
      setTikTokStatus((prev) => ({ ...prev, isConnecting: true, error: '' }));
      const res = await fetch('/api/tiktok/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, sessionId: settingsRef.current?.tiktokSessionId }),
      });
      const data = await res.json();
      if (!data.success) {
        setTikTokStatus((prev) => ({ ...prev, isConnecting: false, error: data.error }));
      }
    } catch (err: any) {
      setTikTokStatus((prev) => ({ ...prev, isConnecting: false, error: err.message }));
    }
  }, []);

  const handleDisconnectTikTok = useCallback(async () => {
    try {
      await fetch('/api/tiktok/disconnect', { method: 'POST' });
    } catch {}
  }, []);

  // If viewed as standalone stage page in OBS / TikTok LIVE Studio (`?view=stage`)
  if (IS_STAGE_PAGE) {
    return (
      <DrivingStage
        question={currentQuestion}
        totalQuestions={questions.length || 600}
        phase={phase}
        timeLeft={timeLeft}
        totalTime={settings.countdownSeconds}
        revealDelayLeft={revealDelayLeft}
        sessionState={sessionState}
        votes={votes}
        recentVotes={recentVotes}
        leaderboard={leaderboard}
        tikTokStatus={tikTokStatus}
        isReading={isReading}
        marqueeText={settings.marqueeText}
        marqueeSpeed={settings.marqueeSpeed}
        showTipTiming={settings.showTipTiming}
        onReplayAudio={handleReplayAudio}
        isStandalone={true}
        settings={settings}
      />
    );
  }

  // Pure Streamer Control Deck Mode
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal-500 font-extrabold text-white flex items-center justify-center text-sm shadow-md">
            600
          </div>
          <div>
            <h1 className="font-extrabold text-sm md:text-base text-white tracking-tight">
              BẢNG ĐIỀU KHIỂN TIKTOK LIVE (600 CÂU LÝ THUYẾT LÁI XE B2/C)
            </h1>
            <p className="text-xs text-slate-400">
              Trang điều khiển từ xa (Node.js + Socket.io) • Link OBS:{' '}
              <span className="text-teal-400 font-semibold">
                {typeof window !== 'undefined' ? `${window.location.origin}/?view=stage` : '/?view=stage'}
              </span>
            </p>
          </div>
        </div>

        {/* Mở link Stage trên tab mới */}
        <div className="flex items-center gap-2">
          <a
            href="/?view=stage"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-bold text-white shadow-lg transition-all"
            title="Mở màn hình Live 9:16 trên tab riêng hoặc copy link vào OBS / TikTok LIVE Studio"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Mở Màn Hình Live (Stage 9:16)</span>
          </a>
        </div>
      </header>

      {/* Main Body: Streamer Control Deck */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-5xl w-full mx-auto">
        <DrivingStreamerDeck
          currentQuestion={currentQuestion}
          totalQuestions={questions.length || 600}
          playedCount={playedCount}
          phase={phase}
          timeLeft={timeLeft}
          sessionState={sessionState}
          settings={settings}
          tikTokStatus={tikTokStatus}
          leaderboard={leaderboard}
          onConnectTikTok={handleConnectTikTok}
          onDisconnectTikTok={handleDisconnectTikTok}
          onStartSession={handleStartSession}
          onRestartSession={handleReplayAudio}
          onPauseSession={handlePauseSession}
          onResumeSession={handleResumeSession}
          onEndSession={handleEndSession}
          onNextQuestion={handleNextQuestion}
          onPrevQuestion={handlePrevQuestion}
          onJumpQuestion={handleJumpQuestion}
          onStartTimer={handleStartTimer}
          onRevealAnswer={handleRevealAnswer}
          onReplayAudio={handleReplayAudio}
          onUpdateSettings={handleUpdateSettings}
          onResetLeaderboard={handleResetLeaderboard}
          onSimulateTestVote={handleSimulateTestVote}
        />
      </main>
    </div>
  );
}
