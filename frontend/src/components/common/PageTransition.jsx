import { motion, useReducedMotion } from 'framer-motion';

export default function PageTransition({ children }) {
  const shouldReduceMotion = useReducedMotion();
  
  const variants = {
    initial: { 
      opacity: 0, 
      y: shouldReduceMotion ? 0 : 20 
    },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.5, 
        ease: [0.25, 0.1, 0.25, 1.0] 
      }
    },
    exit: { 
      opacity: 0, 
      y: shouldReduceMotion ? 0 : -20,
      transition: { 
        duration: 0.3, 
        ease: [0.25, 0.1, 0.25, 1.0] 
      }
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      className="w-full min-h-screen flex flex-col"
    >
      {children}
    </motion.div>
  );
}
