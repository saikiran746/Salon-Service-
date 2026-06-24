import { useEffect, useState, useRef } from 'react';

export default function AnimatedCountUp({ end, duration = 2.0 }) {
  const [count, setCount] = useState('0');
  const ref = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasAnimated.current) {
        hasAnimated.current = true;
        
        // Parse numerical value and retrieve any suffix/prefix
        const rawString = String(end);
        const isDecimal = rawString.includes('.');
        const parsedVal = isDecimal ? parseFloat(rawString.replace(/[^0-9.]/g, '')) : parseInt(rawString.replace(/[^0-9]/g, ''), 10);
        const suffix = rawString.replace(/[0-9.,]/g, '');

        if (isNaN(parsedVal)) {
          setCount(end);
          return;
        }

        const startTime = performance.now();

        const updateCount = (currentTime) => {
          const elapsedTime = (currentTime - startTime) / 1000;
          if (elapsedTime < duration) {
            const progress = elapsedTime / duration;
            // Ease out quad
            const easeProgress = progress * (2 - progress);
            const currentVal = easeProgress * parsedVal;
            
            if (isDecimal) {
              setCount(currentVal.toFixed(1) + suffix);
            } else {
              setCount(Math.floor(currentVal).toLocaleString('en-IN') + suffix);
            }
            requestAnimationFrame(updateCount);
          } else {
            setCount(end);
          }
        };

        requestAnimationFrame(updateCount);
      }
    }, { threshold: 0.1 });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{count}</span>;
}
