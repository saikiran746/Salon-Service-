import { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function LuxurySplashScreen({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 bg-[#0A0A0A] flex flex-col items-center justify-center z-[9999] overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0, 
        transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1.0] } 
      }}
    >
      <div className="flex flex-col items-center max-w-md w-full px-6">
        {/* Brand Name with expanding letter spacing reveal */}
        <motion.h2
          initial={{ opacity: 0, letterSpacing: '0.1em' }}
          animate={{ opacity: 1, letterSpacing: '0.35em' }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-2xl sm:text-3xl text-gold-500 font-semibold tracking-[0.35em] uppercase text-center mb-4"
        >
          TONI & GUY
        </motion.h2>
        
        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 0.4, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
          className="text-[9px] text-white tracking-[0.4em] uppercase font-sans text-center mb-8"
        >
          ESSENSUALS KONDAPUR
        </motion.p>

        {/* Growing Gold Line */}
        <div className="w-48 h-[1px] bg-white/[0.04] relative overflow-hidden">
          <motion.div
            initial={{ left: '-100%', width: '0%' }}
            animate={{ left: '0%', width: '100%' }}
            transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-0 bottom-0 bg-gradient-to-r from-gold-600 to-gold-400 shadow-[0_0_8px_rgba(201,168,76,0.6)]"
          />
        </div>
      </div>
    </motion.div>
  );
}
