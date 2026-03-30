import { describe, it, expect } from 'vitest';
import { textWidth, padRight } from '../../src/render/text-width.js';
describe('textWidth', () => {
  it('ASCII width 1', () => { expect(textWidth('hello')).toBe(5); });
  it('CJK width 2', () => { expect(textWidth('컨텍스트')).toBe(8); });
  it('emoji width 2', () => { expect(textWidth('🟢')).toBe(2); });
  it('ignores ANSI', () => { expect(textWidth('\x1b[32mhello\x1b[0m')).toBe(5); });
  it('mixed content', () => { expect(textWidth('[Opus] 컨텍스트')).toBe(15); });
});
describe('padRight', () => {
  it('pads ASCII', () => { expect(padRight('hi', 5)).toBe('hi   '); });
  it('pads CJK', () => { expect(textWidth(padRight('안녕', 6))).toBe(6); });
});
