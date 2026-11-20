package expo.modules.studioexport

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Rect
import android.media.Image
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMuxer
import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.nio.ByteBuffer
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * পুরো ভিডিও → কার্টুন ভিডিও (সম্পূর্ণ ফোনের ভেতরে, ক্লাসিক কম্পিউটার ভিশন; কোনো ক্লাউড/জেনারেটিভ AI নয়)।
 * ডিকোড (MediaCodec) → প্রতি ফ্রেমে CartoonFilter → এনকোড (H.264) ; মূল অডিও ট্র্যাক হুবহু (পুনঃ-এনকোড ছাড়া) কপি,
 * একই টাইমস্ট্যাম্প, তাই সিঙ্ক নষ্ট হয় না। ফ্রেম এক এক করে — পুরো ভিডিও কখনও RAM-এ থাকে না।
 */
object VideoCartoon {
  @Volatile var cancelled = false

  fun run(ctx: Context, inPath: String, outPath: String, opts: JSONObject, progress: (Double, String) -> Unit): String {
    cancelled = false
    val t0 = System.currentTimeMillis()
    val warnings = JSONArray()
    val bgMode = opts.optInt("bg", 0)               // 0 সব কার্টুন, 1 ঝাপসা পটভূমি, 2 কার্টুন আকাশ-মাঠ, 3 সাদা
    val workLong = opts.optInt("work", 640).coerceIn(240, 960)
    val maxOutLong = opts.optInt("maxOut", 1280).coerceIn(320, 1920)
    val maxFrames = opts.optInt("maxFrames", 0)     // 0 = সীমা নেই
    progress(0.0, "ভিডিও ফাইল খোলা হচ্ছে…")
    val dec = VideoDecoder(ctx, inPath)
    val out = File(outPath.removePrefix("file://")); out.parentFile?.mkdirs(); if (out.exists()) out.delete()
    var codec: MediaCodec? = null; var muxer: MediaMuxer? = null; var audioEx: MediaExtractor? = null; var seg: Segmenter? = null
    var finished = false
    try {
      // মাপ: কাজের মাপ (ফিল্টার) ও আউটপুট মাপ (মূলের কাছাকাছি, সর্বোচ্চ maxOut)
      val sw = dec.width; val sh = dec.height; val longSide = max(sw, sh)
      val ws = workLong.toFloat() / longSide
      val ww = max(16, (sw * ws).roundToInt()); val wh = max(16, (sh * ws).roundToInt())
      val os = min(1f, maxOutLong.toFloat() / longSide)
      val ow = max(16, ((sw * os).roundToInt()) and 1.inv()); val oh = max(16, ((sh * os).roundToInt()) and 1.inv())
      val srcFps = dec.fps; val outFps = min(30, srcFps)
      progress(0.0, "ভিডিও ${sw}x$sh (${mimeName(dec.mime)}) → আউটপুট ${ow}x$oh")

      // অডিও (AAC হলে সরাসরি কপি)
      var audioFormat: MediaFormat? = null; var audioTrackSrc = -1
      try {
        val ae = MediaExtractor(); setSrc(ae, ctx, inPath)
        for (i in 0 until ae.trackCount) { val f = ae.getTrackFormat(i); if ((f.getString(MediaFormat.KEY_MIME) ?: "") .startsWith("audio/")) { audioTrackSrc = i; audioFormat = f; break } }
        if (audioFormat != null && audioFormat.getString(MediaFormat.KEY_MIME) == "audio/mp4a-latm") { ae.selectTrack(audioTrackSrc); audioEx = ae }
        else { if (audioFormat != null) warnings.put("অডিও AAC নয় (${audioFormat.getString(MediaFormat.KEY_MIME)}), তাই বাদ গেছে"); else warnings.put("ভিডিওতে অডিও নেই"); ae.release(); audioFormat = null }
      } catch (e: Exception) { warnings.put("অডিও পড়া যায়নি: ${e.message}"); audioFormat = null; audioEx = null }

      // এনকোডার ও মাক্সার
      val bitrate = (ow.toLong() * oh * outFps * 0.11).toInt().coerceIn(1_500_000, 14_000_000)
      val fmt = MediaFormat.createVideoFormat(MediaFormat.MIMETYPE_VIDEO_AVC, ow, oh)
      fmt.setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Flexible)
      fmt.setInteger(MediaFormat.KEY_BIT_RATE, bitrate); fmt.setInteger(MediaFormat.KEY_FRAME_RATE, outFps); fmt.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1)
      val enc = try { MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_VIDEO_AVC) } catch (e: Exception) { throw Exception("H.264 এনকোডার পাওয়া যায়নি: ${e.message}") }
      codec = enc
      try { enc.configure(fmt, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE); enc.start() }
      catch (e: Exception) { throw Exception("MP4 এনকোডার চালু হয়নি (${ow}x$oh): ${e.message}") }
      val mux = MediaMuxer(out.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4); muxer = mux
      if (dec.rotation != 0) mux.setOrientationHint(dec.rotation)

      if (bgMode != 0) {
        try { seg = Segmenter(ctx) } catch (e: Throwable) { warnings.put("মানুষ আলাদা করা যায়নি (${e.message}); পুরো ছবি কার্টুন হবে"); seg = null }
      }

      val sg = seg; val af = audioFormat; val aex = audioEx
      val filter = CartoonFilter(ww, wh)
      val workArgb = IntArray(ww * wh); val toon = IntArray(ww * wh); val comp = IntArray(ww * wh)
      val inF = FloatArray(ww * wh * 3)
      val workBmp = Bitmap.createBitmap(ww, wh, Bitmap.Config.ARGB_8888)
      val outBmp = Bitmap.createBitmap(ow, oh, Bitmap.Config.ARGB_8888); val cv = Canvas(outBmp)
      val sp = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
      val dstRect = Rect(0, 0, ow, oh)
      val outPix = IntArray(ow * oh)
      val mask = if (sg != null) FloatArray(ww * wh) else null

      var videoTrack = -1; var audioTrack = -1; var started = false
      val binfo = MediaCodec.BufferInfo()
      var firstPts = -1L; var lastPts = -1L; var frames = 0; var skipped = 0
      val minGap = 1_000_000L / outFps * 9 / 10
      var lastReport = 0L; var audioDone = aex == null
      val abuf = ByteBuffer.allocate(af?.let { if (it.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) it.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE) else 0 }?.coerceAtLeast(65536) ?: 65536)
      val ainfo = MediaCodec.BufferInfo()

      fun writeAudioUpTo(limitUs: Long) {
        val ae = aex ?: return
        while (!audioDone) {
          val t = ae.sampleTime
          if (t < 0) { audioDone = true; break }
          if (t - firstPts > limitUs) break
          val sz = ae.readSampleData(abuf, 0)
          if (sz < 0) { audioDone = true; break }
          val rel = t - firstPts
          if (rel >= 0) { ainfo.set(0, sz, rel, if ((ae.sampleFlags and MediaExtractor.SAMPLE_FLAG_SYNC) != 0) MediaCodec.BUFFER_FLAG_KEY_FRAME else 0); mux.writeSampleData(audioTrack, abuf, ainfo) }
          ae.advance()
        }
      }
      fun drain(eos: Boolean) {
        var idle = 0
        while (true) {
          val oi = enc.dequeueOutputBuffer(binfo, if (eos) 10_000 else 0)
          if (oi == MediaCodec.INFO_TRY_AGAIN_LATER) { if (!eos) return; if (++idle > 500) throw Exception("এনকোডার শেষ হয়নি"); continue }
          if (oi == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
            videoTrack = mux.addTrack(enc.outputFormat)
            if (aex != null && af != null) audioTrack = mux.addTrack(af)
            mux.start(); started = true; continue
          }
          if (oi >= 0) {
            val b = enc.getOutputBuffer(oi)
            if ((binfo.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG) != 0) binfo.size = 0
            if (binfo.size > 0 && started && b != null) {
              b.position(binfo.offset); b.limit(binfo.offset + binfo.size)
              mux.writeSampleData(videoTrack, b, binfo)
              if (audioTrack >= 0) writeAudioUpTo(binfo.presentationTimeUs)
            }
            enc.releaseOutputBuffer(oi, false)
            if ((binfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) return
          }
        }
      }

      val totalUs = max(1L, dec.durationUs)
      progress(0.01, "কার্টুন করা শুরু…")
      dec.run({ cancelled }) { img, pts ->
        if (firstPts < 0) firstPts = pts
        val rel = pts - firstPts
        if (lastPts >= 0 && rel - lastPts < minGap) { skipped++; return@run true }
        lastPts = rel
        VideoDecoder.toArgb(img, ww, wh, workArgb)
        for (i in 0 until ww * wh) { val p = workArgb[i]; inF[i * 3] = ((p shr 16) and 255) / 255f; inF[i * 3 + 1] = ((p shr 8) and 255) / 255f; inF[i * 3 + 2] = (p and 255) / 255f }
        filter.process(inF, toon)
        var frameArgb = toon
        if (sg != null && mask != null) {
          workBmp.setPixels(workArgb, 0, ww, 0, 0, ww, wh)
          sg.maskInto(workBmp, mask, ww, wh)
          CartoonFilter.compose(toon, mask, ww, wh, bgMode, comp); frameArgb = comp
        }
        workBmp.setPixels(frameArgb, 0, ww, 0, 0, ww, wh)
        cv.drawBitmap(workBmp, null, dstRect, sp)
        outBmp.getPixels(outPix, 0, ow, 0, 0, ow, oh)
        var idx: Int
        while (true) { idx = enc.dequeueInputBuffer(10_000); if (idx >= 0) break; drain(false); if (cancelled) throw CancelledException() }
        val ei = enc.getInputImage(idx) ?: throw Exception("এনকোডারের ইনপুট ছবি পাওয়া যায়নি")
        fillYuv(ei, outPix, ow, oh)
        enc.queueInputBuffer(idx, 0, ow * oh * 3 / 2, rel, 0)
        frames++
        drain(false)
        val now = System.currentTimeMillis()
        if (now - lastReport > 250) {
          lastReport = now
          val frac = (rel.toDouble() / totalUs).coerceIn(0.0, 1.0)
          val el = (now - t0) / 1000.0
          val eta = if (frac > 0.02) (el / frac - el).roundToInt() else -1
          progress(0.01 + 0.97 * frac, "ফ্রেম $frames — ${(frac * 100).roundToInt()}%" + (if (eta >= 0) " · বাকি প্রায় ${eta}সে" else ""))
        }
        !(maxFrames > 0 && frames >= maxFrames)
      }
      if (frames == 0) throw Exception("ভিডিও থেকে একটিও ফ্রেম পড়া যায়নি")
      progress(0.98, "MP4 চূড়ান্ত হচ্ছে…")
      var idx: Int
      while (true) { idx = enc.dequeueInputBuffer(10_000); if (idx >= 0) break; drain(false) }
      enc.queueInputBuffer(idx, 0, 0, max(0L, lastPts) + 1_000_000L / outFps, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
      drain(true)
      if (audioTrack >= 0) writeAudioUpTo(Long.MAX_VALUE / 4)
      if (!started) throw IllegalStateException("কোনো ফ্রেম লেখা হয়নি")
      mux.stop(); finished = true
      progress(1.0, "সম্পন্ন")
      return JSONObject().put("path", out.absolutePath).put("w", ow).put("h", oh).put("fps", outFps).put("frames", frames)
        .put("skipped", skipped).put("audio", audioTrack >= 0).put("bgApplied", sg != null && bgMode != 0).put("warnings", warnings)
        .put("ms", System.currentTimeMillis() - t0).put("bytes", out.length()).toString()
    } catch (e: OutOfMemoryError) {
      throw Exception("ফোনের মেমরি কম পড়েছে — ছোট ভিডিও বা কম রেজোলিউশন দিয়ে আবার চেষ্টা করুন")
    } finally {
      try { seg?.close() } catch (_: Throwable) {}
      try { codec?.stop() } catch (_: Exception) {}
      try { codec?.release() } catch (_: Exception) {}
      try { muxer?.release() } catch (_: Exception) {}
      try { audioEx?.release() } catch (_: Exception) {}
      dec.close()
      if (!finished && out.exists()) out.delete()
    }
  }

  private fun mimeName(m: String) = m.removePrefix("video/")
  private fun setSrc(ex: MediaExtractor, ctx: Context, s: String) { if (s.startsWith("content://")) ex.setDataSource(ctx, Uri.parse(s), null) else ex.setDataSource(VideoDecoder.cleanPath(s)) }

  private fun fillYuv(img: Image, pixels: IntArray, w: Int, h: Int) {
    val yp = img.planes[0]; val up = img.planes[1]; val vp = img.planes[2]
    val yb = yp.buffer; val ub = up.buffer; val vb = vp.buffer
    for (j in 0 until h) {
      val row = j * w; val yo = j * yp.rowStride
      for (i in 0 until w) {
        val p = pixels[row + i]
        val r = (p shr 16) and 255; val g = (p shr 8) and 255; val b = p and 255
        yb.put(yo + i * yp.pixelStride, (((66 * r + 129 * g + 25 * b + 128) shr 8) + 16).toByte())
        if ((j and 1) == 0 && (i and 1) == 0) {
          val ci = j / 2; val cj = i / 2
          ub.put(ci * up.rowStride + cj * up.pixelStride, (((-38 * r - 74 * g + 112 * b + 128) shr 8) + 128).toByte())
          vb.put(ci * vp.rowStride + cj * vp.pixelStride, (((112 * r - 94 * g - 18 * b + 128) shr 8) + 128).toByte())
        }
      }
    }
  }
}

