'use client';

import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Radio, ChevronDown, Maximize2, Loader2 } from 'lucide-react';
import { useAuthStore, usePlayerStore } from '@/lib/store';
import { formatTime } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { playSong, togglePlay, seek, setVolume as setAudioVolume } from '@/lib/audio';
import { broadcastWave } from '@/lib/socket';
import { fetchLyrics } from '@/lib/api';

export default function Player() {
    const { currentSong, isPlaying, isLoading, volume, progress, setIsPlaying, setVolume, nextSong, prevSong, activeListeners, currentTime, duration, followingSid } = usePlayerStore();
    const { user } = useAuthStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isShared, setIsShared] = useState(false);
    const [showLyricView, setShowLyricView] = useState(false);
    const [lyrics, setLyrics] = useState<string[]>([]);
    const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
    const [lyricTimes, setLyricTimes] = useState<number[]>([]);

    useEffect(() => {
        setAudioVolume(volume);
    }, [volume]);

    useEffect(() => {
        if (!isExpanded) setShowLyricView(false);
    }, [isExpanded]);

    // 获取并解析歌词
    useEffect(() => {
        if (currentSong?.id) {
            const getLyrics = async () => {
                try {
                    const data = await fetchLyrics(currentSong.id, user?.cookie);
                    // 优先使用普通歌词（原文），如果没有则使用逐字歌词
                    let lyricText = null;

                    if (data.lrc?.lyric) {
                        // 普通歌词（原文）
                        lyricText = data.lrc.lyric;
                    } else if (data.tlyric?.lyric) {
                        // 逐字歌词（可能包含翻译）
                        lyricText = data.tlyric.lyric;
                    }

                    if (lyricText) {
                        parseLyrics(lyricText);
                    } else {
                        setLyrics(['暂无歌词']);
                        setLyricTimes([0]);
                        setCurrentLyricIndex(0);
                    }
                } catch (error) {
                    console.error('Failed to fetch lyrics:', error);
                    setLyrics(['获取歌词失败']);
                    setLyricTimes([0]);
                    setCurrentLyricIndex(0);
                }
            };
            getLyrics();
        }
    }, [currentSong?.id, user?.cookie]);

    // 解析歌词格式 [时间]歌词内容
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
                            const totalSeconds = minutes * 60 + seconds + milliseconds / 1000;
                            parsedTimes.push(totalSeconds);
                            parsedLyrics.push(text);
                        }
                    });
                }
            }
        });

        // 按时间排序
        const sortedLyrics = parsedLyrics.map((lyric, index) => ({ lyric, time: parsedTimes[index] }))
            .sort((a, b) => a.time - b.time);

        setLyrics(sortedLyrics.map(item => item.lyric));
        setLyricTimes(sortedLyrics.map(item => item.time));
        setCurrentLyricIndex(0);
    };

    // 更新当前歌词索引
    useEffect(() => {
        if (lyricTimes.length > 0 && currentTime !== undefined) {
            let newIndex = 0;
            for (let i = 0; i < lyricTimes.length; i++) {
                if (lyricTimes[i] <= currentTime) {
                    newIndex = i;
                } else {
                    break;
                }
            }
            setCurrentLyricIndex(newIndex);
        }
    }, [currentTime, lyricTimes]);

    // 动态更新浏览器tab标题
    useEffect(() => {
        if (currentSong) {
            let title = `${currentSong.name} - ${currentSong.artist}`;

            document.title = title;
        } else {
            document.title = "WAVER - Music Ocean";
        }

        // 组件卸载时恢复默认标题
        return () => {
            document.title = "WAVER - Music Ocean";
        };
    }, [currentSong]);

    if (!currentSong) return null;

    return (
        <>
        {isExpanded && (
            <div
                className="fixed inset-0 z-40 pointer-events-auto"
                onClick={() => setIsExpanded(false)}
            />
        )}
        <div className="fixed bottom-8 right-8 z-50 flex items-end justify-end pointer-events-none">
            {!isExpanded ? (
                <div
                    onClick={() => setIsExpanded(true)}
                    className="pointer-events-auto flex items-center bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/10 rounded-full p-2 shadow-2xl cursor-pointer group w-[380px] h-[80px]"
                >
                        <div className="relative w-14 h-14 flex-shrink-0 mr-3">
                            <img
                                src={currentSong.albumArt || undefined}
                                alt=""
                                className="w-full h-full object-cover rounded-full shadow-lg"
                            />
                            <div className="absolute inset-0 bg-black/10 dark:bg-white/10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Maximize2 size={16} className="text-white" />
                            </div>
                        </div>

                        <div className="flex flex-col flex-grow min-w-0 px-2">
                            <span className="text-[12px] font-black uppercase tracking-tight truncate dark:text-white">{currentSong.name}</span>
                            <span className="text-[10px] font-bold uppercase opacity-40 dark:text-white/40 truncate">{currentSong.artist}</span>
                            {lyrics.length > 0 && lyrics[currentLyricIndex] && (
                                <span className="text-[11px] font-medium opacity-60 dark:text-white/60 truncate mt-0.5">
                                    {lyrics[currentLyricIndex]}
                                </span>
                            )}
                        </div>

                        <button
                            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                            className={`w-12 h-12 flex items-center justify-center rounded-full shrink-0 mr-1.5 transition-all ${
                                isLoading
                                    ? 'bg-black/30 dark:bg-white/30 cursor-not-allowed'
                                    : 'bg-black dark:bg-white text-white dark:text-black'
                            }`}
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                        </button>
                </div>
            ) : (
                <div
                    className="pointer-events-auto w-[340px] h-[540px] bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/10 rounded-[28px] p-5 shadow-2xl flex flex-col gap-5 relative overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                        {/* Minimize Button */}
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="absolute top-4 right-4 p-2 text-black/20 dark:text-white/20 hover:text-black dark:hover:text-white transition-colors"
                        >
                            <ChevronDown size={18} />
                        </button>

                        {/* Vinyl Record */}
                        <div className="flex justify-center py-2">
                            <div
                                className="relative w-40 h-40 flex items-center justify-center cursor-pointer"
                                onClick={() => setShowLyricView(v => !v)}
                            >
                                {!showLyricView ? (
                                    <div className="absolute inset-0 bg-black rounded-full shadow-2xl flex items-center justify-center overflow-hidden">
                                        <div className="absolute inset-0 rounded-full" style={{
                                            backgroundImage: `repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 2px, rgba(255,255,255,0.05) 3px)`
                                        }} />
                                        <div className={`relative w-24 h-24 rounded-full border-2 border-black overflow-hidden bg-neutral-800 ${isPlaying ? 'animate-spin-slow' : ''}`}>
                                            <img src={currentSong.albumArt || undefined} className="w-full h-full object-cover" alt="" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 rounded-3xl bg-black text-white flex items-center justify-center px-4 text-center shadow-2xl">
                                        <p className="text-[12px] font-bold leading-snug line-clamp-3">
                                            {lyrics[currentLyricIndex] || '♪ ♪ ♪'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Song Details */}
                        <div className="text-center px-4">
                            <h2 className="text-base font-black uppercase tracking-tight dark:text-white truncate">{currentSong.name}</h2>
                            <p className="text-[11px] font-bold uppercase opacity-40 dark:text-white/40 tracking-widest mt-1 truncate">{currentSong.artist}</p>
                        </div>

                        {/* Peer Stack (Listening with) */}
                        <div className="flex flex-col items-center gap-3">
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-30 dark:text-white/30">Listening With</p>
                            <div className="flex -space-x-2">
                                {/* 显示当前队伍的成员，而不是所有活跃用户 */}
                                {(() => {
                                    // 如果没有跟随任何人，只显示当前用户
                                    if (!followingSid) {
                                        return user ? (
                                            <img
                                                key="current-user"
                                                src={user.avatarUrl || user.avatar}
                                                className="w-6 h-6 rounded-full border-2 border-white dark:border-neutral-900 shadow-sm"
                                                title={user.nickname || user.name}
                                                alt=""
                                            />
                                        ) : [];
                                    }
                                    
                                    // 找到当前跟随的队长
                                    const leader = activeListeners.find(l => l.sid === followingSid);
                                    if (!leader) return [];
                                    
                                    // 构建队伍成员列表：队长 + 所有跟随该队长的用户
                                    const teamMembers = [leader];
                                    
                                    // 添加所有跟随该队长的用户
                                    activeListeners.forEach(listener => {
                                        if (listener.followingSid === leader.sid && 
                                            listener.sid !== leader.sid && 
                                            listener.user?.userId !== user?.userId) {
                                            teamMembers.push(listener);
                                        }
                                    });
                                    
                                    // 添加当前用户到队伍（如果还没在列表中）
                                    if (user && !teamMembers.some(m => m.sid === 'current-user')) {
                                        teamMembers.push({
                                            sid: 'current-user',
                                            user: user
                                        });
                                    }
                                    
                                    return teamMembers.slice(0, 5).map((member) => (
                                        <img
                                            key={member.sid}
                                            src={member.user?.avatarUrl || member.user?.avatar}
                                            className="w-6 h-6 rounded-full border-2 border-white dark:border-neutral-900 shadow-sm"
                                            title={member.user?.nickname || member.user?.name}
                                            alt=""
                                        />
                                    ));
                                })()}
                                {/* 显示队伍成员数量超过5个的提示 */}
                                {(() => {
                                    if (!followingSid) return null;
                                    const leader = activeListeners.find(l => l.sid === followingSid);
                                    if (!leader) return null;
                                    
                                    // 计算队伍成员数量
                                    const teamSize = 1 + 
                                                    activeListeners.filter(l => l.followingSid === leader.sid).length +
                                                    (user ? 1 : 0);
                                    
                                    if (teamSize <= 5) return null;
                                    return (
                                        <div className="w-6 h-6 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[8px] font-black dark:text-white border-2 border-white dark:border-neutral-900">
                                            +{teamSize - 5}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Progress */}
                        <div className="space-y-4">
                            <div className="relative h-1.5 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden group cursor-pointer"
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const percent = ((e.clientX - rect.left) / rect.width) * 100;
                                    seek(percent);
                                }}
                            >
                                <div
                                    className="absolute inset-y-0 left-0 bg-black dark:bg-white"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] font-bold opacity-30 dark:text-white/30">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        {/* Main Controls */}
                        <div className="flex items-center justify-center gap-10">
                            <button onClick={prevSong} className="text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors">
                                <SkipBack size={22} fill="currentColor" />
                            </button>
                            <button
                                onClick={togglePlay}
                                className={`w-14 h-14 flex items-center justify-center rounded-full active:scale-95 shadow-xl transition-all ${
                                    isLoading
                                        ? 'bg-black/30 dark:bg-white/30 cursor-not-allowed shadow-black/10 dark:shadow-white/5'
                                        : 'bg-black dark:bg-white text-white dark:text-black shadow-black/20 dark:shadow-white/10'
                                }`}
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 size={22} className="animate-spin" /> : isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-1" />}
                            </button>
                            <button onClick={nextSong} className="text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors">
                                <SkipForward size={22} fill="currentColor" />
                            </button>
                        </div>

                        {/* Extra Controls (Broadcast/Volume) */}
                        <div className="flex items-center justify-between mt-4">
                            <button
                                onClick={() => {
                                    if (currentSong && user) {
                                        broadcastWave(null, [currentSong], user);
                                        setIsShared(true);
                                        setTimeout(() => setIsShared(false), 2000);
                                    }
                                }}
                                className={`p-2 rounded-full transition-all ${isShared ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-black/20 dark:text-white/20 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'}`}
                            >
                                <Radio size={18} className={isShared ? 'animate-pulse' : ''} />
                            </button>

                            <div className="flex items-center gap-3 w-32">
                                <Volume2 size={14} className="text-black/20 dark:text-white/20" />
                                <input
                                    type="range"
                                    min="0" max="1" step="0.01"
                                    value={volume}
                                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-black/10 dark:bg-white/20 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
                                />
                            </div>
                        </div>
                    </div>
            )}
        </div>
        </>
    );
}