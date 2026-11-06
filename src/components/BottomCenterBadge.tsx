import React from 'react';
import { Timer, CheckCircle2, Volume2, Sparkles } from 'lucide-react';
import { GamePhase, SessionState } from '../types/driving';

interface BottomCenterBadgeProps {
  phase: GamePhase;
  timeLeft: number;
  totalTime: number;
  revealDelayLeft: number;
  correctAnswer: number;
  sessionState: SessionState;
  isReading?: boolean;
  optionsCount?: number;
}

export const BottomCenterBadge: React.FC<BottomCenterBadgeProps> = ({
  phase,
  timeLeft,
  totalTime,
  revealDelayLeft,
  correctAnswer,
  sessionState,
  isReading,
  optionsCount = 4,
}) => {
  // 1. Nếu đang TẠM DỪNG: Luôn hiển thị huy hiệu TẠM DỪNG nổi bật cho streamer & khán giả biết
  if (sessionState === 'paused') {
    return (
      <div className="flex items-center justify-center pointer-events-auto filter drop-shadow-2xl select-none animate-fade-in">
        <div className="bg-amber-500/95 text-white font-extrabold text-xs md:text-sm px-4 py-2 rounded-full shadow-2xl border border-amber-300/60 backdrop-blur-md flex items-center gap-2 animate-pulse">
          <Timer className="w-4 h-4" />
          <span>PHIÊN ĐANG TẠM DỪNG</span>
        </div>
      </div>
    );
  }

  // 2. Chỉ hiện thời gian khi chọn đáp án (phase === 'countdown').
  // Khi hiện đáp án (revealed) hoặc khi đang đọc câu hỏi: ẩn hoàn toàn!
  if (phase === 'revealed' || isReading || phase === 'reading') {
    return null;
  }

  const isUrgent = timeLeft <= 5 && phase === 'countdown';
  const count = Math.max(2, Math.min(4, optionsCount || 4));
  const optionsListText = Array.from({ length: count }, (_, i) => i + 1).join(', ');

  return (
    <div className="flex items-center justify-center pointer-events-auto filter drop-shadow-2xl select-none animate-fade-in">
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-2xl backdrop-blur-md transition-all font-extrabold border ${
          isUrgent
            ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white animate-bounce shadow-rose-950/50 border-rose-300/80'
            : 'bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white shadow-teal-950/40 border-teal-300/60'
        }`}
      >
        <Timer className="w-4 h-4 shrink-0" />
        <span className="text-base md:text-lg font-black tracking-tight">{sessionState === 'idle' ? totalTime : timeLeft}s</span>
        <span className="h-3.5 w-px bg-white/40 mx-0.5" />
        <span className="text-xs font-semibold opacity-95">
          {isUrgent ? `Sắp hết giờ! Gõ ${optionsListText}` : `Gõ comment ${optionsListText}`}
        </span>
      </div>
    </div>
  );
};
