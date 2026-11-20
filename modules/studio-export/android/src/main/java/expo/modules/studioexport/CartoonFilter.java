package expo.modules.studioexport;

/**
 * ফ্রেম-থেকে-কার্টুন ফিল্টার (পুরো ছবি, ক্লাসিক কম্পিউটার ভিশন — কোনো AI নয়)।
 * ধাপ: ধার-রক্ষা মসৃণ (৩x৩ bilateral × N) → সময়ভিত্তিক মসৃণ (ঝিলিক কমায়) → রঙের স্তর (posterize)
 *      → রং উজ্জ্বল → কালো রেখা (Sobel)। বিশুদ্ধ Java, Android API ছাড়া, তাই সার্ভারে javac দিয়ে পরীক্ষা করা যায়।
 * ছবি: float RGB [0..1], interleaved, আকার w*h*3।
 */
public final class CartoonFilter {
  public final int w, h;
  public int iterations = 8;
  public float sigma = 0.20f;
  public int levels = 5;
  public float satBoost = 1.35f;
  public float edgeLo = 0.22f, edgeSpan = 0.18f, edgeStrength = 0.8f;
  private float[] prev;            // আগের মসৃণ ফ্রেম
  private final float[] a, b, y, ys, tmp, gx, gy;
  private static final float[] W_LUT = new float[2048];   // exp(-d/σ²) টেবিল
  private static float lutSigma = -1;

  public CartoonFilter(int w, int h) {
    this.w = w; this.h = h;
    int n = w * h;
    a = new float[n * 3]; b = new float[n * 3];
    y = new float[n]; ys = new float[n]; tmp = new float[n]; gx = new float[n]; gy = new float[n];
  }

  public void reset() { prev = null; }

  private static void buildLut(float sigma) {
    if (lutSigma == sigma) return;
    // d = Σ(Δrgb)² ∈ [0,3]
    for (int i = 0; i < W_LUT.length; i++) W_LUT[i] = (float) Math.exp(-(i * 3.0 / (W_LUT.length - 1)) / (sigma * sigma));
    lutSigma = sigma;
  }

  /** in: float RGB; out: 0..255 ARGB int. */
  public void process(float[] in, int[] out) {
    buildLut(sigma);
    System.arraycopy(in, 0, a, 0, in.length);
    float[] src = a, dst = b;
    for (int it = 0; it < iterations; it++) {
      bilateral(src, dst);
      float[] t = src; src = dst; dst = t;
    }
    float[] s = src;                       // মসৃণ ছবি
    int n = w * h;
    if (prev != null) {
      for (int i = 0; i < n; i++) {
        int k = i * 3;
        float d = (Math.abs(s[k] - prev[k]) + Math.abs(s[k + 1] - prev[k + 1]) + Math.abs(s[k + 2] - prev[k + 2])) / 3f;
        float al = 1f - d * 8f; al = al < 0.25f ? 0.25f : (al > 0.75f ? 0.75f : al);
        s[k] = al * prev[k] + (1 - al) * s[k];
        s[k + 1] = al * prev[k + 1] + (1 - al) * s[k + 1];
        s[k + 2] = al * prev[k + 2] + (1 - al) * s[k + 2];
      }
    }
    if (prev == null) prev = new float[s.length];
    System.arraycopy(s, 0, prev, 0, s.length);

    for (int i = 0; i < n; i++) y[i] = 0.299f * s[i * 3] + 0.587f * s[i * 3 + 1] + 0.114f * s[i * 3 + 2];
    gauss(y, ys, 1.6f);
    sobel(ys);
    for (int i = 0; i < n; i++) {
      float yy = y[i];
      float t = yy * levels; float fl = (float) Math.floor(t); float fr = t - fl;
      float k = (fr - 0.5f) * 3f + 0.5f; k = k < 0 ? 0 : (k > 1 ? 1 : k); k = k * k * (3 - 2 * k);
      float yq = (fl + k) / levels;
      float gain = (yq + 0.02f) / (yy + 0.02f);
      float r = s[i * 3] * gain, g = s[i * 3 + 1] * gain, bl = s[i * 3 + 2] * gain;
      float gr = (r + g + bl) / 3f;
      r = clamp(gr + (r - gr) * satBoost); g = clamp(gr + (g - gr) * satBoost); bl = clamp(gr + (bl - gr) * satBoost);
      float m = (float) Math.sqrt(gx[i] * gx[i] + gy[i] * gy[i]);
      float e = (m - edgeLo) / edgeSpan; e = e < 0 ? 0 : (e > 1 ? 1 : e);
      float f = 1f - edgeStrength * e;
      int R = (int) (clamp(r * f) * 255f), G = (int) (clamp(g * f) * 255f), B = (int) (clamp(bl * f) * 255f);
      out[i] = 0xFF000000 | (R << 16) | (G << 8) | B;
    }
  }

