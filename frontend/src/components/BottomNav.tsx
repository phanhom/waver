'use client';

import React from 'react';
import { Radio, MessageSquare, Library, Settings } from 'lucide-react';

interface BottomNavProps {
    activeTab: 'live' | 'waves' | 'library' | 'settings';
    onTabChange: (tab: 'live' | 'waves' | 'library' | 'settings') => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
    const tabs = [
        { id: 'live' as const, label: 'Live Now', icon: Radio },
        { id: 'waves' as const, label: 'Chat', icon: MessageSquare },
        { id: 'library' as const, label: 'Library', icon: Library },
        { id: 'settings' as const, label: 'Settings', icon: Settings },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-[72px] bg-white dark:bg-neutral-900 border-t border-black/5 dark:border-white/10 px-4 py-2 z-40 md:hidden">
            <div className="flex justify-around items-center">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${
                                isActive
                                    ? 'text-black dark:text-white bg-black/5 dark:bg-white/10'
                                    : 'text-black/40 dark:text-white/40'
                            }`}
                        >
                            <Icon size={20} />
                            <span className="text-[10px] font-bold uppercase tracking-wide">
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}