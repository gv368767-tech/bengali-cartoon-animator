package expo.modules.studioexport

import android.content.Context
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaExtractor
import android.media.MediaFormat
import org.json.JSONArray
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder

/** মিউজিক (লুপ) + সংলাপ (সময়মতো) এক ট্র্যাকে মিশিয়ে AAC-তে এনকোড করে। */
object AudioMixer {
  const val RATE = 44100

  class Sample(val data: ByteArray, val ptsUs: Long, val flags: Int)
  class Result(val format: MediaFormat, val samples: List<Sample>)

  private class Wav(val pcm: FloatArray, val rate: Int)

  private fun readWav(path: String): Wav? {
    return try {
      val bytes = File(path.removePrefix("file://")).readBytes()
      if (bytes.size < 44) return null
      val bb = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
      var pos = 12
      var channels = 1; var rate = 22050; var bits = 16; var dataOff = -1; var dataLen = 0
      while (pos + 8 <= bytes.size) {
        val id = String(bytes, pos, 4, Charsets.US_ASCII)
        val len = bb.getInt(pos + 4)
        if (id == "fmt ") {
          channels = bb.getShort(pos + 10).toInt(); rate = bb.getInt(pos + 12); bits = bb.getShort(pos + 22).toInt()
        } else if (id == "data") {
          dataOff = pos + 8
          dataLen = if (len < 0 || dataOff + len > bytes.size) bytes.size - dataOff else len
          break
        }
        pos += 8 + len + (len and 1)
      }
      if (dataOff < 0 || bits != 16 || channels < 1) return null
      val frames = dataLen / (2 * channels)
      val pcm = FloatArray(frames)
      for (i in 0 until frames) {
        var sum = 0f
        for (ch in 0 until channels) sum += bb.getShort(dataOff + (i * channels + ch) * 2) / 32768f
        pcm[i] = sum / channels
      }
      Wav(pcm, rate)
    } catch (e: Exception) { null }
  }

