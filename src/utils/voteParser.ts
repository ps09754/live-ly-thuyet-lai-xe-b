/**
 * voteParser.ts
 * Nhận diện đáp án bình chọn thông minh từ comment của người xem TikTok LIVE:
 * - Chuỗi số lặp lại: "1", "11", "111", "11111111", "222", "3333", "4444" -> nhận diện đúng 1, 2, 3, 4
 * - Chuỗi chữ cái lặp lại: "a", "aaa", "b", "bb", "c", "ccc", "d", "dddd" -> 1, 2, 3, 4
 * - Kèm từ đệm tiền tố: "chọn 1", "chọn 111", "đáp án 2", "da 2", "câu 3", "phương án 4", "số 1"
 * - Kèm trợ từ hậu tố: "1 ạ", "111 nhé", "2 nha", "3 đi", "4 nha ad", "1."
 * - Bao bọc bởi emoji / dấu câu: "👍 111 👍", "111...", "---2222---", "(333)"
 * - Bỏ qua comment không liên quan: "chúc bạn thi tốt", "câu 16", "1 và 2", "hello cả nhà"
 */

export function extractChosenOption(rawComment: string | undefined | null, maxOptions: number = 4): number | null {
  if (!rawComment || typeof rawComment !== 'string') return null;

  const text = rawComment.trim().toLowerCase();
  if (!text) return null;

  // Chuẩn hóa bỏ dấu tiếng Việt để đối chiếu prefix/suffix: "chọn", "đáp án", "câu" -> "chon", "dap an", "cau"
  const clean = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

  // 1. Chuỗi thuần số lặp lại: "1", "11", "111", "11111111", "22", "3333", "44444"
  const repeatDigitMatch = text.match(/^([1-4])\1*$/);
  if (repeatDigitMatch) {
    const opt = parseInt(repeatDigitMatch[1], 10);
    if (opt >= 1 && opt <= maxOptions) return opt;
  }

  // 2. Chuỗi thuần chữ lặp lại: "a", "aaa", "aaaa", "b", "bb", "c", "ccc", "d", "dddd"
  const repeatLetterMatch = text.match(/^([a-d])\1*$/);
  if (repeatLetterMatch) {
    const char = repeatLetterMatch[1];
    const opt = char === 'a' ? 1 : char === 'b' ? 2 : char === 'c' ? 3 : 4;
    if (opt >= 1 && opt <= maxOptions) return opt;
  }

  // 3. Có từ khóa tiền tố: "chọn 1", "chọn 111", "đáp án 2", "da 222", "câu 3", "phương án 4", "số 1"
  const prefixMatch = clean.match(
    /(?:chon|dap an|da|cau|phuong an|so|pa)\s*[:=-]?\s*([1-4]|[a-d])\1*(?:\s|$|[.,!?~])/
  );
  if (prefixMatch) {
    const raw = prefixMatch[1];
    let opt = parseInt(raw, 10);
    if (isNaN(opt)) {
      opt = raw === 'a' ? 1 : raw === 'b' ? 2 : raw === 'c' ? 3 : 4;
    }
    if (opt >= 1 && opt <= maxOptions) return opt;
  }

  // 4. Số lặp lại kèm trợ từ / dấu câu phía sau: "1 ạ", "111 nhé", "2 nha", "3 đi", "4 nha ad", "1."
  const suffixMatch = clean.match(
    /^([1-4])\1*\s*(?:a|nha|nhe|di|oi|dung|nhe ad|nha ad|ad)?[.,!?~]*$/
  );
  if (suffixMatch) {
    const opt = parseInt(suffixMatch[1], 10);
    if (opt >= 1 && opt <= maxOptions) return opt;
  }

  // 5. Chữ cái kèm trợ từ phía sau: "a nha", "bb nhe", "c ạ"
  const letterSuffixMatch = clean.match(
    /^([a-d])\1*\s*(?:a|nha|nhe|di|oi|dung|nhe ad|nha ad|ad)?[.,!?~]*$/
  );
  if (letterSuffixMatch) {
    const char = letterSuffixMatch[1];
    const opt = char === 'a' ? 1 : char === 'b' ? 2 : char === 'c' ? 3 : 4;
    if (opt >= 1 && opt <= maxOptions) return opt;
  }

  // 6. Lọc sạch ký tự lạ/emoji, nếu nội dung còn lại toàn bộ là CÙNG 1 SỐ lặp lại:
  // Ví dụ: "👍 111 👍", "111...", "---2222---", "(333)"
  const textWithoutPunct = text.replace(/[\s\p{P}\p{S}]/gu, '');
  const allDigits = text.replace(/[^0-9]/g, '');
  if (allDigits.length > 0 && textWithoutPunct === allDigits) {
    const first = allDigits[0];
    if (allDigits.split('').every((d) => d === first)) {
      const opt = parseInt(first, 10);
      if (opt >= 1 && opt <= maxOptions) return opt;
    }
  }

  return null;
}

