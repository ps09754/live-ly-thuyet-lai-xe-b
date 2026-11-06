import React, { useState } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Radio,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Timer,
  Save,
  MessageSquare,
  Lightbulb,
  Gauge,
  Heart,
  PhoneCall,
  GraduationCap,
} from 'lucide-react';
import { socketService } from '../services/socketService';
import {
  DrivingQuestion,
  GamePhase,
  GameSettings,
  LeaderboardUser,
  SessionState,
  TikTokLiveStatus,
  AVAILABLE_VOICES,
} from '../types/driving';
import { drivingSoundEngine } from '../services/drivingSoundEngine';

interface DrivingStreamerDeckProps {
  currentQuestion: DrivingQuestion;
  totalQuestions: number;
  phase: GamePhase;
  timeLeft: number;
  sessionState: SessionState;
  settings: GameSettings;
  tikTokStatus: TikTokLiveStatus;
  leaderboard?: LeaderboardUser[];
  onConnectTikTok: (username: string) => void;
  onDisconnectTikTok: () => void;
  onStartSession: () => void;
  onRestartSession?: () => void;
  onPauseSession: () => void;
  onResumeSession: () => void;
  onEndSession: () => void;
  onNextQuestion: () => void;
  onPrevQuestion: () => void;
  onJumpQuestion: (id: number) => void;
  onStartTimer: () => void;
  onRevealAnswer: () => void;
  onReplayAudio: () => void;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onResetLeaderboard?: () => void;
  onSimulateTestVote: (option: number, username?: string) => void;
}

