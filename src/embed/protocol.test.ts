import { describe, expect, it } from 'vitest';

import { encodeGuestMessage, encodeHostMessage, originOf, parseGuestMessage } from './protocol';

describe('parseGuestMessage', () => {
  it('解析本协议的消息', () => {
    expect(parseGuestMessage(encodeGuestMessage({ type: 'ready' }))).toEqual({ type: 'ready' });
    expect(parseGuestMessage(encodeGuestMessage({ type: 'navigate', payload: { path: '/dialog/1' } }))).toEqual({ type: 'navigate', payload: { path: '/dialog/1' } });
    expect(parseGuestMessage(encodeGuestMessage({ type: 'changed', payload: { scope: 'task', id: 3 } }))).toEqual({ type: 'changed', payload: { scope: 'task', id: 3 } });
  });

  it('忽略别的 postMessage、坏 JSON、版本不对和对象形式', () => {
    expect(parseGuestMessage('hello')).toBeNull();
    expect(parseGuestMessage('{bad')).toBeNull();
    expect(parseGuestMessage(JSON.stringify({ source: 'dootask-embed', v: 2, type: 'ready' }))).toBeNull();
    expect(parseGuestMessage({ source: 'dootask-embed', v: 1, type: 'ready' })).toBeNull();
    expect(parseGuestMessage(JSON.stringify({ source: 'other', v: 1, type: 'ready' }))).toBeNull();
  });

  it('拒绝格式不对的内容和站外跳转', () => {
    const raw = (body: object) => JSON.stringify({ source: 'dootask-embed', v: 1, ...body });
    expect(parseGuestMessage(raw({ type: 'title', payload: { title: 1 } }))).toBeNull();
    expect(parseGuestMessage(raw({ type: 'unknown' }))).toBeNull();
    for (const path of ['https://evil.com', '//evil.com/x', 'javascript:alert(1)', 'dialog/1']) {
      expect(parseGuestMessage(raw({ type: 'navigate', payload: { path } }))).toBeNull();
    }
  });
});

describe('encodeHostMessage', () => {
  it('带信封', () => {
    expect(JSON.parse(encodeHostMessage({ type: 'theme', payload: { theme: 'dark' } }))).toEqual({ source: 'dootask-embed', v: 1, type: 'theme', payload: { theme: 'dark' } });
  });
});

describe('originOf', () => {
  it('取协议、主机、端口，去掉默认端口', () => {
    expect(originOf('https://A.example.com/path?x#y')).toBe('https://a.example.com');
    expect(originOf('https://a.com:443/x')).toBe('https://a.com');
    expect(originOf('http://a.com:80')).toBe('http://a.com');
    expect(originOf('http://a.com:8080/x')).toBe('http://a.com:8080');
  });
  it('非 http(s) 和带账号的网址返回 null', () => {
    expect(originOf('javascript:alert(1)')).toBeNull();
    expect(originOf('file:///etc/passwd')).toBeNull();
    expect(originOf('about:blank')).toBeNull();
    expect(originOf('https://user@evil.com')).toBeNull();
  });
});
