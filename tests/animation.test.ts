import { describe, it, expect, vi } from 'vitest';
import { getFrameDuration, selectFrame } from '../src/animation.js';
import type { Character, BrailleFrame } from '../src/characters/types.js';

describe('getFrameDuration', () => {
  it('3000ms for idle', () => { expect(getFrameDuration('idle', 0)).toBe(3000); });
  it('1000ms for rateLimited', () => { expect(getFrameDuration('rateLimited', 1.0)).toBe(1000); });
  it('faster for higher intensity running', () => { expect(getFrameDuration('running', 0.8)).toBeLessThan(getFrameDuration('running', 0.3)); });
  it('500ms for heavy', () => { expect(getFrameDuration('heavy', 0.5)).toBe(500); });
  it('600ms for crushed', () => { expect(getFrameDuration('crushed', 0.9)).toBe(600); });
});

describe('selectFrame', () => {
  const mockFrames: BrailleFrame[] = [{ lines: ['frame0'] }, { lines: ['frame1'] }, { lines: ['frame2'] }];
  const mockCharacter: Character = {
    name: 'test',
    displayName: { en: 'Test', ko: '테스트', ja: 'テスト', zh: '测试' },
    frames: { running: mockFrames, idle: [{ lines: ['idle0'] }], heavy: mockFrames, crushed: mockFrames, expensive: mockFrames, rateLimited: mockFrames },
    compactFrames: { running: ['r0', 'r1', 'r2'], idle: ['i0'], heavy: ['h0'], crushed: ['c0'], expensive: ['e0'], rateLimited: ['l0'] },
  };

  it('selects frame at timestamp 0', () => { vi.spyOn(Date, 'now').mockReturnValue(0); expect(selectFrame(mockCharacter, 'running', 0.5, 'normal').lines[0]).toBe('frame0'); vi.restoreAllMocks(); });
  it('cycles frames', () => { vi.spyOn(Date, 'now').mockReturnValue(400); expect(selectFrame(mockCharacter, 'running', 0.3, 'normal').lines[0]).toBe('frame1'); vi.restoreAllMocks(); });
  it('compact mode', () => { vi.spyOn(Date, 'now').mockReturnValue(0); expect(selectFrame(mockCharacter, 'running', 0.5, 'compact').lines[0]).toBe('r0'); vi.restoreAllMocks(); });
  it('falls back to running for empty phase', () => {
    const sparse = { ...mockCharacter, frames: { ...mockCharacter.frames, expensive: [] } };
    vi.spyOn(Date, 'now').mockReturnValue(0);
    expect(selectFrame(sparse, 'expensive', 0.5, 'normal').lines[0]).toBe('frame0');
    vi.restoreAllMocks();
  });
});
