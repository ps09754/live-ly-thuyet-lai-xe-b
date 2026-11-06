import React, { useState, useEffect, useRef } from 'react';
import { UserVote } from '../types/driving';

interface FloatingVoteBubblesProps {
  recentVotes: UserVote[];
}

interface ActiveBubble {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  option: number;
  driftX: number;
}

const OPTION_STYLES: Record<number, { bg: string; badge: string; label: string }> = {
  1: {
    bg: 'from-emerald-500/20 to-teal-600/30 border-emerald-400/40',
    badge: 'bg-emerald-500 text-white shadow-emerald-500/30',
    label: 'Đáp án 1',
  },
  2: {
    bg: 'from-blue-500/20 to-cyan-600/30 border-blue-400/40',
    badge: 'bg-blue-500 text-white shadow-blue-500/30',
    label: 'Đáp án 2',
  },
  3: {
    bg: 'from-amber-500/20 to-orange-600/30 border-amber-400/40',
    badge: 'bg-amber-500 text-white shadow-amber-500/30',
    label: 'Đáp án 3',
  },
  4: {
    bg: 'from-purple-500/20 to-pink-600/30 border-purple-400/40',
    badge: 'bg-purple-500 text-white shadow-purple-500/30',
    label: 'Đáp án 4',
  },
};

export const FloatingVoteBubbles: React.FC<FloatingVoteBubblesProps> = ({ recentVotes }) => {
  const [bubbles, setBubbles] = useState<ActiveBubble[]>([]);
  const lastProcessedTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!recentVotes || recentVotes.length === 0) return;
    const latestVote = recentVotes[recentVotes.length - 1];
    if (!latestVote || !latestVote.timestamp || latestVote.timestamp <= lastProcessedTimeRef.current) {
      return;
    }

    lastProcessedTimeRef.current = latestVote.timestamp;

    const newBubble: ActiveBubble = {
      id: `${latestVote.timestamp}_${Math.random().toString(36).substring(2, 7)}`,
      username: latestVote.username,
      nickname: latestVote.nickname || latestVote.username,
      avatar: latestVote.avatar,
      option: latestVote.option,
      // Subtle drift left/right between -18px and +18px
      driftX: Math.round((Math.random() - 0.5) * 36),
    };

    // Giới hạn nghiêm ngặt tối đa 3 bong bóng cùng lúc trên màn hình để chống spam và tránh lag máy
    setBubbles((prev) => [...prev.slice(-2), newBubble]);

    // Auto cleanup after 2.5s animation ends
    const timer = setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== newBubble.id));
    }, 2500);

    return () => clearTimeout(timer);
  }, [recentVotes]);

  if (bubbles.length === 0) return null;

  return (
    <div className="absolute bottom-20 right-3.5 z-40 pointer-events-none flex flex-col items-end gap-2 overflow-visible">
      {bubbles.map((b) => {
        const style = OPTION_STYLES[b.option] || OPTION_STYLES[1];
        return (
          <div
            key={b.id}
            style={
              {
                '--drift-x': `${b.driftX}px`,
              } as React.CSSProperties
            }
            className={`animate-float-bubble flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-md bg-slate-900/90 border shadow-lg ${style.bg}`}
          >
            {/* User Avatar */}
            {b.avatar ? (
              <img
                src={b.avatar}
                alt={b.nickname}
                className="w-5 h-5 rounded-full object-cover shrink-0 border border-white/30"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {b.nickname.charAt(0).toUpperCase()}
              </div>
            )}

            {/* User Nickname */}
            <span className="text-[11px] font-medium text-slate-100 max-w-[85px] truncate drop-shadow-sm">
              {b.nickname}
            </span>

            {/* Answer Badge */}
            <span
              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm shrink-0 uppercase tracking-tight ${style.badge}`}
            >
              {style.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

