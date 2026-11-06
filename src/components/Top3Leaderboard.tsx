import React from 'react';
import { Trophy } from 'lucide-react';
import { LeaderboardUser } from '../types/driving';

interface Top3LeaderboardProps {
  users: LeaderboardUser[];
}

export const Top3Leaderboard: React.FC<Top3LeaderboardProps> = ({ users }) => {
  const top3 = users.slice(0, 3);

  const ranks = [
    { rank: 1, medal: '🥇', border: 'border-amber-400 bg-amber-50/60' },
    { rank: 2, medal: '🥈', border: 'border-slate-300 bg-slate-50/60' },
    { rank: 3, medal: '🥉', border: 'border-amber-600/50 bg-amber-50/40' },
  ];

  return (
    <div className="w-full px-3 py-1">
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-2.5 shadow-xs">
        {/* Compact Header */}
        <div className="flex items-center justify-between px-1 pb-1 mb-1 border-b border-slate-100/80">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>TOP 3 CAO ĐIỂM NHẤT</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Trả lời đúng nhiều nhất
          </span>
        </div>

        {/* 3 Columns */}
        <div className="grid grid-cols-3 gap-1.5">
          {ranks.map((r, idx) => {
            const user = top3[idx];
            if (user) {
              return (
                <div
                  key={user.username}
                  className={`flex items-center gap-1.5 p-1.5 rounded-xl border ${r.border} overflow-hidden`}
                >
                  {/* Medal + Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover border border-white shadow-2xs"
                    />
                    <span className="absolute -bottom-1 -left-1 text-[11px] leading-none">
                      {r.medal}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-slate-800 truncate leading-tight">
                      {user.nickname || user.username}
                    </div>
                    <div className="text-[10px] font-semibold text-emerald-600 leading-tight">
                      {user.correctCount} đúng
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={idx}
                className="flex items-center gap-1.5 p-1.5 rounded-xl border border-dashed border-slate-200/80 bg-slate-50/50"
              >
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs shrink-0">
                  {r.medal}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-medium text-slate-400 truncate">
                    Đang chờ...
                  </div>
                  <div className="text-[9px] text-slate-400">0 đúng</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
