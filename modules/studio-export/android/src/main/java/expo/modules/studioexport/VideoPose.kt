package expo.modules.studioexport

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.media.MediaMetadataRetriever
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * ভিডিও → মানুষের ভঙ্গি (MediaPipe Pose Landmarker, মডেল অ্যাপের ভেতরেই: assets/pose_landmarker_lite.task) এবং "খালি পটভূমি" তৈরি।
 * সব কাজ ফোনের ভেতরে; কোনো নেটওয়ার্ক/ক্লাউড/জেনারেটিভ AI নয়।
 * ভঙ্গি = প্রতি জয়েন্টে (x, y, দৃশ্যমানতা), ৩৩ জয়েন্ট = ৯৯ সংখ্যা — src/lib/mocap.ts এই ফরম্যাট পড়ে।
 */
object VideoPose {
  private const val MODEL = "pose_landmarker_lite.task"
  private const val DET_W = 540

  private fun open(path: String): MediaMetadataRetriever {
    val r = MediaMetadataRetriever(); r.setDataSource(VideoDecoder.cleanPath(path)); return r
  }
  private fun frameAt(r: MediaMetadataRetriever, ms: Long, w: Int): Bitmap? {
    val b = r.getFrameAtTime(ms * 1000, MediaMetadataRetriever.OPTION_CLOSEST) ?: return null
    val h = (b.height.toFloat() * w / b.width).roundToInt()
    val s = if (b.width == w) b else Bitmap.createScaledBitmap(b, w, h, true)
    return if (s.config == Bitmap.Config.ARGB_8888) s else s.copy(Bitmap.Config.ARGB_8888, false)
  }
  private fun landmarker(ctx: Context, mode: RunningMode, poses: Int): PoseLandmarker {
    val o = PoseLandmarker.PoseLandmarkerOptions.builder()
      .setBaseOptions(BaseOptions.builder().setModelAssetPath(MODEL).build())
      .setRunningMode(mode).setNumPoses(poses)
      .setMinPoseDetectionConfidence(0.5f).setMinPosePresenceConfidence(0.5f).setMinTrackingConfidence(0.5f)
      .build()
    return PoseLandmarker.createFromOptions(ctx, o)
  }
  private fun poseJson(l: List<com.google.mediapipe.tasks.components.containers.NormalizedLandmark>, map: (Float, Float) -> Pair<Double, Double>): JSONArray {
    val a = JSONArray()
    for (p in l) {
      val xy = map(p.x(), p.y())
      a.put(Math.round(xy.first * 10000) / 10000.0); a.put(Math.round(xy.second * 10000) / 10000.0)
      a.put(Math.round(p.visibility().orElse(0f) * 100) / 100.0)
    }
    return a
  }

