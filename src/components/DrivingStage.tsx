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

  return (
    // Outer viewport container - aligned flex-start at top
    <div
      ref={containerRef}
      onClick={handleStageClick}
      className={`w-full h-full min-h-screen flex items-start justify-center select-none overflow-hidden box-border cursor-pointer relative ${
        isStandalone && isExact916 ? 'bg-[#0a0f18] p-0' : 'bg-slate-950 p-0 md:p-2'
      }`}
    >
      {/* 9:16 Virtual Screen: Base size 480x853.33 scaled up/down with top origin */}
      <div
        style={{
          width: 480,
          height: 853.33,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
        }}
        className={`shrink-0 bg-gradient-to-b from-[#f2f9f8] via-[#eaf5f3] to-[#f0f6f5] text-slate-800 flex flex-col justify-start py-2.5 px-2 relative overflow-hidden box-border ${
          isStandalone && isExact916
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
        <div className="w-full px-1 z-10 shrink-0">
          <StageHeaderMarquee
            marqueeText={marqueeText}
            marqueeSpeed={marqueeSpeed}
            tikTokStatus={tikTokStatus}
          />
        </div>

        {/* 2. Question Card (Main Focus - Fills central area with pb-16 to avoid floating badge) */}
        <div className="w-full flex-1 min-h-0 z-10 flex flex-col justify-start pt-1.5 pb-16 overflow-y-auto no-scrollbar">
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
        <div className="absolute bottom-3.5 left-0 right-0 flex justify-center z-30 pointer-events-none px-4">
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

        {/* 4. Interactive Teacher Avatar (Cô Ngân) at Bottom-Right */}
        <InteractiveTeacherAvatar
          settings={settings}
          phase={phase}
          isReading={isReading}
          recentVotes={recentVotes}
          timeLeft={timeLeft}
        />

        {/* 5. Floating Vote Bubbles on Bottom-Right */}
        <FloatingVoteBubbles recentVotes={recentVotes} />
      </div>
    </div>
  );
};
