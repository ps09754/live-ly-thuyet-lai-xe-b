/**
 * liveVoiceInteractions.ts
 * Bộ điều phối câu thoại MC livestream TikTok thông minh & tự nhiên:
 * - Đọc trực tiếp tên (nickname) của người xem và đáp án họ chọn để kích thích tương tác mạnh mẽ.
 * - Tự động thích ứng theo lượng comment thực tế (có nhiều vote, có 1 vote, hay chưa ai vote).
 * - Chuẩn hóa tên người dùng thành âm tiết tiếng Việt dễ nghe, tự nhiên cho bộ đọc TTS.
 * - Chống trùng lặp câu thoại: Không lặp lại trong 25 lần chọn liên tiếp.
 */

import { UserVote } from '../types/driving';

/**
 * Chuẩn hóa tên nickname người xem TikTok để TTS phát âm tròn vành, tự nhiên:
 * - Lọc bỏ emoji, ký hiệu lạ, ký tự đặc biệt (@, _, -, .)
 * - Lọc bỏ các dãy số dài ngẫu nhiên phía sau (vd: "nam1998374" -> "Nam")
 * - Giới hạn độ dài tối đa 14 ký tự để không làm câu đọc bị kéo dài.
 */
export function cleanViewerName(nickname?: string, username?: string): string {
  let name = (nickname || username || '').trim();

  // Bỏ emoji và các icon Unicode
  name = name.replace(
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
    ''
  );
  // Bỏ các ký tự đặc biệt thường gặp trong username
  name = name.replace(/[._\-@*#~!$%^&+=/\\|<>?`~[\](){}:;,"']/g, ' ');

  // Bỏ dãy số đuôi dài từ 3-4 số trở lên (vd: "tuan8899" -> "tuan")
  name = name.replace(/\d{3,}$/, '').trim();
  // Gom gọn khoảng trắng thừa
  name = name.replace(/\s+/g, ' ').trim();

  // Nếu tên bị rỗng hoặc là dạng user mặc định của TikTok
  if (!name || /^user\d*$/i.test(name) || name.length < 2) {
    const fallbackTitles = ['bạn học viên', 'bác tài', 'bạn khán giả'];
    return fallbackTitles[Math.floor(Math.random() * fallbackTitles.length)];
  }

  // Giới hạn tối đa 14 ký tự
  if (name.length > 14) {
    name = name.slice(0, 14).trim();
  }

  return name;
}

/**
 * Trình quản lý chống trùng lặp câu thoại gần nhất
 */
class RecentHistoryTracker<T extends string> {
  private history: T[] = [];
  private maxHistory: number;
  private storageKey: string;

  constructor(storageKey: string, maxHistory: number = 25) {
    this.storageKey = storageKey;
    this.maxHistory = maxHistory;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const saved = sessionStorage.getItem(`driving_voice_history_${storageKey}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) this.history = parsed;
        }
      } catch {
        // ignore
      }
    }
  }

  public pick(items: T[]): T {
    if (items.length === 0) return '';
    const available = items.filter((item) => !this.history.includes(item));
    const pool = available.length > 0 ? available : items;
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    this.history.push(chosen);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        sessionStorage.setItem(`driving_voice_history_${this.storageKey}`, JSON.stringify(this.history));
      } catch {
        // ignore
      }
    }
    return chosen;
  }
}

// 1. Mẫu câu kêu gọi khi bắt đầu đếm ngược
const COUNTDOWN_CALLOUTS = [
  'Đếm ngược bắt đầu! Cả nhà cùng gõ comment đáp án của mình nào!',
  'Mời các bác tài tương lai cùng trổ tài, gõ đáp án 1, 2, 3 hoặc 4 nhé!',
  'Câu này rất quen thuộc nè, ai biết đáp án thì bấm số cho em thấy với ạ!',
  'Đồng hồ bắt đầu đếm, cả nhà nhanh tay chốt đáp án để em đọc tên nha!',
  'Bác nào chuẩn bị thi sát hạch thì cùng thử sức gõ đáp án câu này nhé!',
  'Nhanh tay nào cả nhà ơi, xem ai là người chốt đáp án chính xác đầu tiên!',
  'Mời cả nhà cùng điểm danh, để lại con số bạn chọn ở phần bình luận nhé!',
  'Thời gian suy nghĩ bắt đầu, các bác tự tin chốt số nào!',
];

// 2. Mẫu câu giữa giờ khi ĐÃ CÓ NGƯỜI BÌNH CHỌN (gọi tên người xem)
const MID_CALLOUTS_WITH_NAME = [
  'Cảm ơn bạn {name} đã chốt đáp án {opt}, các bác còn lại nhanh tay lên nhé!',
  'Em thấy bạn {name} vừa chọn số {opt} rất tự tin nè, còn ai chưa chọn không ạ!',
  'Bạn {name} và các bác tài khác đang cùng chọn đáp án {opt}, chốt nhanh kẻo hết giờ nha!',
  'Khung chat đang nhảy liên tục rồi, bạn {name} chọn số {opt}, chuẩn bị đón kết quả nào!',
  'Đã có {totalVotes} bác bình chọn rồi, bạn {name} vừa gửi đáp án {opt} rất dứt khoát!',
  'Bác {name} cũng đồng tình với đáp án {opt} rồi, các bác còn lại nhanh tay lên nào!',
  'Hơn {totalVotes} lượt vote rồi cả nhà ơi, bạn {name} chốt số {opt} rất nhanh tay!',
  'Cảm ơn bạn {name} đã tương tác nhiệt tình với đáp án số {opt} nhé!',
];

// 3. Mẫu câu giữa giờ khi CHƯA CÓ AI BÌNH CHỌN (kích thích tương tác mở hàng)
const MID_CALLOUTS_EMPTY = [
  'Chưa thấy bác nào lên tiếng nè, ai xung phong mở hàng comment đáp án đầu tiên nào!',
  'Chỉ còn vài giây thôi cả nhà ơi, nhanh tay gõ số để em đọc tên lên live nào!',
  'Sắp hết giờ rồi các bác ơi, tự tin gõ con số bạn nghĩ là đúng nhé!',
  'Câu này không làm khó được các bác đâu, nhanh tay gửi đáp án nào cả nhà!',
  'Đồng hồ đang đếm những giây cuối rồi, ai biết đáp án thì bấm liền tay nha!',
];

// 4. Mẫu câu công bố kết quả KHI CÓ NGƯỜI ĐOÁN ĐÚNG (gọi tên người đoán đúng)
const REVEAL_CALLOUTS_WITH_CORRECT_NAME = [
  'Chính xác! Đáp án đúng là số {answer}. Chúc mừng bạn {name} đã trả lời cực kỳ chuẩn xác!',
  'Đáp án chuẩn là số {answer}! Xin chúc mừng bạn {name} đã ghi điểm tuyệt đối ở câu này nhé!',
  'Quá xuất sắc bạn {name} ơi, chọn số {answer} là chuẩn đét luôn rồi!',
  'Số {answer} hoàn toàn chính xác! Chúc mừng bạn {name} cùng các bác tài đã chọn đúng câu này!',
  'Chuẩn không cần chỉnh, đáp án chính là số {answer}! Bạn {name} phân tích đề rất sắc bén!',
  'Đáp án là số {answer} nha cả nhà! Chúc mừng bạn {name} và {correctCount} bác đã chọn đúng!',
  'Tuyệt vời bạn {name} ơi, số {answer} là câu trả lời chính xác, giữ vững phong độ nhé!',
  'Không ngoài dự đoán, đáp án là số {answer}! Chúc mừng bạn {name} đã đưa ra đáp án rất nhanh!',
];

// 5. Mẫu câu công bố kết quả KHI NGƯỜI XEM ĐOÁN SAI (trêu vui & động viên)
const REVEAL_CALLOUTS_WITH_WRONG_NAME = [
  'Đáp án đúng là số {answer} nha cả nhà! Bạn {name} chọn số {wrongOpt} tiếc quá, chuẩn bị gỡ lại ở câu sau nha!',
  'Số {answer} mới là đáp án chuẩn nhé các bác! Bạn {name} bị câu này đánh lừa chút xíu rồi, câu sau lấy lại phong độ nhé!',
  'Đáp án chính xác là {answer}! Rất nhiều bác và bạn {name} bị nhầm ở câu này, cùng lưu ý để đi thi không bị mất điểm nha!',
  'Chính là số {answer} nha cả nhà! Bạn {name} ơi câu sau chắc chắn sẽ đúng, cùng chuẩn bị nào!',
];

// 6. Mẫu câu công bố kết quả KHI KHÔNG CÓ AI BÌNH CHỌN
const REVEAL_CALLOUTS_EMPTY = [
  'Đáp án đúng là số {answer} nha cả nhà! Câu này dễ mà sao chưa thấy bác nào comment nè, câu sau nhớ bấm số tương tác nha!',
  'Chính là đáp án số {answer}! Câu sau cả nhà mình nhớ nhanh tay gõ đáp án để em xướng tên chúc mừng nhé!',
  'Số {answer} là câu trả lời chuẩn xác của Bộ Công An nha các bác! Chuẩn bị sang câu mới nào!',
];

// 7. Mẫu câu tạo đà chuyển sang câu mới
const TRANSITION_CALLOUTS = [
  'Cả nhà cùng lấy đà để chinh phục câu hỏi tiếp theo ngay bây giờ nhé!',
  'Tiếp tục giữ vững phong độ cao này để sang câu tiếp theo nào các bác ơi!',
  'Ai đúng thả tim, chúng ta cùng bước sang câu hỏi mới ngay đây ạ!',
  'Chuẩn bị sẵn tay trên bàn phím, câu tiếp theo lộ diện ngay đây cả nhà ơi!',
  'Tiến lên câu tiếp theo nào các bác ơi, khí thế đang rất hừng hực!',
  'Một câu hỏi mới đang chờ đợi cả nhà, cùng xem ai trả lời nhanh nhất nhé!',
];

const countdownTracker = new RecentHistoryTracker<string>('countdown', 20);
const midWithNameTracker = new RecentHistoryTracker<string>('mid_name', 20);
const midEmptyTracker = new RecentHistoryTracker<string>('mid_empty', 10);
const revealCorrectTracker = new RecentHistoryTracker<string>('reveal_correct', 25);
const revealWrongTracker = new RecentHistoryTracker<string>('reveal_wrong', 15);
const revealEmptyTracker = new RecentHistoryTracker<string>('reveal_empty', 10);
const transitionTracker = new RecentHistoryTracker<string>('transition', 20);

/**
 * Câu gọi mở màn khi vừa đọc xong câu hỏi và bắt đầu đếm ngược
 */
export function getRandomCountdownCallout(optionsCount: number = 4): string {
  const template = countdownTracker.pick(COUNTDOWN_CALLOUTS);
  const count = Math.max(2, Math.min(4, optionsCount));
  const optionsStr = count === 2 ? '1 hoặc 2' : count === 3 ? '1, 2 hoặc 3' : '1, 2, 3 hoặc 4';
  return template.replace(/1, 2, 3 hoặc 4/g, optionsStr);
}

/**
 * Câu nhắc nhở tương tác giữa giờ đếm ngược (dưới 10s):
 * Đọc tên một người vừa comment và đáp án của họ để tạo hiệu ứng tương tác.
 */
export function getRandomMidCountdownCallout(params?: {
  votes?: UserVote[];
  optionsCount?: number;
}): string {
  const votes = params?.votes || [];

  if (votes.length > 0) {
    // Chọn ngẫu nhiên 1 bạn trong danh sách đã vote (ưu tiên các bạn vote gần đây)
    const recentPool = votes.slice(-6);
    const chosenVote = recentPool[Math.floor(Math.random() * recentPool.length)];
    const cleanName = cleanViewerName(chosenVote.nickname, chosenVote.username);

    const template = midWithNameTracker.pick(MID_CALLOUTS_WITH_NAME);
    return template
      .replace(/\{name\}/g, cleanName)
      .replace(/\{opt\}/g, String(chosenVote.option))
      .replace(/\{totalVotes\}/g, String(votes.length));
  }

  return midEmptyTracker.pick(MID_CALLOUTS_EMPTY);
}

/**
 * Câu công bố đáp án khi hết giờ:
 * - Nếu có người chọn ĐÚNG: Đọc tên người đoán đúng để khen ngợi.
 * - Nếu có người chọn SAI: Đọc tên bạn chọn sai một cách nhẹ nhàng, động viên.
 * - Nếu không ai chọn: Kêu gọi câu sau nhớ comment.
 */
export function getRandomRevealCallout(params: {
  correctAnswer: number;
  votes?: UserVote[];
}): string {
  const { correctAnswer, votes = [] } = params;

  if (votes.length > 0) {
    const correctVoters = votes.filter((v) => v.option === correctAnswer);
    const wrongVoters = votes.filter((v) => v.option !== correctAnswer);

    // 85% ưu tiên đọc tên bạn trả lời đúng (nếu có)
    if (correctVoters.length > 0 && Math.random() < 0.85) {
      const chosen = correctVoters[Math.floor(Math.random() * correctVoters.length)];
      const cleanName = cleanViewerName(chosen.nickname, chosen.username);

      const template = revealCorrectTracker.pick(REVEAL_CALLOUTS_WITH_CORRECT_NAME);
      return template
        .replace(/\{answer\}/g, String(correctAnswer))
        .replace(/\{name\}/g, cleanName)
        .replace(/\{correctCount\}/g, String(correctVoters.length))
        .replace(/\{totalVotes\}/g, String(votes.length));
    }

    // Nếu không ai đúng hoặc 15% nhắc bạn đoán sai để động viên
    if (wrongVoters.length > 0) {
      const chosen = wrongVoters[Math.floor(Math.random() * wrongVoters.length)];
      const cleanName = cleanViewerName(chosen.nickname, chosen.username);

      const template = revealWrongTracker.pick(REVEAL_CALLOUTS_WITH_WRONG_NAME);
      return template
        .replace(/\{answer\}/g, String(correctAnswer))
        .replace(/\{name\}/g, cleanName)
        .replace(/\{wrongOpt\}/g, String(chosen.option));
    }
  }

  // Khi không có ai bình chọn
  const template = revealEmptyTracker.pick(REVEAL_CALLOUTS_EMPTY);
  return template.replace(/\{answer\}/g, String(correctAnswer));
}

/**
 * Câu cảm ơn trực tiếp ngay khi một người vừa gửi bình chọn mới trong phòng live
 */
export function getInstantVoteShoutout(vote: UserVote): string {
  const cleanName = cleanViewerName(vote.nickname, vote.username);
  const shoutouts = [
    `Cảm ơn bạn ${cleanName} đã chốt đáp án ${vote.option}!`,
    `Bạn ${cleanName} vừa chọn số ${vote.option}, rất tự tin!`,
    `Ghi nhận đáp án ${vote.option} từ bạn ${cleanName} nhé!`,
  ];
  return shoutouts[Math.floor(Math.random() * shoutouts.length)];
}

/**
 * Câu chuyển tiếp sang câu mới
 */
export function getRandomTransitionCallout(): string {
  return transitionTracker.pick(TRANSITION_CALLOUTS);
}