  /**
   * সব ফ্রেমে (fps হারে) সব মানুষের ভঙ্গি। ফল: {w,h,fps,n,frames:[[pose,...],...]}
   * হার্ডওয়্যার ডিকোডারে ক্রমানুসারে ফ্রেম পড়ে (দ্রুত) এবং প্রতি ফ্রেমের পরে সত্যিকারের অগ্রগতি জানায়।
   */
  fun detect(ctx: Context, path: String, fps: Int, maxFrames: Int, progress: (Double, String) -> Unit, cancelled: () -> Boolean): String {
    progress(0.0, "ভিডিও ফাইল খোলা হচ্ছে…")
    val dec = VideoDecoder(ctx, path)
    try {
      val durS = max(0.1, dec.durationUs / 1e6)
      val n = max(1, min(maxFrames, (durS * fps).toInt()))
      val upright = dec.rotation == 90 || dec.rotation == 270
      val sw = if (upright) dec.height else dec.width; val sh = if (upright) dec.width else dec.height
      val dw = DET_W; val dh = max(2, (DET_W.toFloat() * sh / sw).roundToInt())
      val rw = if (upright) dh else dw; val rh = if (upright) dw else dh      // ডিকোড-করা (ঘোরানো-আগের) মাপ
      progress(0.0, "মডেল লোড হচ্ছে (অফলাইন)…")
      val lm = try { landmarker(ctx, RunningMode.VIDEO, 4) } catch (e: Throwable) { throw Exception("অফলাইন পোজ মডেল লোড হয়নি: ${e.message}") }
      val frames = Array(n) { JSONArray() }
      try {
        val pix = IntArray(rw * rh); var next = 0; var base = -1L; var lastMs = -1L; var last = JSONArray(); var seen = 0
        val step = 1_000_000.0 / fps; var t0 = System.currentTimeMillis()
        progress(0.01, "ফ্রেম পড়া ও ভঙ্গি খোঁজা শুরু…")
        dec.run(cancelled) { img, pts ->
          if (base < 0) base = pts
          val rel = pts - base; seen++
          if (rel + step / 2 < next * step) return@run true
          VideoDecoder.toArgb(img, rw, rh, pix)
          var bmp = Bitmap.createBitmap(pix, rw, rh, Bitmap.Config.ARGB_8888)
          if (dec.rotation != 0) { val m = android.graphics.Matrix(); m.postRotate(dec.rotation.toFloat()); bmp = Bitmap.createBitmap(bmp, 0, 0, rw, rh, m, true) }
          var ms = rel / 1000; if (ms <= lastMs) ms = lastMs + 1; lastMs = ms
          val fa = JSONArray()
          val res = lm.detectForVideo(BitmapImageBuilder(bmp).build(), ms)
          for (pose in res.landmarks()) fa.put(poseJson(pose) { x, y -> Pair(x.toDouble(), y.toDouble()) })
          last = fa
          // একই ফ্রেম একাধিক স্লটে পড়লে (ভিডিও কম-fps) একই ফল
          while (next < n && rel + step / 2 >= next * step) { frames[next++] = fa }
          val el = (System.currentTimeMillis() - t0) / 1000.0
          val frac = next.toDouble() / n
          val eta = if (frac > 0.03) (el / frac - el).roundToInt() else -1
          progress(0.01 + 0.98 * frac, "ভঙ্গি খোঁজা: $next/$n ফ্রেম" + (if (eta >= 0) " · বাকি প্রায় ${eta}সে" else ""))
          next < n
        }
        if (seen == 0) throw Exception("ভিডিও থেকে একটিও ফ্রেম পড়া যায়নি")
        while (next < n) frames[next++] = JSONArray()
      } finally { lm.close() }
      progress(1.0, "ভঙ্গি খোঁজা শেষ")
      val arr = JSONArray(); for (f in frames) arr.put(f)
      return JSONObject().put("w", sw).put("h", sh).put("fps", fps).put("n", n).put("frames", arr).toString()
    } finally { dec.close() }
  }

  /** ধরা না-পড়া ফ্রেমের জন্য: ওই ব্যক্তির এলাকা কেটে আলাদাভাবে খোঁজা। requests: [{person,frame,box:[x0,y0,x1,y1]}] */
  fun detectCrops(ctx: Context, path: String, fps: Int, requests: String, progress: (Double, String) -> Unit = { _, _ -> }): String {
    val reqs = JSONArray(requests); val out = JSONArray()
    val r = open(path)
    try {
      val lm = landmarker(ctx, RunningMode.IMAGE, 1)
      try {
        for (q in 0 until reqs.length()) {
          progress(q.toDouble() / reqs.length(), "ফাঁক ভরা: ${q + 1}/${reqs.length()}")
          val o = reqs.getJSONObject(q); val b = o.getJSONArray("box")
          val x0 = b.getDouble(0); val y0 = b.getDouble(1); val x1 = b.getDouble(2); val y1 = b.getDouble(3)
          val full = frameAt(r, o.getInt("frame") * 1000L / fps, 720) ?: continue
          val cx = (x0 * full.width).toInt().coerceIn(0, full.width - 2); val cy = (y0 * full.height).toInt().coerceIn(0, full.height - 2)
          val cw = ((x1 - x0) * full.width).toInt().coerceIn(2, full.width - cx); val ch = ((y1 - y0) * full.height).toInt().coerceIn(2, full.height - cy)
          val crop = Bitmap.createBitmap(full, cx, cy, cw, ch)
          val c = if (crop.config == Bitmap.Config.ARGB_8888) crop else crop.copy(Bitmap.Config.ARGB_8888, false)
          val res = lm.detect(BitmapImageBuilder(c).build())
          if (res.landmarks().isNotEmpty()) {
            val pose = poseJson(res.landmarks()[0]) { x, y -> Pair(x0 + x * (x1 - x0), y0 + y * (y1 - y0)) }
            out.put(JSONObject().put("person", o.getInt("person")).put("frame", o.getInt("frame")).put("pose", pose))
          }
        }
      } finally { lm.close() }
    } finally { r.release() }
    return out.toString()
  }

