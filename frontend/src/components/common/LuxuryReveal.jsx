import { motion, useReducedMotion } from 'framer-motion';

export default function LuxuryReveal({ text, accentText, className = '' }) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <h1 className={`font-display font-extralight tracking-widest text-white leading-none flex flex-wrap justify-center items-center gap-x-[0.3em] ${className}`}
        style={{ fontSize: 'clamp(2rem, 4.5vw, 4rem)' }}>
        <span>{text}</span>
        {accentText && (
          <span className="font-medium italic"
            style={{
              background: 'linear-gradient(135deg, #E8C96A 0%, #C9A84C 50%, #B8901E 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
            {accentText}
          </span>
        )}
      </h1>
    );
  }

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.035, delayChildren: 0.08 }
    }
  };

  const letterVariants = {
    hidden: { y: '115%', opacity: 0, rotateX: -30 },
    visible: {
      y: '0%',
      opacity: 1,
      rotateX: 0,
      transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] }
    }
  };

  const accentVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.5 }
    }
  };

  const words = text.split(' ');

  return (
    <motion.h1
      className={`font-display font-extralight tracking-widest text-white leading-none 
        flex flex-wrap justify-center items-center gap-x-[0.3em] overflow-visible py-1 ${className}`}
      style={{ fontSize: 'clamp(2rem, 4.5vw, 4rem)' }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Regular words */}
      <span className="flex flex-wrap justify-center gap-x-[0.3em] overflow-hidden py-2">
        {words.map((word, wordIndex) => (
          <span key={wordIndex} className="inline-flex overflow-hidden">
            {word.split('').map((char, charIndex) => (
              <motion.span
                key={charIndex}
                className="inline-block"
                variants={letterVariants}
                style={{ display: 'inline-block' }}
              >
                {char}
              </motion.span>
            ))}
            {/* Space between words */}
            {wordIndex < words.length - 1 && (
              <span className="inline-block" style={{ width: '0.3em' }} />
            )}
          </span>
        ))}
      </span>

      {/* Accent / Italic text */}
      {accentText && (
        <motion.span
          className="font-medium italic inline-block"
          variants={accentVariants}
          style={{
            background: 'linear-gradient(135deg, #E8C96A 0%, #C9A84C 50%, #B8901E 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 20px rgba(201,168,76,0.3))'
          }}
        >
          {accentText}
        </motion.span>
      )}
    </motion.h1>
  );
}