  private static float clamp(float v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  private void bilateral(float[] s, float[] d) {
    final int last = W_LUT.length - 1;
    final float scale = last / 3f;
    for (int j = 0; j < h; j++) {
      for (int i = 0; i < w; i++) {
        int c = (j * w + i) * 3;
        float r0 = s[c], g0 = s[c + 1], b0 = s[c + 2];
        float ar = 0, ag = 0, ab = 0, ws = 0;
        for (int dy = -1; dy <= 1; dy++) {
          int jj = j + dy; jj = jj < 0 ? 0 : (jj >= h ? h - 1 : jj);
          for (int dx = -1; dx <= 1; dx++) {
            int ii = i + dx; ii = ii < 0 ? 0 : (ii >= w ? w - 1 : ii);
            int q = (jj * w + ii) * 3;
            float r = s[q], g = s[q + 1], bb = s[q + 2];
            float dr = r - r0, dg = g - g0, db = bb - b0;
            int li = (int) ((dr * dr + dg * dg + db * db) * scale + 0.5f); if (li > last) li = last;
            float wt = W_LUT[li];
            ar += wt * r; ag += wt * g; ab += wt * bb; ws += wt;
          }
        }
        d[c] = ar / ws; d[c + 1] = ag / ws; d[c + 2] = ab / ws;
      }
    }
  }

  private void gauss(float[] s, float[] d, float sg) {
    int rad = 5; float[] k = new float[rad * 2 + 1]; float sum = 0;
    for (int i = -rad; i <= rad; i++) { k[i + rad] = (float) Math.exp(-(i * i) / (2 * sg * sg)); sum += k[i + rad]; }
    for (int i = 0; i < k.length; i++) k[i] /= sum;
    for (int j = 0; j < h; j++) for (int i = 0; i < w; i++) {
      float acc = 0; for (int t = -rad; t <= rad; t++) { int ii = refl(i + t, w); acc += k[t + rad] * s[j * w + ii]; }
      tmp[j * w + i] = acc;
    }
    for (int j = 0; j < h; j++) for (int i = 0; i < w; i++) {
      float acc = 0; for (int t = -rad; t <= rad; t++) { int jj = refl(j + t, h); acc += k[t + rad] * tmp[jj * w + i]; }
      d[j * w + i] = acc;
    }
  }
  private static int refl(int v, int n) { if (v < 0) v = -v; if (v >= n) v = 2 * (n - 1) - v; return v < 0 ? 0 : (v >= n ? n - 1 : v); }

  private void sobel(float[] s) {
    for (int j = 0; j < h; j++) for (int i = 0; i < w; i++) {
      int j0 = refl(j - 1, h), j1 = refl(j + 1, h), i0 = refl(i - 1, w), i1 = refl(i + 1, w);
      float a00 = s[j0 * w + i0], a01 = s[j0 * w + i], a02 = s[j0 * w + i1];
      float a10 = s[j * w + i0], a12 = s[j * w + i1];
      float a20 = s[j1 * w + i0], a21 = s[j1 * w + i], a22 = s[j1 * w + i1];
      gx[j * w + i] = (a02 + 2 * a12 + a22) - (a00 + 2 * a10 + a20);
      gy[j * w + i] = (a20 + 2 * a21 + a22) - (a00 + 2 * a01 + a02);
    }
  }

  /**
   * মানুষ/পটভূমি আলাদা করে বসানো। mask = মানুষের সম্ভাবনা [0..1]।
   * mode: 1 = পটভূমি ঝাপসা-সরল, 2 = কার্টুন আকাশ+মাঠ, 3 = সাদা। (mode 0 = কিছুই বদলায় না)
   */
  public static void compose(int[] toon, float[] mask, int w, int h, int mode, int[] out) {
    int n = w * h;
    if (mode == 0 || mask == null) { System.arraycopy(toon, 0, out, 0, n); return; }
    int[] bg = new int[n];
    if (mode == 1) {
      float[] t = new float[n * 3];
      int rad = 7;
      for (int j = 0; j < h; j++) for (int c = 0; c < 3; c++) {
        float acc = 0; int sh = 16 - 8 * c;
        for (int i = -rad; i <= rad; i++) acc += (toon[j * w + Math.max(0, Math.min(w - 1, i))] >> sh) & 255;
        for (int i = 0; i < w; i++) {
          t[(j * w + i) * 3 + c] = acc / (2 * rad + 1);
          int a = Math.min(w - 1, i + rad + 1), b = Math.max(0, i - rad);
          acc += ((toon[j * w + a] >> sh) & 255) - ((toon[j * w + b] >> sh) & 255);
        }
      }
      for (int i = 0; i < w; i++) for (int c = 0; c < 3; c++) {
        float acc = 0;
        for (int j = -rad; j <= rad; j++) acc += t[(Math.max(0, Math.min(h - 1, j)) * w + i) * 3 + c];
        for (int j = 0; j < h; j++) {
          float v = acc / (2 * rad + 1);
          bg[j * w + i] |= ((int) Math.min(255, v * 0.92f)) << (16 - 8 * c);
          int a = Math.min(h - 1, j + rad + 1), b = Math.max(0, j - rad);
          acc += t[(a * w + i) * 3 + c] - t[(b * w + i) * 3 + c];
        }
      }
    } else if (mode == 2) {
      int hz = (int) (h * 0.62f);
      for (int j = 0; j < h; j++) {
        int col;
        if (j < hz) { float k = j / (float) hz; col = rgb(95 + (int) (120 * k), 175 + (int) (60 * k), 240 + (int) (10 * k)); }
        else { float k = (j - hz) / (float) (h - hz); col = rgb(120 - (int) (45 * k), 200 - (int) (60 * k), 95 - (int) (30 * k)); }
        for (int i = 0; i < w; i++) bg[j * w + i] = 0xFF000000 | col;
      }
    } else {
      java.util.Arrays.fill(bg, 0xFFFFFFFF);
    }
    for (int i = 0; i < n; i++) {
      float m = mask[i]; m = m < 0 ? 0 : (m > 1 ? 1 : m);
      m = m * m * (3 - 2 * m);
      int p = toon[i], q = bg[i];
      int r = (int) (((p >> 16) & 255) * m + ((q >> 16) & 255) * (1 - m));
      int g = (int) (((p >> 8) & 255) * m + ((q >> 8) & 255) * (1 - m));
      int b = (int) ((p & 255) * m + (q & 255) * (1 - m));
      out[i] = 0xFF000000 | (r << 16) | (g << 8) | b;
    }
  }
  private static int rgb(int r, int g, int b) { return (Math.max(0, Math.min(255, r)) << 16) | (Math.max(0, Math.min(255, g)) << 8) | Math.max(0, Math.min(255, b)); }
}
