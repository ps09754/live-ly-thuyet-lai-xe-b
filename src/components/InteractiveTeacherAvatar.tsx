import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Heart } from 'lucide-react';
import { GameSettings, UserVote } from '../types/driving';
import { cleanViewerName } from '../services/liveVoiceInteractions';
import { socketService } from '../services/socketService';
import { drivingSoundEngine } from '../services/drivingSoundEngine';

interface InteractiveTeacherAvatarProps {
  settings?: GameSettings;
  phase?: 'question' | 'countdown' | 'revealed';
  isReading?: boolean;
  recentVotes?: UserVote[];
  timeLeft?: number;
  padX?: number;
  padBottom?: number;
}

const READING_PROMPTS = [
  'Cô đọc đề nhé, chú ý nha! 🎧',
  'Lắng nghe kỹ câu hỏi nào! 📖',
  'Câu này thi hay gặp lắm nè! ⚡',
  'Chú ý từ khóa quan trọng nha! 💡',
];

const COUNTDOWN_PROMPTS = [
  'Gõ ngay 1, 2, 3 hoặc 4 nhé! ✍️',
  'Đáp án nào đúng vậy cả nhà? 🤔',
  'Đếm ngược sắp hết giờ rồi! ⏳',
  'Tự tin lên nào các bạn ơi! 🚗',
  'Bình tĩnh nhìn kỹ các đáp án nha! 🎯',
];

const REVEALED_PROMPTS = [
  'Xuất sắc! Chúc mừng các bạn! 🎉',
  'Ghi nhớ mẹo này đi thi nha! 💡',
  'Chuẩn không cần chỉnh luôn! 🌟',
  'Ai chọn đúng giơ tay cô xem nào! 🙋‍♀️',
];

const IDLE_PROMPTS = [
  'Thả tim liên tục ủng hộ cô nha! ❤️',
  'Follow kênh để không lỡ buổi học! ✨',
  'Chúc bạn thi đậu 100% điểm tối đa! 🎯',
  'Gõ đáp án để cùng đua top nha! 🏆',
];