  /**
   * "খালি পটভূমি": স্থির ক্যামেরার ভিডিওতে প্রতি পিক্সেলে — মানুষ যে ফ্রেমে ছিল না সেগুলোর মধ্যমা (median)।
   * কোথাও মানুষ সবসময় ছিল (ফাঁক) — আশপাশের রং ছড়িয়ে ভরা (সাধারণ ক্লাসিক পদ্ধতি, AI নয়)। ক্যামেরা নড়লে এটা কাজ করে না।
   * tracks: {persons:[[pose|null,...],...]} (বাকি ফ্রেমগুলোর ভঙ্গি, mocap.ts থেকে)। ফল: JPEG ফাইল, উচ্চতা ৭২০।
   */
  fun plate(path: String, fps: Int, tracks: String, outPath: String, progress: (Double, String) -> Unit = { _, _ -> }): String {
    val persons = JSONObject(tracks).getJSONArray("persons"); val n = persons.getJSONArray(0).length()
    val r = open(path)
    try {
      val b0 = frameAt(r, 0, 360) ?: throw Exception("ভিডিওর ফ্রেম পড়া যায়নি")
      val ph = 720; val pw = (ph.toFloat() * b0.width / b0.height).roundToInt()
      val px = pw * ph
      val budget = 48_000_000 / (px * 3)
      val S = max(8, min(40, budget)); val step = max(1, n / S)
      val idx = (0 until n step step).take(S)
      val rgb = Array(idx.size) { ByteArray(px * 3) }; val ok = Array(idx.size) { BooleanArray(px) }
      val mbmp = Bitmap.createBitmap(pw, ph, Bitmap.Config.ARGB_8888); val mc = Canvas(mbmp)
      val line = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; style = Paint.Style.STROKE; strokeCap = Paint.Cap.ROUND }
      val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; style = Paint.Style.FILL }
      val pix = IntArray(px)
      for ((si, i) in idx.withIndex()) {
        progress(si.toDouble() / idx.size * 0.9, "পটভূমি: ফ্রেম ${si + 1}/${idx.size}")
        val raw = frameAt(r, i * 1000L / fps, pw) ?: continue
        val f = Bitmap.createScaledBitmap(raw, pw, ph, true); f.getPixels(pix, 0, pw, 0, 0, pw, ph)
        mbmp.eraseColor(Color.TRANSPARENT)
        for (k in 0 until persons.length()) {
          val p = persons.getJSONArray(k).optJSONArray(i) ?: continue
          fun X(j: Int) = (p.getDouble(j * 3) * pw).toFloat()
          fun Y(j: Int) = (p.getDouble(j * 3 + 1) * ph).toFloat()
          val torso = hypot(((X(11) + X(12)) / 2 - (X(23) + X(24)) / 2).toDouble(), ((Y(11) + Y(12)) / 2 - (Y(23) + Y(24)) / 2).toDouble()).toFloat()
          val w = 0.62f * torso + 18f
          for ((a, b, ww) in listOf(Triple(11, 13, 0.7f), Triple(13, 15, 0.7f), Triple(12, 14, 0.7f), Triple(14, 16, 0.7f), Triple(23, 25, 1f), Triple(25, 27, 1f), Triple(24, 26, 1f), Triple(26, 28, 1f), Triple(11, 23, 1f), Triple(12, 24, 1f), Triple(11, 12, 1f), Triple(23, 24, 1f), Triple(0, 11, 0.7f), Triple(0, 12, 0.7f))) {
            line.strokeWidth = w * ww; mc.drawLine(X(a), Y(a), X(b), Y(b), line)
          }
          mc.drawCircle(X(0), Y(0), 0.5f * torso + 12f, fill)
          val sw = 0.9f * w; val path2 = Path()   // শাড়ি/পোশাকের চওড়া অংশ: কাঁধ থেকে গোড়ালি পর্যন্ত
          val ax = (X(27) + X(28)) / 2; val ay = (Y(27) + Y(28)) / 2
          path2.moveTo(X(11), Y(11)); path2.lineTo(X(12), Y(12)); path2.lineTo(X(24) + sw, Y(24)); path2.lineTo(ax + sw, ay); path2.lineTo(ax - sw, ay); path2.lineTo(X(23) - sw, Y(23)); path2.close()
          mc.drawPath(path2, fill)
        }
        val m = IntArray(px); mbmp.getPixels(m, 0, pw, 0, 0, pw, ph)
        val dst = rgb[si]
        for (q in 0 until px) {
          ok[si][q] = (m[q] ushr 24) < 8
          val c = pix[q]; dst[q * 3] = (c shr 16).toByte(); dst[q * 3 + 1] = (c shr 8).toByte(); dst[q * 3 + 2] = c.toByte()
        }
      }
      val outPix = IntArray(px); val hole = BooleanArray(px); val tmp = IntArray(S)
      for (q in 0 until px) {
        var c = 0; for (si in idx.indices) if (ok[si][q]) c++
        if (c < 4) { hole[q] = true; continue }
        var rr = 0; var gg = 0; var bb = 0
        for (ch in 0 until 3) {
          var t = 0; for (si in idx.indices) if (ok[si][q]) tmp[t++] = rgb[si][q * 3 + ch].toInt() and 0xff
          java.util.Arrays.sort(tmp, 0, t); val v = tmp[t / 2]
          when (ch) { 0 -> rr = v; 1 -> gg = v; else -> bb = v }
        }
        outPix[q] = Color.rgb(rr, gg, bb)
      }
      // ফাঁক ভরা: কিনারা থেকে ভেতরে, চারপাশের গড় রং দিয়ে (সবসময় মানুষ-ঢাকা অংশ)
      var left = hole.count { it }; var guard = 0
      while (left > 0 && guard++ < 400) {
        val fillNow = ArrayList<Int>(); val cols = ArrayList<Int>()
        for (y in 0 until ph) for (x in 0 until pw) {
          val q = y * pw + x; if (!hole[q]) continue
          var c = 0; var r2 = 0; var g2 = 0; var b2 = 0
          for ((dx, dy) in listOf(-1 to 0, 1 to 0, 0 to -1, 0 to 1)) {
            val xx = x + dx; val yy = y + dy
            if (xx < 0 || yy < 0 || xx >= pw || yy >= ph) continue
            val qq = yy * pw + xx; if (hole[qq]) continue
            c++; r2 += Color.red(outPix[qq]); g2 += Color.green(outPix[qq]); b2 += Color.blue(outPix[qq])
          }
          if (c > 0) { fillNow.add(q); cols.add(Color.rgb(r2 / c, g2 / c, b2 / c)) }
        }
        if (fillNow.isEmpty()) break
        for (t in fillNow.indices) { outPix[fillNow[t]] = cols[t]; hole[fillNow[t]] = false }
        left -= fillNow.size
      }
      val outBmp = Bitmap.createBitmap(outPix, pw, ph, Bitmap.Config.ARGB_8888)
      FileOutputStream(File(outPath.removePrefix("file://"))).use { outBmp.compress(Bitmap.CompressFormat.JPEG, 92, it) }
      return JSONObject().put("w", pw).put("h", ph).toString()
    } finally { r.release() }
  }
}
