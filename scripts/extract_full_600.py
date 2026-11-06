import fitz
import re
import os
import json

doc = fitz.open('600-cau-hoi-sat-hach.pdf')
os.makedirs('public/data/images', exist_ok=True)

def get_chapter(qid):
    if qid <= 180:
        return "Chương 1: Quy định chung & quy tắc GTĐB"
    elif qid <= 205:
        return "Chương 2: Văn hóa, đạo đức người lái xe & sơ cứu"
    elif qid <= 263:
        return "Chương 3: Kỹ thuật lái xe"
    elif qid <= 300:
        return "Chương 4: Cấu tạo và sửa chữa"
    elif qid <= 485:
        return "Chương 5: Báo hiệu đường bộ"
    else:
        return "Chương 6: Giải thế sa hình & kỹ năng xử lý tình huống"

def extract_all():
    print("=== BẮT ĐẦU TRÍCH XUẤT 600 CÂU HỎI TỪ PDF (EXACT WORD-LEVEL MATCHING) ===")
    
    pages_data = []
    
    for page_idx in range(4, len(doc)):
        page = doc[page_idx]
        pno = page_idx + 1
        
        words = page.get_text('words')
        
        underlines = []
        for d in page.get_drawings():
            r = d['rect']
            if (r.y1 - r.y0) <= 3.8 and (r.x1 - r.x0) >= 12:
                underlines.append(r)
                
        img_infos = page.get_image_info()
        images = []
        for im in img_infos:
            bbox = fitz.Rect(im['bbox'])
            if bbox.width > 30 and bbox.height > 30:
                images.append(bbox)
                
        q_anchors = []
        for i, w in enumerate(words):
            text = w[4]
            if text == 'Câu' and i + 1 < len(words):
                next_w = words[i+1][4]
                m = re.match(r'^(\d+)[\.:]', next_w)
                if m:
                    q_anchors.append({
                        'qid': int(m.group(1)),
                        'word_idx': i,
                        'end_header_idx': i + 2,
                        'bbox': fitz.Rect(w[0], w[1], words[i+1][2], words[i+1][3])
                    })
            else:
                m = re.match(r'^Câu\s*(\d+)[\.:]', text)
                if m:
                    q_anchors.append({
                        'qid': int(m.group(1)),
                        'word_idx': i,
                        'end_header_idx': i + 1,
                        'bbox': fitz.Rect(w[0], w[1], w[2], w[3])
                    })
                    
        q_anchors.sort(key=lambda x: x['qid'])
        
        pages_data.append({
            'page_idx': page_idx,
            'pno': pno,
            'page': page,
            'words': words,
            'underlines': underlines,
            'images': images,
            'q_anchors': q_anchors
        })

    q_map = {}
    for p_info in pages_data:
        for qa in p_info['q_anchors']:
            q_map[qa['qid']] = {
                'p_info': p_info,
                'anchor': qa
            }
            
    print(f"Tổng số mỏ neo câu hỏi tìm thấy: {len(q_map)} / 600")
    
    questions = []
    
    for qid in range(1, 601):
        if qid not in q_map:
            print(f"Lỗi: Không tìm thấy Câu {qid}!")
            continue
            
        cur = q_map[qid]
        p_info = cur['p_info']
        page = p_info['page']
        anchor = cur['anchor']
        
        start_w_idx = anchor['end_header_idx']
        
        idx_in_page = [i for i, qa in enumerate(p_info['q_anchors']) if qa['qid'] == qid][0]
        has_next_on_same_page = (idx_in_page + 1 < len(p_info['q_anchors']))
        
        combined_words_with_page = []
        
        if has_next_on_same_page:
            end_w_idx = p_info['q_anchors'][idx_in_page + 1]['word_idx']
            for w in p_info['words'][start_w_idx:end_w_idx]:
                combined_words_with_page.append((w, p_info))
        else:
            for w in p_info['words'][start_w_idx:]:
                combined_words_with_page.append((w, p_info))
            if qid + 1 in q_map:
                next_cur = q_map[qid + 1]
                next_p_info = next_cur['p_info']
                if next_p_info['page_idx'] > p_info['page_idx']:
                    next_end_w_idx = next_cur['anchor']['word_idx']
                    for w in next_p_info['words'][:next_end_w_idx]:
                        if re.match(r'^\d+$', w[4]) and w[1] < 70:
                            continue
                        if 'CHƯƠNG' in w[4] and w[1] < 80:
                            continue
                        combined_words_with_page.append((w, next_p_info))
                        
        opt_anchors = []
        for idx, (w, p_inf) in enumerate(combined_words_with_page):
            if re.match(r'^[1-4]\.$', w[4]):
                prev_text = combined_words_with_page[idx-1][0][4] if idx > 0 else ''
                if prev_text not in ['Biển', 'biển', 'Ý', 'ý', 'Hướng', 'hướng', 'số', 'Số', 'khoản', 'Khoản', 'điểm', 'Điểm', 'thứ', 'Thứ']:
                    opt_anchors.append({
                        'opt_num': int(w[4][0]),
                        'idx': idx,
                        'word': w,
                        'p_info': p_inf
                    })
                    
        first_opt_idx = opt_anchors[0]['idx'] if opt_anchors else len(combined_words_with_page)
        q_text_words = [w[0][4] for w in combined_words_with_page[:first_opt_idx]]
        question_text = " ".join(q_text_words).strip()
        
        question_text = re.sub(r'^\d+\s+', '', question_text)
        question_text = re.sub(r'CHƯƠNG\s+[IVXLCDM]+\.?\s*[^\n]+', '', question_text).strip()
        
        image_path = None
        matched_img = None
        q_top = anchor['bbox'].y0
        opts_top = opt_anchors[0]['word'][1] if opt_anchors and opt_anchors[0]['p_info']['page_idx'] == p_info['page_idx'] else page.rect.height
        
        for img_rect in p_info['images']:
            center_y = (img_rect.y0 + img_rect.y1) / 2
            if q_top - 10 <= center_y <= opts_top + 30:
                matched_img = img_rect
                break
                
        if matched_img:
            crop_rect = fitz.Rect(
                max(0, matched_img.x0 - 2),
                max(0, matched_img.y0 - 2),
                min(page.rect.width, matched_img.x1 + 2),
                min(page.rect.height, matched_img.y1 + 2)
            )
            pix = page.get_pixmap(clip=crop_rect, dpi=200)
            img_rel_path = f"/data/images/q_{qid}.png"
            img_abs_path = os.path.join(os.getcwd(), 'public', 'data', 'images', f'q_{qid}.png')
            pix.save(img_abs_path)
            image_path = img_rel_path

        # Options
        options = []
        correct_answer = 1
        found_underline = False
        
        for o_idx, oa in enumerate(opt_anchors):
            num = oa['opt_num']
            w_start = oa['idx']
            w_end = opt_anchors[o_idx + 1]['idx'] if o_idx + 1 < len(opt_anchors) else len(combined_words_with_page)
            
            # words belonging to this option (including anchor '1.')
            all_opt_items = combined_words_with_page[w_start:w_end]
            text_items = combined_words_with_page[w_start + 1:w_end]
            o_text = " ".join(item[0][4] for item in text_items).strip()
            
            # Check underline under ANY word in this option
            is_underlined = False
            for item in all_opt_items:
                w_obj = item[0]
                target_p_info = item[1]
                underlines = target_p_info['underlines']
                
                # word bottom: w_obj[3]
                for u in underlines:
                    # underline must be near bottom of word: abs(u.y0 - w_obj[3]) <= 4
                    if abs(u.y0 - w_obj[3]) <= 4.5:
                        overlap = max(0, min(u.x1, w_obj[2]) - max(u.x0, w_obj[0]))
                        if overlap > 0:
                            is_underlined = True
                            break
                if is_underlined:
                    break
                    
            if is_underlined:
                correct_answer = num
                found_underline = True
                
            options.append({
                'id': num,
                'text': o_text
            })
            
        options.sort(key=lambda x: x['id'])
        clean_opts = []
        seen_ids = set()
        for o in options:
            if o['id'] not in seen_ids:
                clean_opts.append(o['text'])
                seen_ids.add(o['id'])
                
        questions.append({
            'id': qid,
            'chapter': get_chapter(qid),
            'question': question_text,
            'image': image_path,
            'options': clean_opts,
            'correctAnswer': correct_answer,
            'foundUnderline': found_underline
        })
        
    print(f"Đã xử lý xong {len(questions)} / 600 câu hỏi!")
    missing_answers = [q['id'] for q in questions if not q['foundUnderline']]
    print(f"Số câu tìm thấy đáp án gạch chân chính xác: {len(questions) - len(missing_answers)} / {len(questions)}")
    if missing_answers:
        print(f"Các câu chưa match gạch chân: {missing_answers} (tổng {len(missing_answers)})")
        
    with open('public/data/questions.json', 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
        
    print("Đã lưu public/data/questions.json thành công!")

extract_all()
