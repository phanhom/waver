'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePlayerStore } from '@/lib/store';

export default function ThemeToggle() {
  const { darkMode, toggleDarkMode } = usePlayerStore();
  const [expanding, setExpanding] = useState(false);

  // Sync the dark class with the darkMode state
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleToggle = () => {
    setExpanding(true);
    // State change happens slightly before animation finishes for better feel
    setTimeout(() => {
      toggleDarkMode();
    }, 250);

    setTimeout(() => {
      setExpanding(false);
    }, 500); // Overlay duration
  };

  return (
    <>
      <motion.button
          onClick={handleToggle}
          className="fixed top-8 right-8 w-12 h-12 rounded-full bg-white/70 dark:bg-black/70 backdrop-blur-xl border border-black/5 dark:border-white/10 text-black dark:text-white shadow-lg flex items-center justify-center z-50"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </motion.button>

      {/* Transition overlay for spread effect */}
      <AnimatePresence>
        {expanding && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-40"
            initial={{
              clipPath: 'circle(0% at 92% 8%)',
              backgroundColor: darkMode ? '#fcfcfc' : '#000000'
            }}
            animate={{
              clipPath: 'circle(150% at 92% 8%)'
            }}
            exit={{
              clipPath: 'circle(0% at 92% 8%)'
            }}
            transition={{
              duration: 0.5,
              ease: "easeInOut"
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}