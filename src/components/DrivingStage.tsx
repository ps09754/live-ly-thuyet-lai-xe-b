import React, { useState, useEffect, useRef } from 'react';
import {
  DrivingQuestion,
  GamePhase,
  GameSettings,
  LeaderboardUser,
  SessionState,
  TikTokLiveStatus,
  UserVote,
} from '../types/driving';
import { drivingSoundEngine } from '../services/drivingSoundEngine';
import { DrivingQuestionCard } from './DrivingQuestionCard';
import { BottomCenterBadge } from './BottomCenterBadge';
import { StageHeaderMarquee } from './StageHeaderMarquee';
import { FloatingVoteBubbles } from './FloatingVoteBubbles';
import { FloatingOverlayBanners } from './FloatingOverlayBanners';
import { InteractiveTeacherAvatar } from './InteractiveTeacherAvatar';

interface DrivingStageProps {
  question: DrivingQuestion;
  totalQuestions: number;
  phase: GamePhase;
  timeLeft: number;
  totalTime: number;
  revealDelayLeft: number;
  sessionState: SessionState;
  votes: UserVote[];
  recentVotes: UserVote[];
  leaderboard?: LeaderboardUser[];
  tikTokStatus: TikTokLiveStatus;
  isReading?: boolean;
  marqueeText?: string;
  marqueeSpeed?: number;
  showTipTiming?: 'always' | 'revealed';
  onReplayAudio?: () => void;
  isStandalone?: boolean;
  settings?: GameSettings;
}

