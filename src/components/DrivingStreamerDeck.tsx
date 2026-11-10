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
  Shuffle,
  Maximize2,
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
  playedCount?: number;
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
  playedCount = 1,
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
      voiceId: settings.voiceId || 'zerotts-maichi',
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

      {/* 2. Primary Control Strip: BẮT ĐẦU, TẠM DỪNG / TIẾP TỤC, KẾT THÚC & RANDOM */}
      <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
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
          </div>

          <div className="flex items-center gap-2.5">
            {/* Nút Bật/Tắt Chế độ Random Câu Hỏi ngay trên thanh điều khiển chính */}
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ enableRandomQuestions: !(settings.enableRandomQuestions ?? false) })
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                settings.enableRandomQuestions
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-purple-500/30 ring-2 ring-purple-300'
                  : 'bg-slate-700/80 hover:bg-slate-600 text-slate-300 border border-slate-600'
              }`}
              title="Bật: Tự động bốc ngẫu nhiên câu hỏi chưa đọc. Đọc hết 600 câu sẽ tự động reset vòng mới."
            >
              <Shuffle className={`w-3.5 h-3.5 ${settings.enableRandomQuestions ? 'animate-pulse' : ''}`} />
              <span>{settings.enableRandomQuestions ? '🔀 Random: BẬT' : 'Random: TẮT'}</span>
            </button>

            <span className="text-xs text-slate-300 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-700/50">
              {phase === 'reading' ? '🎙️ Đang đọc câu hỏi' : phase === 'countdown' ? `⏱️ Đếm ngược: ${timeLeft}s` : '🎉 Đã hiện đáp án'}
            </span>
          </div>
        </div>

        {/* Thanh trạng thái Tiến độ Random khi BẬT */}
        {settings.enableRandomQuestions && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-purple-950/70 via-slate-900/80 to-purple-950/70 border border-purple-500/40 rounded-xl px-3.5 py-2 text-xs shadow-inner">
            <div className="flex items-center gap-2">
              <span className="text-purple-300 font-medium flex items-center gap-1.5">
                <span>🎲 Tiến độ Random: Đã đọc</span>
                <b className="px-2 py-0.5 rounded-md bg-purple-600 text-white font-extrabold text-xs shadow-xs">
                  {playedCount || 1}
                </b>
                <span>/{totalQuestions} câu</span>
                <span className="text-purple-300/80 text-[11px] ml-1">
                  (Còn <b className="text-purple-200">{Math.max(0, totalQuestions - (playedCount || 1))}</b> câu chưa đọc)
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => socketService.emit('cmd:reset_random')}
              className="px-2.5 py-1 bg-purple-700/90 hover:bg-purple-600 active:scale-95 text-purple-100 rounded-lg text-xs font-bold transition-all border border-purple-400/40 shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Bấm để xóa danh sách câu đã đọc và bắt đầu lại vòng random từ đầu"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đặt lại vòng mới</span>
            </button>
          </div>
        )}

        {/* Bộ điều khiển nhạc (Media Player Controls): CÂU TRƯỚC - BẮT ĐẦU / TẠM DỪNG / TIẾP TỤC - CÂU TIẾP */}
        <div className="flex items-center justify-center gap-3 pt-1">
          {/* Nút CÂU TRƯỚC (Prev) */}
          <button
            onClick={onPrevQuestion}
            disabled={!settings.enableRandomQuestions && currentQuestion.id <= 1}
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
            disabled={!settings.enableRandomQuestions && currentQuestion.id >= totalQuestions}
            className={`flex-1 max-w-[190px] py-3.5 px-4 active:scale-95 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
              settings.enableRandomQuestions
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-300 shadow-purple-500/25 ring-2 ring-purple-400/50'
                : 'bg-slate-700/80 hover:bg-slate-700 border border-slate-600/60 disabled:opacity-30 disabled:pointer-events-none'
            }`}
            title={settings.enableRandomQuestions ? 'Bốc ngẫu nhiên câu kế tiếp chưa đọc' : 'Câu hỏi kế tiếp'}
          >
            <span>{settings.enableRandomQuestions ? 'CÂU TIẾP (RANDOM)' : 'CÂU TIẾP'}</span>
            {settings.enableRandomQuestions ? (
              <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            )}
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

      {/* 2.6. Safe Zone Padding Config (Căn lề an toàn màn hình Live tránh tràn viền điện thoại TikTok) */}
      <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-200">
              Căn lề an toàn màn hình Live (Safe Zone Padding cho TikTok Mobile):
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Simulator Guide */}
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  showTikTokSafeZoneGuide: !settings.showTikTokSafeZoneGuide,
                })
              }
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                settings.showTikTokSafeZoneGuide
                  ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-300 animate-pulse'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
              title="Bật/Tắt đường viền nét đứt đỏ mô phỏng khung cắt điện thoại TikTok trên màn Live"
            >
              <span>{settings.showTikTokSafeZoneGuide ? '👁️ Đang hiện Khung An Toàn' : '👁️ Hiện Khung Cắt TikTok (Test)'}</span>
            </button>

            <span className="text-[11px] font-semibold text-slate-400">
              Lề Ngang: <b className="text-emerald-400 font-bold">{settings.stagePaddingX ?? 32}px</b> • Lệch tâm:{' '}
              <b className="text-cyan-400 font-bold">
                {(settings.stageOffsetX ?? 0) === 0
                  ? '0 (Giữa)'
                  : (settings.stageOffsetX ?? 0) > 0
                  ? `+${settings.stageOffsetX} (Phải)`
                  : `${settings.stageOffsetX} (Trái)`}
              </b>{' '}
              • Trên: <b className="text-teal-400 font-bold">{settings.stagePaddingTop ?? 80}px</b> • Đáy:{' '}
              <b className="text-amber-400 font-bold">{settings.stagePaddingBottom ?? 190}px</b>
            </span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[11px] font-medium text-slate-400">Chế độ mẫu:</span>
          {[
            { label: '📱 Chuẩn TikTok Điện Thoại (19.5:9) ⭐ Khuyên dùng', padX: 52, offsetX: 0, padTop: 100, padBottom: 220 },
            { label: '📱 Siêu Rộng Rãi (Lề 60px)', padX: 60, offsetX: 0, padTop: 120, padBottom: 220 },
            { label: '🎯 Vừa phải (Màn 16:9)', padX: 32, offsetX: 0, padTop: 80, padBottom: 180 },
            { label: '🖥️ Toàn màn hình OBS Studio (Gọn)', padX: 12, offsetX: 0, padTop: 24, padBottom: 24 },
          ].map(({ label, padX, offsetX, padTop, padBottom }) => {
            const isSelected =
              (settings.stagePaddingX ?? 32) === padX &&
              (settings.stageOffsetX ?? 0) === offsetX &&
              (settings.stagePaddingTop ?? 80) === padTop &&
              (settings.stagePaddingBottom ?? 190) === padBottom;
            return (
              <button
                key={label}
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    stagePaddingX: padX,
                    stageOffsetX: offsetX,
                    stagePaddingTop: padTop,
                    stagePaddingBottom: padBottom,
                  })
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-300'
                    : 'bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-700/80'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Sliders for precise custom adjustment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2.5 border-t border-slate-700/60">
          {/* 1. Lề ngang Trái & Phải */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300 font-medium">Lề Ngang (Độ dày 2 bên):</span>
              <span className="text-emerald-400 font-extrabold">{settings.stagePaddingX ?? 32}px</span>
            </div>
            <input
              type="range"
              min="8"
              max="70"
              step="2"
              value={settings.stagePaddingX ?? 32}
              onChange={(e) => onUpdateSettings({ stagePaddingX: parseInt(e.target.value, 10) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* 2. Dịch tâm lệch Trái / Phải */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300 font-medium">Dịch Trái ⟵ 0 ⟶ Phải:</span>
              <span className="text-cyan-400 font-extrabold">
                {(settings.stageOffsetX ?? 0) === 0
                  ? '0px (Giữa)'
                  : (settings.stageOffsetX ?? 0) > 0
                  ? `+${settings.stageOffsetX}px (Phải)`
                  : `${settings.stageOffsetX}px (Trái)`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min="-40"
                max="40"
                step="2"
                value={settings.stageOffsetX ?? 0}
                onChange={(e) => onUpdateSettings({ stageOffsetX: parseInt(e.target.value, 10) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              {(settings.stageOffsetX ?? 0) !== 0 && (
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ stageOffsetX: 0 })}
                  className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] text-slate-300 shrink-0"
                  title="Đặt lại chính giữa"
                >
                  Giữa
                </button>
              )}
            </div>
          </div>

          {/* 3. Lề trên */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300 font-medium">Lề Trên (Tránh thanh TikTok):</span>
              <span className="text-teal-400 font-extrabold">{settings.stagePaddingTop ?? 80}px</span>
            </div>
            <input
              type="range"
              min="10"
              max="140"
              step="5"
              value={settings.stagePaddingTop ?? 80}
              onChange={(e) => onUpdateSettings({ stagePaddingTop: parseInt(e.target.value, 10) })}
              className="w-full accent-teal-500 cursor-pointer"
            />
          </div>

          {/* 4. Nâng lề đáy */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300 font-medium">Nâng lề Đáy (Tránh Chat & Bio):</span>
              <span className="text-amber-400 font-extrabold">{settings.stagePaddingBottom ?? 190}px</span>
            </div>
            <input
              type="range"
              min="10"
              max="280"
              step="5"
              value={settings.stagePaddingBottom ?? 190}
              onChange={(e) => onUpdateSettings({ stagePaddingBottom: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
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
              {AVAILABLE_VOICES.find((v) => v.id === (settings.voiceId || 'zerotts-maichi'))?.tag || 'ZeroTTS AI'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {AVAILABLE_VOICES.map((v) => {
              const isSelected = (settings.voiceId || 'zerotts-maichi') === v.id;
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
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">
              Câu {currentQuestion.id}/{totalQuestions}
            </span>
          </div>
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
