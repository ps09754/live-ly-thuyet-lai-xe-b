import React, { useState, useEffect, useRef } from 'react';
import { Heart, UserPlus, GraduationCap } from 'lucide-react';
import { GameSettings } from '../types/driving';
import { socketService } from '../services/socketService';

interface FloatingOverlayBannersProps {
  settings: GameSettings;
}

export const FloatingOverlayBanners: React.FC<FloatingOverlayBannersProps> = ({ settings }) => {
  const [activeBanner, setActiveBanner] = useState<'like_follow' | 'zalo_course' | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showBanner = (type: 'like_follow' | 'zalo_course') => {
    setActiveBanner(type);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    // Hiện nhanh trong đúng 3 giây rồi biến mất mượt mà
    hideTimeoutRef.current = setTimeout(() => {
      setActiveBanner(null);
    }, 3000);
  };

  // Lắng nghe sự kiện "Xem thử ngay" từ bảng điều khiển streamer qua Socket.io
  useEffect(() => {
    const handleTrigger = (data: { type: 'like_follow' | 'zalo_course' }) => {
      if (data?.type) {
        showBanner(data.type);
      }
    };
    socketService.on('overlay:trigger', handleTrigger);
    return () => {
      socketService.off('overlay:trigger', handleTrigger);
    };
  }, []);

  // 1. Bộ đếm định kỳ cho Popup Thả tim & Follow
  useEffect(() => {
    if (settings.enableLikeFollowPopup === false) return;

    const intervalMinutes = Math.max(1, settings.likeFollowIntervalMinutes || 2);
    const intervalMs = intervalMinutes * 60 * 1000;

    // Lần đầu tiên kích hoạt sau 30s mở stream
    const initialTimer = setTimeout(() => {
      showBanner('like_follow');
    }, 30000);

    const recurringInterval = setInterval(() => {
      showBanner('like_follow');
    }, intervalMs);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(recurringInterval);
    };
  }, [settings.enableLikeFollowPopup, settings.likeFollowIntervalMinutes]);

  // 2. Bộ đếm định kỳ cho Popup Chỉ dẫn Zalo / Đăng ký Khóa học
  useEffect(() => {
    if (settings.enableZaloCoursePopup === false) return;

    const intervalMinutes = Math.max(1, settings.zaloCourseIntervalMinutes || 3);
    const intervalMs = intervalMinutes * 60 * 1000;

    // Lần đầu tiên kích hoạt sau 60s mở stream (lệch pha với Like & Follow để không trùng)
    const initialTimer = setTimeout(() => {
      showBanner('zalo_course');
    }, 60000);

    const recurringInterval = setInterval(() => {
      showBanner('zalo_course');
    }, intervalMs);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(recurringInterval);
    };
  }, [settings.enableZaloCoursePopup, settings.zaloCourseIntervalMinutes]);

  if (!activeBanner) return null;

  return (
    // Đặt ở vị trí bottom-16 (ngay trên đồng hồ đếm ngược bottom-3.5), tuyệt đối không che nội dung câu hỏi
    <div className="absolute bottom-16 left-0 right-0 flex justify-center z-40 px-3 pointer-events-none">
      {activeBanner === 'like_follow' && (
        <div className="animate-in fade-in slide-in-from-bottom-3 zoom-in-95 duration-300 max-w-[440px] w-auto bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 text-white py-1.5 px-3 rounded-full shadow-2xl border border-pink-300/50 backdrop-blur-md flex items-center gap-2">
          {/* Heart icon */}
          <div className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center shrink-0 shadow-inner">
            <Heart className="w-3.5 h-3.5 text-white fill-current animate-pulse" />
          </div>

          {/* Text 1 dòng nhỏ gọn */}
          <span className="text-[11.5px] font-bold text-white truncate drop-shadow-sm">
            {settings.likeFollowText || 'Thả tim & Bấm Follow để lưu buổi học nhé cả nhà!'}
          </span>

          {/* Follow badge */}
          <div className="shrink-0 flex items-center gap-1 px-2 py-0.5 bg-white text-rose-600 rounded-full font-black text-[10px] shadow-sm">
            <UserPlus className="w-3 h-3" />
            <span>Follow</span>
          </div>
        </div>
      )}

      {activeBanner === 'zalo_course' && (
        <div className="animate-in fade-in slide-in-from-bottom-3 zoom-in-95 duration-300 max-w-[440px] w-auto bg-gradient-to-r from-[#0068ff] via-blue-600 to-teal-600 text-white py-1.5 px-3 rounded-full shadow-2xl border border-blue-300/50 backdrop-blur-md flex items-center gap-2">
          {/* Zalo logo badge */}
          <div className="w-6 h-6 rounded-full bg-white text-[#0068ff] flex items-center justify-center shrink-0 shadow-md font-black text-[9px] tracking-tighter">
            Zalo
          </div>

          {/* Text 1 dòng nhỏ gọn */}
          <span className="text-[11.5px] font-bold text-white truncate drop-shadow-sm">
            {settings.zaloContactPhone && settings.zaloContactPhone !== '09xx.xxx.xxx'
              ? `Zalo: ${settings.zaloContactPhone} • Vào Bio đăng ký học B2/C nhé!`
              : settings.zaloCourseText || '👉 Bấm vào Bio (Trang cá nhân) để lấy Zalo đăng ký học lái xe nhé!'}
          </span>

          {/* Bio badge */}
          <div className="shrink-0 flex items-center gap-1 px-2 py-0.5 bg-amber-400 text-slate-950 rounded-full font-black text-[10px] shadow-sm">
            <GraduationCap className="w-3 h-3" />
            <span>Xem Bio</span>
          </div>
        </div>
      )}
    </div>
  );
};
