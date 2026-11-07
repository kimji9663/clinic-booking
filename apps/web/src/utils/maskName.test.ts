import { describe, expect, it } from 'vitest';
import { maskName } from './maskName';

describe('maskName', () => {
  it.each([
    ['김민준', '김*준'],
    ['이준', '이*'],
    ['남궁민수', '남**수'],
    ['김', '김'],
    [' 박서아 ', '박*아'],
  ])('%s → %s', (input, expected) => {
    expect(maskName(input)).toBe(expected);
  });
});
