package expo.modules.studioexport

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Rect
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import androidx.core.graphics.PathParser
import org.json.JSONArray
import org.json.JSONObject

/** JS-এর Shape তালিকা (rect/circle/ellipse/line/path/poly/grad) Android Canvas-এ আঁকে। */
object ShapeDrawer {
  private val pathCache = HashMap<String, Path>()
  private val atlasPaths = HashMap<String, String>()
  private val atlasBmp = HashMap<String, Bitmap?>()
  private val imgPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
  fun setAtlases(o: JSONObject) { atlasPaths.clear(); atlasBmp.clear(); for (k in o.keys()) atlasPaths[k] = o.getString(k) }
  private fun atlas(k: String): Bitmap? = atlasBmp.getOrPut(k) { atlasPaths[k]?.let { BitmapFactory.decodeFile(it) } }
  private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
  private val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE; strokeCap = Paint.Cap.ROUND; strokeJoin = Paint.Join.ROUND
  }

  /** CSS-ধাঁচের #rgb, #rrggbb, #rrggbbaa */
  fun parseColor(s: String): Int {
    var h = s.trim()
    if (h.startsWith("#")) {
      h = h.substring(1)
      if (h.length == 3) h = "" + h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
      if (h.length == 6) return (0xFF shl 24) or h.toLong(16).toInt()
      if (h.length == 8) {
        val v = h.toLong(16)
        val rgb = (v shr 8).toInt() and 0xFFFFFF
        val a = (v and 0xFF).toInt()
        return (a shl 24) or rgb
      }
    }
    return Color.parseColor(s)
  }

  private fun fill(color: String, op: Double): Paint {
    fillPaint.shader = null
    fillPaint.color = parseColor(color)
    fillPaint.alpha = (fillPaint.alpha * op).toInt().coerceIn(0, 255)
    return fillPaint
  }

  private fun stroke(color: String, width: Float, op: Double): Paint {
    strokePaint.color = parseColor(color)
    strokePaint.alpha = (strokePaint.alpha * op).toInt().coerceIn(0, 255)
    strokePaint.strokeWidth = width
    return strokePaint
  }

  fun drawAll(c: Canvas, shapes: JSONArray) {
    for (i in 0 until shapes.length()) {
      try { draw(c, shapes.getJSONObject(i)) } catch (e: Exception) { /* একটি আকার ব্যর্থ হলে বাকিগুলো আঁকা চলবে */ }
    }
  }

  private fun draw(c: Canvas, s: JSONObject) {
    val op = s.optDouble("op", 1.0)
    when (s.getString("t")) {
      "img" -> {
        val bmp = atlas(s.getString("k")) ?: return
        val w = s.getDouble("w").toFloat(); val h = s.getDouble("h").toFloat()
        val u = s.getInt("u"); val v = s.getInt("v"); val pw = s.getInt("pw"); val ph = s.getInt("ph")
        imgPaint.alpha = (255 * op).toInt().coerceIn(0, 255)
        c.save()
        c.translate(s.getDouble("e").toFloat(), s.getDouble("f").toFloat())
        c.rotate(s.getDouble("r").toFloat())
        val sc = s.getDouble("s").toFloat(); c.scale(sc, sc)
        val x = s.getDouble("x").toFloat(); val y = s.getDouble("y").toFloat()
        c.drawBitmap(bmp, Rect(u, v, u + pw, v + ph), RectF(x, y, x + w, y + h), imgPaint)
        c.restore()
      }
      "rect" -> {
        val x = s.getDouble("x").toFloat(); val y = s.getDouble("y").toFloat()
        val w = s.getDouble("w").toFloat(); val h = s.getDouble("h").toFloat()
        val r = s.optDouble("r", 0.0).toFloat()
        val p = fill(s.getString("fill"), op)
        if (r > 0f) c.drawRoundRect(RectF(x, y, x + w, y + h), r, r, p) else c.drawRect(x, y, x + w, y + h, p)
      }
      "circle" -> {
        val x = s.getDouble("x").toFloat(); val y = s.getDouble("y").toFloat(); val r = s.getDouble("r").toFloat()
        val f = s.optString("fill", "")
        if (f.isNotEmpty()) c.drawCircle(x, y, r, fill(f, op))
        val st = s.optString("stroke", "")
        if (st.isNotEmpty()) c.drawCircle(x, y, r, stroke(st, s.optDouble("sw", 2.0).toFloat(), op))
      }
      "ellipse" -> {
        val x = s.getDouble("x").toFloat(); val y = s.getDouble("y").toFloat()
        val rx = s.getDouble("rx").toFloat(); val ry = s.getDouble("ry").toFloat()
        c.drawOval(RectF(x - rx, y - ry, x + rx, y + ry), fill(s.getString("fill"), op))
      }
      "line" -> c.drawLine(
        s.getDouble("x1").toFloat(), s.getDouble("y1").toFloat(),
        s.getDouble("x2").toFloat(), s.getDouble("y2").toFloat(),
        stroke(s.getString("color"), s.getDouble("w").toFloat(), op)
      )
      "path" -> {
        val d = s.getString("d")
        if (pathCache.size > 4000) pathCache.clear()
        val path = pathCache.getOrPut(d) { PathParser.createPathFromPathData(d) }
        val f = s.optString("fill", "")
        if (f.isNotEmpty()) c.drawPath(path, fill(f, op))
        val st = s.optString("stroke", "")
        if (st.isNotEmpty()) c.drawPath(path, stroke(st, s.optDouble("sw", 3.0).toFloat(), op))
      }
      "poly" -> {
        val pts = s.getJSONArray("pts")
        val path = Path()
        var i = 0
        while (i + 1 < pts.length()) {
          val x = pts.getDouble(i).toFloat(); val y = pts.getDouble(i + 1).toFloat()
          if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
          i += 2
        }
        path.close()
        c.drawPath(path, fill(s.getString("fill"), op))
      }
      "grad" -> {
        val x = s.getDouble("x").toFloat(); val y = s.getDouble("y").toFloat()
        val w = s.getDouble("w").toFloat(); val h = s.getDouble("h").toFloat()
        val p = Paint(Paint.ANTI_ALIAS_FLAG)
        p.shader = LinearGradient(x, y, x, y + h, parseColor(s.getString("c1")), parseColor(s.getString("c2")), Shader.TileMode.CLAMP)
        c.drawRect(x, y, x + w, y + h, p)
      }
    }
  }
}