export const DrivingStreamerDeck: React.FC<DrivingStreamerDeckProps> = ({
  currentQuestion,
  totalQuestions,
  phase,
  timeLeft,
  sessionState,
  settings,
  tikTokStatus,
  leaderboard = [],
  onConnectTikTok,
  onDisconnectTikTok,
  onStartSession,
  onRestartSession,
  onPauseSession,
  onResumeSession,
  onEndSession,
  onNextQuestion,
  onPrevQuestion,
  onJumpQuestion,
  onStartTimer,
  onRevealAnswer,
  onReplayAudio,
  onUpdateSettings,
  onResetLeaderboard,
  onSimulateTestVote,
}) => {
  const [inputUsername, setInputUsername] = useState(tikTokStatus.username || '');
  const [jumpInput, setJumpInput] = useState(String(currentQuestion.id));
  const [copiedLink, setCopiedLink] = useState(false);
  const [isPlayingTestVoice, setIsPlayingTestVoice] = useState(false);

  const handleTestVoice = () => {
    if (isPlayingTestVoice) {
      drivingSoundEngine.stopTTS();
      setIsPlayingTestVoice(false);
      return;
    }
    setIsPlayingTestVoice(true);
    const testSampleText = `Xin chào các bạn! Đây là câu hỏi sát hạch lý thuyết lái xe ô tô sáu trăm câu. Chúc các bạn ôn thi đạt kết quả tốt nhất.`;
    drivingSoundEngine.playTTS(testSampleText, {
      rate: settings.voiceRate || 1.0,
      voiceId: settings.voiceId || 'zerotts-quangminh',
      voiceGender: settings.voiceGender || 'male',
      volume: settings.voiceVolume ?? 1.0,
      onStart: () => setIsPlayingTestVoice(true),
      onEnd: () => setIsPlayingTestVoice(false),
    });
  };

  const chapters = [
    { name: 'Chương 1 (Quy tắc)', start: 1 },
    { name: 'Chương 2 (Văn hóa)', start: 181 },
    { name: 'Chương 3 (Kỹ thuật)', start: 206 },
    { name: 'Chương 4 (Cấu tạo)', start: 264 },
    { name: 'Chương 5 (Biển báo)', start: 301 },
    { name: 'Chương 6 (Sa hình)', start: 486 },
  ];

  const presetTimes = [10, 15, 20, 25, 30, 45, 60];

  const handleCopyStageUrl = () => {
    const url = `${window.location.origin}/?view=stage`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 bg-slate-900 text-slate-100 rounded-3xl shadow-2xl border border-slate-800 space-y-5">
      {/* 1. Header & Live Studio Link */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-lg md:text-xl font-extrabold flex items-center gap-2 text-white">
            <span className="p-1 bg-teal-500/20 text-teal-400 rounded-lg">🚗</span>
            ĐIỀU KHIỂN TIKTOK LIVE (TỶ LỆ 9:16)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Dạy học 600 câu lý thuyết sát hạch lái xe B2/C • Tương tác comment trực tiếp
          </p>
        </div>

        {/* OBS Stage Link Copy */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyStageUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-all"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Đã copy Link 9:16' : 'Copy Link OBS (?view=stage)'}</span>
          </button>
          <a
            href="/?view=stage"
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Mở màn hình Stage 9:16"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* 2. Primary Control Strip: BẮT ĐẦU, TẠM DỪNG / TIẾP TỤC, KẾT THÚC */}
      <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                sessionState === 'running'
                  ? 'bg-emerald-500 animate-pulse'
                  : sessionState === 'paused'
                  ? 'bg-amber-500'
                  : 'bg-slate-500'
              }`}
            />
            TRẠNG THÁI PHIÊN:
            <span
              className={`ml-1 px-2.5 py-0.5 rounded-lg text-xs font-extrabold ${
                sessionState === 'running'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : sessionState === 'paused'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {sessionState === 'running'
                ? 'ĐANG CHẠY'
                : sessionState === 'paused'
                ? 'ĐANG TẠM DỪNG'
                : 'CHƯA BẮT ĐẦU'}
            </span>
          </span>

          <span className="text-xs text-slate-400">
            {phase === 'reading' ? '🎙️ Đang đọc câu hỏi' : phase === 'countdown' ? `⏱️ Đếm ngược: ${timeLeft}s` : '🎉 Đã hiện đáp án'}
          </span>
        </div>

        {/* Bộ điều khiển nhạc (Media Player Controls): CÂU TRƯỚC - BẮT ĐẦU / TẠM DỪNG / TIẾP TỤC - CÂU TIẾP */}
        <div className="flex items-center justify-center gap-3 pt-1">
          {/* Nút CÂU TRƯỚC (Prev) */}
          <button
            onClick={onPrevQuestion}
            disabled={currentQuestion.id <= 1}
            className="flex-1 max-w-[160px] py-3.5 px-4 bg-slate-700/80 hover:bg-slate-700 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-600/60 shadow-md transition-all cursor-pointer"
            title="Câu hỏi trước đó"
          >
            <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            <span>CÂU TRƯỚC</span>
          </button>

          {/* Nút CHÍNH: BẮT ĐẦU -> TẠM DỪNG -> TIẾP TỤC */}
          {sessionState === 'running' ? (
            <button
              onClick={onPauseSession}
              className="flex-1 max-w-[220px] py-3.5 px-6 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 border border-amber-300 transition-all cursor-pointer"
              title="Bấm để tạm dừng"
            >
              <Pause className="w-5 h-5 fill-current" />
              <span>TẠM DỪNG</span>
            </button>
          ) : sessionState === 'paused' ? (
            <button
              onClick={onResumeSession}
              className="flex-1 max-w-[220px] py-3.5 px-6 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 border border-emerald-400 transition-all animate-pulse cursor-pointer"
              title="Bấm để tiếp tục chạy"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>TIẾP TỤC</span>
            </button>
          ) : (
            <button
              onClick={onStartSession}
              className="flex-1 max-w-[220px] py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 border border-emerald-400 transition-all cursor-pointer"
              title="Bấm để bắt đầu phiên"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>BẮT ĐẦU</span>
            </button>
          )}

          {/* Nút CÂU KẾ TIẾP (Next) */}
          <button
            onClick={onNextQuestion}
            disabled={currentQuestion.id >= totalQuestions}
            className="flex-1 max-w-[160px] py-3.5 px-4 bg-slate-700/80 hover:bg-slate-700 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-600/60 shadow-md transition-all cursor-pointer"
            title="Câu hỏi kế tiếp"
          >
            <span>CÂU TIẾP</span>
            <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          </button>
        </div>
      </div>

      {/* 2.5. Header Marquee Banner Text & Speed (Chữ chạy trên header stage) */}
      <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-bold text-slate-200">
            Nội dung chữ chạy Header (Marquee trên màn hình Live):
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={settings.marqueeText || ''}
            onChange={(e) => onUpdateSettings({ marqueeText: e.target.value })}
            placeholder="Nhập nội dung chữ chạy trên Header màn hình Live..."
            className="flex-1 bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none"
          />
          <button
            onClick={() =>
              onUpdateSettings({
                marqueeText:
                  '🚗 ÔN THI LÝ THUYẾT LÁI XE B2/C • 600 CÂU HỎI CHUẨN BỘ GTVT • GÕ COMMENT 1, 2, 3, 4 ĐỂ CHỌN ĐÁP ÁN • CHÚC BẠN THI ĐẬU 100%! 🚗',
              })
            }
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs font-bold shrink-0 transition-all"
            title="Khôi phục chữ chạy mặc định"
          >
            Mặc định
          </button>
        </div>

        {/* Tốc độ chữ chạy Marquee */}
        <div className="pt-2.5 border-t border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-xs font-bold text-slate-300">Tốc độ chữ chạy:</span>
            <span className="text-xs font-extrabold text-teal-400 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700">
              {settings.marqueeSpeed === 60
                ? 'Rất chậm (60s)'
                : (settings.marqueeSpeed || 45) === 45
                ? 'Chậm (45s)'
                : settings.marqueeSpeed === 35
                ? 'Vừa (35s)'
                : settings.marqueeSpeed === 24
                ? 'Nhanh (24s)'
                : `${settings.marqueeSpeed || 45}s`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { label: 'Rất chậm', speed: 60 },
              { label: 'Chậm', speed: 45 },
              { label: 'Vừa', speed: 35 },
              { label: 'Nhanh', speed: 24 },
            ].map(({ label, speed }) => (
              <button
                key={speed}
                type="button"
                onClick={() => onUpdateSettings({ marqueeSpeed: speed })}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  (settings.marqueeSpeed || 45) === speed
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-900 hover:bg-slate-700 text-slate-400 border border-slate-700/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Countdown Seconds Config (Input số giây đếm ngược) */}
      <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-teal-400" />
            <span className="text-xs font-bold text-slate-200">
              Thời gian đếm ngược trả lời (cho phép nhập số giây):
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min="3"
              max="180"
              value={settings.countdownSeconds}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 3) {
                  onUpdateSettings({ countdownSeconds: val });
                }
              }}
              className="w-20 bg-slate-950 border border-teal-500/50 rounded-xl px-3 py-1.5 text-center text-sm font-extrabold text-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
            <span className="text-xs font-bold text-slate-400">giây</span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] text-slate-400 mr-1">Chọn nhanh:</span>
          {presetTimes.map((sec) => (
            <button
              key={sec}
              onClick={() => onUpdateSettings({ countdownSeconds: sec })}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                settings.countdownSeconds === sec
                  ? 'bg-teal-500 text-white shadow-xs'
                  : 'bg-slate-700/80 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {sec}s
            </button>
          ))}
        </div>

        {/* Delay after answer reveal */}
        <div className="pt-2 border-t border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-200">
              Thời gian delay đọc đáp án & mẹo nhớ trước khi qua câu kế:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min="3"
              max="180"
              value={settings.autoNextDelay}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 3) {
                  onUpdateSettings({ autoNextDelay: val });
                }
              }}
              className="w-16 bg-slate-950 border border-emerald-500/50 rounded-xl px-2 py-1 text-center text-xs font-extrabold text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
            <span className="text-xs font-bold text-slate-400">giây</span>
          </div>
        </div>

        {/* Delay Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 mr-1">Chọn nhanh:</span>
          {[3, 5, 10, 15, 20, 30].map((dSec) => (
            <button
              key={dSec}
              onClick={() => onUpdateSettings({ autoNextDelay: dSec })}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                settings.autoNextDelay === dSec
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-700/80 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {dSec}s
            </button>
          ))}
        </div>
      </div>

      {/* 3.5. Voice Reader Settings (Bộ điều chỉnh giọng đọc câu hỏi) */}
      <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-teal-400" />
            <span className="text-xs font-bold text-slate-100 uppercase tracking-tight">
              Bộ điều chỉnh giọng đọc câu hỏi (TTS)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Interactive Callouts (50+ câu tương tác) */}
            <button
              onClick={() => onUpdateSettings({ enableInteractiveVoice: !(settings.enableInteractiveVoice ?? true) })}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                (settings.enableInteractiveVoice ?? true)
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
              title="Tự động phát 55 câu thoại tương tác MC ngẫu nhiên (mời bình chọn và công bố đáp án kèm tạo đà)"
            >
              <span>🎙️ {(settings.enableInteractiveVoice ?? true) ? 'Tương tác MC: BẬT' : 'Tương tác MC: TẮT'}</span>
            </button>

            {/* Toggle Enable/Disable TTS */}
            <button
              onClick={() => onUpdateSettings({ enableTTS: !settings.enableTTS })}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                settings.enableTTS
                  ? 'bg-teal-500 text-white shadow-xs'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {settings.enableTTS ? (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Bật giọng đọc</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Tắt giọng đọc</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Voice Selection Cards */}
        <div className="space-y-2 pt-1 border-t border-slate-700/60">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300">Giọng đọc AI (ZeroTTS & Edge):</span>
            <span className="text-[11px] text-teal-400 font-semibold">
              {AVAILABLE_VOICES.find((v) => v.id === (settings.voiceId || 'zerotts-quangminh'))?.tag || 'ZeroTTS AI'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {AVAILABLE_VOICES.map((v) => {
              const isSelected = (settings.voiceId || 'zerotts-quangminh') === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onUpdateSettings({ voiceId: v.id })}
                  className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-teal-950/70 border-teal-500 shadow-sm shadow-teal-500/20 ring-1 ring-teal-500/50'
                      : 'bg-slate-900/60 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-lg shrink-0">{v.avatar}</span>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white truncate">
                          {v.name}
                        </div>
                        <div className="text-[10px] text-teal-400 font-medium">
                          {v.tag}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 text-slate-950 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-2 leading-tight">
                    {v.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Speed Slider + Quick Presets */}
        <div className="space-y-1.5 pt-1 border-t border-slate-700/60">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300">Tốc độ đọc câu hỏi:</span>
            <span className="font-extrabold text-teal-400">
              {Number(settings.voiceRate || 1.0).toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min="0.75"
            max="1.35"
            step="0.05"
            value={settings.voiceRate || 1.0}
            onChange={(e) => onUpdateSettings({ voiceRate: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-teal-500"
          />
          <div className="flex items-center justify-between gap-1 pt-1">
            {[0.85, 1.0, 1.15, 1.25].map((rate) => (
              <button
                key={rate}
                onClick={() => onUpdateSettings({ voiceRate: rate })}
                className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all text-center ${
                  Math.abs((settings.voiceRate || 1.0) - rate) < 0.02
                    ? 'bg-teal-500 text-white shadow-2xs'
                    : 'bg-slate-700/70 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {rate === 1.0 ? '1.0x (Chuẩn)' : `${rate}x`}
              </button>
            ))}
          </div>
        </div>

        {/* Volume Slider + Preview Test Button */}
        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between gap-3">
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">Âm lượng đọc:</span>
              <span className="font-extrabold text-teal-400">
                {Math.round((settings.voiceVolume ?? 1.0) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.voiceVolume ?? 1.0}
              onChange={(e) => onUpdateSettings({ voiceVolume: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-teal-500"
            />
          </div>

          <button
            onClick={handleTestVoice}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-xs ${
              isPlayingTestVoice
                ? 'bg-amber-500 text-slate-950 animate-pulse'
                : 'bg-slate-700 hover:bg-slate-600 text-amber-300'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{isPlayingTestVoice ? 'Đang phát...' : 'Nghe thử giọng'}</span>
          </button>
        </div>

        {/* Sound Effects Toggle */}
        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300">
            Hiệu ứng âm thanh (Tick đếm ngược & Chuông báo):
          </span>
          <button
            onClick={() => onUpdateSettings({ soundEffectsEnabled: !settings.soundEffectsEnabled })}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              settings.soundEffectsEnabled
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            {settings.soundEffectsEnabled ? 'Bật hiệu ứng' : 'Tắt hiệu ứng'}
          </button>
        </div>

        {/* Tip Timing Toggle */}
        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300">
            Hiện Mẹo nhớ trên màn hình:
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onUpdateSettings({ showTipTiming: 'revealed' })}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                settings.showTipTiming !== 'always'
                  ? 'bg-teal-500 text-white shadow-2xs'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              Khi hiện đáp án
            </button>
            <button
              onClick={() => onUpdateSettings({ showTipTiming: 'always' })}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                settings.showTipTiming === 'always'
                  ? 'bg-teal-500 text-white shadow-2xs'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              Luôn hiện
            </button>
          </div>
        </div>
      </div>

      {/* 3.8. Popup Hiệu ứng nổi trên màn Live 9:16 (Thả tim & Zalo khóa học) */}
      <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-bold text-slate-100 uppercase tracking-tight">
              Hiệu ứng Popup nổi trên màn Live 9:16 (Thả tim & Zalo khóa học)
            </span>
          </div>
        </div>

        {/* Cài đặt 1: Popup Thả tim & Follow */}
        <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-700/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-400 fill-current" />
              <span className="text-xs font-bold text-white">Popup 1: Kêu gọi Thả tim & Follow</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => socketService.emit('overlay:trigger', { type: 'like_follow' })}
                className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-[11px] font-bold transition-all"
                title="Bấm để xem popup xuất hiện ngay trên màn hình Live"
              >
                👁️ Hiện thử ngay
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ enableLikeFollowPopup: !(settings.enableLikeFollowPopup ?? true) })}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  (settings.enableLikeFollowPopup ?? true)
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {(settings.enableLikeFollowPopup ?? true) ? 'Đang BẬT' : 'Đang TẮT'}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Tần suất xuất hiện:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 5].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => onUpdateSettings({ likeFollowIntervalMinutes: mins })}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                      (settings.likeFollowIntervalMinutes || 2) === mins
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {mins} phút/lần
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400">Lời nhắn kêu gọi:</span>
            <input
              type="text"
              value={settings.likeFollowText || ''}
              onChange={(e) => onUpdateSettings({ likeFollowText: e.target.value })}
              placeholder="❤️ Nhấn thả tim liên tục vào màn hình & Bấm Follow để không bỏ lỡ buổi học tiếp theo nhé!"
              className="w-full bg-slate-950 border border-slate-700 focus:border-rose-400 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Cài đặt 2: Popup Chỉ dẫn Zalo & Đăng ký Khóa học */}
        <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-700/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-white">Popup 2: Chỉ dẫn Zalo / Đăng ký Khóa học</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => socketService.emit('overlay:trigger', { type: 'zalo_course' })}
                className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-lg text-[11px] font-bold transition-all"
                title="Bấm để xem popup xuất hiện ngay trên màn hình Live"
              >
                👁️ Hiện thử ngay
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ enableZaloCoursePopup: !(settings.enableZaloCoursePopup ?? true) })}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  (settings.enableZaloCoursePopup ?? true)
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {(settings.enableZaloCoursePopup ?? true) ? 'Đang BẬT' : 'Đang TẮT'}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Tần suất xuất hiện:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 5].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => onUpdateSettings({ zaloCourseIntervalMinutes: mins })}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                      (settings.zaloCourseIntervalMinutes || 3) === mins
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {mins} phút/lần
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <PhoneCall className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-[11px] text-slate-400 shrink-0">Zalo/Hotline:</span>
              <input
                type="text"
                value={settings.zaloContactPhone || ''}
                onChange={(e) => onUpdateSettings({ zaloContactPhone: e.target.value })}
                placeholder="09xx.xxx.xxx (để trống nếu không hiện)"
                className="w-36 bg-slate-950 border border-slate-700 focus:border-blue-400 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400">Lời nhắn chỉ dẫn học viên:</span>
            <input
              type="text"
              value={settings.zaloCourseText || ''}
              onChange={(e) => onUpdateSettings({ zaloCourseText: e.target.value })}
              placeholder="👉 Bấm vào Avatar / Trang cá nhân để lấy Zalo tư vấn học bằng lái B2/C trọn gói nhé cả nhà!"
              className="w-full bg-slate-950 border border-slate-700 focus:border-blue-400 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 3.6. Trợ Giảng Ảo Tương Tác Góc Dưới Bên Phải (Cô Ngân) */}
      <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Trợ Giảng AI / Avatar Tương Tác Góc Dưới (Cô Ngân)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                socketService.emit('avatar:speak', {
                  text: 'Cùng comment đáp án để thi đỗ 100% nhé cả nhà! 🚗✨',
                })
              }
              className="px-2.5 py-1 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 rounded-lg text-[11px] font-bold transition-all"
              title="Bấm để kích hoạt câu thoại bong bóng thử nghiệm trên avatar"
            >
              💬 Nói thử ngay
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ enableAvatar: !(settings.enableAvatar ?? true) })}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                (settings.enableAvatar ?? true)
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {(settings.enableAvatar ?? true) ? 'Đang BẬT' : 'Đang TẮT'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-700/50">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400">Tên Trợ Giảng:</span>
            <input
              type="text"
              value={settings.avatarName || 'Cô Ngân 💖'}
              onChange={(e) => onUpdateSettings({ avatarName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 focus:border-pink-400 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
              placeholder="Cô Ngân 💖"
            />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-slate-400">Kích thước hiển thị:</span>
            <div className="flex items-center gap-1">
              {[
                { id: 'small', label: 'Nhỏ (80px)' },
                { id: 'medium', label: 'Chuẩn (105px)' },
                { id: 'large', label: 'Lớn (130px)' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onUpdateSettings({ avatarSize: s.id as any })}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    (settings.avatarSize || 'medium') === s.id
                      ? 'bg-pink-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-slate-400">Định dạng hiển thị:</span>
            <div className="flex items-center gap-1">
              {[
                { id: 'gif', label: 'GIF Sống động ✨' },
                { id: 'image', label: 'Ảnh nét 🖼️' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onUpdateSettings({ avatarMedia: m.id as any })}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    (settings.avatarMedia || 'gif') === m.id
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-[11px] text-slate-300 font-medium">Bong bóng thoại thông minh:</span>
            <span className="text-[10px] text-slate-500">(Tự động nhắc học viên comment, cổ vũ, cảm ơn khi có người vote)</span>
          </div>
          <button
            type="button"
            onClick={() => onUpdateSettings({ enableAvatarSpeechBubble: !(settings.enableAvatarSpeechBubble ?? true) })}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              (settings.enableAvatarSpeechBubble ?? true)
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            {(settings.enableAvatarSpeechBubble ?? true) ? 'BẬT thoại' : 'TẮT thoại'}
          </button>
        </div>
      </div>

      {/* 4. TikTok Live Connection */}
      <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Radio
            className={`w-5 h-5 ${
              tikTokStatus.isConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-400'
            }`}
          />
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>TikTok LIVE:</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  tikTokStatus.isConnected
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {tikTokStatus.isConnected ? `@${tikTokStatus.username} (Đã kết nối)` : 'Chưa kết nối'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-44">
            <span className="absolute left-2.5 top-2 text-xs text-slate-500 font-bold">@</span>
            <input
              type="text"
              value={inputUsername}
              onChange={(e) => {
                setInputUsername(e.target.value);
                localStorage.setItem('driving_tiktok_user', e.target.value);
              }}
              placeholder="username"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-6 pr-2 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          {tikTokStatus.isConnected ? (
            <button
              onClick={onDisconnectTikTok}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all"
            >
              Ngắt
            </button>
          ) : (
            <button
              onClick={() => {
                localStorage.setItem('driving_tiktok_user', inputUsername);
                onConnectTikTok(inputUsername);
              }}
              disabled={tikTokStatus.isConnecting || !inputUsername.trim()}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all"
            >
              {tikTokStatus.isConnecting ? 'Đang nối...' : 'Kết nối'}
            </button>
          )}
        </div>
      </div>

      {/* 5. Navigation & Chapter Jump */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Navigation & Jump */}
        <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 space-y-2.5">
          <span className="text-xs font-bold text-slate-300 block">
            Câu {currentQuestion.id}/{totalQuestions}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevQuestion}
              disabled={currentQuestion.id <= 1}
              className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
            >
              <SkipBack className="w-3.5 h-3.5" />
              <span>Câu trước</span>
            </button>
            <input
              type="number"
              min="1"
              max={totalQuestions}
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              className="w-16 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1 text-xs text-center font-bold text-white"
            />
            <button
              onClick={() => {
                const val = parseInt(jumpInput, 10);
                if (!isNaN(val) && val >= 1 && val <= totalQuestions) {
                  onJumpQuestion(val);
                }
              }}
              className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs font-bold rounded-xl text-slate-200"
            >
              Đến câu
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onReplayAudio}
              className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Đọc lại câu hỏi</span>
            </button>
            <button
              onClick={onResetLeaderboard}
              className="py-1.5 px-3 bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Top 3</span>
            </button>
          </div>

          {/* Streamer Tip Guide */}
          {currentQuestion.tip && (
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-2 space-y-1">
              <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Mẹo nhớ: {currentQuestion.tip}</span>
              </span>
            </div>
          )}
        </div>

        {/* Quick Chapter select */}
        <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 space-y-2">
          <span className="text-xs font-bold text-slate-300 block">
            Chọn nhanh chương
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {chapters.map((ch, idx) => (
              <button
                key={idx}
                onClick={() => onJumpQuestion(ch.start)}
                className={`p-1.5 rounded-xl text-[11px] font-bold text-center border transition-all ${
                  currentQuestion.id >= ch.start && (idx === chapters.length - 1 || currentQuestion.id < chapters[idx + 1].start)
                    ? 'bg-teal-600/30 border-teal-500 text-teal-300'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                }`}
              >
                <div>{ch.name.split(' ')[0]} {ch.name.split(' ')[1]}</div>
                <div className="text-[9px] text-slate-400">câu {ch.start}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Test Vote Simulator */}
      <div className="bg-slate-800/40 p-2.5 rounded-xl border border-dashed border-slate-700 flex items-center justify-between text-xs">
        <span className="text-slate-400 flex items-center gap-1 text-[11px]">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Test giả lập comment:
        </span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4].map((opt) => (
            <button
              key={opt}
              onClick={() => onSimulateTestVote(opt)}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-xs font-bold"
            >
              {opt}
            </button>
          ))}
          <button
            onClick={() => {
              for (let i = 0; i < 5; i++) {
                const randOpt = Math.floor(Math.random() * 4) + 1;
                const randUser = `user_${Math.floor(Math.random() * 800) + 100}`;
                setTimeout(() => onSimulateTestVote(randOpt, randUser), i * 150);
              }
            }}
            className="px-2 py-0.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold"
          >
            +5 vote
          </button>
        </div>
      </div>
    </div>
  );
};
