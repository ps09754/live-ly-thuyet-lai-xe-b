import React from 'react';
import { UserVote } from '../types/driving';

interface LiveVotesTickerProps {
  recentVotes: UserVote[];
}

export const LiveVotesTicker: React.FC<LiveVotesTickerProps> = ({ recentVotes }) => {
  const displayVotes = recentVotes.slice(-6).reverse();

  if (displayVotes.length === 0) {
    return (
      <div className="w-full max-w-full px-3 py-0.5 text-center text-[11px] text-slate-400 italic">
        Đang chờ comment đáp án từ người xem TikTok LIVE...
      </div>
    );
  }

  return (
    <div className="w-full max-w-full px-2 py-0.5 overflow-hidden">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-[11px] font-bold text-slate-500 uppercase shrink-0 bg-slate-100 px-2 py-0.5 rounded-full">
          Live Chat
        </span>
        <div className="flex items-center gap-1.5 flex-nowrap">
          {displayVotes.map((vote, idx) => (
            <div
              key={`${vote.username}-${vote.timestamp}-${idx}`}
              className="flex items-center gap-1.5 bg-white/90 border border-slate-200 px-2.5 py-1 rounded-full text-xs shadow-2xs shrink-0 animate-fade-in"
            >
              <img
                src={vote.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${vote.username}`}
                alt=""
                className="w-4 h-4 rounded-full"
              />
              <span className="font-semibold text-slate-800 max-w-[80px] truncate">
                {vote.nickname || vote.username}
              </span>
              <span className="text-slate-400">chọn</span>
              <span className="w-4 h-4 rounded-full bg-teal-600 text-white font-extrabold flex items-center justify-center text-[10px]">
                {vote.option}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