/** মানুষের মাস্ক (MediaPipe Pose Landmarker-এর অফলাইন সেগমেন্টেশন) — একই অফলাইন মডেল, নতুন কিছু ডাউনলোড নয়। */
class Segmenter(ctx: Context) : AutoCloseable {
  private val lm: com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
  private var prev: FloatArray? = null
  init {
    val o = com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker.PoseLandmarkerOptions.builder()
      .setBaseOptions(com.google.mediapipe.tasks.core.BaseOptions.builder().setModelAssetPath("pose_landmarker_lite.task").build())
      .setRunningMode(com.google.mediapipe.tasks.vision.core.RunningMode.IMAGE).setNumPoses(4).setOutputSegmentationMasks(true)
      .setMinPoseDetectionConfidence(0.4f).setMinPosePresenceConfidence(0.4f).build()
    lm = com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker.createFromOptions(ctx, o)
  }
  /** mask[w*h] ∈ [0,1] ভরে (সময়ে মসৃণ)। কোনো মানুষ না পেলে আগের মাস্কের ধীরে ফিকে হওয়া। */
  fun maskInto(bmp: Bitmap, mask: FloatArray, w: Int, h: Int) {
    val res = lm.detect(com.google.mediapipe.framework.image.BitmapImageBuilder(bmp).build())
    val cur = FloatArray(w * h)
    val list = res.segmentationMasks().orElse(null)
    if (list != null) for (m in list) {
      val fb = com.google.mediapipe.framework.image.ByteBufferExtractor.extract(m).order(java.nio.ByteOrder.nativeOrder()).asFloatBuffer()
      val mw = m.width; val mh = m.height
      for (j in 0 until h) { val sy = min(mh - 1, j * mh / h); for (i in 0 until w) { val sx = min(mw - 1, i * mw / w); val v = fb.get(sy * mw + sx); if (v > cur[j * w + i]) cur[j * w + i] = v } }
    }
    val p = prev
    for (i in 0 until w * h) mask[i] = if (p == null) cur[i] else 0.5f * p[i] + 0.5f * cur[i]
    prev = mask.copyOf()
  }
  override fun close() { lm.close() }
}
