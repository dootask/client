package expo.modules.mentioninput

import android.text.Editable
import android.text.Spanned
import android.text.TextWatcher
import android.text.style.ClickableSpan
import android.view.View
import android.widget.EditText
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Collections
import java.util.WeakHashMap

/**
 * 输入框退格删到 @ 提及时整段删除。
 *
 * 提及在输入框里是 role="link" 的 Text 片段，排版后带 ClickableSpan。
 * 输入框获得焦点时挂上监听：纯删除碰到提及，在同一次修改里把提及剩下的部分一起删掉，
 * 画面不会出现只删了一个字的中间状态。
 */
class DooTaskMentionInputModule : Module() {
  private val observedRoots = Collections.newSetFromMap(WeakHashMap<View, Boolean>())
  private val watchedInputs = Collections.newSetFromMap(WeakHashMap<EditText, Boolean>())

  override fun definition() = ModuleDefinition {
    Name("DooTaskMentionInput")

    OnActivityEntersForeground {
      val root = appContext.currentActivity?.window?.decorView ?: return@OnActivityEntersForeground
      if (!observedRoots.add(root)) return@OnActivityEntersForeground
      root.viewTreeObserver.addOnGlobalFocusChangeListener { _, focused ->
        if (focused is EditText && watchedInputs.add(focused)) focused.addTextChangedListener(MentionDeletionWatcher())
      }
    }
  }
}

private class MentionDeletionWatcher : TextWatcher {
  private var touched: List<ClickableSpan> = emptyList()

  override fun beforeTextChanged(s: CharSequence, start: Int, count: Int, after: Int) {
    val end = start + count
    touched = if (after == 0 && count > 0 && s is Spanned) {
      s.getSpans(start, end, ClickableSpan::class.java).filter { s.getSpanStart(it) < end && s.getSpanEnd(it) > start }
    } else {
      emptyList()
    }
  }

  override fun onTextChanged(s: CharSequence, start: Int, before: Int, count: Int) = Unit

  override fun afterTextChanged(s: Editable) {
    val spans = touched
    touched = emptyList()
    spans
      .map { s.getSpanStart(it) to s.getSpanEnd(it) }
      .filter { (start, end) -> start in 0 until end }
      .sortedByDescending { it.first }
      .forEach { (start, end) -> s.delete(start, end) }
  }
}
