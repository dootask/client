package expo.modules.dootaskmenu

import android.content.Context
import android.content.res.Configuration
import android.graphics.Color
import android.os.Build
import android.text.SpannableString
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.view.Gravity
import android.view.ContextThemeWrapper
import android.view.Menu
import android.widget.PopupMenu
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

/**
 * 系统原生菜单（Android）：包住触发元素，JS 在点击或长按时调 show()，以本视图为锚点弹出 PopupMenu。
 * 菜单结构由 JS 传入（sections：分组 → 菜单项，菜单项可带子分组），选中后回传菜单项 id
 */
class DooTaskMenuModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DooTaskMenu")

    View(DooTaskMenuView::class) {
      Events("onAction")

      Prop("sections") { view: DooTaskMenuView, sections: List<List<Map<String, Any?>>> ->
        view.sections = sections
      }

      Prop("dark") { view: DooTaskMenuView, dark: Boolean ->
        view.dark = dark
      }

      Prop("destructiveColor") { view: DooTaskMenuView, color: String ->
        view.destructiveColor = Color.parseColor(color)
      }

      // 视图上的函数默认在主线程执行
      AsyncFunction("show") { view: DooTaskMenuView ->
        view.show()
      }
    }
  }
}

class DooTaskMenuView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onAction by EventDispatcher()

  var sections: List<List<Map<String, Any?>>> = emptyList()
  /** 跟随 App 内的主题，而不是系统的深色模式设置 */
  var dark = false
  var destructiveColor: Int? = null

  private var popup: PopupMenu? = null

  fun show() {
    popup?.dismiss()
    val ids = mutableListOf<String>()
    val menu = PopupMenu(themedContext(), this, Gravity.NO_GRAVITY)
    fill(menu.menu, sections, ids)
    menu.setOnMenuItemClickListener { item ->
      ids.getOrNull(item.itemId)?.let { onAction(mapOf("id" to it)) }
      true
    }
    menu.setOnDismissListener { if (popup === menu) popup = null }
    popup = menu
    menu.show()
  }

  private fun themedContext(): Context {
    val activity = appContext.currentActivity ?: return context
    val config = Configuration(activity.resources.configuration)
    val night = if (dark) Configuration.UI_MODE_NIGHT_YES else Configuration.UI_MODE_NIGHT_NO
    config.uiMode = (config.uiMode and Configuration.UI_MODE_NIGHT_MASK.inv()) or night
    return ContextThemeWrapper(activity, activity.applicationInfo.theme).apply { applyOverrideConfiguration(config) }
  }

  /** 每组一个 groupId，系统在组之间画分隔线；itemId 是 ids 里的下标 */
  @Suppress("UNCHECKED_CAST")
  private fun fill(menu: Menu, sections: List<List<Map<String, Any?>>>, ids: MutableList<String>) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) menu.setGroupDividerEnabled(true)
    sections.forEachIndexed { group, items ->
      items.forEach { item ->
        val itemId = ids.size
        ids.add(item["id"] as? String ?: "")
        val title = title(item)
        val children = item["sections"] as? List<List<Map<String, Any?>>>
        val added = if (children != null) {
          val sub = menu.addSubMenu(group, itemId, Menu.NONE, title)
          fill(sub, children, ids)
          sub.item
        } else {
          menu.add(group, itemId, Menu.NONE, title)
        }
        added.isEnabled = item["disabled"] != true
        if (item["checked"] == true) {
          added.isCheckable = true
          added.isChecked = true
        }
      }
    }
  }

  private fun title(item: Map<String, Any?>): CharSequence {
    val text = item["title"] as? String ?: ""
    val color = destructiveColor
    if (item["destructive"] != true || color == null) return text
    return SpannableString(text).apply { setSpan(ForegroundColorSpan(color), 0, text.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE) }
  }
}
