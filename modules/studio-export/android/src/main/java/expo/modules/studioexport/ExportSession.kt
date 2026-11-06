package expo.modules.studioexport

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.media.Image
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.media.MediaMuxer
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.nio.ByteBuffer

/** একটি MP4 এক্সপোর্টের পুরো ধাপ: ফ্রেম আঁকা → H.264 এনকোড → অডিসহ MP4 মাক্সিং। */
class ExportSession(private val cfg: JSONObject, private val ctx: Context) {
  private val w = cfg.getInt("w")
  private val h = cfg.getInt("h")
  private val fps = cfg.getInt("fps")
  private val outFile = File(cfg.getString("out"))
  private val bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
  private val canvas = Canvas(bitmap)
  private val pixels = IntArray(w * h)
  private val backgrounds = HashMap<String, Bitmap>()
  private val textPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; isFakeBoldText = true; textSize = h * 0.046f }
  private val boxPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(185, 0, 0, 0) }

  private var codec: MediaCodec? = null
  private var muxer: MediaMuxer? = null
  private var videoTrack = -1
  private var audioTrack = -1
  private var muxStarted = false
  private var audio: AudioMixer.Result? = null
  private var frameIndex = 0L
  private val warnings = ArrayList<String>()

  fun start(): String {
    outFile.parentFile?.mkdirs()
    if (outFile.exists()) outFile.delete()

    val totalMs = cfg.getLong("totalMs")
    val voices = cfg.optJSONArray("voices")
    val music = cfg.optString("music", "")
    audio = AudioMixer.build(ctx, totalMs, music, cfg.optDouble("musicVol", 0.3).toFloat(), voices, cfg.optJSONArray("clips")) { warnings.add(it) }

    val fmt = MediaFormat.createVideoFormat(MediaFormat.MIMETYPE_VIDEO_AVC, w, h)
    fmt.setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Flexible)
    fmt.setInteger(MediaFormat.KEY_BIT_RATE, cfg.getInt("bitrate"))
    fmt.setInteger(MediaFormat.KEY_FRAME_RATE, fps)
    fmt.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1)
    val c = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_VIDEO_AVC)
    c.configure(fmt, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
    c.start()
    codec = c
    muxer = MediaMuxer(outFile.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
    return warnings.joinToString(",") + (if (audio == null) ",no_audio" else "")
  }

  fun setBackground(key: String, shapes: JSONArray) {
    val bm = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val c = Canvas(bm)
    c.scale(w / 1280f, h / 720f)
    ShapeDrawer.drawAll(c, shapes)
    backgrounds[key]?.recycle()
    backgrounds[key] = bm
  }

  fun drawFrames(frames: JSONArray) {
    for (i in 0 until frames.length()) {
      render(frames.getJSONObject(i))
      encodeCurrent()
    }
  }

  private fun render(f: JSONObject) {
    val bg = backgrounds[f.optString("bg", "")]
    if (bg != null) canvas.drawBitmap(bg, 0f, 0f, null) else canvas.drawColor(Color.WHITE)
    canvas.save()
    canvas.scale(w / 1280f, h / 720f)
    val items = f.getJSONArray("items")
    for (i in 0 until items.length()) {
      val it = items.getJSONObject(i)
      canvas.save()
      canvas.translate(it.getDouble("x").toFloat(), it.getDouble("y").toFloat())
      canvas.rotate(it.optDouble("rot", 0.0).toFloat())
      canvas.scale(it.getDouble("sx").toFloat(), it.getDouble("sy").toFloat())
      val shadow = it.optDouble("shadow", 0.0).toFloat()
      if (shadow > 0f) {
        val p = Paint(Paint.ANTI_ALIAS_FLAG); p.color = Color.argb(56, 0, 0, 0)
        canvas.drawOval(RectF(-shadow, -shadow * 0.18f, shadow, shadow * 0.18f), p)
      }
      ShapeDrawer.drawAll(canvas, it.getJSONArray("shapes"))
      canvas.restore()
    }
    canvas.restore()

    val cap = f.optString("caption", "")
    if (cap.isNotEmpty()) {
      val maxW = (w * 0.86f).toInt()
      val layout = StaticLayout.Builder.obtain(cap, 0, cap.length, textPaint, maxW)
        .setAlignment(Layout.Alignment.ALIGN_CENTER).build()
      val pad = h * 0.02f
      val left = (w - maxW) / 2f
      val top = h - layout.height - pad * 3f
      canvas.drawRoundRect(RectF(left - pad, top - pad, left + maxW + pad, top + layout.height + pad), pad, pad, boxPaint)
      canvas.save(); canvas.translate(left, top); layout.draw(canvas); canvas.restore()
    }
  }

  private fun encodeCurrent() {
    val c = codec ?: throw IllegalStateException("এনকোডার চালু নেই")
    bitmap.getPixels(pixels, 0, w, 0, 0, w, h)
    var idx: Int
    while (true) {
      idx = c.dequeueInputBuffer(10_000)
      if (idx >= 0) break
      drain(false)
    }
    val img = c.getInputImage(idx) ?: throw IllegalStateException("ইনপুট ছবি পাওয়া যায়নি")
    fillImage(img)
    c.queueInputBuffer(idx, 0, w * h * 3 / 2, frameIndex * 1_000_000L / fps, 0)
    frameIndex++
    drain(false)
  }

  private fun fillImage(img: Image) {
    val yp = img.planes[0]; val up = img.planes[1]; val vp = img.planes[2]
    val yb = yp.buffer; val ub = up.buffer; val vb = vp.buffer
    for (j in 0 until h) {
      val row = j * w
      val yo = j * yp.rowStride
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

  private fun startMuxer(videoFormat: MediaFormat) {
    val m = muxer ?: return
    videoTrack = m.addTrack(videoFormat)
    val a = audio
    if (a != null) audioTrack = m.addTrack(a.format)
    m.start()
    muxStarted = true
    if (a != null) {
      val info = MediaCodec.BufferInfo()
      for (s in a.samples) {
        info.set(0, s.data.size, s.ptsUs, s.flags)
        m.writeSampleData(audioTrack, ByteBuffer.wrap(s.data), info)
      }
    }
  }

  private fun drain(eos: Boolean) {
    val c = codec ?: return
    val info = MediaCodec.BufferInfo()
    var idle = 0
    while (true) {
      val out = c.dequeueOutputBuffer(info, if (eos) 10_000 else 0)
      if (out == MediaCodec.INFO_TRY_AGAIN_LATER) {
        if (!eos) return
        if (++idle > 600) return
        continue
      }
      if (out == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) { startMuxer(c.outputFormat); continue }
      if (out >= 0) {
        val buf = c.getOutputBuffer(out)
        if ((info.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG) != 0) info.size = 0
        if (info.size > 0 && muxStarted && buf != null) {
          buf.position(info.offset); buf.limit(info.offset + info.size)
          muxer!!.writeSampleData(videoTrack, buf, info)
        }
        c.releaseOutputBuffer(out, false)
        if ((info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) return
      }
    }
  }

  fun finish(): String {
    val c = codec ?: throw IllegalStateException("এনকোডার চালু নেই")
    var idx: Int
    while (true) {
      idx = c.dequeueInputBuffer(10_000)
      if (idx >= 0) break
      drain(false)
    }
    c.queueInputBuffer(idx, 0, 0, frameIndex * 1_000_000L / fps, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
    drain(true)
    release(true)
    if (!muxStarted) throw IllegalStateException("কোনো ফ্রেম লেখা হয়নি")
    return outFile.absolutePath
  }

  fun abort() { release(false); if (outFile.exists()) outFile.delete() }

  private fun release(finishMux: Boolean) {
    try { codec?.stop() } catch (_: Exception) {}
    try { codec?.release() } catch (_: Exception) {}
    codec = null
    try { if (muxStarted && finishMux) muxer?.stop() } catch (_: Exception) {}
    try { muxer?.release() } catch (_: Exception) {}
    muxer = null
    backgrounds.values.forEach { it.recycle() }
    backgrounds.clear()
  }
}
