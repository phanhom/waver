'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePlayerStore } from '@/lib/store';
import SettingsPanel from '@/components/SettingsPanel';

export default function SettingsButton() {
  const { darkMode } = usePlayerStore();
  const [expanding, setExpanding] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

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
    setTimeout(() => {
      setIsPanelOpen(true);
    }, 250);

    setTimeout(() => {
      setExpanding(false);
    }, 500);
  };

  return (
    <>
      <motion.button
          onClick={handleToggle}
          className="fixed top-8 right-8 w-12 h-12 rounded-full bg-white/70 dark:bg-black/70 backdrop-blur-xl border border-black/5 dark:border-white/10 text-black dark:text-white shadow-lg hidden md:flex items-center justify-center z-50"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <Settings size={20} />
        </motion.button>

      {/* Transition overlay for spread effect */}
      <AnimatePresence>
        {expanding && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-40"
            initial={{
              clipPath: 'circle(0% at 92% 8%)',
              backgroundColor: 'rgba(0, 0, 0, 0.1)'
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

      {/* Settings Panel */}
      <SettingsPanel 
        isOpen={isPanelOpen} 
        onClose={() => setIsPanelOpen(false)} 
      />
    </>
  );
}
