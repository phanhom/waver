'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, User, X, Play } from 'lucide-react';

interface MobileHeaderProps {
    user: {
        userId?: string;
        nickname?: string;
        name?: string;
        avatarUrl?: string;
        avatar?: string;
    } | null;
    urlInput: string;
    setUrlInput: (value: string) => void;
    onSearch: () => void;
    searchResults: any[];
    isSearching: boolean;
    onPlaySong: (song: any) => void;
}

export default function MobileHeader({ 
    user, 
    urlInput, 
    setUrlInput, 
    onSearch, 
    searchResults, 
    isSearching, 
    onPlaySong 
}: MobileHeaderProps) {
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭搜索结果
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchFocused(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handlePlaySong = (song: any) => {
        onPlaySong(song);
        setIsSearchFocused(false);
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-neutral-900 border-b border-black/5 dark:border-white/10 px-4 py-3 md:hidden">
            <div className="flex items-center gap-3">
                {/* User Avatar */}
                <div className="flex-shrink-0">
                    {user?.avatarUrl || user?.avatar ? (
                        <img
                            src={user.avatarUrl || user.avatar}
                            alt=""
                            className="w-10 h-10 rounded-full border-2 border-black/5 dark:border-white/10"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center">
                            <User size={20} className="text-black/40 dark:text-white/40" />
                        </div>
                    )}
                </div>

                {/* Username */}
                <div className="flex-shrink-0">
                    <span className="text-sm font-bold text-black dark:text-white uppercase tracking-wide">
                        {user?.nickname || user?.name || 'Guest'}
                    </span>
                </div>

                {/* Spacer to push search to right */}
                <div className="flex-grow" />

                {/* Search Input */}
                <div className="w-[180px] flex-shrink-0" ref={searchRef}>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="搜索歌曲..."
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                            onFocus={() => setIsSearchFocused(true)}
                            className="w-full bg-black/5 dark:bg-white/10 rounded-xl py-2 pl-4 pr-10 text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-all"
                        />
                        
                        {/* 搜索按钮和清除按钮 */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {urlInput && (
                                <button 
                                    onClick={() => { setUrlInput(''); }}
                                    className="p-1 opacity-30 hover:opacity-100 transition-opacity"
                                >
                                    <X size={14} />
                                </button>
                            )}
                            <button 
                                onClick={onSearch}
                                className="p-1 opacity-30 hover:opacity-100 transition-opacity"
                            >
                                <Search size={14} />
                            </button>
                        </div>

                        {/* 搜索结果下拉框 */}
                        {isSearchFocused && urlInput.trim() && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-800 rounded-xl shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto border border-black/10 dark:border-white/10">
                                {isSearching ? (
                                    <div className="px-4 py-6 text-sm text-center text-gray-500 dark:text-gray-400">
                                        <div className="animate-spin w-5 h-5 border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white rounded-full mx-auto mb-2"></div>
                                        搜索中...
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map((song) => (
                                        <div
                                            key={song.id}
                                            className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors active:bg-gray-100 dark:active:bg-white/10"
                                            onClick={() => handlePlaySong(song)}
                                        >
                                            <div className="w-12 h-12 bg-gray-100 dark:bg-white/10 rounded-lg overflow-hidden flex-shrink-0">
                                                {song.al?.picUrl ? (
                                                    <img src={song.al.picUrl} alt={song.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Play size={16} className="text-gray-500 dark:text-gray-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold truncate dark:text-white leading-tight mb-1">{song.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-white/50 truncate leading-none">
                                                    {song.ar?.[0]?.name} • {song.al?.name}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-4 py-6 text-sm text-center text-gray-500 dark:text-gray-400">
                                        未找到相关歌曲
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}