  /** WAV (১৬-বিট) না হলে MP3/AAC/OGG ইত্যাদি অ্যান্ড্রয়েডের নিজস্ব ডিকোডারে PCM বানায় (মনো, ফ্লোট) */
  private fun decodeCodec(path: String): Wav? {
    val ex = MediaExtractor()
    var codec: MediaCodec? = null
    return try {
      ex.setDataSource(path.removePrefix("file://"))
      var track = -1
      var fmt: MediaFormat? = null
      for (i in 0 until ex.trackCount) {
        val f = ex.getTrackFormat(i)
        if (f.getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true) { track = i; fmt = f; break }
      }
      if (track < 0 || fmt == null) return null
      ex.selectTrack(track)
      var rate = fmt.getInteger(MediaFormat.KEY_SAMPLE_RATE)
      var ch = fmt.getInteger(MediaFormat.KEY_CHANNEL_COUNT).coerceAtLeast(1)
      codec = MediaCodec.createDecoderByType(fmt.getString(MediaFormat.KEY_MIME)!!)
      codec.configure(fmt, null, null, 0)
      codec.start()
      val info = MediaCodec.BufferInfo()
      var buf = FloatArray(rate * 30)
      var n = 0
      val cap = 44100 * 60 * 8 // সর্বোচ্চ ৮ মিনিট
      var inDone = false
      var outDone = false
      var spins = 0
      while (!outDone && spins < 5_000_000) {
        spins++
        if (!inDone) {
          val i = codec.dequeueInputBuffer(10_000)
          if (i >= 0) {
            val b = codec.getInputBuffer(i)!!
            val sz = ex.readSampleData(b, 0)
            if (sz < 0) { codec.queueInputBuffer(i, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM); inDone = true }
            else { codec.queueInputBuffer(i, 0, sz, ex.sampleTime, 0); ex.advance() }
          }
        }
        val o = codec.dequeueOutputBuffer(info, 10_000)
        if (o == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
          val nf = codec.outputFormat
          rate = nf.getInteger(MediaFormat.KEY_SAMPLE_RATE); ch = nf.getInteger(MediaFormat.KEY_CHANNEL_COUNT).coerceAtLeast(1)
        } else if (o >= 0) {
          val ob = codec.getOutputBuffer(o)!!
          ob.position(info.offset); ob.limit(info.offset + info.size)
          val sb = ob.order(ByteOrder.LITTLE_ENDIAN).asShortBuffer()
          val frames = sb.remaining() / ch
          if (n + frames > buf.size) buf = buf.copyOf(maxOf(buf.size * 2, n + frames))
          for (f in 0 until frames) {
            var sum = 0f
            for (c in 0 until ch) sum += sb.get(f * ch + c) / 32768f
            buf[n++] = sum / ch
          }
          codec.releaseOutputBuffer(o, false)
          if ((info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0 || n >= cap) outDone = true
        }
      }
      if (n == 0) null else Wav(buf.copyOf(n), rate)
    } catch (e: Exception) { null }
    finally { try { codec?.stop() } catch (_: Exception) {} ; try { codec?.release() } catch (_: Exception) {} ; ex.release() }
  }

  private fun readAny(path: String): Wav? = readWav(path) ?: decodeCodec(path)

  /** ফাইলের দৈর্ঘ্য (ms) ও আওয়াজের ওঠানামা (প্রতি সেকেন্ডে fps টি মান, ০..১) */
  fun analyze(path: String, fps: Int): Pair<Long, FloatArray>? {
    val w = readAny(path) ?: return null
    val durMs = w.pcm.size.toLong() * 1000 / w.rate
    val step = w.rate / fps
    val cnt = (w.pcm.size / step).coerceAtLeast(1)
    val rms = FloatArray(cnt)
    for (i in 0 until cnt) {
      var s = 0.0
      val a = i * step; val b = minOf(w.pcm.size, a + step)
      for (k in a until b) s += (w.pcm[k] * w.pcm[k]).toDouble()
      rms[i] = Math.sqrt(s / maxOf(1, b - a)).toFloat()
    }
    val sorted = rms.sortedArray()
    val ref = maxOf(0.02f, sorted[(sorted.size * 0.95).toInt().coerceAtMost(sorted.size - 1)])
    for (i in rms.indices) rms[i] = (rms[i] / ref).coerceIn(0f, 1f)
    return Pair(durMs, rms)
  }

  private fun mixIn(mix: FloatArray, w: Wav, startSample: Int, vol: Float, maxMs: Long = 0) {
    var outLen = (w.pcm.size.toLong() * RATE / w.rate).toInt()
    if (maxMs > 0) outLen = minOf(outLen, (maxMs * RATE / 1000).toInt())
    for (k in 0 until outLen) {
      val j = startSample + k
      if (j >= mix.size) break
      if (j < 0) continue
      val pos = k.toDouble() * w.rate / RATE
      val a = pos.toInt().coerceAtMost(w.pcm.size - 1)
      val b = (a + 1).coerceAtMost(w.pcm.size - 1)
      val fr = (pos - a).toFloat()
      mix[j] += (w.pcm[a] * (1 - fr) + w.pcm[b] * fr) * vol
    }
  }

  fun build(ctx: Context, totalMs: Long, musicPath: String?, musicVol: Float, voices: JSONArray?, clips: JSONArray?, warn: (String) -> Unit): Result? {
    val total = (totalMs * RATE / 1000).toInt() + RATE / 2
    val mix = FloatArray(total)
    var any = false

    // ব্যাকগ্রাউন্ড মিউজিক (লুপ) — বিল্ট-ইন WAV বা নিজের MP3/WAV
    if (!musicPath.isNullOrEmpty()) {
      val w = readAny(musicPath)
      if (w != null && w.pcm.isNotEmpty()) {
        for (i in 0 until total) {
          val src = (i.toLong() * w.rate / RATE) % w.pcm.size
          mix[i] += w.pcm[src.toInt()] * musicVol
        }
        any = true
      } else warn("music_read_failed")
    }

    // সাউন্ড ইফেক্ট ও ভয়েসওভার ক্লিপ (সময়মতো বসে)
    if (clips != null) {
      var bad = 0
      for (i in 0 until clips.length()) {
        val c = clips.getJSONObject(i)
        val w = readAny(c.getString("path"))
        if (w == null) { bad++; continue }
        mixIn(mix, w, (c.getLong("startMs") * RATE / 1000).toInt(), c.optDouble("vol", 1.0).toFloat(), c.optLong("durMs", 0))
        any = true
      }
      if (bad > 0) warn("clip_read_failed")
    }

    // সংলাপ: তৈরি করা ভয়েস ফাইল থাকলে সেটা, না থাকলে ফোনের বাংলা TTS দিয়ে এখনই বানানো
    if (voices != null && voices.length() > 0) {
      val texts = ArrayList<String>(); val starts = ArrayList<Long>(); val ready = ArrayList<Wav?>()
      val need = ArrayList<Int>()
      for (i in 0 until voices.length()) {
        val v = voices.getJSONObject(i)
        texts.add(v.optString("text", "")); starts.add(v.getLong("startMs"))
        val file = v.optString("file", "")
        val w = if (file.isNotEmpty()) readAny(file) else null
        ready.add(w)
        if (w == null && texts[i].isNotBlank()) need.add(i)
      }
      var placed = 0
      for (i in ready.indices) { val w = ready[i] ?: continue; mixIn(mix, w, (starts[i] * RATE / 1000).toInt(), 1f); placed++ }
      if (need.isNotEmpty()) {
        val files = TtsSynth.synthesize(ctx, need.map { texts[it] }, warn)
        for ((k, f) in files.withIndex()) {
          if (f == null) continue
          val w = readWav(f.absolutePath) ?: continue
          mixIn(mix, w, (starts[need[k]] * RATE / 1000).toInt(), 1f)
          placed++
          f.delete()
        }
      }
      if (placed > 0) any = true else if (need.isNotEmpty()) warn("no_voice_placed")
    }

    if (!any) return null
    // সব অডিও মেশানোর পর ফেটে গেলে (clipping) সামগ্রিক আওয়াজ কমিয়ে আনা
    var peak = 0f
    for (v in mix) { val a = Math.abs(v); if (a > peak) peak = a }
    if (peak > 0.98f) { val k = 0.98f / peak; for (i in mix.indices) mix[i] *= k }
    return encode(mix)
  }

  private fun encode(mix: FloatArray): Result {
    val fmt = MediaFormat.createAudioFormat(MediaFormat.MIMETYPE_AUDIO_AAC, RATE, 1)
    fmt.setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC)
    fmt.setInteger(MediaFormat.KEY_BIT_RATE, 96000)
    fmt.setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, 16384)
    val codec = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_AUDIO_AAC)
    codec.configure(fmt, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
    codec.start()

    val samples = ArrayList<Sample>()
    var outFmt: MediaFormat? = null
    val info = MediaCodec.BufferInfo()
    var pos = 0
    var inputDone = false
    var outputDone = false
    val chunk = 2048
    while (!outputDone) {
      if (!inputDone) {
        val idx = codec.dequeueInputBuffer(10_000)
        if (idx >= 0) {
          val buf = codec.getInputBuffer(idx)!!
          buf.clear()
          val n = minOf(chunk, mix.size - pos)
          if (n <= 0) {
            codec.queueInputBuffer(idx, 0, 0, pos.toLong() * 1_000_000L / RATE, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
            inputDone = true
          } else {
            buf.order(ByteOrder.LITTLE_ENDIAN)
            for (i in 0 until n) {
              val v = (mix[pos + i].coerceIn(-1f, 1f) * 32767f).toInt().toShort()
              buf.putShort(v)
            }
            codec.queueInputBuffer(idx, 0, n * 2, pos.toLong() * 1_000_000L / RATE, 0)
            pos += n
          }
        }
      }
      val out = codec.dequeueOutputBuffer(info, 10_000)
      when {
        out == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> outFmt = codec.outputFormat
        out >= 0 -> {
          val ob = codec.getOutputBuffer(out)!!
          if (info.size > 0 && (info.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG) == 0) {
            val data = ByteArray(info.size)
            ob.position(info.offset); ob.limit(info.offset + info.size)
            ob.get(data)
            samples.add(Sample(data, info.presentationTimeUs, info.flags and MediaCodec.BUFFER_FLAG_KEY_FRAME))
          }
          codec.releaseOutputBuffer(out, false)
          if ((info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) outputDone = true
        }
      }
    }
    codec.stop(); codec.release()
    return Result(outFmt ?: fmt, samples)
  }
}
