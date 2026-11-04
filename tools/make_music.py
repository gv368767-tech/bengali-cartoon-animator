# অফলাইনে নিজস্ব সুর তৈরি (কপিরাইটমুক্ত): ২২০৫০ Hz, মোনো, ১৬-বিট WAV
import math, random, struct, wave, sys
SR = 22050
def note(freq, dur, vol=0.3, kind="soft"):
    n = int(SR * dur); out = []
    for i in range(n):
        t = i / SR
        env = min(1, t / 0.01) * math.exp(-t * (3.5 if kind == "soft" else 6))
        if i > n - 400: env *= (n - i) / 400
        s = math.sin(2 * math.pi * freq * t) + 0.35 * math.sin(4 * math.pi * freq * t) + 0.15 * math.sin(6 * math.pi * freq * t)
        out.append(vol * env * s)
    return out
def hat(vol=0.05):
    return [vol * (random.random() * 2 - 1) * math.exp(-i / (SR * 0.02)) for i in range(int(SR * 0.06))]
def mix(buf, samples, at):
    for i, v in enumerate(samples):
        j = at + i
        if j < len(buf): buf[j] += v
def hz(m): return 440 * 2 ** ((m - 69) / 12)
def track(name, bpm, scale, melody_seed, bars, bass_pat, drums):
    random.seed(melody_seed)
    beat = 60 / bpm; total = int(SR * beat * 4 * bars) + int(SR * 0.4)
    buf = [0.0] * total
    root = 60
    for b in range(bars * 8):                       # অষ্টমাংশ নোট
        at = int(SR * beat * 0.5 * b)
        if random.random() < 0.72:
            m = root + 12 + random.choice(scale) + (12 if random.random() < 0.2 else 0)
            mix(buf, note(hz(m), beat * random.choice([0.5, 0.5, 1.0]), 0.22), at)
        if b % 4 == 0:
            deg = bass_pat[(b // 4) % len(bass_pat)]
            mix(buf, note(hz(root - 12 + deg), beat * 1.8, 0.28, "soft"), at)
        if drums and b % 2 == 1: mix(buf, hat(0.05), at)
        if drums and b % 4 == 0: mix(buf, note(60, 0.12, 0.35, "hard"), at)
    peak = max(abs(v) for v in buf) or 1
    with wave.open(f"assets/music/{name}.wav", "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, v / peak * 0.85)) * 32767)) for v in buf))
track("happy", 120, [0, 2, 4, 7, 9], 11, 12, [0, 7, 9, 5], True)
track("calm", 72, [0, 2, 4, 7, 9], 5, 8, [0, 5, 7, 4], False)
track("adventure", 132, [0, 2, 3, 7, 8], 23, 12, [0, 0, 3, 5], True)
