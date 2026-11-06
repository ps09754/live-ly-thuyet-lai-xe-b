import React from 'react';
import { BarChart3, CheckCircle2, Users } from 'lucide-react';
import { DrivingQuestion, GamePhase, UserVote } from '../types/driving';

interface AudienceVoteBreakdownProps {
  question: DrivingQuestion;
  votes: UserVote[];
  phase: GamePhase;
}

export const AudienceVoteBreakdown: React.FC<AudienceVoteBreakdownProps> = ({
  question,
  votes,
  phase,
}) => {
  const voteCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  votes.forEach((v) => {
    if (v.option >= 1 && v.option <= 4) {
      voteCounts[v.option] = (voteCounts[v.option] || 0) + 1;
    }
  });

  const totalVotes = votes.length;
  const isRevealed = phase === 'revealed';
  const optionsCount = question.options?.length || 4;

  return (
    <div className="w-full px-3 py-1">
      <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-3 border border-slate-200/90 shadow-2xs flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <div className="flex items-center gap-1.5 text-teal-700">
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="tracking-tight uppercase text-[11px] font-extrabold">
              Tỷ lệ bình chọn khán giả
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-semibold">
            <Users className="w-3 h-3 text-slate-500" />
            <span>{totalVotes} lượt bình chọn</span>
          </div>
        </div>

        {/* Option Vote Bars */}
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: optionsCount }, (_, i) => i + 1).map((optNum) => {
            const count = voteCounts[optNum] || 0;
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const isCorrect = optNum === question.correctAnswer;

            let barBg = 'bg-slate-100 border-slate-200';
            let fillBg = 'bg-teal-500';
            let badgeBg = 'bg-slate-200 text-slate-700';

            if (isRevealed) {
              if (isCorrect) {
                barBg = 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/20';
                fillBg = 'bg-emerald-500';
                badgeBg = 'bg-emerald-600 text-white';
              } else if (count > 0) {
                fillBg = 'bg-slate-400';
                badgeBg = 'bg-slate-300 text-slate-700';
              } else {
                fillBg = 'bg-slate-200';
                badgeBg = 'bg-slate-200 text-slate-400';
              }
            } else if (count > 0) {
              fillBg = 'bg-teal-500';
              badgeBg = 'bg-teal-600 text-white';
            }

            return (
              <div
                key={optNum}
                className={`relative overflow-hidden rounded-xl border p-1.5 flex items-center justify-between gap-2 transition-all ${barBg}`}
              >
                {/* Progress bar background fill */}
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 pointer-events-none opacity-20 ${fillBg}`}
                  style={{ width: `${pct}%` }}
                />

                {/* Left: Badge & Option Label */}
                <div className="relative z-10 flex items-center gap-2 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0 shadow-2xs ${badgeBg}`}
                  >
                    {optNum}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-700 truncate">
                    Đáp án {optNum}
                  </span>
                </div>

                {/* Right: Percent & Vote count & Correct indicator */}
                <div className="relative z-10 flex items-center gap-1.5 shrink-0 text-[11px]">
                  {isRevealed && isCorrect && (
                    <span className="flex items-center gap-0.5 text-emerald-700 font-extrabold text-[10px] bg-white px-1.5 py-0.2 rounded-md border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      ĐÚNG
                    </span>
                  )}
                  <span className="font-extrabold text-slate-800">{pct}%</span>
                  <span className="text-slate-400 text-[10px]">({count})</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

