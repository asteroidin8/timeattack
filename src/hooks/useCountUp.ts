import { useEffect, useState } from 'react';

// 0 → target으로 감속(ease-out cubic)하며 굴러가는 숫자. 타임 세이브 히어로 연출용.
export function useCountUp(target: number, durationMs = 1200): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }
    let raf: number;
    const startedAt = Date.now();
    const tick = () => {
      const progress = Math.min(1, (Date.now() - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // rAF가 스로틀되는 환경(백그라운드 마운트 등)에서도 최종값은 반드시 도달
    const finisher = setTimeout(() => setValue(target), durationMs + 100);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(finisher);
    };
  }, [target, durationMs]);

  return value;
}
