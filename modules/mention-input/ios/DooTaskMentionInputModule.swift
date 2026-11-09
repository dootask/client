import ExpoModulesCore
import ObjectiveC
import UIKit

/**
 * 输入框退格删到 @ 提及时整段删除。
 *
 * 提及在输入框里是 role="link" 的 Text 片段，排版后带 AccessibilityRole = "link" 属性。
 * RN 多行输入框的 UITextView 代理（RCTBackedTextViewDelegateAdapter）在 shouldChangeTextInRange 里决定怎么改字；
 * 这里换掉它的实现：纯删除碰到提及时，把删除范围扩到整段提及再交给原实现，系统不会先删掉一个字再由 JS 补删。
 * 用的是预编译的 React 框架，改不了源码，所以在运行时替换方法。
 */
public class DooTaskMentionInputModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DooTaskMentionInput")

    OnCreate {
      MentionDeletion.install
    }
  }
}

private enum MentionDeletion {
  typealias Original = @convention(c) (AnyObject, Selector, UITextView, NSRange, NSString) -> Bool
  typealias Replacement = @convention(block) (AnyObject, UITextView, NSRange, NSString) -> Bool

  static let selector = #selector(UITextViewDelegate.textView(_:shouldChangeTextIn:replacementText:))
  static let roleKey = NSAttributedString.Key("AccessibilityRole")

  static let install: Void = {
    guard
      let adapter = NSClassFromString("RCTBackedTextViewDelegateAdapter"),
      let method = class_getInstanceMethod(adapter, selector)
    else { return }
    let original = unsafeBitCast(method_getImplementation(method), to: Original.self)
    let replacement: Replacement = { delegate, textView, range, text in
      guard text.length == 0, textView.markedTextRange == nil, let expanded = expand(range, in: textView.attributedText) else {
        return original(delegate, selector, textView, range, text)
      }
      // 原实现返回 NO 时已自己按扩大后的范围改好（或拒绝了这次修改）；返回 YES 表示交给系统按原范围删，这里改为自己删整段
      guard original(delegate, selector, textView, expanded, text) else { return false }
      let next = NSMutableAttributedString(attributedString: textView.attributedText)
      next.deleteCharacters(in: expanded)
      textView.attributedText = next
      textView.selectedRange = NSRange(location: expanded.location, length: 0)
      (delegate as? UITextViewDelegate)?.textViewDidChange?(textView)
      return false
    }
    method_setImplementation(method, imp_implementationWithBlock(replacement))
  }()

  /** 删除范围碰到的提及整段并入；没碰到提及返回 nil */
  static func expand(_ range: NSRange, in text: NSAttributedString) -> NSRange? {
    let whole = NSRange(location: 0, length: text.length)
    guard range.length > 0, NSMaxRange(range) <= whole.length else { return nil }
    var result = range
    text.enumerateAttribute(roleKey, in: range) { value, run, _ in
      guard value as? String == "link" else { return }
      var mention = NSRange()
      _ = text.attribute(roleKey, at: run.location, longestEffectiveRange: &mention, in: whole)
      result = NSUnionRange(result, mention)
    }
    return result == range ? nil : result
  }
}
