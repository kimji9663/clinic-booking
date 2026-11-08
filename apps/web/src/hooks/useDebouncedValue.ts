import { useEffect, useState } from 'react';

/** 입력이 delay 동안 멈췄을 때만 값을 바꾼다 (타이핑마다 검색 요청을 보내지 않도록) */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
