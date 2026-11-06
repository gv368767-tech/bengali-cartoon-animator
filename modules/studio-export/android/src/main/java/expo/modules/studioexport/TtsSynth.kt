package expo.modules.studioexport

import android.content.Context
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.io.File
import java.util.Locale
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/** ফোনের নিজস্ব (অফলাইন) TTS ইঞ্জিন দিয়ে বাংলা সংলাপ WAV ফাইলে বানায়। */
object TtsSynth {
  fun synthesize(ctx: Context, texts: List<String>, warn: (String) -> Unit): List<File?> {
    val none: List<File?> = texts.map { null }
    var ok = false
    val ready = CountDownLatch(1)
    val tts = TextToSpeech(ctx) { status -> ok = status == TextToSpeech.SUCCESS; ready.countDown() }
    if (!ready.await(10, TimeUnit.SECONDS) || !ok) { warn("tts_init_failed"); tts.shutdown(); return none }

    var set = false
    for (l in listOf(Locale("bn", "BD"), Locale("bn", "IN"), Locale("bn"))) {
      val r = tts.setLanguage(l)
      if (r == TextToSpeech.LANG_AVAILABLE || r == TextToSpeech.LANG_COUNTRY_AVAILABLE || r == TextToSpeech.LANG_COUNTRY_VAR_AVAILABLE) { set = true; break }
    }
    if (!set) { warn("tts_no_bengali"); tts.shutdown(); return none }

    val out = ArrayList<File?>()
    for ((i, text) in texts.withIndex()) {
      val f = File(ctx.cacheDir, "tts_$i.wav")
      if (f.exists()) f.delete()
      val done = CountDownLatch(1)
      var success = false
      tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
        override fun onStart(utteranceId: String?) {}
        override fun onDone(utteranceId: String?) { success = true; done.countDown() }
        @Deprecated("Deprecated in Java")
        override fun onError(utteranceId: String?) { done.countDown() }
        override fun onError(utteranceId: String?, errorCode: Int) { done.countDown() }
      })
      val r = tts.synthesizeToFile(text, Bundle(), f, "u$i")
      if (r != TextToSpeech.SUCCESS) { out.add(null); continue }
      done.await(40, TimeUnit.SECONDS)
      out.add(if (success && f.exists() && f.length() > 1000) f else null)
    }
    tts.shutdown()
    return out
  }

  /** একটি লেখা থেকে একটি WAV ফাইল (ব্যবহারকারীর "ভয়েস তৈরি" বাটন)। সফল হলে ফাইল, না হলে ব্যর্থতার কারণ-কোড। */
  fun synthesizeOne(ctx: Context, text: String, out: File, rate: Float, pitch: Float): String? {
    var ok = false
    val ready = CountDownLatch(1)
    val tts = TextToSpeech(ctx) { status -> ok = status == TextToSpeech.SUCCESS; ready.countDown() }
    if (!ready.await(10, TimeUnit.SECONDS) || !ok) { tts.shutdown(); return "tts_init_failed" }
    var set = false
    for (l in listOf(Locale("bn", "BD"), Locale("bn", "IN"), Locale("bn"))) {
      val r = tts.setLanguage(l)
      if (r == TextToSpeech.LANG_AVAILABLE || r == TextToSpeech.LANG_COUNTRY_AVAILABLE || r == TextToSpeech.LANG_COUNTRY_VAR_AVAILABLE) { set = true; break }
    }
    if (!set) { tts.shutdown(); return "tts_no_bengali" }
    tts.setSpeechRate(rate.coerceIn(0.4f, 2f)); tts.setPitch(pitch.coerceIn(0.5f, 2f))
    out.parentFile?.mkdirs()
    if (out.exists()) out.delete()
    val done = CountDownLatch(1)
    var success = false
    tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
      override fun onStart(utteranceId: String?) {}
      override fun onDone(utteranceId: String?) { success = true; done.countDown() }
      @Deprecated("Deprecated in Java")
      override fun onError(utteranceId: String?) { done.countDown() }
      override fun onError(utteranceId: String?, errorCode: Int) { done.countDown() }
    })
    val r = tts.synthesizeToFile(text, Bundle(), out, "one")
    if (r != TextToSpeech.SUCCESS) { tts.shutdown(); return "tts_failed" }
    done.await(60, TimeUnit.SECONDS)
    tts.shutdown()
    return if (success && out.exists() && out.length() > 1000) null else "tts_failed"
  }
}
