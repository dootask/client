import ExpoModulesCore
import UIKit

/**
 * 会话页底部坞（iOS）：消息区与输入栏放在坞里，坞的底边用约束钉在 keyboardLayoutGuide 上，
 * 由 UIKit 在键盘自己的动画里摆位置。逐帧跟随要等键盘事件、算位移、提交挂载，主线程一忙
 * （第三方输入法弹出时尤其）就慢一拍，头几帧键盘先盖住输入栏；交给 UIKit 则与键盘同一个动画，不会脱节。
 *
 * 坞的位置只在原生层，React 的布局树不知道：坞内视图要用 measureInWindow 取真实位置。
 */
public class DooTaskKeyboardDockModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DooTaskKeyboardDock")

    // 原生视图的真实窗口位置。Fabric 的 measureInWindow 按布局树算，不含坞被键盘、面板托起的位移
    AsyncFunction("measureInWindow") { (tag: Int) -> [String: Double]? in
      guard let view = self.appContext?.findView(withTag: tag, ofType: UIView.self), view.window != nil else { return nil }
      let rect = view.convert(view.bounds, to: nil)
      return ["x": rect.minX, "y": rect.minY, "width": rect.width, "height": rect.height]
    }.runOnQueue(.main)

    View(KeyboardDockView.self) {
      // 键盘弹出时坞的底边可以低于键盘顶边多少：输入栏下方给安全区留的空白，弹键盘时被键盘盖住
      Prop("keyboardOffset") { (view: KeyboardDockView, offset: Double) in
        view.keyboardOffset = CGFloat(offset)
      }

      // 面板的高度（与键盘高度同一口径，含底部安全区），0 为收起；坞取键盘与面板中较高的一个
      AsyncFunction("setLift") { (view: KeyboardDockView, height: Double, animated: Bool) in
        view.setLift(CGFloat(height), animated: animated)
      }.runOnQueue(.main)
    }
  }
}

public final class KeyboardDockView: ExpoView {
  var keyboardOffset: CGFloat = 0 {
    didSet {
      if keyboardOffset != oldValue { setNeedsLayout() }
    }
  }

  /// 放 React Native 子视图。React Native 摆放的是本视图（坞停在底部时的位置），dockView 与它一样大，由约束托起
  private let dockView = UIView()
  /// 坞底边 ≤ 键盘顶边 + 偏移；只在本坞内的输入框弹键盘时生效
  private var keyboardConstraint: NSLayoutConstraint!
  /// 坞底边 ≤ 本视图底边 - 面板托起的高度
  private var liftConstraint: NSLayoutConstraint!
  private var lift: CGFloat = 0
  /// 本坞内正在（或最近）编辑的输入框
  private weak var input: UIView?

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)

    dockView.translatesAutoresizingMaskIntoConstraints = false
    addSubview(dockView)

    // iOS 17 起键盘收起时 guide 顶边落在视图底边；之前落在安全区底边，此时偏移（等于安全区高度）正好抵掉
    if #available(iOS 17.0, *) {
      keyboardLayoutGuide.usesBottomSafeArea = false
    }
    keyboardConstraint = dockView.bottomAnchor.constraint(lessThanOrEqualTo: keyboardLayoutGuide.topAnchor)
    liftConstraint = dockView.bottomAnchor.constraint(lessThanOrEqualTo: bottomAnchor)
    // 键盘与面板都没有时停在底部；有任一个时被上面两条「≤」顶起，取较高的一个
    let resting = dockView.bottomAnchor.constraint(equalTo: bottomAnchor)
    resting.priority = .defaultLow
    NSLayoutConstraint.activate([
      dockView.leadingAnchor.constraint(equalTo: leadingAnchor),
      dockView.trailingAnchor.constraint(equalTo: trailingAnchor),
      dockView.heightAnchor.constraint(equalTo: heightAnchor),
      liftConstraint,
      resting,
    ])

    let center = NotificationCenter.default
    center.addObserver(self, selector: #selector(didBeginEditing(_:)), name: UITextView.textDidBeginEditingNotification, object: nil)
    center.addObserver(self, selector: #selector(didBeginEditing(_:)), name: UITextField.textDidBeginEditingNotification, object: nil)
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  // MARK: - Children

  public override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    dockView.insertSubview(childComponentView, at: index)
  }

  public override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
    childComponentView.removeFromSuperview()
  }

  // 坞被托起后，贴在它下方的面板在 dockView 范围外，触摸也要交给子视图自己判断
  public override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
    guard isUserInteractionEnabled, !isHidden, alpha > 0.01 else { return nil }
    let dockPoint = convert(point, to: dockView)
    for child in dockView.subviews.reversed() {
      if let hit = child.hitTest(dockView.convert(dockPoint, to: child), with: event) {
        return hit
      }
    }
    return nil
  }

  // MARK: - Keyboard

  /**
   * 只跟随本坞内输入框弹出的键盘：页面上的抽屉里的输入框弹键盘时，坞不动。
   * 开始编辑的通知在获得焦点时同步发出，早于键盘动画，约束在键盘动画开始前就切好
   */
  @objc private func didBeginEditing(_ notification: Notification) {
    guard let view = notification.object as? UIView else { return }
    let owned = view.isDescendant(of: self)
    input = owned ? view : nil
    guard keyboardConstraint.isActive != owned else { return }
    keyboardConstraint.isActive = owned
    // 键盘已经弹着时（抽屉与本页输入框互切）没有键盘动画可跟，自己过渡
    if window != nil {
      UIView.animate(withDuration: 0.25) { self.layoutIfNeeded() }
    }
  }

  public override func layoutSubviews() {
    // keyboard-controller 给输入框挂了隐形的 inputAccessoryView（下拉收键盘从输入栏顶边开始跟手），
    // 它算在键盘里、guide 顶边随之上移，但看不见；补回它的高度。挂上、隐藏都会引起这里重新布局
    let accessory = (input as? UIResponder)?.inputAccessoryView?.frame.height ?? 0
    keyboardConstraint.constant = keyboardOffset + accessory
    liftConstraint.constant = lift > 0 ? keyboardOffset - lift : 0
    super.layoutSubviews()
  }

  // MARK: - Panel

  func setLift(_ height: CGFloat, animated: Bool) {
    lift = height
    liftConstraint.constant = height > 0 ? keyboardOffset - height : 0
    guard window != nil else { return }
    if animated {
      // 与 JS 侧面板动画同一时长与曲线（bezier(0.2, 0.8, 0.2, 1)）
      let animator = UIViewPropertyAnimator(duration: 0.25, controlPoint1: CGPoint(x: 0.2, y: 0.8), controlPoint2: CGPoint(x: 0.2, y: 1)) {
        self.layoutIfNeeded()
      }
      animator.startAnimation()
    } else {
      UIView.performWithoutAnimation { self.layoutIfNeeded() }
    }
  }
}
