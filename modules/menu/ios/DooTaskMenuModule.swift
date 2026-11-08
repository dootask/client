import ExpoModulesCore
import UIKit

/**
 * 系统原生菜单（iOS）：包住触发元素，点击（press）用 UIButton 的 showsMenuAsPrimaryAction 弹出 UIMenu，
 * 长按（context）用 UIContextMenuInteraction 弹出系统上下文菜单。
 * 菜单结构由 JS 传入（sections：分组 → 菜单项，菜单项可带子分组），选中后回传菜单项 id
 */
public class DooTaskMenuModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DooTaskMenu")

    View(DooTaskMenuView.self) {
      Events("onAction")

      Prop("sections") { (view: DooTaskMenuView, sections: [[[String: Any]]]) in
        view.sections = sections
      }

      Prop("trigger") { (view: DooTaskMenuView, trigger: String) in
        view.trigger = trigger
      }
    }
  }
}

public final class DooTaskMenuView: ExpoView, UIContextMenuInteractionDelegate {
  let onAction = EventDispatcher()

  var sections: [[[String: Any]]] = [] {
    didSet { button.menu = buildMenu() }
  }

  var trigger = "press" {
    didSet { applyTrigger() }
  }

  /// 盖在触发元素上面的透明按钮，点击时由系统弹出菜单
  private let button = UIButton(type: .custom)
  private lazy var contextInteraction = UIContextMenuInteraction(delegate: self)

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    button.showsMenuAsPrimaryAction = true
    addSubview(button)
    applyTrigger()
  }

  private func applyTrigger() {
    let press = trigger == "press"
    button.isHidden = !press
    if press {
      removeInteraction(contextInteraction)
    } else if !interactions.contains(where: { $0 === contextInteraction }) {
      addInteraction(contextInteraction)
    }
  }

  // React Native 的子视图后挂上来，按钮要一直在最上层
  public override func didAddSubview(_ subview: UIView) {
    super.didAddSubview(subview)
    if subview !== button { bringSubviewToFront(button) }
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    button.frame = bounds
  }

  public func contextMenuInteraction(_ interaction: UIContextMenuInteraction, configurationForMenuAtLocation location: CGPoint) -> UIContextMenuConfiguration? {
    UIContextMenuConfiguration(identifier: nil, previewProvider: nil) { [weak self] _ in self?.buildMenu() }
  }

  private func buildMenu() -> UIMenu {
    UIMenu(title: "", children: elements(sections))
  }

  /// 只有一组时直接平铺；多组时每组是一个内联子菜单，系统会画分隔线
  private func elements(_ sections: [[[String: Any]]]) -> [UIMenuElement] {
    let groups = sections.map { $0.map(element) }
    if groups.count == 1 { return groups[0] }
    return groups.map { UIMenu(title: "", options: .displayInline, children: $0) }
  }

  private func element(_ item: [String: Any]) -> UIMenuElement {
    let id = item["id"] as? String ?? ""
    let title = item["title"] as? String ?? ""
    var attributes: UIMenuElement.Attributes = []
    if item["disabled"] as? Bool == true { attributes.insert(.disabled) }
    if item["destructive"] as? Bool == true { attributes.insert(.destructive) }

    if let children = item["sections"] as? [[[String: Any]]] {
      let menu = UIMenu(title: title, options: attributes.contains(.destructive) ? .destructive : [], children: elements(children))
      return menu
    }
    let action = UIAction(title: title, attributes: attributes) { [weak self] _ in
      self?.onAction(["id": id])
    }
    action.state = item["checked"] as? Bool == true ? .on : .off
    return action
  }
}
