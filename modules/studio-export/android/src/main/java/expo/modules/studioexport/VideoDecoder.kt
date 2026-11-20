package expo.modules.studioexport

import android.content.Context
import android.media.Image
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaExtractor
import android.media.MediaFormat
import android.net.Uri

class CancelledException : Exception("বাতিল করা হয়েছে")

/** ভিডিও ফাইল খোলা + হার্ডওয়্যার ডিকোডারে ক্রমানুসারে ফ্রেম পড়া (MediaMetadataRetriever-এর ফ্রেম-প্রতি-সিক নয়, তাই দ্রুত)। */
class VideoDecoder(ctx: Context, source: String) : AutoCloseable {
  val extractor = MediaExtractor()
  var videoTrack = -1; private set
  lateinit var format: MediaFormat; private set
  lateinit var mime: String; private set
  var width = 0; private set
  var height = 0; private set
  var rotation = 0; private set
  var durationUs = 0L; private set
  var fps = 30; private set

  init {
    try {
      if (source.startsWith("content://")) extractor.setDataSource(ctx, Uri.parse(source), null)
      else extractor.setDataSource(cleanPath(source))
    } catch (e: Exception) {
      extractor.release()
      throw Exception("ভিডিও ফাইল খোলা যায়নি (${e.message ?: e.javaClass.simpleName}) — ফাইলটি আছে কি না ও MP4/MOV কি না দেখুন")
    }
    for (i in 0 until extractor.trackCount) {
      val f = extractor.getTrackFormat(i)
      if ((f.getString(MediaFormat.KEY_MIME) ?: "").startsWith("video/")) { videoTrack = i; format = f; break }
    }
    if (videoTrack < 0) { extractor.release(); throw Exception("এই ফাইলে কোনো ভিডিও ট্র্যাক নেই") }
    mime = format.getString(MediaFormat.KEY_MIME)!!
    width = format.getInteger(MediaFormat.KEY_WIDTH); height = format.getInteger(MediaFormat.KEY_HEIGHT)
    rotation = if (format.containsKey(MediaFormat.KEY_ROTATION)) format.getInteger(MediaFormat.KEY_ROTATION) else 0
    durationUs = if (format.containsKey(MediaFormat.KEY_DURATION)) format.getLong(MediaFormat.KEY_DURATION) else 0L
    fps = if (format.containsKey(MediaFormat.KEY_FRAME_RATE)) format.getInteger(MediaFormat.KEY_FRAME_RATE).coerceIn(1, 120) else 30
  }

  /** ফ্রেম পড়ে onFrame(image, ptsUs) ডাকে; false ফেরালে থামে। কোনো ত্রুটি লুকানো হয় না — Exception হয়ে বেরোয়। */
  fun run(isCancelled: () -> Boolean, onFrame: (Image, Long) -> Boolean) {
    extractor.selectTrack(videoTrack)
    extractor.seekTo(0, MediaExtractor.SEEK_TO_CLOSEST_SYNC)
    // মূল ফরম্যাটের সব তথ্য (csd ইত্যাদি) নিয়েই কনফিগার
    val fmt = format
    fmt.setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Flexible)
    val codec = try { MediaCodec.createDecoderByType(mime) } catch (e: Exception) { throw Exception("এই ফোনে '$mime' ভিডিও ডিকোড করার ডিকোডার নেই") }
    try {
      try { codec.configure(fmt, null, null, 0); codec.start() }
      catch (e: Exception) { throw Exception("ভিডিও ডিকোডার চালু হয়নি ($mime ${width}x$height): ${e.message}") }
      val info = MediaCodec.BufferInfo()
      var inDone = false; var stall = 0
      while (true) {
        if (isCancelled()) throw CancelledException()
        var progressed = false
        if (!inDone) {
          val ii = codec.dequeueInputBuffer(4_000)
          if (ii >= 0) {
            val buf = codec.getInputBuffer(ii)!!
            val sz = extractor.readSampleData(buf, 0)
            if (sz < 0) { codec.queueInputBuffer(ii, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM); inDone = true }
            else { codec.queueInputBuffer(ii, 0, sz, extractor.sampleTime, 0); extractor.advance() }
            progressed = true
          }
        }
        val oi = codec.dequeueOutputBuffer(info, 4_000)
        if (oi >= 0) {
          progressed = true
          val eos = (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0
          var cont = true
          if (info.size > 0) {
            val img = codec.getOutputImage(oi)
            if (img != null) { try { cont = onFrame(img, info.presentationTimeUs) } finally { img.close() } }
          }
          codec.releaseOutputBuffer(oi, false)
          if (eos || !cont) break
        } else if (oi == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED || oi == MediaCodec.INFO_OUTPUT_BUFFERS_CHANGED) progressed = true
        if (progressed) stall = 0 else if (++stall > 3000) throw Exception("ভিডিও ডিকোডার ১২ সেকেন্ড সাড়া দেয়নি (ফাইল নষ্ট বা ফরম্যাট অসমর্থিত হতে পারে)")
      }
    } finally {
      try { codec.stop() } catch (_: Exception) {}
      try { codec.release() } catch (_: Exception) {}
    }
  }

  override fun close() { try { extractor.release() } catch (_: Exception) {} }

  companion object {
    fun cleanPath(p: String): String = if (p.startsWith("file://")) (Uri.parse(p).path ?: p.removePrefix("file://")) else p

    /** ডিকোড করা YUV ছবি → ow×oh ARGB (সরল নমুনা-গড়, ২x২ উজ্জ্বলতা)। */
    fun toArgb(img: Image, ow: Int, oh: Int, out: IntArray) {
      val c = img.cropRect; val sw = c.width(); val sh = c.height()
      val yp = img.planes[0]; val up = img.planes[1]; val vp = img.planes[2]
      val yb = yp.buffer; val ub = up.buffer; val vb = vp.buffer
      val hd = sh >= 720
      val kr = if (hd) 1.793f else 1.596f; val kgu = if (hd) 0.213f else 0.392f; val kgv = if (hd) 0.533f else 0.813f; val kb = if (hd) 2.112f else 2.017f
      for (j in 0 until oh) {
        val sy = c.top + ((j + 0.5f) * sh / oh).toInt().coerceIn(0, sh - 1)
        val sy1 = minOf(sy + 1, c.top + sh - 1)
        for (i in 0 until ow) {
          val sx = c.left + ((i + 0.5f) * sw / ow).toInt().coerceIn(0, sw - 1)
          val sx1 = minOf(sx + 1, c.left + sw - 1)
          val y = ((yb.get(sy * yp.rowStride + sx * yp.pixelStride).toInt() and 255) + (yb.get(sy * yp.rowStride + sx1 * yp.pixelStride).toInt() and 255) +
            (yb.get(sy1 * yp.rowStride + sx * yp.pixelStride).toInt() and 255) + (yb.get(sy1 * yp.rowStride + sx1 * yp.pixelStride).toInt() and 255)) * 0.25f
          val u = (ub.get((sy / 2) * up.rowStride + (sx / 2) * up.pixelStride).toInt() and 255) - 128
          val v = (vb.get((sy / 2) * vp.rowStride + (sx / 2) * vp.pixelStride).toInt() and 255) - 128
          val yy = 1.164f * (y - 16f)
          val r = (yy + kr * v).toInt().coerceIn(0, 255); val g = (yy - kgu * u - kgv * v).toInt().coerceIn(0, 255); val b = (yy + kb * u).toInt().coerceIn(0, 255)
          out[j * ow + i] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
        }
      }
    }
  }
}
