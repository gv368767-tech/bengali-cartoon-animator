package expo.modules.studioexport

import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import org.json.JSONObject
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * ভিডিওর প্রতিটি ফ্রেমকে "২ডি কার্টুন" রূপ: মসৃণ রং-পটি + গাঢ় রেখা। ক্লাসিক ইমেজ প্রসেসিং — কোনো AI/নেটওয়ার্ক নেই।
 * ঝিলমিল কমাতে: আগের ফ্রেমের মসৃণ রঙের সঙ্গে মেশানো (যেখানে নড়াচড়া কম), এবং স্থির রঙের স্তর।
 */
object Cartoonizer {
  private var r: MediaMetadataRetriever? = null
  private var path: String = ""
  private var pr: IntArray? = null; private var pg: IntArray? = null; private var pb: IntArray? = null

  /** আউটপুট মাপ ও ভিডিও তথ্য: ফল {w,h,srcFps,durMs} (w,h জোড় সংখ্যা, সর্বোচ্চ ১২৮০×৭২০) */
  fun probe(videoPath: String): String {
    val m = MediaMetadataRetriever()
    try {
      try { m.setDataSource(videoPath.removePrefix("file://")) } catch (e: Throwable) { throw Exception("ভিডিও ফাইল খোলা যায়নি: " + e.message) }
      val dur = m.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: throw Exception("ভিডিওর দৈর্ঘ্য জানা যায়নি")
      val fw = m.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull() ?: throw Exception("ভিডিও ট্র্যাক নেই")
      val fh = m.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull() ?: throw Exception("ভিডিওর মাপ জানা যায়নি")
      val rot = m.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)?.toIntOrNull() ?: 0
      val sw = if (rot == 90 || rot == 270) fh else fw; val sh = if (rot == 90 || rot == 270) fw else fh
      val k = min(1f, min(1280f / sw, 1280f / sh)).let { s -> if (sw >= sh) min(s, min(1280f / sw, 720f / sh)) else min(s, min(720f / sw, 1280f / sh)) }
      val ow = max(2, ((sw * k).roundToInt() / 2) * 2); val oh = max(2, ((sh * k).roundToInt() / 2) * 2)
      var fps = 0.0
      if (android.os.Build.VERSION.SDK_INT >= 28) {
        val fc = m.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_FRAME_COUNT)?.toDoubleOrNull()
        if (fc != null && dur > 0) fps = fc * 1000.0 / dur
      }
      if (fps < 5 || fps > 120) fps = 30.0
      return JSONObject().put("w", ow).put("h", oh).put("srcFps", Math.round(fps * 10) / 10.0).put("durMs", dur).toString()
    } finally { try { m.release() } catch (_: Throwable) {} }
  }

  fun reset() { try { r?.release() } catch (_: Throwable) {}; r = null; path = ""; pr = null; pg = null; pb = null }

  /** ফ্রেম [start, start+count) কার্টুন করে সেশনে এনকোড। ফেরত: কত ms লাগল */
  fun frames(videoPath: String, s: ExportSession, start: Int, count: Int, fps: Int, levels: Int): Long {
    val t0 = System.currentTimeMillis()
    try {
      if (r == null || path != videoPath) {
        reset(); val m = MediaMetadataRetriever()
        try { m.setDataSource(videoPath.removePrefix("file://")) } catch (e: Throwable) { throw Exception("ভিডিও ফাইল খোলা যায়নি: " + e.message) }
        r = m; path = videoPath
      }
      val m = r!!; val w = s.width; val h = s.height
      val out = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
      for (i in start until start + count) {
        val us = i * 1_000_000L / fps
        val raw = (if (android.os.Build.VERSION.SDK_INT >= 27) m.getScaledFrameAtTime(us, MediaMetadataRetriever.OPTION_CLOSEST, w, h) else m.getFrameAtTime(us, MediaMetadataRetriever.OPTION_CLOSEST))
          ?: m.getFrameAtTime(us, MediaMetadataRetriever.OPTION_CLOSEST_SYNC) ?: throw Exception("ফ্রেম $i ডিকোড করা যায়নি")
        val src = if (raw.width == w && raw.height == h) raw else Bitmap.createScaledBitmap(raw, w, h, true)
        apply(src, out, levels)
        s.drawBitmap(out)
        if (src !== raw) src.recycle(); raw.recycle()
      }
      out.recycle()
    } catch (e: Throwable) { throw if (e is Exception) e else Exception(e.javaClass.simpleName + ": " + e.message) }
    return System.currentTimeMillis() - t0
  }

  private fun blur(a: IntArray, w: Int, h: Int, rad: Int, tmp: IntArray) {
    val n = 2 * rad + 1
    for (y in 0 until h) {                       // আড়াআড়ি
      val o = y * w; var sum = 0
      for (k in -rad..rad) sum += a[o + min(w - 1, max(0, k))]
      for (x in 0 until w) {
        tmp[o + x] = sum / n
        sum += a[o + min(w - 1, x + rad + 1)] - a[o + max(0, x - rad)]
      }
    }
    for (x in 0 until w) {                       // খাড়াখাড়ি
      var sum = 0
      for (k in -rad..rad) sum += tmp[min(h - 1, max(0, k)) * w + x]
      for (y in 0 until h) {
        a[y * w + x] = sum / n
        sum += tmp[min(h - 1, y + rad + 1) * w + x] - tmp[max(0, y - rad) * w + x]
      }
    }
  }

  private fun apply(src: Bitmap, out: Bitmap, levels: Int) {
    val w = src.width; val h = src.height; val np = w * h
    val px = IntArray(np); src.getPixels(px, 0, w, 0, 0, w, h)
    val r = IntArray(np); val g = IntArray(np); val b = IntArray(np); val tmp = IntArray(np)
    for (i in 0 until np) { val c = px[i]; r[i] = (c shr 16) and 255; g[i] = (c shr 8) and 255; b[i] = c and 255 }
    for (ch in arrayOf(r, g, b)) { blur(ch, w, h, 2, tmp); blur(ch, w, h, 2, tmp) }
    // আগের ফ্রেমের সঙ্গে মেশানো (ঝিলমিল কমানো)
    val ar = pr; val ag = pg; val ab = pb
    if (ar != null && ag != null && ab != null && ar.size == np) {
      for (i in 0 until np) {
        val d = abs(r[i] - ar[i]) + abs(g[i] - ag[i]) + abs(b[i] - ab[i])
        if (d < 36) { r[i] = ar[i] + (r[i] - ar[i]) * 35 / 100; g[i] = ag[i] + (g[i] - ag[i]) * 35 / 100; b[i] = ab[i] + (b[i] - ab[i]) * 35 / 100 }
      }
    }
    pr = r.copyOf(); pg = g.copyOf(); pb = b.copyOf()
    val y = IntArray(np) { (77 * r[it] + 150 * g[it] + 29 * b[it]) shr 8 }
    val lv = levels.coerceIn(3, 12); val stepQ = 255f / (lv - 1)
    val res = IntArray(np)
    for (yy in 0 until h) for (xx in 0 until w) {
      val i = yy * w + xx
      // রেখা: সোবেল (মসৃণ করা উজ্জ্বলতার উপর)
      var edge = false
      if (xx > 0 && yy > 0 && xx < w - 1 && yy < h - 1) {
        val gx = -y[i - w - 1] - 2 * y[i - 1] - y[i + w - 1] + y[i - w + 1] + 2 * y[i + 1] + y[i + w + 1]
        val gy = -y[i - w - 1] - 2 * y[i - w] - y[i - w + 1] + y[i + w - 1] + 2 * y[i + w] + y[i + w + 1]
        edge = abs(gx) + abs(gy) > 90
      }
      if (edge) { res[i] = 0xFF2A2230.toInt(); continue }
      val gray = y[i]
      fun q(c: Int): Int { val v = (gray + (c - gray) * 13 / 10).coerceIn(0, 255); return ((v / stepQ).roundToInt() * stepQ).roundToInt().coerceIn(0, 255) }
      res[i] = (0xFF shl 24) or (q(r[i]) shl 16) or (q(g[i]) shl 8) or q(b[i])
    }
    out.setPixels(res, 0, w, 0, 0, w, h)
  }
}
