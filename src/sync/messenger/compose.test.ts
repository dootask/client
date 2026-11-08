import { describe, expect, it } from 'vitest';

import { htmlToText, textToHtml } from './compose';

describe('输入栏文本与 HTML', () => {
  it('每行一个段落，空行用 <br>，转义尖括号', () => {
    expect(textToHtml('a<b>\n\nc & d\n')).toBe('<p>a&lt;b&gt;</p><p><br></p><p>c &amp; d</p>');
  });

  it('HTML 还原成多行文本', () => {
    expect(htmlToText('<p>a&lt;b&gt;</p><p><br></p><p>c &amp; <strong>d</strong></p>')).toBe('a<b>\n\nc & d');
  });

  it('表情图换成名字', () => {
    expect(htmlToText('<p>好<img class="emoticon" src="x.png" alt="微笑"></p>')).toBe('好[微笑]');
  });

  it('来回转换不变', () => {
    const text = '第一行\n\n  缩进 <tag>\n最后';
    expect(htmlToText(textToHtml(text))).toBe(text);
  });
});
