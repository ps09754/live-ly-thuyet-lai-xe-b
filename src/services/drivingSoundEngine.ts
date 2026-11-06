// Web Audio API Synthesizer & Edge TTS Audio Player for Driving License Live Stream

class DrivingSoundEngine {
  private audioCtx: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private onCurrentEndCallbacks: Array<() => void> = [];
  private speechListeners: Array<(isSpeaking: boolean) => void> = [];

  public onSpeechStatusChange(cb: (isSpeaking: boolean) => void): () => void {
    this.speechListeners.push(cb);
    cb(this.isSpeaking());
    return () => {
      this.speechListeners = this.speechListeners.filter((l) => l !== cb);
    };
  }

  private notifySpeechStatus(speaking: boolean): void {
    this.speechListeners.forEach((cb) => {
      try {
        cb(speaking);
      } catch {}
    });
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.currentAudio) {
      this.currentAudio.pause();
    }
  }

  // Unlock Web Audio & HTML5 Audio on browser user interaction (bypasses Chrome autoplay restrictions)
  public unlockAudio(): void {
    if (typeof window === 'undefined') return;
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    try {
      const silent = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      silent.play().catch(() => {});
    } catch {
      // ignore
    }
  }

  public isSpeaking(): boolean {
    return this.currentAudio !== null && !this.currentAudio.paused && !this.currentAudio.ended;
  }

  public onCurrentAudioEnd(callback: () => void): void {
    if (!this.isSpeaking()) {
      callback();
      return;
    }
    this.onCurrentEndCallbacks.push(callback);
  }

  private triggerEndCallbacks(): void {
    if (this.onCurrentEndCallbacks.length > 0) {
      const cbs = [...this.onCurrentEndCallbacks];
      this.onCurrentEndCallbacks = [];
      cbs.forEach((cb) => {
        try {
          cb();
        } catch (e) {
          console.warn('[SoundEngine] Callback error:', e);
        }
      });
    }
  }

  // Play natural Vietnamese ZeroTTS / Edge TTS via backend /api/tts with blob object URL
  public playTTS(
    text: string,
    options: {
      rate?: number;
      voiceId?: string;
      questionId?: number;
      voiceGender?: 'male' | 'female';
      volume?: number;
      onStart?: () => void;
      onEnd?: () => void;
    } = {}
  ): () => void {
    const { rate = 1.0, voiceId = 'zerotts-quangminh', questionId, volume = 1.0, onStart, onEnd } = options;

    if (this.isMuted) {
      onEnd?.();
      return () => {};
    }

    this.stopTTS();

    let isCancelled = false;
    let objectUrlToRevoke: string | null = null;
    const abortController = new AbortController();

    const cleanText = text.replace(/[*_#`]/g, '').trim();
    const qidParam = questionId ? `&qid=${questionId}` : '';
    const ttsUrl = `/api/tts?text=${encodeURIComponent(cleanText)}&rate=${rate}&voice=${encodeURIComponent(voiceId)}${qidParam}`;

    // Ensure audio context is active
    this.getAudioContext();

    fetch(ttsUrl, { signal: abortController.signal })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`TTS server responded with ${res.status}`);
        }
        return res.blob();
      })
      .then((blob) => {
        if (isCancelled) return;

        const objectUrl = URL.createObjectURL(blob);
        objectUrlToRevoke = objectUrl;

        const audio = new Audio(objectUrl);
        audio.volume = Math.max(0, Math.min(1, volume));
        this.currentAudio = audio;

        audio.onplay = () => {
          this.notifySpeechStatus(true);
          if (!isCancelled) onStart?.();
        };

        audio.onended = () => {
          this.notifySpeechStatus(false);
          if (objectUrlToRevoke) {
            URL.revokeObjectURL(objectUrlToRevoke);
            objectUrlToRevoke = null;
          }
          if (!isCancelled) {
            this.currentAudio = null;
            onEnd?.();
            this.triggerEndCallbacks();
          }
        };

        audio.onerror = () => {
          this.notifySpeechStatus(false);
          if (objectUrlToRevoke) {
            URL.revokeObjectURL(objectUrlToRevoke);
            objectUrlToRevoke = null;
          }
          if (isCancelled) return;
          console.warn('[SoundEngine] Audio element decode error');
          this.currentAudio = null;
          onEnd?.();
          this.triggerEndCallbacks();
        };

        // Ensure audio context and element are unlocked
        this.unlockAudio();
        return audio.play().catch((playErr) => {
          if (isCancelled) return;
          console.warn('[SoundEngine] audio.play() rejected, attempting unlock & fallback:', playErr);
          this.unlockAudio();
          audio.play().catch(() => {
            if (!isCancelled) {
              this.fallbackBrowserTTS(cleanText, rate, onStart, onEnd);
            }
          });
        });
      })
      .catch((err) => {
        if (isCancelled || err?.name === 'AbortError') return;
        console.warn('[SoundEngine] TTS fetch/play error:', err);
        this.currentAudio = null;
        onEnd?.();
        this.triggerEndCallbacks();
      });

    return () => {
      isCancelled = true;
      try {
        abortController.abort();
      } catch {
        // ignore
      }
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio = null;
        this.notifySpeechStatus(false);
      }
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
        objectUrlToRevoke = null;
      }
    };
  }

  // Pre-fetch next question audio in the background so it plays with 0ms latency
  public prefetchTTS(text: string, voiceId?: string, questionId?: number): void {
    if (typeof window === 'undefined') return;
    const cleanText = text.replace(/[*_#`]/g, '').trim();
    const voiceParam = voiceId || 'zerotts-quangminh';
    const qidParam = questionId ? `&qid=${questionId}` : '';
    const url = `/api/tts?text=${encodeURIComponent(cleanText)}&voice=${encodeURIComponent(voiceParam)}${qidParam}`;
    fetch(url).catch(() => {});
  }

  private fallbackBrowserTTS(
    text: string,
    rate: number,
    onStart?: () => void,
    onEnd?: () => void
  ) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = rate;
    utterance.onstart = () => onStart?.();
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();

    // Try finding Vietnamese voice
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find((v) => v.lang.startsWith('vi'));
    if (viVoice) utterance.voice = viVoice;

    window.speechSynthesis.speak(utterance);
  }

  public stopTTS() {
    this.onCurrentEndCallbacks = [];
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {
        // ignore
      }
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  // --- Web Audio Synthesized Sound Effects ---

  // Subtle countdown tick
  public playTick() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  // Urgent warning tick (last 5s)
  public playWarningTick() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.07);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  // Time is up buzzer / gong
  public playTimeUp() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Bell / Gong chime
    [523.25, 659.25, 783.99].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.85);
    });
  }

  // Correct answer fanfare (major chord victory chime)
  public playCorrectFanfare() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { f: 523.25, t: 0, d: 0.15 }, // C5
      { f: 659.25, t: 0.12, d: 0.15 }, // E5
      { f: 783.99, t: 0.24, d: 0.2 }, // G5
      { f: 1046.5, t: 0.38, d: 0.6 }, // C6
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.f, now + note.t);

      gain.gain.setValueAtTime(0.15, now + note.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.t);
      osc.stop(now + note.t + note.d + 0.05);
    });
  }

  // Alias for backward compatibility
  public playCorrectDing() {
    this.playCorrectFanfare();
  }

  // Soft vote pop sound when a comment vote arrives
  public playVotePop() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  }
}

export const drivingSoundEngine = new DrivingSoundEngine();