export const InteractiveTeacherAvatar: React.FC<InteractiveTeacherAvatarProps> = ({
  settings,
  phase = 'question',
  isReading = false,
  recentVotes = [],
  padX = 20,
  padBottom = 18,
}) => {
  const isEnabled = settings?.enableAvatar !== false; // Default true
  const avatarName = settings?.avatarName || 'Cô Ngân 💖';
  const avatarSize = settings?.avatarSize || 'medium';
  const avatarMedia = settings?.avatarMedia || 'gif';
  const enableSpeechBubble = settings?.enableAvatarSpeechBubble !== false;

  const [currentBubble, setCurrentBubble] = useState<string | null>(null);
  const [bubbleKey, setBubbleKey] = useState<number>(0);
  const [hearts, setHearts] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [isAudioSpeaking, setIsAudioSpeaking] = useState<boolean>(false);
  const lastVoteTimestampRef = useRef<number>(0);
  const hideBubbleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to realtime Web Audio / TTS speaking events from sound engine
  useEffect(() => {
    const unsubscribe = drivingSoundEngine.onSpeechStatusChange((speaking) => {
      setIsAudioSpeaking(speaking);
    });
    return unsubscribe;
  }, []);

  // Total speaking state: either question TTS is reading, or sound engine is actively playing audio
  const isSpeaking = isReading || isAudioSpeaking;

  // Show a speech bubble for duration ms
  const showBubbleText = (text: string, durationMs: number = 4000) => {
    if (!enableSpeechBubble) return;
    setCurrentBubble(text);
    setBubbleKey((k) => k + 1);

    if (hideBubbleTimeoutRef.current) {
      clearTimeout(hideBubbleTimeoutRef.current);
    }
    hideBubbleTimeoutRef.current = setTimeout(() => {
      setCurrentBubble(null);
    }, durationMs);
  };

  // 1. Streamer triggers custom line or preview from deck
  useEffect(() => {
    const handleSpeakTrigger = (data: { text: string }) => {
      if (data?.text) {
        showBubbleText(data.text, 5000);
      }
    };
    socketService.on('avatar:speak', handleSpeakTrigger);
    return () => {
      socketService.off('avatar:speak', handleSpeakTrigger);
    };
  }, [enableSpeechBubble]);

  // 2. React to Phase Changes
  useEffect(() => {
    if (!isEnabled || !enableSpeechBubble) return;

    if (isReading) {
      const prompt = READING_PROMPTS[Math.floor(Math.random() * READING_PROMPTS.length)];
      showBubbleText(prompt, 3800);
    } else if (phase === 'countdown') {
      const prompt = COUNTDOWN_PROMPTS[Math.floor(Math.random() * COUNTDOWN_PROMPTS.length)];
      showBubbleText(prompt, 3800);
    } else if (phase === 'revealed') {
      const prompt = REVEALED_PROMPTS[Math.floor(Math.random() * REVEALED_PROMPTS.length)];
      showBubbleText(prompt, 4500);
    }
  }, [phase, isReading, isEnabled, enableSpeechBubble]);

  // 3. React when viewers vote (shoutout in bubble)
  useEffect(() => {
    if (!isEnabled || !enableSpeechBubble || !recentVotes || recentVotes.length === 0) return;
    const latest = recentVotes[recentVotes.length - 1];
    if (!latest || !latest.timestamp || latest.timestamp <= lastVoteTimestampRef.current) return;
    lastVoteTimestampRef.current = latest.timestamp;

    // 40% chance to acknowledge vote in speech bubble if not currently showing something critical
    if (Math.random() < 0.45 && phase === 'countdown') {
      const cleanName = cleanViewerName(latest.nickname || latest.username);
      showBubbleText(`Cảm ơn ${cleanName} đã chọn ${latest.option}! 👍`, 2800);
    }
  }, [recentVotes, isEnabled, enableSpeechBubble, phase]);

  // 4. Idle periodic prompts (every 14s when no other bubble is showing)
  useEffect(() => {
    if (!isEnabled || !enableSpeechBubble) return;

    const interval = setInterval(() => {
      if (!currentBubble) {
        const prompt = IDLE_PROMPTS[Math.floor(Math.random() * IDLE_PROMPTS.length)];
        showBubbleText(prompt, 3500);
      }
    }, 14000);

    return () => clearInterval(interval);
  }, [isEnabled, enableSpeechBubble, currentBubble]);

  // Click on Cô Ngân creates floating hearts
  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newHeart = {
      id: Date.now() + Math.random(),
      x: (Math.random() - 0.5) * 40,
      y: (Math.random() - 0.5) * 20,
    };
    setHearts((prev) => [...prev.slice(-4), newHeart]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 1500);

    showBubbleText('Yêu cả nhà nhiều lắm! Cùng đỗ điểm cao nhé ❤️', 3000);
  };

  if (!isEnabled) return null;

  // Dimensions based on size
  const sizeStyles = {
    small: {
      width: 'w-20', // ~80px
      containerMaxW: 'max-w-[140px]',
      badgeText: 'text-[9px] px-2 py-0.5',
      bubbleText: 'text-[10px]',
    },
    medium: {
      width: 'w-24', // ~96px - 105px
      containerMaxW: 'max-w-[165px]',
      badgeText: 'text-[10px] px-2.5 py-0.5',
      bubbleText: 'text-[11px]',
    },
    large: {
      width: 'w-32', // ~128px
      containerMaxW: 'max-w-[190px]',
      badgeText: 'text-[11px] px-3 py-1',
      bubbleText: 'text-xs',
    },
  }[avatarSize];

  // Image source with cache-busting to guarantee the browser immediately drops any old cached GIF with badge
  const imgSrc = isSpeaking ? '/avatar-talking.gif?v=nobadge' : '/avatar-idle.gif?v=nobadge';

  return (
    <div
      onClick={handleAvatarClick}
      className="absolute z-25 flex flex-col items-center select-none cursor-pointer group"
      style={{
        left: `${Math.max(8, padX - 8)}px`,
        bottom: `${Math.max(8, padBottom - 8)}px`,
        filter: 'drop-shadow(0 6px 14px rgba(13, 148, 136, 0.28))',
      }}
      title="Nhấn để tương tác với Trợ Giảng AI"
    >
      {/* Dynamic Floating Hearts when clicked */}
      {hearts.map((h) => (
        <div
          key={h.id}
          style={{ transform: `translate(${h.x}px, ${h.y}px)` }}
          className="absolute -top-6 text-pink-500 animate-ping pointer-events-none z-50"
        >
          <Heart className="w-5 h-5 fill-pink-500 stroke-none" />
        </div>
      ))}

      {/* Interactive Speech Bubble - positioned on the left pointing down to Cô Ngân */}
      {currentBubble && (
        <div
          key={bubbleKey}
          className={`absolute -top-14 left-0 min-w-[130px] ${sizeStyles.containerMaxW} bg-white/95 backdrop-blur-md text-slate-800 px-3 py-1.5 rounded-2xl rounded-bl-sm shadow-xl border border-teal-200/80 pointer-events-none transition-all duration-300 animate-in fade-in zoom-in-95 z-40 flex items-center gap-1.5`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-spin" style={{ animationDuration: '4s' }} />
          <p className={`${sizeStyles.bubbleText} font-semibold leading-tight text-slate-700 tracking-tight`}>
            {currentBubble}
          </p>
          {/* Tail pointing down towards Cô Ngân's head */}
          <div className="absolute -bottom-1.5 left-7 w-3 h-3 bg-white/95 border-b border-r border-teal-200/80 transform rotate-45" />
        </div>
      )}

      {/* Character Image Container */}
      <div className="relative flex flex-col items-center">
        <img
          src={imgSrc}
          alt={avatarName}
          className={`${sizeStyles.width} h-auto object-contain transition-transform duration-300 group-hover:scale-105 active:scale-95`}
          draggable={false}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.src.includes('avatar-idle.gif')) {
              target.src = '/avatar-idle.gif?v=nobadge';
            }
          }}
        />
      </div>
    </div>
  );
};