export const DrivingStage: React.FC<DrivingStageProps> = ({
  question,
  totalQuestions,
  phase,
  timeLeft,
  totalTime,
  revealDelayLeft,
  sessionState,
  votes,
  recentVotes = [],
  tikTokStatus,
  isReading = false,
  marqueeText,
  marqueeSpeed = 45,
  showTipTiming = 'revealed',
  onReplayAudio,
  isStandalone = false,
  settings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [isExact916, setIsExact916] = useState<boolean>(false);

  const [hasInteracted, setHasInteracted] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.sessionStorage?.getItem('audio_unlocked') === 'true';
  });

  // Responsive 9:16 auto-scale: fits any resolution (1080x1920, 720x1280, 450x800) perfectly
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      if (!clientWidth || !clientHeight) return;

      // Base design dimensions (locked 9:16 vertical ratio)
      const BASE_W = 480;
      const BASE_H = 853.33; // 480 * 16 / 9

      const scaleX = clientWidth / BASE_W;
      const scaleY = clientHeight / BASE_H;
      const currentScale = Math.min(scaleX, scaleY);
      setScale(currentScale);

      // Check if container closely matches 9:16 vertical stream ratio (~0.5625)
      const ratio = clientWidth / clientHeight;
      setIsExact916(Math.abs(ratio - 9 / 16) < 0.05);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      observer = new ResizeObserver(updateScale);
      observer.observe(containerRef.current);
    }
    return () => {
      window.removeEventListener('resize', updateScale);
      observer?.disconnect();
    };
  }, []);

  // Ensure body and html have strictly no scrollbars in stage mode
  useEffect(() => {
    if (isStandalone) {
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.height = '100%';
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100%';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, [isStandalone]);

  const handleStageClick = () => {
    drivingSoundEngine.unlockAudio();
    if (!hasInteracted) {
      setHasInteracted(true);
      if (typeof window !== 'undefined') {
        window.sessionStorage?.setItem('audio_unlocked', 'true');
      }
      onReplayAudio?.();
    }
  };

  useEffect(() => {
    const handleGlobalUnlock = () => {
      drivingSoundEngine.unlockAudio();
      setHasInteracted(true);
      if (typeof window !== 'undefined') {
        window.sessionStorage?.setItem('audio_unlocked', 'true');
      }
    };
    window.addEventListener('click', handleGlobalUnlock, { once: true });
    window.addEventListener('keydown', handleGlobalUnlock, { once: true });
    return () => {
      window.removeEventListener('click', handleGlobalUnlock);
      window.removeEventListener('keydown', handleGlobalUnlock);
    };
  }, []);

  // Safe Zone Padding for TikTok Mobile Viewers (Tránh bị chèn view ra ngoài trên điện thoại)
  const padX = typeof settings?.stagePaddingX === 'number' ? settings.stagePaddingX : 42;
  const offsetX = typeof settings?.stageOffsetX === 'number' ? settings.stageOffsetX : 0;
  const padTop = typeof settings?.stagePaddingTop === 'number' ? settings.stagePaddingTop : 80;
  const padBottom = typeof settings?.stagePaddingBottom === 'number' ? settings.stagePaddingBottom : 190;

  // Lề trái và phải kết hợp cân chỉnh lệch tâm ngang (nếu màn hình Live bị lệch 1 bên)
  const paddingLeft = Math.max(0, padX + offsetX);
  const paddingRight = Math.max(0, padX - offsetX);

  return (
    // Outer viewport container - aligned flex-start at top
    <div
      ref={containerRef}
      onClick={handleStageClick}
      className={`w-full h-full min-h-screen flex items-start justify-center select-none overflow-hidden box-border cursor-pointer relative ${isStandalone ? 'bg-[#0a0f18] p-0' : 'bg-slate-950 p-0 md:p-2'
        }`}
    >
      {/* 9:16 Virtual Screen: Base size 480x853.33 scaled up/down with top origin */}
      <div
        style={{
          width: 480,
          height: 853.33,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          paddingLeft: `${paddingLeft}px`,
          paddingRight: `${paddingRight}px`,
          paddingTop: `${padTop}px`,
          paddingBottom: `${padBottom}px`,
        }}
        className={`shrink-0 bg-gradient-to-b from-[#f2f9f8] via-[#eaf5f3] to-[#f0f6f5] text-slate-800 flex flex-col justify-start relative overflow-hidden box-border ${isStandalone
          ? 'rounded-none border-0 shadow-none'
          : 'rounded-3xl shadow-2xl border border-slate-800/40'
          }`}
      >
        {/* Subtle decorative background blur strictly contained */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 -left-16 w-56 h-56 bg-teal-200/25 rounded-full blur-3xl" />
          <div className="absolute bottom-10 -right-16 w-56 h-56 bg-emerald-200/25 rounded-full blur-3xl" />
        </div>

        {/* 1. Header with running Marquee banner customizable from deck */}
        <div className="w-full z-10 shrink-0">
          <StageHeaderMarquee
            marqueeText={marqueeText}
            marqueeSpeed={marqueeSpeed}
            tikTokStatus={tikTokStatus}
          />
        </div>

        {/* 2. Question Card (Main Focus) */}
        <div className="w-full flex-1 min-h-0 z-10 flex flex-col justify-start pt-2 pb-2 overflow-y-auto no-scrollbar">
          <DrivingQuestionCard
            question={question}
            totalQuestions={totalQuestions}
            phase={phase}
            votes={votes}
            showTipTiming={showTipTiming}
            onReplayAudio={onReplayAudio}
            isReading={isReading}
          />
        </div>

        {/* 2.5. Floating Overlay Banners: Like & Follow / Zalo Course (Slim pill positioned at bottom, stays 3s) */}
        {settings && <FloatingOverlayBanners settings={settings} />}

        {/* 3. Floating Bottom Center Badge (Floating Centered Countdown / Result) */}
        <div
          className="absolute left-0 right-0 flex justify-center z-30 pointer-events-none px-4"
          style={{ bottom: `${Math.max(14, padBottom)}px` }}
        >
          <BottomCenterBadge
            phase={phase}
            timeLeft={timeLeft}
            totalTime={totalTime}
            revealDelayLeft={revealDelayLeft}
            correctAnswer={question.correctAnswer}
            sessionState={sessionState}
            isReading={isReading}
            optionsCount={question.options?.length || 4}
          />
        </div>

        {/* 4. Interactive Teacher Avatar (Cô Ngân) at Bottom-Left with Safe Zone Padding */}
        <InteractiveTeacherAvatar
          settings={settings}
          phase={phase}
          isReading={isReading}
          recentVotes={recentVotes}
          timeLeft={timeLeft}
          padX={padX}
          padBottom={padBottom}
        />

        {/* 5. Floating Vote Bubbles on Bottom-Right */}
        <FloatingVoteBubbles recentVotes={recentVotes} padX={padX} padBottom={padBottom} />

        {/* 6. TikTok Mobile 19.5:9 Safe Zone Simulator Guide (Chỉ hiện khi streamer bật để căn chỉnh) */}
        {settings?.showTikTokSafeZoneGuide && (
          <div className="absolute inset-0 pointer-events-none z-50">
            <div
              style={{
                left: `${paddingLeft}px`,
                right: `${paddingRight}px`,
                top: `${padTop}px`,
                bottom: `${padBottom}px`,
              }}
              className="absolute border-2 border-dashed border-rose-500/80 rounded-2xl bg-rose-500/5 flex flex-col justify-between p-2 shadow-2xl"
            >
              <div className="flex justify-between items-center text-[9px] font-black text-rose-600 bg-white/95 px-2 py-0.5 rounded shadow">
                <span>▲ VÙNG AN TOÀN ĐIỆN THOẠI TIKTOK (19.5:9)</span>
                <span>TRÁNH TAI THỎ / HEADER</span>
              </div>
              <div className="flex justify-between items-center text-[9px] font-black text-rose-600 bg-white/95 px-2 py-0.5 rounded shadow">
                <span>▼ KHUNG CHAT & NÚT TƯƠNG TÁC TIKTOK</span>
                <span>TRÁNH CHE CHỮ</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
