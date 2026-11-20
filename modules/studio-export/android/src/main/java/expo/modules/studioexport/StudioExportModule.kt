package expo.modules.studioexport

import android.content.ContentValues
import android.os.Build
import android.provider.MediaStore
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class StudioExportModule : Module() {
  private var session: ExportSession? = null

  private fun context() = appContext.reactContext ?: throw Exception("অ্যাপ কনটেক্সট পাওয়া যায়নি")

  override fun definition() = ModuleDefinition {
    Name("StudioExport")

    AsyncFunction("begin") { config: String ->
      session?.abort()
      val s = ExportSession(JSONObject(config), context().applicationContext)
      val warn = s.start()
      session = s
      warn
    }

    AsyncFunction("setBackground") { key: String, shapes: String ->
      (session ?: throw Exception("এক্সপোর্ট শুরু হয়নি")).setBackground(key, JSONArray(shapes))
    }

    AsyncFunction("setAtlases") { paths: String ->
      ShapeDrawer.setAtlases(JSONObject(paths))
    }

    AsyncFunction("drawFrames") { frames: String ->
      (session ?: throw Exception("এক্সপোর্ট শুরু হয়নি")).drawFrames(JSONArray(frames))
    }

    AsyncFunction("finish") { ->
      val s = session ?: throw Exception("এক্সপোর্ট শুরু হয়নি")
      try { s.finish() } finally { session = null }
    }

    AsyncFunction("cancel") { ->
      session?.abort()
      session = null
      null
    }

    // অডিও ফাইলের দৈর্ঘ্য ও আওয়াজের ওঠানামা (ঠোঁট নড়ানো ও টাইমলাইনের জন্য)
    AsyncFunction("analyzeAudio") { path: String, fps: Int ->
      val r = AudioMixer.analyze(path, fps.coerceIn(5, 60)) ?: throw Exception("এই অডিও ফাইলটি পড়া যায়নি (MP3/WAV/AAC/OGG দিন)")
      mapOf("durationMs" to r.first.toInt(), "envelope" to r.second.map { (Math.round(it * 100f) / 100f).toDouble() })
    }

    // লেখা থেকে বাংলা ভয়েস ফাইল (ফোনের নিজস্ব অফলাইন ইঞ্জিনে)
    AsyncFunction("synthesizeVoice") { text: String, outPath: String, rate: Double, pitch: Double ->
      val f = File(outPath.removePrefix("file://"))
      val err = TtsSynth.synthesizeOne(context().applicationContext, text, f, rate.toFloat(), pitch.toFloat())
      if (err != null) throw Exception(err)
      val a = AudioMixer.analyze(f.absolutePath, 20)
      mapOf("path" to f.absolutePath, "durationMs" to (a?.first ?: 0L).toInt(), "envelope" to (a?.second?.map { (Math.round(it * 100f) / 100f).toDouble() } ?: emptyList<Double>()))
    }

    // ভিডিও → মানুষের ভঙ্গি (অফলাইন MediaPipe), ফাঁক ভরা ও খালি পটভূমি
    AsyncFunction("detectOpen") { path: String, fps: Int, maxFrames: Int ->
      VideoPose.detectOpen(context().applicationContext, path, fps.coerceIn(5, 30), maxFrames.coerceIn(1, 1800))
    }
    AsyncFunction("detectNext") { start: Int, count: Int -> VideoPose.detectNext(start, count.coerceIn(1, 60)) }
    AsyncFunction("detectClose") { -> VideoPose.detectClose(); null }
    AsyncFunction("detectCrops") { path: String, fps: Int, requests: String ->
      try { VideoPose.detectCrops(context().applicationContext, path, fps.coerceIn(5, 30), requests) }
      catch (e: Throwable) { throw if (e is Exception) e else Exception(e.javaClass.simpleName + ": " + e.message) }
    }
    AsyncFunction("profile") { path: String, fps: Int, tracks: String -> VideoPose.profile(path, fps.coerceIn(5, 30), tracks) }
    AsyncFunction("cartoonImage") { inPath: String, outPath: String, levels: Int -> Cartoonizer.image(inPath, outPath, levels.coerceIn(3, 12)) }
    AsyncFunction("plateBegin") { path: String, fps: Int, tracks: String -> VideoPose.plateBegin(path, fps.coerceIn(5, 30), tracks) }
    AsyncFunction("plateStep") { count: Int -> VideoPose.plateStep(count.coerceIn(1, 20)) }
    AsyncFunction("plateFinish") { outPath: String -> VideoPose.plateFinish(outPath) }
    AsyncFunction("plateClose") { -> VideoPose.plateClose(); null }

    // সম্পূর্ণ ভিডিও কার্টুন: প্রতিটি ফ্রেম কার্টুন রূপে (ক্লাসিক ইমেজ প্রসেসিং)
    AsyncFunction("cartoonProbe") { path: String -> Cartoonizer.probe(path) }
    AsyncFunction("cartoonFrames") { path: String, start: Int, count: Int, fps: Int, levels: Int ->
      val s = session ?: throw Exception("এক্সপোর্ট শুরু হয়নি")
      Cartoonizer.frames(path, s, start, count.coerceIn(1, 30), fps.coerceIn(5, 30), levels).toInt()
    }
    AsyncFunction("cartoonReset") { -> Cartoonizer.reset(); null }

    AsyncFunction("saveToGallery") { path: String, name: String ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) throw Exception("পুরোনো অ্যান্ড্রয়েডে 'শেয়ার' ব্যবহার করুন")
      val resolver = context().contentResolver
      val values = ContentValues().apply {
        put(MediaStore.Video.Media.DISPLAY_NAME, name)
        put(MediaStore.Video.Media.MIME_TYPE, "video/mp4")
        put(MediaStore.Video.Media.RELATIVE_PATH, "Movies/BengaliCartoonStudio")
        put(MediaStore.Video.Media.IS_PENDING, 1)
      }
      val uri = resolver.insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values) ?: throw Exception("গ্যালারিতে ফাইল বানানো যায়নি")
      resolver.openOutputStream(uri)!!.use { out -> File(path).inputStream().use { it.copyTo(out) } }
      values.clear()
      values.put(MediaStore.Video.Media.IS_PENDING, 0)
      resolver.update(uri, values, null, null)
      "Movies/BengaliCartoonStudio/$name"
    }
  }
}
