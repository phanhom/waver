'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@/lib/store';

export default function Background() {
    return (
        <div className="fixed inset-0 -z-10 bg-[var(--background)] overflow-hidden transition-colors duration-500">
            <div className="absolute inset-0 opacity-10 dark:opacity-20" style={{
                backgroundImage: `radial-gradient(circle at 1.5px 1.5px, var(--dot-color) 3px, transparent 0)`,
                backgroundSize: '200px 200px'
            }} />
        </div>
    );
}
