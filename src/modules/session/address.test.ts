import { describe, expect, it } from 'vitest';

import { serverCandidates } from './address';

describe('serverCandidates', () => {
  it('写了协议：去掉空白、结尾斜杠和 /api', () => {
    expect(serverCandidates('  https://a.example.com/api/  ')).toEqual(['https://a.example.com']);
    expect(serverCandidates('http://a.example.com:8080/sub/')).toEqual(['http://a.example.com:8080/sub']);
    expect(serverCandidates('HTTPS://a.example.com/API')).toEqual(['HTTPS://a.example.com']);
  });

  it('没写协议：先 https 再 http', () => {
    expect(serverCandidates('a.example.com')).toEqual(['https://a.example.com', 'http://a.example.com']);
    expect(serverCandidates('192.168.1.2:2222/api')).toEqual(['https://192.168.1.2:2222', 'http://192.168.1.2:2222']);
  });

  it('空的、别的协议、只有协议：没有候选', () => {
    expect(serverCandidates('   ')).toEqual([]);
    expect(serverCandidates('ftp://a.example.com')).toEqual([]);
    expect(serverCandidates('https://')).toEqual([]);
  });
});
