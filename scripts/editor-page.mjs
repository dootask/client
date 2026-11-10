// 生成 App 全屏编辑页要内联的脚本和样式：src/embed/editor/page.generated.ts（不进 git）。
// Metro 不能把文件当文本引入，所以由这里把 Quill、quill-mention 的发行版和 src/embed/editor/core.ts（转成普通脚本）拼成字符串。
// npm install 后、npm start、npm run typecheck 前自动执行；改了 core.ts 要重新执行（或重启 Metro）
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

const core = ts.transpileModule(read('src/embed/editor/core.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019, removeComments: true },
}).outputText;

// 页面里：全局的 Quill（发行版注册）+ 编辑器逻辑，事件经 ReactNativeWebView 发给 App，App 通过 window.editor 调用
const boot = `(function(){var post=function(e){window.ReactNativeWebView.postMessage(JSON.stringify(e))};window.editor=DtEditor.createEditor(window.Quill,document.getElementById('editor'),post);post({type:'boot'});})();`;
const script = [
  read('node_modules/quill-hi/dist/quill.js'),
  read('node_modules/quill-mention-hi/dist/quill.mention.min.js'),
  `var DtEditor=(function(exports){${core}\nreturn exports;})({});`,
  boot,
]
  .join('\n;\n')
  // 内联进 <script> 时不能提前结束标签
  .replace(/<\/script/gi, '<\\/script');

const out = [
  '// 由 scripts/editor-page.mjs 生成，不要手改',
  `export const EDITOR_SCRIPT = ${JSON.stringify(script)};`,
  `export const QUILL_CSS = ${JSON.stringify(read('node_modules/quill-hi/dist/quill.core.css'))};`,
  '',
].join('\n');
writeFileSync(join(root, 'src/embed/editor/page.generated.ts'), out);
