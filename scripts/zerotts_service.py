#!/usr/bin/env python3
"""
ZeroTTS Local Microservice for Vietnamese Driving Exam Live Stream.
Provides high quality, natural Vietnamese neural speech synthesis.
Listens on http://127.0.0.1:5005
"""

import io
import json
import os
import sys
import time
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# Ensure onnx is available
import onnx
import soundfile as sf
from zerotts import ZeroTTS
from zerotts.hub import resolve_model_dir

PORT = int(os.environ.get("ZEROTTS_PORT", 5005))
HOST = os.environ.get("ZEROTTS_HOST", "127.0.0.1")

def patch_onnx_local_frame_decode(model_dir: Path):
    """
    On CPU on macOS / ARM64, onnxruntime does not support INT64 input for ArgMax(13).
    We ensure the 17 Cast nodes feeding ArgMax cast to INT32 instead.
    """
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
            print("[ZeroTTS Service] Applying INT32 ArgMax compatibility patch...")
            onnx.save(model, str(lfd_path))
            print("[ZeroTTS Service] Patch applied successfully.")
    except Exception as e:
        print(f"[ZeroTTS Service] Note on model patch check: {e}")

print(f"[ZeroTTS Service] Initializing ZeroTTS model...")
t0 = time.time()
model_path = resolve_model_dir("zeroweight-ai/ZeroTTS")
patch_onnx_local_frame_decode(model_path)

tts_engine = ZeroTTS.from_pretrained(str(model_path))
print(f"[ZeroTTS Service] ZeroTTS loaded in {time.time() - t0:.2f}s!")
available_voices = tts_engine.list_voices()
print(f"[ZeroTTS Service] Available voices: {available_voices}")


class TTSRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Concise logging
        sys.stderr.write(f"[ZeroTTS] {args[0]} {args[1]}\n")

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            resp = {
                "status": "ready",
                "engine": "ZeroTTS",
                "voices": available_voices,
                "default_voice": "quangminh"
            }
            self.wfile.write(json.dumps(resp).encode("utf-8"))
            return

        if parsed.path == "/synthesize":
            qs = urllib.parse.parse_qs(parsed.query)
            text = (qs.get("text", [""])[0]).strip()
            voice = (qs.get("voice", ["quangminh"])[0]).strip()
            self._handle_synthesis(text, voice)
            return

        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/synthesize":
            content_len = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_len).decode("utf-8")
            try:
                data = json.loads(body)
                text = str(data.get("text", "")).strip()
                voice = str(data.get("voice", "quangminh")).strip()
            except Exception:
                text = ""
                voice = "quangminh"
            self._handle_synthesis(text, voice)
            return

        self.send_response(404)
        self.end_headers()

    def _handle_synthesis(self, text: str, voice: str):
        if not text:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(b'{"error": "Missing text parameter"}')
            return

        # Map aliases or normalize voice name
        voice = voice.replace("zerotts-", "").lower()
        if voice not in available_voices:
            voice = "quangminh"

        try:
            t0 = time.time()
            audio = tts_engine.synthesize(text, voice=voice)
            dt = time.time() - t0
            dur = audio.shape[-1] / tts_engine.sample_rate
            print(f"[ZeroTTS Service] Synthesized '{text[:30]}...' ({voice}) -> {dur:.2f}s audio in {dt:.2f}s")

            # Convert to WAV
            buf = io.BytesIO()
            # audio is shape (1, N) float32 -> write as (N, 1)
            sf.write(buf, audio.T, tts_engine.sample_rate, format="WAV")
            wav_bytes = buf.getvalue()

            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Content-Length", str(len(wav_bytes)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "public, max-age=86400")
            self.end_headers()
            self.wfile.write(wav_bytes)
        except Exception as e:
            print(f"[ZeroTTS Service] Synthesis error: {e}")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))


def main():
    server = HTTPServer((HOST, PORT), TTSRequestHandler)
    print(f"[ZeroTTS Service] Server running on http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[ZeroTTS Service] Stopping server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

