import { useEffect, useRef } from 'react';

export default function Parallax({ children, speed = 0.05, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    let requestId;
    let currentY = 0;
    let targetY = 0;

    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Calculate position relative to viewport center
      const elementCenter = rect.top + rect.height / 2;
      const viewportCenter = viewportHeight / 2;
      
      // Update target transform value
      targetY = (elementCenter - viewportCenter) * speed;
    };

    const animate = () => {
      // Lerp for smooth scrolling effect
      currentY += (targetY - currentY) * 0.1;
      
      if (ref.current) {
        ref.current.style.transform = `translate3d(0, ${currentY}px, 0)`;
      }
      
      requestId = requestAnimationFrame(animate);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    animate();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(requestId);
    };
  }, [speed]);

  return (
    <div ref={ref} className={className} style={{ willChange: 'transform' }}>
      {children}
    </div>
  );
}
