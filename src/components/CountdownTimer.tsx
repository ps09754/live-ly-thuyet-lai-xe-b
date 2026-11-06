import React from 'react';
import { Timer, Sparkles } from 'lucide-react';
import { GamePhase, SessionState } from '../types/driving';

interface CountdownTimerProps {
  phase: GamePhase;
  timeLeft: number;
  totalTime: number;
  sessionState: SessionState;
  isReading?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  phase,
  timeLeft,
  totalTime,
  sessionState,
}) => {
  const percentage = Math.max(0, Math.min(100, (timeLeft / (totalTime || 15)) * 100));
  const isUrgent = timeLeft <= 5 && phase === 'countdown';

  return (
    <div className="w-full px-3 py-1">
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-2.5 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <Timer
              className={`w-4 h-4 ${
                sessionState === 'paused'
                  ? 'text-amber-500'
                  : isUrgent
                  ? 'text-rose-500 animate-bounce'
                  : 'text-teal-600'
              }`}
            />
            <span
              className={
                sessionState === 'paused'
                  ? 'text-amber-600'
                  : phase === 'reading'
                  ? 'text-amber-700'
                  : phase === 'countdown'
                  ? isUrgent
                    ? 'text-rose-600 font-extrabold'
                    : 'text-teal-700'
                  : 'text-emerald-700'
              }
            >
              {sessionState === 'paused'
                ? 'ĐANG TẠM DỪNG'
                : sessionState === 'idle'
                ? 'Bấm BẮT ĐẦU để thi'
                : phase === 'reading'
                ? 'Đang đọc câu hỏi...'
                : phase === 'countdown'
                ? isUrgent
                  ? 'SẮP HẾT GIỜ! Comment 1, 2, 3, 4'
                  : 'Thời gian trả lời: Comment 1, 2, 3, 4'
                : 'ĐÃ CÔNG BỐ ĐÁP ÁN ĐÚNG!'}
            </span>
          </div>

          <div
            className={`px-2 py-0.5 rounded-lg font-extrabold text-xs shadow-2xs ${
              isUrgent && phase === 'countdown'
                ? 'bg-rose-500 text-white animate-pulse'
                : phase === 'revealed'
                ? 'bg-emerald-600 text-white'
                : 'bg-teal-50 text-teal-800 border border-teal-200'
            }`}
          >
            {phase === 'countdown' ? `${timeLeft}s` : phase === 'revealed' ? 'Xong' : `${totalTime}s`}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden p-0.5 border border-slate-200/80">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              sessionState === 'paused'
                ? 'bg-amber-400 w-full'
                : phase === 'reading'
                ? 'bg-amber-400 w-full animate-pulse'
                : phase === 'countdown'
                ? isUrgent
                  ? 'bg-gradient-to-r from-orange-500 to-rose-600'
                  : 'bg-gradient-to-r from-teal-400 to-emerald-500'
                : 'bg-emerald-500 w-full'
            }`}
            style={{
              width: phase === 'countdown' ? `${percentage}%` : '100%',
            }}
          />
        </div>
      </div>
    </div>
  );
};
