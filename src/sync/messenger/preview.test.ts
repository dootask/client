import { describe, expect, it } from 'vitest';

import { draftPreview, htmlToLine, lastSenderId, msgPreview } from './preview';

const p = (type: string, msg: Record<string, unknown>) => msgPreview({ type, msg });

describe('消息摘要', () => {
  it('服务端生成的摘要原样用', () => {
    expect(p('preview', { preview: '[图片]' })).toEqual({ labels: [], text: '[图片]' });
  });

  it('文本去标签、表情换名字、图片只剩标签', () => {
    expect(p('text', { text: '<p>你好&nbsp;<b>世界</b></p><p>二</p>' })?.text).toBe('你好 世界 二');
    expect(p('text', { text: '<img class="emoticon" alt="微笑" src="x">好' })?.text).toBe('[微笑]好');
    expect(p('text', { text: '<p><img class="browse" src="x">看</p>' })).toEqual({ labels: ['image'], text: '看' });
    expect(p('text', { text: '<img class="emoticon" src="x.gif">' })).toEqual({ labels: ['sticker'], text: '' });
    expect(p('text', { text: 'a'.repeat(60) })?.text).toBe(`${'a'.repeat(50)}...`);
  });

  it('Markdown 取标题或去符号，AI 状态单独标出', () => {
    expect(p('text', { type: 'md', text: '前言\n## 标题\n正文' })?.text).toBe('标题');
    expect(p('text', { type: 'md', text: '**粗体** [链接](http://a)' })?.text).toBe('粗体 链接');
    expect(p('text', { type: 'md', text: '::: reasoning\n想' })?.status).toBe('aiThinking');
    expect(p('text', { text: '...', ai: { status: 'running' } })?.status).toBe('aiRunning');
    expect(p('text', { text: '...', ai: { status: 'cancelled' } })?.status).toBe('aiStopped');
  });

  it('各类消息的标签', () => {
    expect(p('file', { type: 'img' })?.labels).toEqual(['image']);
    expect(p('file', { ext: 'mp4' })?.labels).toEqual(['video']);
    expect(p('file', { name: 'a.pdf' })).toEqual({ labels: ['file'], text: 'a.pdf' });
    expect(p('record', {})?.labels).toEqual(['voice']);
    expect(p('longtext', { desc: '摘要' })?.text).toBe('摘要');
    expect(p('vote', { text: '投票内容' })).toEqual({ labels: ['vote'], text: '投票内容' });
    expect(p('notice', { notice: '通知' })?.text).toBe('通知');
    expect(p('whatever', {})?.labels).toEqual(['unknown']);
    expect(msgPreview(null)).toBeNull();
  });

  it('标注、置顶、待办带上被引用消息', () => {
    const inner = { type: 'file', msg: { type: 'img' } };
    expect(p('tag', { action: 'add', data: inner })).toEqual({ labels: ['tag', 'image'], text: '' });
    expect(p('top', { action: 'remove', data: { type: 'text', msg: { text: '哈' } } })).toEqual({ labels: ['untop'], text: '哈', status: undefined });
    expect(p('todo', { action: 'done', data: inner })?.labels).toEqual(['todoDone', 'image']);
  });

  it('模板消息', () => {
    expect(p('template', { title_raw: '原始' })?.text).toBe('原始');
    expect(p('template', { type: 'task_list', title: '任务', list: [{ name: '甲' }] })?.text).toBe('任务: 甲');
    expect(p('template', { type: 'content', content: '内容' })?.text).toBe('内容');
  });

  it('待办完成的发送者是完成的人', () => {
    expect(lastSenderId({ id: 1, type: 'todo', userid: 5, msg: { action: 'done', data: { done_userids: [9] } } } as never)).toBe(9);
    expect(lastSenderId({ id: 1, type: 'text', userid: 5, msg: {} } as never)).toBe(5);
    expect(lastSenderId(null)).toBe(0);
  });

  it('草稿', () => {
    expect(draftPreview('<p>草<img src="x">稿</p>')).toEqual({ labels: ['image'], text: '草稿' });
    expect(htmlToLine('&lt;a&gt; &amp;')).toBe('<a> &');
  });
});
