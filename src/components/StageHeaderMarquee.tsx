import React from 'react';
import { Radio, Volume2 } from 'lucide-react';
import { TikTokLiveStatus } from '../types/driving';

interface StageHeaderMarqueeProps {
  marqueeText?: string;
  marqueeSpeed?: number;
  tikTokStatus: TikTokLiveStatus;
}

export const StageHeaderMarquee: React.FC<StageHeaderMarqueeProps> = ({
  marqueeText = '🚗 ÔN THI LÝ THUYẾT LÁI XE B2/C • 600 CÂU HỎI CHUẨN BỘ GTVT • GÕ COMMENT 1, 2, 3, 4 ĐỂ CHỌN ĐÁP ÁN • CHÚC CÁC BẠN THI ĐẬU 100%! 🚗',
  marqueeSpeed = 45,
  tikTokStatus,
}) => {
  const content = (marqueeText || '').trim() || '600 CÂU LÝ THUYẾT LÁI XE B2/C • TIKTOK LIVE';

  return (
    <div className="w-full px-2.5 z-10 flex items-center justify-between gap-2 shrink-0 bg-white/80 backdrop-blur-xs py-1.5 rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
      {/* Left Badge: Category / Branding */}
      <div className="flex items-center gap-1 shrink-0 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-extrabold text-[11px] px-2 py-0.5 rounded-lg shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping mr-0.5" />
        <span>B2/C</span>
      </div>

      {/* Center Running Marquee Banner */}
      <div className="flex-1 overflow-hidden relative">
        {/* Left & Right gradient fade masks */}
        <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-white/90 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-white/90 to-transparent z-10 pointer-events-none" />

        <div
          key={`${marqueeSpeed}_${content}`}
          style={{ animationDuration: `${marqueeSpeed}s` }}
          className="animate-marquee-smooth flex items-center"
        >
          <span className="text-[11px] md:text-xs font-bold text-slate-700 tracking-tight px-2 whitespace-nowrap">
            {content}
          </span>
          <span className="text-teal-400 px-2">✦</span>
          <span className="text-[11px] md:text-xs font-bold text-slate-700 tracking-tight px-2 whitespace-nowrap">
            {content}
          </span>
          <span className="text-teal-400 px-2">✦</span>
          <span className="text-[11px] md:text-xs font-bold text-slate-700 tracking-tight px-2 whitespace-nowrap">
            {content}
          </span>
          <span className="text-teal-400 px-2">✦</span>
          <span className="text-[11px] md:text-xs font-bold text-slate-700 tracking-tight px-2 whitespace-nowrap">
            {content}
          </span>
          <span className="text-teal-400 px-2">✦</span>
        </div>
      </div>

      {/* Right TikTok LIVE Status */}
      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 px-2 py-0.5 rounded-full text-[10px] md:text-[11px] font-semibold text-slate-700 shadow-2xs shrink-0">
        <span
          className={`w-2 h-2 rounded-full ${
            tikTokStatus.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
          }`}
        />
        <Radio className="w-3 h-3 text-slate-500" />
        <span className="max-w-[75px] truncate">
          {tikTokStatus.isConnected ? `@${tikTokStatus.username}` : 'LIVE'}
        </span>
      </div>
    </div>
  );
};
