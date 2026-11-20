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
    val r = MediaMetadataRetriever(); r.setDataSource(path.removePrefix("file://")); return r
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

  // ---- খণ্ড-খণ্ড শনাক্তকরণ: JS প্রতি খণ্ডের পর আসল অগ্রগতি দেখাতে পারে ----
  private class Det(val r: MediaMetadataRetriever, val lm: PoseLandmarker, val fps: Int, val n: Int, val sw: Int, val sh: Int, val dw: Int, val dh: Int)
  private var det: Det? = null

  private fun scaledFrame(r: MediaMetadataRetriever, ms: Long, w: Int, h: Int): Bitmap? {
    val b = (if (android.os.Build.VERSION.SDK_INT >= 27) r.getScaledFrameAtTime(ms * 1000, MediaMetadataRetriever.OPTION_CLOSEST, w, h)
             else r.getFrameAtTime(ms * 1000, MediaMetadataRetriever.OPTION_CLOSEST)) ?: return null
    val s = if (b.width == w && b.height == h) b else Bitmap.createScaledBitmap(b, w, h, true)
    return if (s.config == Bitmap.Config.ARGB_8888) s else s.copy(Bitmap.Config.ARGB_8888, false)
  }

  /** ভিডিও খোলা + মডেল লোড + একটি পরীক্ষামূলক ফ্রেম। কোনো ধাপ ব্যর্থ হলে পরিষ্কার বার্তা সহ Exception। */
  fun detectOpen(ctx: Context, path: String, fps: Int, maxFrames: Int): String {
    detectClose()
    val t0 = System.currentTimeMillis()
    val r = MediaMetadataRetriever()
    try {
      try { r.setDataSource(path.removePrefix("file://")) } catch (e: Throwable) { throw Exception("ভিডিও ফাইল খোলা যায়নি: " + e.message) }
      val durMs = r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: throw Exception("ভিডিওর দৈর্ঘ্য জানা যায়নি")
      val fullW = r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull() ?: throw Exception("এটি ভিডিও ফাইল নয় বা ভিডিও ট্র্যাক নেই")
      val fullH = r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull() ?: throw Exception("ভিডিওর মাপ জানা যায়নি")
      val rot = r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)?.toIntOrNull() ?: 0
      val sw = if (rot == 90 || rot == 270) fullH else fullW; val sh = if (rot == 90 || rot == 270) fullW else fullH
      val dw = DET_W; val dh = max(2, (sh.toFloat() * dw / sw).roundToInt())
      val tFrame0 = System.currentTimeMillis()
      val first = scaledFrame(r, 0, dw, dh) ?: throw Exception("ভিডিওর প্রথম ফ্রেম ডিকোড করা যায়নি (ফোনের ডিকোডার এই ভিডিও পড়তে পারছে না)")
      val frameMs = System.currentTimeMillis() - tFrame0
      val tModel0 = System.currentTimeMillis()
      val lm = try { landmarker(ctx, RunningMode.VIDEO, 4) } catch (e: Throwable) { throw Exception("মডেল লোড হয়নি: " + e.javaClass.simpleName + " " + e.message) }
      val modelMs = System.currentTimeMillis() - tModel0
      val n = max(1, min(maxFrames, (durMs * fps / 1000).toInt()))
      det = Det(r, lm, fps, n, sw, sh, dw, dh)
      first.recycle()
      return JSONObject().put("w", sw).put("h", sh).put("n", n).put("durMs", durMs).put("frameMs", frameMs).put("modelMs", modelMs).put("openMs", System.currentTimeMillis() - t0).toString()
    } catch (e: Throwable) {
      try { r.release() } catch (_: Throwable) {}
      throw if (e is Exception) e else Exception(e.javaClass.simpleName + ": " + e.message)
    }
  }

  /** ফ্রেম [start, start+count) — ফল: {frames:[[pose,...],...], ms}। প্রতিটি ফ্রেম আলাদাভাবে ধরা হয়। */
  fun detectNext(start: Int, count: Int): String {
    val d = det ?: throw Exception("শনাক্তকরণ শুরু হয়নি")
    val t0 = System.currentTimeMillis()
    val frames = JSONArray()
    try {
      for (i in start until min(d.n, start + count)) {
        val ms = i * 1000L / d.fps
        val bmp = scaledFrame(d.r, ms, d.dw, d.dh)
        val fa = JSONArray()
        if (bmp != null) {
          val res = d.lm.detectForVideo(BitmapImageBuilder(bmp).build(), ms)
          for (pose in res.landmarks()) fa.put(poseJson(pose) { x, y -> Pair(x.toDouble(), y.toDouble()) })
          bmp.recycle()
        }
        frames.put(fa)
      }
    } catch (e: Throwable) { throw if (e is Exception) e else Exception(e.javaClass.simpleName + ": " + e.message) }
    return JSONObject().put("frames", frames).put("ms", System.currentTimeMillis() - t0).toString()
  }

  fun detectClose() {
    val d = det; det = null
    if (d != null) { try { d.lm.close() } catch (_: Throwable) {}; try { d.r.release() } catch (_: Throwable) {} }
  }

  /** ধরা না-পড়া ফ্রেমের জন্য: ওই ব্যক্তির এলাকা কেটে আলাদাভাবে খোঁজা। requests: [{person,frame,box:[x0,y0,x1,y1]}] */
  fun detectCrops(ctx: Context, path: String, fps: Int, requests: String): String {
    val reqs = JSONArray(requests); val out = JSONArray()
    val r = try { open(path) } catch (e: Throwable) { throw Exception("ভিডিও খোলা যায়নি: " + e.message) }
    try {
      val lm = landmarker(ctx, RunningMode.IMAGE, 1)
      try {
        for (q in 0 until reqs.length()) {
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
   * তিন ধাপ: plateBegin → plateStep (বারবার, অগ্রগতি দেখানো যায়) → plateFinish। AI নয়, ক্লাসিক পদ্ধতি।
   */
  private class Plate(val r: MediaMetadataRetriever, val fps: Int, val persons: JSONArray, val pw: Int, val ph: Int, val idx: List<Int>) {
    val px = pw * ph
    val rgb = Array(idx.size) { ByteArray(px * 3) }; val ok = Array(idx.size) { BooleanArray(px) }
    val mbmp: Bitmap = Bitmap.createBitmap(pw, ph, Bitmap.Config.ARGB_8888); val mc = Canvas(mbmp)
    val line = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; style = Paint.Style.STROKE; strokeCap = Paint.Cap.ROUND }
    val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; style = Paint.Style.FILL }
    val pix = IntArray(px); val m = IntArray(px)
    var done = 0
  }
  private var plate: Plate? = null

  fun plateBegin(path: String, fps: Int, tracks: String): String {
    plateClose()
    val persons = JSONObject(tracks).getJSONArray("persons"); val n = persons.getJSONArray(0).length()
    val r = try { open(path) } catch (e: Throwable) { throw Exception("ভিডিও খোলা যায়নি: " + e.message) }
    try {
      val rot = r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)?.toIntOrNull() ?: 0
      val fw = r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)!!.toInt(); val fh = r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)!!.toInt()
      val sw = if (rot == 90 || rot == 270) fh else fw; val sh = if (rot == 90 || rot == 270) fw else fh
      val ph = 540; val pw = max(2, (ph.toFloat() * sw / sh).roundToInt())
      val px = pw * ph
      val budget = 40_000_000 / (px * 4)
      val S = max(8, min(30, budget)); val step = max(1, n / S)
      val idx = (0 until n step step).take(S)
      plate = Plate(r, fps, persons, pw, ph, idx)
      return JSONObject().put("w", pw).put("h", ph).put("steps", idx.size).toString()
    } catch (e: Throwable) { try { r.release() } catch (_: Throwable) {}; throw if (e is Exception) e else Exception(e.javaClass.simpleName + ": " + e.message) }
  }

  /** পরের [count]টি নমুনা-ফ্রেম প্রসেস; ফেরত: এ পর্যন্ত শেষ হওয়া সংখ্যা */
  fun plateStep(count: Int): Int {
    val P = plate ?: throw Exception("পটভূমি তৈরি শুরু হয়নি")
    try {
      val end = min(P.idx.size, P.done + count)
      for (si in P.done until end) {
        val i = P.idx[si]
        val raw = scaledFrame(P.r, i * 1000L / P.fps, P.pw, P.ph)
        if (raw != null) {
          raw.getPixels(P.pix, 0, P.pw, 0, 0, P.pw, P.ph); raw.recycle()
          P.mbmp.eraseColor(Color.TRANSPARENT)
          for (k in 0 until P.persons.length()) {
            val p = P.persons.getJSONArray(k).optJSONArray(i) ?: continue
            drawMask(P, p)
          }
          P.mbmp.getPixels(P.m, 0, P.pw, 0, 0, P.pw, P.ph)
          val dst = P.rgb[si]; val okk = P.ok[si]
          for (q in 0 until P.px) {
            okk[q] = (P.m[q] ushr 24) < 8
            val c = P.pix[q]; dst[q * 3] = (c shr 16).toByte(); dst[q * 3 + 1] = (c shr 8).toByte(); dst[q * 3 + 2] = c.toByte()
          }
        }
        P.done = si + 1
      }
      return P.done
    } catch (e: Throwable) { throw if (e is Exception) e else Exception(e.javaClass.simpleName + ": " + e.message) }
  }

  private fun drawMask(P: Plate, p: JSONArray) {
    val pw = P.pw; val ph = P.ph; val mc = P.mc
    fun X(j: Int) = (p.getDouble(j * 3) * pw).toFloat()
    fun Y(j: Int) = (p.getDouble(j * 3 + 1) * ph).toFloat()
    val torso = hypot(((X(11) + X(12)) / 2 - (X(23) + X(24)) / 2).toDouble(), ((Y(11) + Y(12)) / 2 - (Y(23) + Y(24)) / 2).toDouble()).toFloat()
    val w = 0.62f * torso + 14f
    for ((a, b, ww) in listOf(Triple(11, 13, 0.7f), Triple(13, 15, 0.7f), Triple(12, 14, 0.7f), Triple(14, 16, 0.7f), Triple(23, 25, 1f), Triple(25, 27, 1f), Triple(24, 26, 1f), Triple(26, 28, 1f), Triple(11, 23, 1f), Triple(12, 24, 1f), Triple(11, 12, 1f), Triple(23, 24, 1f), Triple(0, 11, 0.7f), Triple(0, 12, 0.7f))) {
      P.line.strokeWidth = w * ww; mc.drawLine(X(a), Y(a), X(b), Y(b), P.line)
    }
    mc.drawCircle(X(0), Y(0), 0.5f * torso + 10f, P.fill)
    val sw = 0.9f * w; val path2 = Path()
    val ax = (X(27) + X(28)) / 2; val ay = (Y(27) + Y(28)) / 2
    path2.moveTo(X(11), Y(11)); path2.lineTo(X(12), Y(12)); path2.lineTo(X(24) + sw, Y(24)); path2.lineTo(ax + sw, ay); path2.lineTo(ax - sw, ay); path2.lineTo(X(23) - sw, Y(23)); path2.close()
    mc.drawPath(path2, P.fill)
  }

  fun plateFinish(outPath: String): String {
    val P = plate ?: throw Exception("পটভূমি তৈরি শুরু হয়নি")
    try {
      val px = P.px; val pw = P.pw; val ph = P.ph; val S = P.idx.size
      val outPix = IntArray(px); val hole = BooleanArray(px); val tmp = IntArray(S)
      for (q in 0 until px) {
        var c = 0; for (si in 0 until S) if (P.ok[si][q]) c++
        if (c < 4) { hole[q] = true; continue }
        var rr = 0; var gg = 0; var bb = 0
        for (ch in 0 until 3) {
          var t = 0; for (si in 0 until S) if (P.ok[si][q]) tmp[t++] = P.rgb[si][q * 3 + ch].toInt() and 0xff
          java.util.Arrays.sort(tmp, 0, t); val v = tmp[t / 2]
          when (ch) { 0 -> rr = v; 1 -> gg = v; else -> bb = v }
        }
        outPix[q] = Color.rgb(rr, gg, bb)
      }
      // ফাঁক ভরা: কিনারা থেকে ভেতরে, ৪ পাশের গড় রং (রিং-রিং, দ্রুত)
      var cur = IntArray(px); var nxt = IntArray(px); var cn = 0; val queued = BooleanArray(px)
      val dx = intArrayOf(-1, 1, 0, 0); val dy = intArrayOf(0, 0, -1, 1)
      fun known(x: Int, y: Int): Boolean = x in 0 until pw && y in 0 until ph && !hole[y * pw + x]
      for (y in 0 until ph) for (x in 0 until pw) {
        val q = y * pw + x; if (!hole[q]) continue
        for (d in 0 until 4) if (known(x + dx[d], y + dy[d])) { cur[cn++] = q; queued[q] = true; break }
      }
      val cols = IntArray(px); var guard = 0
      while (cn > 0 && guard++ < 2000) {
        for (t in 0 until cn) {
          val q = cur[t]; val x = q % pw; val y = q / pw
          var c = 0; var r2 = 0; var g2 = 0; var b2 = 0
          for (d in 0 until 4) { val xx = x + dx[d]; val yy = y + dy[d]; if (known(xx, yy)) { val v = outPix[yy * pw + xx]; c++; r2 += Color.red(v); g2 += Color.green(v); b2 += Color.blue(v) } }
          cols[t] = Color.rgb(r2 / c, g2 / c, b2 / c)
        }
        for (t in 0 until cn) { outPix[cur[t]] = cols[t]; hole[cur[t]] = false }
        var nn = 0
        for (t in 0 until cn) {
          val q = cur[t]; val x = q % pw; val y = q / pw
          for (d in 0 until 4) { val xx = x + dx[d]; val yy = y + dy[d]
            if (xx in 0 until pw && yy in 0 until ph) { val qq = yy * pw + xx; if (hole[qq] && !queued[qq]) { queued[qq] = true; nxt[nn++] = qq } }
          }
        }
        val tmpA = cur; cur = nxt; nxt = tmpA; cn = nn
      }
      val outBmp = Bitmap.createBitmap(outPix, pw, ph, Bitmap.Config.ARGB_8888)
      FileOutputStream(File(outPath.removePrefix("file://"))).use { outBmp.compress(Bitmap.CompressFormat.JPEG, 92, it) }
      return JSONObject().put("w", pw).put("h", ph).toString()
    } catch (e: Throwable) { throw if (e is Exception) e else Exception(e.javaClass.simpleName + ": " + e.message) }
    finally { plateClose() }
  }

  fun plateClose() { val P = plate; plate = null; if (P != null) try { P.r.release() } catch (_: Throwable) {} }
}
