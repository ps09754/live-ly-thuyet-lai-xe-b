#!/usr/bin/env python3
"""
Pre-generate audio cache for driving exam questions using ZeroTTS.
Skips any questions that have already been generated.
Usage:
  python3 scripts/cache_questions.py --voice quangminh --limit 50
  python3 scripts/cache_questions.py --voice quangminh --all
"""

import argparse
import io
import json
import os
import sys
import time
from pathlib import Path

import onnx
import soundfile as sf
from zerotts import ZeroTTS
from zerotts.hub import resolve_model_dir

ROOT_DIR = Path(__file__).resolve().parent.parent
QUESTIONS_PATH = ROOT_DIR / "public" / "data" / "questions.json"
CACHE_DIR = ROOT_DIR / "public" / "data" / "audio_cache"

def patch_onnx_local_frame_decode(model_dir: Path):
    lfd_path = model_dir / "onnx" / "local_frame_decode.onnx"
    if not lfd_path.exists():
        return
    try:
        model = onnx.load(str(lfd_path))
        argmax_inputs = {n.input[0] for n in model.graph.node if "ArgMax" in n.op_type}
        changed = False
        for node in model.graph.node:
            if node.op_type == "Cast" and node.output[0] in argmax_inputs:
                for attr in node.attribute:
                    if attr.name == "to" and attr.i == onnx.TensorProto.INT64:
                        attr.i = int(onnx.TensorProto.INT32)
                        changed = True
        if changed:
            onnx.save(model, str(lfd_path))
    except Exception as e:
        print(f"Patch notice: {e}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--voice", default="quangminh", help="ZeroTTS voice name")
    parser.add_argument("--limit", type=int, default=30, help="Number of questions to generate")
    parser.add_argument("--start", type=int, default=1, help="Start question id (1-600)")
    parser.add_argument("--all", action="store_true", help="Generate all questions")
    args = parser.parse_args()

    voice = args.voice.replace("zerotts-", "").lower()
    voice_dir = CACHE_DIR / f"zerotts-{voice}"
    voice_dir.mkdir(parents=True, exist_ok=True)

    with open(QUESTIONS_PATH, "r", encoding="utf-8") as f:
        questions = json.load(f)

    print(f"Loaded {len(questions)} questions from {QUESTIONS_PATH}")

    model_dir = resolve_model_dir("zeroweight-ai/ZeroTTS")
    patch_onnx_local_frame_decode(model_dir)
    print("Loading ZeroTTS model...")
    tts = ZeroTTS.from_pretrained(str(model_dir))
    print(f"ZeroTTS ready. Caching voice: {voice}")

    count = 0
    start_q = args.start
    limit = len(questions) if args.all else args.limit

    for q in questions:
        qid = q["id"]
        if qid < start_q:
            continue
        if count >= limit:
            break

        out_path = voice_dir / f"q_{qid}.wav"
        if out_path.exists() and out_path.stat().st_size > 1000:
            # Already exists
            continue

        text = f"Câu {qid}. {q['question']}"
        t0 = time.time()
        try:
            audio = tts.synthesize(text, voice=voice)
            dt = time.time() - t0
            sf.write(str(out_path), audio.T, tts.sample_rate, format="WAV")
            count += 1
            print(f"[{count}/{limit}] Cached q_{qid}.wav ({audio.shape[-1]/tts.sample_rate:.1f}s audio in {dt:.1f}s)")
        except Exception as e:
            print(f"Error caching q_{qid}: {e}")

    print(f"Done! Cached {count} questions in {voice_dir}")

if __name__ == "__main__":
    main()

