/**
 * 개인정보 보호를 위해 이름 가운데 글자를 가린다.
 * 김민준 → 김*준, 이준 → 이*, 남궁민수 → 남**수
 */
export function maskName(name: string): string {
  const chars = Array.from(name.trim());
  if (chars.length <= 1) return name.trim();
  if (chars.length === 2) return `${chars[0]}*`;
  return `${chars[0]}${'*'.repeat(chars.length - 2)}${chars[chars.length - 1]}`;
}

/** 010-1234-5678 → 010-****-5678 */
export function maskPhone(phone: string): string {
  return phone.replace(/^(\d{3})-(\d{3,4})-(\d{4})$/, (_, a: string, b: string, c: string) => {
    return `${a}-${'*'.repeat(b.length)}-${c}`;
  });
}
