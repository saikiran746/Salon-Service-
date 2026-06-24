import { useRef, useState, useEffect } from 'react';

export default function MagneticButton({ children, range = 50, action = 0.25, className = '' }) {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    const button = ref.current;
    if (!button) return;

    const handleMouseMove = (e) => {
      const rect = button.getBoundingClientRect();
      const btnX = rect.left + rect.width / 2;
      const btnY = rect.top + rect.height / 2;
      
      const distance = Math.hypot(e.clientX - btnX, e.clientY - btnY);

      if (distance < range) {
        // Pull the button towards the cursor
        const targetX = (e.clientX - btnX) * action;
        const targetY = (e.clientY - btnY) * action;
        setPosition({ x: targetX, y: targetY });
      } else {
        // Return to center
        setPosition({ x: 0, y: 0 });
      }
    };

    const handleMouseLeave = () => {
      setPosition({ x: 0, y: 0 });
    };

    window.addEventListener('mousemove', handleMouseMove);
    button.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      button.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [range, action]);

  const style = {
    transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
    transition: position.x === 0 && position.y === 0 
      ? 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)' 
      : 'transform 0.1s cubic-bezier(0.25, 1, 0.5, 1)',
    willChange: 'transform',
  };

  return (
    <div ref={ref} style={style} className={className}>
      {children}
    </div>
  );
}
