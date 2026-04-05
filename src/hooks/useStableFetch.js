import { useEffect, useRef } from 'react';

/**
 * 의존성 값이 실제로 변경됐을 때만 callback 실행.
 * 배열/객체 참조가 바뀌어도 값이 같으면 재실행하지 않음.
 * (탭 전환 → Supabase 세션 갱신 → availableAdvertisers 새 참조 문제 해결)
 */
export function useStableFetch(callback, deps) {
  const prevDepsRef = useRef(null);

  useEffect(() => {
    const serialized = JSON.stringify(deps);
    if (prevDepsRef.current === serialized) return;
    prevDepsRef.current = serialized;
    callback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
