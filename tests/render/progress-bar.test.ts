import { describe, it, expect } from 'vitest';
import { progressBar } from '../../src/render/progress-bar.js';
describe('progressBar', () => {
  it('renders 0%', () => { expect(progressBar(0, 10)).toBe('░░░░░░░░░░'); });
  it('renders 100%', () => { expect(progressBar(100, 10)).toBe('██████████'); });
  it('renders 50%', () => { expect(progressBar(50, 10)).toBe('█████░░░░░'); });
  it('clamps >100', () => { expect(progressBar(150, 10)).toBe('██████████'); });
  it('clamps negative', () => { expect(progressBar(-10, 10)).toBe('░░░░░░░░░░'); });
  it('renders with custom bar chars', () => {
    expect(progressBar(50, 4, '━', '─')).toBe('━━──');
  });
});
