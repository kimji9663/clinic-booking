import { describe, expect, it } from 'vitest';
import { formatPhoneInput } from './phone';

describe('formatPhoneInput', () => {
  it.each([
    ['010', '010'],
    ['0101', '010-1'],
    ['0101234', '010-1234'],
    ['01012345678', '010-1234-5678'],
    ['0111234567', '011-123-4567'],
    ['010-1234-56789', '010-1234-5678'],
    ['abc010 1234', '010-1234'],
  ])('%s → %s', (input, expected) => {
    expect(formatPhoneInput(input)).toBe(expected);
  });
});
