import { useEffect, useRef, useState } from 'react';

export default function ScrollReveal({ children, delay = 0, duration = 0.8, className = '' }) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setIsIntersecting(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  const style = {
    opacity: isIntersecting ? 1 : 0,
    transform: isIntersecting ? 'translate3d(0, 0, 0)' : 'translate3d(0, 40px, 0)',
    filter: isIntersecting ? 'blur(0px)' : 'blur(4px)',
    transition: `opacity ${duration}s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, ` +
                `transform ${duration}s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, ` +
                `filter ${duration}s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
    willChange: 'transform, opacity, filter',
  };

  return (
    <div ref={ref} style={style} className={className}>
      {children}
    </div>
  );
}
