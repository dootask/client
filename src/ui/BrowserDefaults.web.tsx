import { useEffect } from 'react';

/** 文件拖到拖放区外面松手时，浏览器默认会打开这个文件、离开应用 */
const blockFileDrop = (event: DragEvent) => {
  // 拖放区已经接手的（它会 preventDefault）不管
  if (event.defaultPrevented || !event.dataTransfer?.types.includes('Files')) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'none';
};

/**
 * 把浏览器的默认行为改成应用的样子，放在根布局，只挂一次：
 * - 界面文字默认不能选中（像桌面应用一样，拖动、双击按钮不会选中一片字）；消息、任务描述等内容用 `<Text selectable>` 打开，
 *   输入框不受影响
 * - 文件拖到拖放区（DropZone）外面松手不会打开文件
 */
export function BrowserDefaults() {
  useEffect(() => {
    document.body.style.userSelect = 'none';
    window.addEventListener('dragover', blockFileDrop);
    window.addEventListener('drop', blockFileDrop);
    return () => {
      document.body.style.userSelect = '';
      window.removeEventListener('dragover', blockFileDrop);
      window.removeEventListener('drop', blockFileDrop);
    };
  }, []);
  return null;
}
