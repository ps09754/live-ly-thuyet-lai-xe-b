export interface DrivingQuestion {
  id: number;
  chapter: string;
  question: string;
  image: string | null;
  options: string[];
  correctAnswer: number; // 1, 2, 3, or 4
  foundUnderline?: boolean;
  tip?: string;
  explanation?: string;
}

export interface UserVote {
  username: string;
  nickname: string;
  avatar: string;
  option: number;
  timestamp: number;
}

export interface LeaderboardUser {
  username: string;
  nickname: string;
  avatar: string;
  correctCount: number;
  totalAnswered: number;
  streak: number;
  lastCorrectTime: number;
}

export type GamePhase = 'reading' | 'countdown' | 'revealed';
export type SessionState = 'idle' | 'running' | 'paused' | 'ended';

export interface VoiceOption {
  id: string;
  name: string;
  tag: string;
  desc: string;
  avatar: string;
  engine: 'zerotts' | 'edgetts';
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  {
    id: 'zerotts-maichi',
    name: 'Mai Chi (Nữ Nhẹ Nhàng)',
    tag: 'ZeroTTS AI',
    desc: 'Giọng Nữ trẻ, cực kỳ mềm mại, thân thiện, dễ nghe',
    avatar: '🌸',
    engine: 'zerotts',
  },
  {
    id: 'zerotts-baotrang',
    name: 'Bảo Trang (News Nữ)',
    tag: 'ZeroTTS AI',
    desc: 'Giọng Nữ BTV bản tin, nhẹ nhàng, thanh thoát, rõ chữ',
    avatar: '👩‍💼',
    engine: 'zerotts',
  },
  {
    id: 'vi-VN-HoaiMyNeural',
    name: 'Hoài My (Edge Nữ)',
    tag: 'Edge TTS',
    desc: 'Giọng Nữ chuẩn miền Bắc, mượt mà',
    avatar: '👧',
    engine: 'edgetts',
  },
];

export interface GameSettings {
  countdownSeconds: number; // custom seconds input (e.g. 15)
  autoNextDelay: number; // delay before next question (e.g. 5)
  autoPlay: boolean;
  enableTTS: boolean;
  voiceId?: string; // e.g. zerotts-maichi, vi-VN-HoaiMyNeural
  voiceGender: 'male' | 'female';
  voiceRate: number;
  voiceVolume: number; // 0.0 to 1.0 (0% to 100%)
  soundEffectsEnabled: boolean;
  marqueeText: string; // Chữ chạy trên header, streamer nhập từ deck
  marqueeSpeed?: number; // Tốc độ chữ chạy header (giây/vòng lặp: 24s đến 70s, mặc định 45s)
  showTipTiming?: 'always' | 'revealed'; // Hiển thị mẹo nhớ
  enableInteractiveVoice?: boolean; // Tự động phát câu thoại tương tác ngẫu nhiên khi đếm ngược và công bố kết quả
  // 1. Popup Thả tim & Follow / Subscribe
  enableLikeFollowPopup?: boolean;
  likeFollowIntervalMinutes?: number; // Tần suất (phút: 1, 2, 3, 5)
  likeFollowText?: string;
  // 2. Popup Chỉ dẫn Zalo / Đăng ký Khóa học
  enableZaloCoursePopup?: boolean;
  zaloCourseIntervalMinutes?: number; // Tần suất (phút: 1, 2, 3, 5)
  zaloCourseText?: string;
  zaloContactPhone?: string;
  // 3. Trợ giảng ảo tương tác góc dưới bên phải (Cô Ngân)
  enableAvatar?: boolean; // Bật/tắt avatar (mặc định: true)
  avatarName?: string; // Tên trợ giảng (mặc định: 'Cô Ngân 💖')
  avatarSize?: 'small' | 'medium' | 'large'; // Kích cỡ
  avatarMedia?: 'gif' | 'image'; // GIF hoạt hình hay ảnh tĩnh
  enableAvatarSpeechBubble?: boolean; // Bong bóng thoại tương tác thông minh
  // 4. Chế độ bốc câu hỏi ngẫu nhiên (Random 600 câu không trùng lặp)
  enableRandomQuestions?: boolean;
  // 5. Căn lề an toàn màn hình Live (Safe Zone Padding cho TikTok Mobile)
  stagePaddingX?: number; // Căn lề ngang (px trên canvas 480: mặc định 52px cho màn 19.5:9)
  stageOffsetX?: number; // Cân chỉnh lệch tâm ngang Trái/Phải (px: -40 đến +40, mặc định 0)
  stagePaddingTop?: number; // Căn lề trên (px: mặc định 100px)
  stagePaddingBottom?: number; // Căn lề dưới (px: mặc định 220px)
  showTikTokSafeZoneGuide?: boolean; // Bật/tắt đường viền mô phỏng khung cắt điện thoại TikTok
  tiktokUsername?: string; // Lưu username TikTok của streamer để không phải nhập lại mỗi lần Live
  tiktokSessionId?: string; // Cookie sessionid từ tiktok.com để vượt chặn IP / Captcha nếu bị lỗi
}

export interface TikTokChatEvent {
  username: string;
  nickname: string;
  comment: string;
  avatar: string;
  timestamp: number;
}

export interface TikTokLiveStatus {
  isConnected: boolean;
  isConnecting: boolean;
  username: string;
  roomId: string;
  viewerCount: number;
  totalLikes: number;
  error?: string;
  source?: 'connector' | 'bridge';
  bridgeLastSeen?: number;
  bridgeCommentCount?: number;
}
