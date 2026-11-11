import { describe, expect, it } from 'vitest';

import { applyTextChange, composeSegments, deleteBefore, composeToHtml, htmlToCompose, insertMention, looksLikeMarkdown, mentionQuery, quickMsgHtml, type ComposeValue } from './compose';

const plain = (text: string): ComposeValue => ({ text, mentions: [] });
const zhang = { char: '@', id: 3, name: '张三' } as const;

describe('输入栏内容与 HTML', () => {
  it('每行一个段落，空行用 <br>，转义尖括号', () => {
    expect(composeToHtml(plain('a<b>\n\nc & d\n'))).toBe('<p>a&lt;b&gt;</p><p><br></p><p>c &amp; d</p>');
  });

  it('HTML 还原成多行文本', () => {
    expect(htmlToCompose('<p>a&lt;b&gt;</p><p><br></p><p>c &amp; d</p>')).toEqual(plain('a<b>\n\nc & d'));
  });

  it('带格式的内容留着原 HTML，发送时原样发出', () => {
    const html = '<p>c &amp; <strong>d</strong></p><ol><li data-list="bullet">e</li></ol>';
    const value = htmlToCompose(html);
    expect(value).toEqual({ text: 'c & d\ne', mentions: [], html });
    expect(composeToHtml(value)).toBe(html);
  });

  it('表情图换成名字', () => {
    expect(htmlToCompose('<p>好<img class="emoticon" src="x.png" alt="微笑"></p>').text).toBe('好[微笑]');
  });

  it('来回转换不变（含 mention）', () => {
    const value: ComposeValue = { text: '第一行 @张三 \n\n  缩进 <tag> #任务"A"\n最后', mentions: [zhang, { char: '#', id: 9, name: '任务"A"' }] };
    expect(htmlToCompose(composeToHtml(value))).toEqual(value);
  });

  it('mention 转成编辑器的标签', () => {
    expect(composeToHtml({ text: '@张三 你好', mentions: [zhang] })).toBe(
      '<p><span class="mention" data-denotation-char="@" data-id="3" data-value="张三">﻿<span contenteditable="false"><span class="ql-mention-denotation-char">@</span>张三</span>﻿</span> 你好</p>',
    );
  });

  it('认领不到的 mention 丢掉', () => {
    expect(composeToHtml({ text: '你好', mentions: [zhang] })).toBe('<p>你好</p>');
  });

  it('已发出消息里的 @ 和 # 读回 mention，文件链接当文字', () => {
    const html = '<p><span class="mention user" data-id="3">@张三</span> 看 <span class="mention task" data-id="7">#修复</span> <a class="mention file" href="x">~a.txt</a></p>';
    expect(htmlToCompose(html)).toEqual({ text: '@张三 看 #修复 ~a.txt', mentions: [zhang, { char: '#', id: 7, name: '修复' }] });
  });
});

describe('输入栏 mention 编辑', () => {
  const value: ComposeValue = { text: 'hi @张三 ok', mentions: [zhang] };

  it('退格删到 mention 时整个删掉', () => {
    expect(applyTextChange(value, 'hi @张 ok')).toEqual({ value: plain('hi  ok'), cursor: 3 });
  });

  it('在 mention 中间插字它变回普通文字', () => {
    expect(applyTextChange(value, 'hi @张x三 ok').value).toEqual(plain('hi @张x三 ok'));
  });

  it('光标前的候选查询', () => {
    expect(mentionQuery(plain('hi @zh'), 6, ['@', '#'])).toEqual({ start: 3, char: '@', query: 'zh' });
    expect(mentionQuery(plain('a@zh'), 4, ['@'])).toBeNull();
    expect(mentionQuery(value, 6, ['@'])).toBeNull();
  });

  it('选中候选替换查询文字并补空格，mentions 按位置排序', () => {
    const result = insertMention({ text: '#x @张三', mentions: [zhang] }, 0, 2, { char: '#', id: 1, name: '任务' });
    expect(result).toEqual({ value: { text: '#任务  @张三', mentions: [{ char: '#', id: 1, name: '任务' }, zhang] }, cursor: 4 });
    expect(composeSegments(result.value).map((s) => s.mention)).toEqual([true, false, true]);
  });
});

describe('默认发送识别 Markdown', () => {
  it('标题、代码块、链接单独就够', () => {
    expect(looksLikeMarkdown(plain('# 标题'))).toBe(true);
    expect(looksLikeMarkdown(plain('```\ncode\n```'))).toBe(true);
    expect(looksLikeMarkdown(plain('看 [文档](https://a.b)'))).toBe(true);
  });

  it('普通文字里常见的写法要凑够分量', () => {
    expect(looksLikeMarkdown(plain('- 买菜'))).toBe(false);
    expect(looksLikeMarkdown(plain('**重点**'))).toBe(false);
    expect(looksLikeMarkdown(plain('**重点**\n- 买菜'))).toBe(true);
    expect(looksLikeMarkdown(plain('#没有空格不是标题'))).toBe(false);
  });

  it('带 mention 的按普通格式', () => {
    expect(looksLikeMarkdown({ text: '# 标题 @张三', mentions: [zhang] })).toBe(false);
  });
});

describe('表情面板删除键', () => {
  it('emoji 整个删掉（组合、肤色、国旗、键帽）', () => {
    for (const emoji of ['😀', '👨‍👩‍👧', '👍🏽', '🇨🇳', '#️⃣', '❤️']) {
      expect(deleteBefore(plain(`a${emoji}`), 1 + emoji.length)).toEqual({ value: plain('a'), cursor: 1 });
    }
  });

  it('删光标前的字，删到 mention 整个删', () => {
    expect(deleteBefore(plain('abc'), 2)).toEqual({ value: plain('ac'), cursor: 1 });
    expect(deleteBefore({ text: 'hi @张三', mentions: [zhang] }, 6).value).toEqual(plain('hi '));
    expect(deleteBefore(plain('abc'), 0)).toEqual({ value: plain('abc'), cursor: 0 });
  });
});

describe('B7 quickMsgHtml', () => {
  it('与旧前端一致的结构，并转义', () => {
    expect(quickMsgHtml({ key: '/help', label: '帮助指令' })).toBe('<p><span data-quick-key="/help">帮助指令</span></p>');
    expect(quickMsgHtml({ key: 'a"b', label: '<x>' })).toBe('<p><span data-quick-key="a&quot;b">&lt;x&gt;</span></p>');
  });
});
