/** 입력 중인 휴대폰 번호에 하이픈을 자동으로 넣는다. 01012345678 → 010-1234-5678 */
export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  const middle = digits.length === 11 ? 4 : 3;
  return `${digits.slice(0, 3)}-${digits.slice(3, 3 + middle)}-${digits.slice(3 + middle)}`;
}
