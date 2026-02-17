'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, ChevronDown, ChevronUp, Loader2, X } from 'lucide-react';
import { useAuthStore, usePlayerStore } from '@/lib/store';
import { formatTime } from '@/lib/utils';
import { togglePlay, seek, setVolume as setAudioVolume } from '@/lib/audio';
import { fetchLyrics } from '@/lib/api';

export default function MobilePlayer() {
    const { currentSong, isPlaying, isLoading, volume, progress, setVolume, nextSong, prevSong, currentTime, duration } = usePlayerStore();
    const { user } = useAuthStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const [lyrics, setLyrics] = useState<string[]>([]);
    const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
    const [lyricTimes, setLyricTimes] = useState<number[]>([]);

    useEffect(() => {
        setAudioVolume(volume);
    }, [volume]);

    // 获取并解析歌词
    useEffect(() => {
        if (currentSong?.id) {
            const getLyrics = async () => {
                try {
                    const data = await fetchLyrics(currentSong.id, user?.cookie);
                    let lyricText = data.lrc?.lyric || data.tlyric?.lyric;
                    if (lyricText) {
                        parseLyrics(lyricText);
                    } else {
                        setLyrics(['暂无歌词']);
                        setLyricTimes([0]);
                    }
                } catch (error) {
                    setLyrics(['获取歌词失败']);
                    setLyricTimes([0]);
                }
            };
            getLyrics();
        }
    }, [currentSong?.id, user?.cookie]);

    const parseLyrics = (lyricText: string) => {
        const lyricLines = lyricText.split('\n');
        const parsedLyrics: string[] = [];
        const parsedTimes: number[] = [];

        lyricLines.forEach(line => {
            const timeMatch = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/g);
            if (timeMatch) {
                const text = line.replace(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/g, '').trim();
                if (text) {
                    timeMatch.forEach(timeTag => {
                        const match = timeTag.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/);
                        if (match) {
                            const minutes = parseInt(match[1]);
                            const seconds = parseInt(match[2]);
                            const milliseconds = match[3].length === 3 ? parseInt(match[3]) : parseInt(match[3]) * 10;
                            parsedTimes.push(minutes * 60 + seconds + milliseconds / 1000);
                            parsedLyrics.push(text);
                        }
                    });
                }
            }
        });

        const sorted = parsedLyrics.map((lyric, i) => ({ lyric, time: parsedTimes[i] })).sort((a, b) => a.time - b.time);
        setLyrics(sorted.map(item => item.lyric));
        setLyricTimes(sorted.map(item => item.time));
    };

    // 更新当前歌词索引
    useEffect(() => {
        if (lyricTimes.length > 0 && currentTime !== undefined) {
            let newIndex = 0;
            for (let i = 0; i < lyricTimes.length; i++) {
                if (lyricTimes[i] <= currentTime) newIndex = i;
                else break;
            }
            setCurrentLyricIndex(newIndex);
        }
    }, [currentTime, lyricTimes]);

    if (!currentSong) return null;

    // 全屏展开视图
    if (isExpanded) {
        return (
            <div className="fixed inset-0 z-50 bg-white dark:bg-neutral-900 flex flex-col md:hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4">
                    <button
                        onClick={() => setIsExpanded(false)}
                        className="p-2 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                    >
                        <ChevronDown size={24} />
                    </button>
                    <span className="text-xs font-bold uppercase tracking-widest text-black/40 dark:text-white/40">
                        正在播放
                    </span>
                    <div className="w-10" /> {/* Spacer */}
                </div>

                {/* Album Art */}
                <div className="flex-grow flex items-center justify-center px-8">
                    <div className="relative w-64 h-64">
                        {/* Vinyl disc background */}
                        <div className={`absolute inset-0 rounded-full bg-neutral-900 shadow-2xl ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }}>
                            {/* Vinyl grooves */}
                            <div className="absolute inset-4 rounded-full border-2 border-neutral-700" />
                            <div className="absolute inset-8 rounded-full border border-neutral-700" />
                            <div className="absolute inset-12 rounded-full border border-neutral-700" />
                            {/* Center label with album art - larger size */}
                            <div className="absolute inset-[48px] rounded-full overflow-hidden border-4 border-neutral-800">
                                <img
                                    src={currentSong.albumArt || undefined}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            {/* Center hole */}
                            <div className="absolute inset-[124px] rounded-full bg-neutral-800 border-2 border-neutral-700" />
                        </div>
                    </div>
                </div>

                {/* Song Info */}
                <div className="px-8 py-4 text-center">
                    <h2 className="text-xl font-black uppercase tracking-tight dark:text-white truncate">
                        {currentSong.name}
                    </h2>
                    <p className="text-sm font-bold uppercase opacity-40 dark:text-white/40 mt-1 truncate">
                        {currentSong.artist}
                    </p>
                </div>

                {/* Current Lyric */}
                <div className="px-8 py-2 h-16 flex items-center justify-center">
                    <p className="text-sm font-medium text-center text-black/60 dark:text-white/60 line-clamp-2">
                        {lyrics[currentLyricIndex] || '♪ ♪ ♪'}
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="px-8 py-4">
                    <div
                        className="relative h-2 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden cursor-pointer"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const percent = ((e.clientX - rect.left) / rect.width) * 100;
                            seek(percent);
                        }}
                    >
                        <div
                            className="absolute inset-y-0 left-0 bg-black dark:bg-white rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs font-bold opacity-30 dark:text-white/30 mt-2">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-8 py-6">
                    <button
                        onClick={prevSong}
                        className="p-3 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                    >
                        <SkipBack size={28} fill="currentColor" />
                    </button>
                    <button
                        onClick={togglePlay}
                        className={`w-16 h-16 flex items-center justify-center rounded-full shadow-xl transition-all ${
                            isLoading
                                ? 'bg-black/30 dark:bg-white/30 cursor-not-allowed'
                                : 'bg-black dark:bg-white text-white dark:text-black'
                        }`}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader2 size={28} className="animate-spin" />
                        ) : isPlaying ? (
                            <Pause size={28} fill="currentColor" />
                        ) : (
                            <Play size={28} fill="currentColor" className="ml-1" />
                        )}
                    </button>
                    <button
                        onClick={nextSong}
                        className="p-3 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                    >
                        <SkipForward size={28} fill="currentColor" />
                    </button>
                </div>

                {/* Volume */}
                <div className="flex items-center justify-center gap-3 px-8 pb-8">
                    <Volume2 size={16} className="text-black/30 dark:text-white/30" />
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-32 h-1 bg-black/10 dark:bg-white/20 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
                    />
                </div>
            </div>
        );
    }

    // Mini Player (底部导航栏上方)
    return (
        <div
            className="fixed bottom-[72px] left-0 right-0 z-40 bg-white dark:bg-neutral-900 border-t border-black/5 dark:border-white/10 px-4 py-2 md:hidden"
            onClick={() => setIsExpanded(true)}
        >
            <div className="flex items-center gap-3">
                {/* Album Art */}
                <div className="relative w-12 h-12 flex-shrink-0">
                    <img
                        src={currentSong.albumArt || undefined}
                        alt=""
                        className="w-full h-full object-cover rounded-xl"
                    />
                    <div className="absolute inset-0 bg-black/10 rounded-xl flex items-center justify-center opacity-0 active:opacity-100">
                        <ChevronUp size={16} className="text-white" />
                    </div>
                </div>

                {/* Song Info */}
                <div className="flex-grow min-w-0">
                    <p className="text-sm font-bold dark:text-white truncate">{currentSong.name}</p>
                    <p className="text-xs text-black/40 dark:text-white/40 truncate">{currentSong.artist}</p>
                </div>

                {/* Play/Pause Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        togglePlay();
                    }}
                    className={`w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0 transition-all ${
                        isLoading
                            ? 'bg-black/20 dark:bg-white/20 cursor-not-allowed'
                            : 'bg-black dark:bg-white text-white dark:text-black'
                    }`}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : isPlaying ? (
                        <Pause size={16} fill="currentColor" />
                    ) : (
                        <Play size={16} fill="currentColor" className="ml-0.5" />
                    )}
                </button>
            </div>
        </div>
    );
}
