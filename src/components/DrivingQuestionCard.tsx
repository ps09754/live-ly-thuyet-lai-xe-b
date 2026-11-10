import React from 'react';
import { Bookmark, CheckCircle2, XCircle, Volume2, Lightbulb } from 'lucide-react';
import { DrivingQuestion, GamePhase, UserVote } from '../types/driving';

interface DrivingQuestionCardProps {
  question: DrivingQuestion;
  totalQuestions?: number;
  phase: GamePhase;
  votes: UserVote[];
  showTipTiming?: 'always' | 'revealed';
  onReplayAudio?: () => void;
  isReading?: boolean;
}

export const DrivingQuestionCard: React.FC<DrivingQuestionCardProps> = ({
  question,
  totalQuestions = 600,
  phase,
  votes,
  showTipTiming = 'revealed',
  onReplayAudio,
  isReading = false,
}) => {
  const voteCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  votes.forEach((v) => {
    if (v.option >= 1 && v.option <= 4) {
      voteCounts[v.option] = (voteCounts[v.option] || 0) + 1;
    }
  });

  const totalVotes = votes.length;
  const isRevealed = phase === 'revealed';

  // Smart Adaptive Density: automatically scales font sizes and paddings based on length
  const optionsCount = question.options?.length || 0;
  const questionLen = (question.question || '').length;
  const maxOptionLen = Math.max(...(question.options || []).map((o) => o.length), 0);
  const totalChars = questionLen + (question.options || []).reduce((sum, o) => sum + o.length, 0);
  const hasImage = Boolean(question.image);

  // Super dense: 4 options with long text, image with 3/4 options, or very long text (e.g. Câu 16)
  const isSuperDense =
    (optionsCount >= 4 && (totalChars > 240 || maxOptionLen > 70)) ||
    (hasImage && optionsCount >= 3) ||
    (hasImage && Boolean(question.tip)) ||
    totalChars > 340 ||
    maxOptionLen > 140;

  // Dense: 4 options, or has image, or moderate text length
  const isDense = isSuperDense || optionsCount >= 3 || totalChars > 140 || maxOptionLen > 50 || hasImage;

  return (
    <div className="w-full">
      <div
        className={`bg-white/95 backdrop-blur-xs rounded-2xl shadow-sm border border-slate-200/90 flex flex-col ${
          isSuperDense ? 'p-2 gap-1' : isDense ? 'p-2.5 gap-1.5' : 'p-3 gap-2'
        }`}
      >
        {/* Top Header Row (Chapter + Index + Audio button) */}
        <div className="flex items-center justify-between gap-1.5">
          {/* Chapter Pill */}
          <div className="bg-[#e6f4f2] text-[#0f766e] px-2 py-0.5 rounded-full font-bold text-[10px] md:text-[11px] border border-[#ccede8] truncate max-w-[65%]">
            {question.chapter}
          </div>

          {/* Question Index Pill + Audio button */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="bg-[#eef2f6] text-[#334155] px-2 py-0.5 rounded-full font-bold text-[10px] md:text-[11px]">
              {question.id}/{totalQuestions}
            </div>
            <button
              onClick={onReplayAudio}
              title="Đọc lại câu hỏi"
              className={`p-1 rounded-full transition-all ${
                isReading
                  ? 'bg-amber-100 text-amber-600 animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
            <Bookmark className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        {/* Question Title Section */}
        <div className="flex items-start gap-1.5">
          <span
            className={`bg-[#0d9488] text-white font-extrabold rounded-full shrink-0 shadow-2xs mt-0.5 ${
              isSuperDense ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]'
            }`}
          >
            Câu {question.id}
          </span>
          <h2
            className={`text-slate-900 font-bold flex-1 ${
              isSuperDense
                ? 'text-[12px] leading-snug'
                : isDense
                ? 'text-[13px] leading-snug'
                : 'text-sm md:text-base leading-snug'
            }`}
          >
            {question.question}
          </h2>
        </div>

        {/* Diagram / Image Section (centered, crisp, auto-scaled) */}
        {question.image && (
          <div className="w-full flex justify-center py-0.5 bg-slate-50/80 rounded-xl border border-slate-100 overflow-hidden shrink-0">
            <img
              src={question.image}
              alt={`Hình minh họa câu ${question.id}`}
              className={`${
                isSuperDense ? 'max-h-[70px]' : isDense ? 'max-h-[82px]' : 'max-h-[100px]'
              } w-auto max-w-full object-contain rounded-lg shadow-2xs`}
              loading="eager"
            />
          </div>
        )}

        {/* Options List */}
        <div className={`flex flex-col ${isSuperDense ? 'gap-1' : isDense ? 'gap-1.5' : 'gap-2'}`}>
          {question.options.map((optText, idx) => {
            const optNum = idx + 1;
            const isCorrect = optNum === question.correctAnswer;
            const optVotes = voteCounts[optNum] || 0;
            const percentage = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;

            // Default card styles during voting (clean, no distraction)
            let cardStyle = 'border-slate-200/90 bg-white hover:border-slate-300';
            let badgeStyle = 'bg-slate-100 text-slate-700 font-bold';
            let textColor = 'text-slate-800 font-medium';

            if (isRevealed) {
              if (isCorrect) {
                // Correct answer lights up with glowing emerald highlight
                cardStyle = 'border-2 border-emerald-500 bg-emerald-50/90 shadow-md ring-2 ring-emerald-400/40';
                badgeStyle = 'bg-emerald-600 text-white font-extrabold shadow-xs';
                textColor = 'text-emerald-950 font-bold';
              } else if (optVotes > 0) {
                cardStyle = 'border-slate-200 bg-slate-50/70 opacity-75';
                badgeStyle = 'bg-slate-200 text-slate-500 font-semibold';
                textColor = 'text-slate-600';
              } else {
                cardStyle = 'border-slate-200/60 bg-white/40 opacity-40';
                badgeStyle = 'bg-slate-100 text-slate-400';
                textColor = 'text-slate-500';
              }
            }

            return (
              <div
                key={optNum}
                className={`relative rounded-xl border transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-2xs ${cardStyle} ${
                  isSuperDense ? 'py-1.5 px-2 gap-1' : isDense ? 'py-2 px-2.5 gap-1.5' : 'py-2.5 px-3 gap-2'
                }`}
              >
                {/* Background Progress Fill Bar ONLY revealed when answers are shown */}
                {isRevealed && (
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-700 pointer-events-none ${
                      isCorrect ? 'bg-emerald-200/45' : 'bg-slate-200/40'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                )}

                {/* Top content: Number Circle + Option Text */}
                <div className="relative z-10 flex items-start gap-2 w-full">
                  <div
                    className={`rounded-full flex items-center justify-center shrink-0 shadow-2xs mt-0.5 ${badgeStyle} ${
                      isSuperDense ? 'w-5 h-5 text-[10px]' : isDense ? 'w-5.5 h-5.5 text-[10.5px]' : 'w-6 h-6 text-xs'
                    }`}
                  >
                    {optNum}
                  </div>
                  <span
                    className={`break-words flex-1 min-w-0 ${textColor} ${
                      isSuperDense
                        ? 'text-[11px] leading-snug'
                        : isDense
                        ? 'text-[11.5px] leading-snug'
                        : 'text-xs md:text-[13px] leading-relaxed'
                    }`}
                  >
                    {optText}
                  </span>
                </div>

                {/* Bottom content: Vote stats & Answer Badges ONLY shown upon reveal directly on this item */}
                {isRevealed && (
                  <div
                    className={`relative z-10 flex items-center justify-between gap-1 pt-1 mt-0.5 border-t animate-fade-in ${
                      isCorrect ? 'border-emerald-300/50' : 'border-slate-200/50'
                    }`}
                  >
                    {/* Left: Vote count & percentage */}
                    <div className="flex items-center gap-1.5 text-[10.5px]">
                      <span className={`font-extrabold ${isCorrect ? 'text-emerald-700' : optVotes > 0 ? 'text-slate-700' : 'text-slate-400'}`}>
                        {percentage}%
                      </span>
                      <span className="text-slate-400 font-medium">({optVotes} bình chọn)</span>
                    </div>

                    {/* Right: Correct / Incorrect badge */}
                    {isCorrect ? (
                      <div className="flex items-center gap-1 bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-md text-[10px] shadow-2xs">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>ĐÁP ÁN ĐÚNG</span>
                      </div>
                    ) : optVotes > 0 ? (
                      <div className="flex items-center gap-0.5 text-rose-500 font-semibold text-[10px]">
                        <XCircle className="w-3 h-3" />
                        <span>Sai</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mẹo nhớ (Memory Tip) */}
        {question.tip && (showTipTiming === 'always' || isRevealed) && (
          <div
            className={`bg-gradient-to-r from-amber-50 to-orange-50/70 border border-amber-300/80 rounded-xl flex items-start shadow-2xs animate-fade-in mt-0.5 ${
              isSuperDense ? 'p-1.5 gap-1.5' : 'p-2 gap-2'
            }`}
          >
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
              <Lightbulb className="w-3 h-3 fill-current" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-tight block">
                Mẹo nhớ:
              </span>
              <p
                className={`font-semibold text-amber-950 leading-relaxed mt-0.5 ${
                  isSuperDense ? 'text-[10.5px]' : 'text-[11px]'
                }`}
              >
                {question.tip}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
