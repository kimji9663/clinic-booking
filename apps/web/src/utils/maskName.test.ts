import { describe, expect, it } from 'vitest';
import { maskName, maskPhone } from './maskName';

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

describe('maskPhone', () => {
  it.each([
    ['010-1234-5678', '010-****-5678'],
    ['011-123-4567', '011-***-4567'],
  ])('%s → %s', (input, expected) => {
    expect(maskPhone(input)).toBe(expected);
  });
});
