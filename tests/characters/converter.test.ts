import { describe, it, expect } from 'vitest';
import { pixelsToBraille } from '../../src/characters/converter.js';

describe('pixelsToBraille', () => {
  it('empty 2x4 = blank braille', () => { expect(pixelsToBraille([[0,0],[0,0],[0,0],[0,0]])).toBe('⠀'); });
  it('full 2x4 = full braille', () => { expect(pixelsToBraille([[1,1],[1,1],[1,1],[1,1]])).toBe('⣿'); });
  it('top-left dot', () => { expect(pixelsToBraille([[1,0],[0,0],[0,0],[0,0]])).toBe('⠁'); });
  it('4x8 = 2x2 braille chars', () => { expect(pixelsToBraille(Array.from({length:8}, () => [1,1,1,1]))).toBe('⣿⣿\n⣿⣿'); });
});
