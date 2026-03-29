'use client';

import React, { useEffect, useState } from 'react';
import MusicOcean from '@/components/MusicOcean';
import Player from '@/components/Player_v2';
import Background from '@/components/Background';
import LoginSection from '@/components/LoginSection';
import ChatRoom from '@/components/ChatRoom';
import { useAuthStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket, initSocket, emitListeningStatus, broadcastWave, onStateUpdated, addComment, getComments, cancelWave, likeWave, unlikeWave } from '@/lib/socket';
import { getAccountInfo, getUserDetail, getUserPlaylists, fetchPlaylistTracks, fetchSongs, searchSongs } from '@/lib/api';
import { usePlayerStore } from '@/lib/store';
import { playSong } from '@/lib/audio';
import { applyRemoteState } from '@/lib/audio';
import { MoreHorizontal, Plus, User, Disc, ChevronRight, Play, Search, X, MessageCircle, Send, Heart, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import BottomNav from '@/components/BottomNav';
import MobileHeader from '@/components/MobileHeader';
import MobilePlayer from '@/components/MobilePlayer';
import MobileSettingsPage from '@/components/MobileSettingsPage';

/*
function WaveDetailModal({ wave, onClose }: { wave: any; onClose: () => void }) {
  const { user, requireLogin } = useAuthStore();
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const resourceId = wave.playlist?.id || wave.song?.id;
  const resourceType = wave.playlist ? 'playlist' : 'song';

  useEffect(() => {
    if (resourceId) {
      getComments(resourceId, resourceType);
    }
    
    const s = getSocket();
    if (!s) return;

    const handleCommentsLoaded = (data: any) => {
      if (String(data.resourceId) === String(resourceId)) {
        setComments(data.comments);
      }
    };
    const handleCommentAdded = (newComment: any) => {
      if (String(newComment.resourceId) === String(resourceId) && newComment.resourceType === resourceType) {
        setComments(prev => [newComment, ...prev]);
      }
    };

    s.on('comments_loaded', handleCommentsLoaded);
    s.on('comment_added', handleCommentAdded);

    return () => {
      s.off('comments_loaded', handleCommentsLoaded);
      s.off('comment_added', handleCommentAdded);
    };
  }, [resourceId, resourceType]);

  useEffect(() => {
    if (wave) {
      setIsLiked(wave.likes?.some((like: any) => like.userId === user?.userId) || false);
      setLikeCount(wave.likeCount || 0);
    }
  }, [wave, user]);

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    if (!requireLogin()) return;
    addComment(resourceId, resourceType, comment, user);
    setComment('');
  };

  const handleLike = () => {
    if (!requireLogin()) return;
    if (isLiked) {
      unlikeWave(wave.id, wave.playlist?.id, wave.song?.id, user.userId);
      setIsLiked(false);
      setLikeCount(prev => Math.max(0, prev - 1));
    } else {
      likeWave(wave.id, wave.playlist?.id, wave.song?.id, user);
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
    }
  };

  const handleDelete = () => {
    if (requireLogin() && confirm('Are you sure you want to delete this share?')) {
      cancelWave(wave.playlist?.id || null, wave.song?.id || null, user.userId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-48 flex-shrink-0">
          <img 
            src={wave.playlist?.coverImgUrl || wave.song?.albumArt} 
            className="w-full h-full object-cover"
            alt="" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors">
            <X size={16} />
          </button>
          {user?.userId === wave.user?.userId && (
            <button onClick={handleDelete} className="absolute top-4 left-4 p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full text-white transition-colors">
              <Trash2 size={16} />
            </button>
          )}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <img src={wave.user?.avatarUrl} className="w-6 h-6 rounded-full border-2 border-white" alt="" />
              <span className="text-xs font-bold uppercase tracking-wider opacity-90">{wave.user?.nickname} Shared</span>
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight truncate">{wave.playlist?.name || wave.song?.name}</h2>
            <p className="text-xs font-bold uppercase opacity-70">{wave.playlist ? `${wave.tracks?.length || 0} Tracks` : wave.song?.artist}</p>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLike}
              className={`flex items-center gap-2 text-xs font-bold uppercase transition-colors ${isLiked ? 'text-red-500' : 'opacity-50 hover:opacity-100'}`}
            >
              <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
              <span>{likeCount}</span>
            </button>
            <div className="flex items-center gap-2 text-xs font-bold uppercase opacity-50">
              <MessageCircle size={18} />
              <span>{comments.length}</span>
            </div>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-8 opacity-30">
              <p className="text-[10px] font-bold uppercase tracking-widest">No comments yet</p>
            </div>
          ) : (
            comments.map((c, i) => (
              <div key={i} className="flex gap-3">
                <img src={c.user_data?.avatarUrl || c.user_data?.avatar} className="w-8 h-8 rounded-full border border-black/10 dark:border-white/10 flex-shrink-0" alt="" />
                <div className="flex-grow min-w-0">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wide">{c.user_data?.nickname || c.user_data?.name}</span>
                    <span className="text-[9px] opacity-30 uppercase">{new Date(c.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[13px] mt-0.5 leading-relaxed opacity-80">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSendComment} className="p-4 border-t border-black/5 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]">
          <div className="relative">
            <input
              type="text"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Write a comment..."
              className="w-full bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors"
            />
            <button 
              type="submit"
              disabled={!comment.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg disabled:opacity-20 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
            >
              <Send size={14} />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function DiscoveryList() {
  const { sharedWaves } = usePlayerStore();
  const [selectedWave, setSelectedWave] = useState<any>(null);

  if (sharedWaves.length === 0) {
    return (
      <div className="py-12 border border-dashed border-black/10 rounded-3xl flex flex-col items-center justify-center opacity-30">
        <p className="text-[10px] font-bold tracking-widest uppercase">No waves shared yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 pb-20">
        {sharedWaves.map((wave, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="aspect-square relative group cursor-pointer"
            onClick={() => setSelectedWave(wave)}
          >
            <img
              src={wave.playlist?.coverImgUrl || wave.song?.albumArt}
              className="w-full h-full object-cover rounded-xl shadow-sm hover:shadow-xl transition-all duration-300"
              alt=""
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl" />
            
            <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
              {wave.playlist ? <Disc size={12} /> : <Radio size={12} />}
            </div>

            <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <img 
                src={wave.user?.avatarUrl} 
                className="w-6 h-6 rounded-full border-2 border-white dark:border-black" 
                alt="" 
              />
            </div>
          </motion.div>
        ))}
      </div>

      {selectedWave && (
        <WaveDetailModal 
          wave={selectedWave} 
          onClose={() => setSelectedWave(null)} 
        />
      )}
    </>
  );
}
*/

function LivingList() {
  const { activeListeners, followingSid, setFollowingSid, setCurrentSong } = usePlayerStore();
  const { user: currentUser, requireLogin } = useAuthStore();
  const { currentSong, isPlaying } = usePlayerStore();

  // 创建包含当前用户的完整用户列表
  // 先过滤掉已存在的当前用户条目避免重复
  const allListeners = [...activeListeners.filter(l => l.user?.userId !== currentUser?.userId)];
  
  if (currentUser) {
    // 添加当前用户到列表
    allListeners.push({
      sid: 'current-user',
      user: currentUser,
      song: currentSong,
      state: isPlaying ? 'playing' : 'paused'
    });
  }

  // 构建跟随关系
  const leaderMap: { [key: string]: any[] } = {};
  
  // 初始化所有用户为自己的leader
  allListeners.forEach(listener => {
    leaderMap[listener.sid] = [listener];
  });
  
  // 处理当前用户的跟随
  if (currentUser && followingSid) {
    const leader = allListeners.find(l => l.sid === followingSid);
    if (leader) {
      // 将当前用户从自己的列表中移除
      const currentUserEntry = allListeners.find(l => l.sid === 'current-user');
      if (currentUserEntry) {
        // 添加到leader的列表
        leaderMap[followingSid].push(currentUserEntry);
        // 从自己的列表中删除
        delete leaderMap['current-user'];
      }
    }
  }

  return (
    <div className="space-y-6">
      {Object.values(leaderMap).map((group, groupIndex) => {
        const leader = group[0];
        const followers = group.slice(1);
        
        return (
          <div key={group[0].sid} className="group">
            <div className="flex items-center gap-2 cursor-pointer">
              {/* Leader's Avatar */}
              <div className={`relative w-6 h-6 rounded-full overflow-hidden border border-black/10 dark:border-white/10 ${leader.state === 'playing' ? 'ring-2 ring-black/20 dark:ring-white/20' : ''}`}>
                <img 
                  src={leader.user?.avatarUrl || leader.user?.avatar} 
                  className="w-full h-full object-cover"
                  alt=""
                />
              </div>
              <div className="flex-grow">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-black uppercase tracking-wider">{leader.user?.nickname || leader.user?.name || 'Unknown'}{leader.sid === 'current-user' ? ' (You)' : ''}</span>
                  {followers.length > 0 && (
                    <div className="flex -space-x-2">
                      {followers.map((follower, idx) => (
                        <img 
                          key={idx} 
                          src={follower.user?.avatarUrl || follower.user?.avatar}
                          className="w-4 h-4 rounded-full border border-white dark:border-black" 
                          alt="" 
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-1 h-1 rounded-full ${leader.state === 'playing' ? 'bg-black dark:bg-white animate-pulse' : 'bg-black/20 dark:bg-white/20'}`} />                 
                  <span className="text-[10px] font-bold opacity-40 uppercase">
                    {leader.state === 'playing' ? 'Now Listening' : 
                     leader.state === 'paused' ? 'Paused' : 'Not Listening'}
                  </span>
                </div>
              </div>
              {leader.sid !== 'current-user' && leader.user?.userId !== currentUser?.userId && (
                <button
                  onClick={() => {
                    if (followingSid === leader.sid) {
                      setFollowingSid(null);
                    } else {
                      if (!requireLogin()) return;
                      if (leader.sid === 'current-user') return;
                      setFollowingSid(leader.sid);
                      setCurrentSong(leader.song);
                      if (leader.song && leader.state === 'playing') {
                        playSong(leader.song, false);
                      }
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${followingSid === leader.sid ? 'bg-black dark:bg-white text-white dark:text-black' : 'border border-black/10 dark:border-white/10 hover:border-black dark:hover:border-white'}`}
                >
                  {followingSid === leader.sid ? '取消跟随' : '跟随'}
                </button>
              )}
            </div>

            {leader.song && (
              <div className="ml-9 p-3 bg-black/[0.03] dark:bg-white/[0.03] rounded-xl flex items-center gap-3 group cursor-pointer" onClick={() => { 
                if (leader.sid !== 'current-user') {
                  if (!requireLogin()) return;
                  setCurrentSong(leader.song);
                  playSong(leader.song);
                }
              }}>
                <div className="flex-shrink-0 relative">
                  {leader.song?.albumArt && (
                    <img 
                      src={leader.song.albumArt} 
                      className="w-8 h-8 rounded-md object-cover"
                      alt=""
                    />
                  )}
                  <Disc size={12} className={`absolute inset-0 flex items-center justify-center text-white bg-black/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${leader.state === 'playing' ? 'animate-spin-slow' : ''}`} />
                </div>
                <div className="flex-grow truncate">
                  <p className="text-[12px] font-bold uppercase truncate">{leader.song?.name}</p>
                  <p className="text-[10px] opacity-40 uppercase truncate">{leader.song?.artist}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LibrarySection() {
  const { userPlaylists, setUserPlaylists, setCurrentSong, setPlaylist } = usePlayerStore();
  const { user, token, requireLogin } = useAuthStore();
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaylistsLoading, setIsPlaylistsLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; track: any } | null>(null);

  useEffect(() => {
    if (user?.userId && token) {
      setIsPlaylistsLoading(true);
      getUserPlaylists(user.userId, token)
        .then(data => {
          const list = data.playlist || data.playlists;
          if (list) setUserPlaylists(list);
        })
        .catch(() => {})
        .finally(() => setIsPlaylistsLoading(false));
    }
  }, [user?.userId, token]);

  const handlePlaylistClick = async (p: any) => {
    if (selectedPlaylist?.id === p.id) {
      setSelectedPlaylist(null);
      return;
    }
    setSelectedPlaylist(p);
    setIsLoading(true);
    try {
      const data = await fetchPlaylistTracks(p.id, token || undefined);
      const rawTracks = data?.songs || data?.playlist?.tracks || [];
      if (rawTracks.length > 0) {
        const mappedTracks = rawTracks.map((t: any) => ({
          id: String(t.id),
          name: t.name,
          artist: t.ar?.[0]?.name || 'Unknown',
          album: t.al?.name || '',
          albumArt: t.al?.picUrl || ''
        }));
        setTracks(mappedTracks);
      }
    } catch (err) {
      console.error(err);
      return;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSharePlaylist = async (p: any, e: React.MouseEvent) => {
    e.stopPropagation();
    // if (!requireLogin()) return;
    // let currentTracks = tracks;

    // // If tracks for THIS playlist aren't loaded, fetch them first
    // if (p.id === selectedPlaylist?.id && tracks.length > 0) {
    //   // Already have tracks
    //   currentTracks = tracks;
    // } else {
    //   // Need to fetch tracks
    //   try {
    //     const data = await fetchPlaylistTracks(p.id, token || undefined);
    //     const rawTracks = data?.songs || data?.playlist?.tracks || [];
    //     if (rawTracks.length > 0) {
    //       currentTracks = rawTracks.map((t: any) => ({
    //         id: String(t.id),
    //         name: t.name,
    //         artist: t.ar?.[0]?.name || 'Unknown',
    //         album: t.al?.name || '',
    //         albumArt: t.al?.picUrl || ''
    //       }));
    //     }
    //   } catch (err) {
    //     console.error(err);
    //     return;
    //   }
    // }

    // // Now broadcast
    // broadcastWave(p, currentTracks, user);
    console.log('Share functionality is disabled');
  };

  const handleShareSong = (track: any) => {
    // if (!requireLogin()) return;
    // broadcastWave(null, [track], user);
    // setContextMenu(null);
    console.log('Share functionality is disabled');
    setContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent, track: any) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      track
    });
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  return (
    <div className="space-y-6">
      {!selectedPlaylist ? (
        <div className="grid grid-cols-1 gap-4">
          {isPlaylistsLoading ? (
            <div className="py-12 flex flex-col items-center gap-4 opacity-30">
              <div className="w-5 h-5 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-[8px] font-black uppercase tracking-widest">Loading Library...</p>
            </div>
          ) : userPlaylists.slice(0, 12).map(p => (
            <div
              key={p.id}
              onClick={() => handlePlaylistClick(p)}
              className="group flex items-center gap-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-xl transition-all"
            >
              <img src={p.coverImgUrl} className="w-10 h-10 rounded-lg transition-all" alt="" />
              <div className="flex-grow min-w-0">
                <h3 className="font-bold text-[13px] uppercase truncate">{p.name}</h3>
                <p className="text-[12px] opacity-40 uppercase">{p.trackCount} Tracks</p>
              </div>
              {/* <MoreHorizontal size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => handleSharePlaylist(p, e)} /> */}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <button onClick={() => setSelectedPlaylist(null)} className="flex items-center gap-2 text-[10px] font-black uppercase opacity-40 hover:opacity-100 transition-opacity">
            <ChevronRight size={10} className="rotate-180" /> Back to Playlists
          </button>
          <div className="flex items-center gap-4 mb-6">
            <img src={selectedPlaylist.coverImgUrl} className="w-12 h-12 rounded-xl border border-black/10 dark:border-white/10" alt="" />
            <div className="flex-grow">
              <h2 className="font-black text-xs uppercase tracking-tight">{selectedPlaylist.name}</h2>
              {/* <button
                onClick={(e) => handleSharePlaylist(selectedPlaylist, e)}
                className="mt-1 text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 border border-black/10 dark:border-white/10 rounded-full hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
              >
                Share All
              </button> */}
            </div>
          </div>
          <div className="space-y-1 max-h-[50vh] overflow-y-auto no-scrollbar">
            {isLoading ? (
              <div className="py-12 flex justify-center"><div className="w-4 h-4 border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white rounded-full animate-spin" /></div>
            ) : tracks.map((t, i) => (
              <div
                key={t.id}
                onClick={() => { if (!requireLogin()) return; setCurrentSong(t); setPlaylist(tracks); playSong(t); }}
                onContextMenu={(e) => handleContextMenu(e, t)}
                className="group flex items-center gap-4 p-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.03] cursor-pointer transition-all"
              >
                <span className="text-[10px] font-black opacity-20 w-5">{i + 1}</span>
                <div className="flex-grow min-w-0">
                  <p className="text-[13px] font-bold uppercase truncate">{t.name}</p>
                  <p className="text-[12px] opacity-40 uppercase truncate">{t.artist}</p>
                </div>
                <Play size={10} className="opacity-0 group-hover:opacity-40" />
              </div>
            ))}
          </div>
        </div>
      )}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-black/10 dark:border-white/10 py-1 min-w-[120px]"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest opacity-20">Actions</div>
          {/* <button
            onClick={() => handleShareSong(contextMenu.track)}
            className="w-full px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Radio size={12} />
            <span>Share</span>
          </button> */}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [forceUpdate, setForceUpdate] = useState(0);
  const { user, token, setUser, setToken, logout, loginModalOpen, closeLoginModal, requireLogin } = useAuthStore();
  
  // 移动端标签页状态
  const [activeTab, setActiveTab] = useState<'live' | 'waves' | 'library' | 'settings'>('live');

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { currentSong, isPlaying, setPlaylist, setCurrentSong, followingSid, activeListeners } = usePlayerStore();
  const playerStore = usePlayerStore();

  useEffect(() => {
    initSocket(playerStore);

    onStateUpdated((payload) => {
      const sid = (payload as any)?.sid;
      if (sid && usePlayerStore.getState().followingSid === sid) {
        applyRemoteState({ song: (payload as any).song, state: (payload as any).state, time: (payload as any).time });
      }
    });

    // Restore profile if missing but token exists
    if (token && (!user?.userId || user.nickname === 'Netease User')) {
      getAccountInfo(token).then(data => {
        if (data.profile) {
          const userId = data.profile.userId || data.account?.id;
          setUser({
            userId: String(userId),
            nickname: data.profile.nickname,
            avatarUrl: data.profile.avatarUrl
          });
        } else if (data.account?.id) {
          const uid = String(data.account.id);
          setUser({ userId: uid, nickname: '网易云用户', avatarUrl: '' });
          getUserDetail(uid, token)
            .then(detail => {
              if (detail?.profile?.userId) {
                setUser({
                  userId: String(detail.profile.userId),
                  nickname: detail.profile.nickname,
                  avatarUrl: detail.profile.avatarUrl
                });
              }
            })
            .catch(() => {});
        }
      }).catch(() => {});
    }

    // Handle click outside for search
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      onStateUpdated(null);
    };
  }, [user?.userId, token]);

  useEffect(() => {
    const handleLoginSuccess = () => {
      // Force re-render when login succeeds
      setForceUpdate(prev => prev + 1);
    };

    window.addEventListener('login-success', handleLoginSuccess as EventListener);
    return () => {
      window.removeEventListener('login-success', handleLoginSuccess as EventListener);
    };
  }, []);

  // Sync logic: If following, update local song when followed user changes
  useEffect(() => {
    if (followingSid) {
      const leader = activeListeners.find(l => l.sid === followingSid);
      if (leader && leader.song?.id !== currentSong?.id) {
        setCurrentSong(leader.song);
      }
    }
  }, [activeListeners, followingSid]);

  // Pulse listening status
  useEffect(() => {
    if (user) {
      emitListeningStatus(user, currentSong, isPlaying, followingSid);
      const interval = setInterval(() => {
        emitListeningStatus(user, currentSong, isPlaying, followingSid);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [user, currentSong, isPlaying, followingSid]);

  // Search functionality
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!urlInput.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const data = await searchSongs(urlInput.trim(), 10);
      if (data.result && data.result.songs) {
        const songIds = data.result.songs.map((s: any) => s.id).join(',');
        const detailData = await fetchSongs(songIds, token || undefined);
        if (detailData.songs) {
          setSearchResults(detailData.songs);
        } else {
          setSearchResults(data.result.songs);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // // Trigger search when input changes
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     handleSearch();
  //   }, 300); // Debounce for 300ms

  //   return () => clearTimeout(timer);
  // }, [urlInput]);

  const playSearchSong = (song: any) => {
    if (!requireLogin()) return;
    const formattedSong = {
      id: String(song.id),
      name: song.name,
      artist: song.ar?.[0]?.name || 'Unknown',
      album: song.al?.name || '',
      albumArt: song.al?.picUrl || ''
    };
    playSong(formattedSong);
    setUrlInput('');
    setSearchResults([]);
  };

  const handleUrlPlay = async () => {
    if (!urlInput) return;
    if (!requireLogin()) return;
    const match = urlInput.match(/id=(\d+)/);
    const songId = match ? match[1] : urlInput.trim();

    try {
      const data = await fetchSongs(songId, token || undefined);
      if (data.songs?.[0]) {
        const s = data.songs[0];
        const song = {
          id: String(s.id),
          name: s.name,
          artist: s.ar?.[0]?.name || 'Unknown',
          album: s.al?.name || '',
          albumArt: s.al?.picUrl || ''
        };
        playSong(song);
        setUrlInput('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 处理回车键搜索
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <main className="relative w-full h-screen overflow-hidden bg-white dark:bg-black text-black dark:text-white">
      <Background />
      <MusicOcean />

      <>
        {/* 桌面端布局 */}
        <div className="hidden md:flex relative z-10 h-full flex-col px-12 overflow-hidden pt-12">

          <div className="flex items-center justify-between mb-16 max-w-7xl mx-auto w-full border-b border-black/5 pb-6">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => !user?.userId && useAuthStore.getState().openLoginModal()}>
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} className="w-14 h-14 rounded-full border border-black/5" alt="" />
              ) : (
                <div className="w-14 h-14 rounded-full border border-black/5 bg-black/5 dark:bg-white/10 flex items-center justify-center">
                  <User size={24} className="opacity-30" />
                </div>
              )}
              <div>
                <h1 className="text-base font-black uppercase tracking-widest">{user?.nickname || 'GUEST'}</h1>
                <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.3em]">{user?.userId ? 'Connected' : 'Tap to Login'} • WAVER</p>
              </div>
            </div>

              <div className="flex items-center gap-3">
                <div className="relative" ref={searchRef}>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onKeyPress={handleKeyPress}
                    placeholder="SEARCH FOR TRACKS..."
                    className="bg-black/5 border-none rounded-full px-8 py-3 text-[11px] font-bold uppercase tracking-widest w-72 focus:ring-1 focus:ring-black/20 outline-none transition-all dark:bg-white/10 dark:text-white dark:placeholder:text-white/30 dark:focus:ring-white/20"
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {urlInput && (
                      <button onClick={() => { setUrlInput(''); setSearchResults([]); }} className="opacity-20 hover:opacity-100 transition-opacity">
                        <X size={14} />
                      </button>
                    )}
                    <button onClick={handleSearch} className="opacity-20 hover:opacity-100 transition-opacity cursor-pointer">
                      <Search size={14} className="dark:opacity-30" />
                    </button>
                  </div>

                  {/* Search Results Dropdown */}
                  {isSearchFocused && urlInput.trim() && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-black dark:border dark:border-white/20 rounded-xl shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                      {isSearching ? (
                        <div className="px-4 py-3 text-sm text-center text-gray-500 dark:text-gray-400">Searching...</div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((song) => (
                          <div
                            key={song.id}
                            className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors"
                            onClick={() => playSearchSong(song)}
                          >
                            <div className="w-10 h-10 bg-gray-100 dark:bg-white/10 rounded overflow-hidden flex-shrink-0">
                              {song.al?.picUrl ? (
                                <img src={song.al.picUrl} alt={song.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Play size={14} className="text-gray-500 dark:text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-black uppercase truncate dark:text-white leading-tight mb-0.5">{song.name}</p>
                              <p className="text-[9px] font-bold uppercase text-gray-400 dark:text-white/40 truncate leading-none">
                                {song.ar?.[0]?.name} • {song.al?.name}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-center text-gray-500 dark:text-gray-400">No results found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={`grid grid-cols-12 gap-12 max-w-7xl mx-auto w-full flex-1 min-h-0 transition-all duration-300 ${currentSong ? 'pb-32' : 'pb-12'}`}>
              {/* Left: ChatRoom */}
              <div className="col-span-4 border-r border-black/5 pr-12 flex flex-col h-full min-h-0">
                <div className="flex items-center gap-3 mb-8 flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                  <h2 className="text-[12px] font-black tracking-[0.4em] uppercase opacity-40">Chat Room</h2>
                </div>
                <div className="flex-1 min-h-0">
                  <ChatRoom />
                </div>
              </div>

              {/* Center: Live Feed */}
              <div className="col-span-4 flex flex-col h-full min-h-0">
                <div className="flex items-center gap-3 mb-8 flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-black/20" />
                  <h2 className="text-[12px] font-black tracking-[0.4em] uppercase opacity-40">Live Now</h2>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
                  <LivingList />
                </div>
              </div>

              {/* Right: Library */}
              <div className="col-span-4 border-l border-black/5 pl-12 flex flex-col h-full min-h-0">
                <div className="flex items-center gap-3 mb-8 flex-shrink-0">
                  <Plus size={16} className="opacity-20" />
                  <h2 className="text-[12px] font-black tracking-[0.4em] uppercase opacity-40">Library</h2>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
                  <LibrarySection />
                </div>
              </div>
            </div>

            <Player />
          </div>

          {/* 移动端布局 */}
          <div className="md:hidden relative z-10 h-full flex flex-col">
            {/* 移动端头部 */}
            <MobileHeader 
              user={user}
              urlInput={urlInput}
              setUrlInput={setUrlInput}
              onSearch={handleSearch}
              searchResults={searchResults}
              isSearching={isSearching}
              onPlaySong={playSearchSong}
            />

            {/* 移动端内容区域 */}
            <div className={`flex-1 min-h-0 pt-20 px-4 flex flex-col transition-all duration-300 ${currentSong ? 'pb-36' : 'pb-24'}`}>
              {activeTab === 'live' && (
                <div className="flex flex-col h-full min-h-0">
                  <div className="flex items-center gap-3 mb-6 flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white animate-pulse" />
                    <h2 className="text-[12px] font-black tracking-[0.4em] uppercase opacity-40">Live Now</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
                    <LivingList />
                  </div>
                </div>
              )}
              {activeTab === 'waves' && (
                <div className="flex flex-col h-full min-h-0">
                  <div className="flex items-center gap-3 mb-6 flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white animate-pulse" />
                    <h2 className="text-[12px] font-black tracking-[0.4em] uppercase opacity-40">Chat Room</h2>
                  </div>
                  <div className="flex-1 min-h-0">
                    <ChatRoom />
                  </div>
                </div>
              )}
              {activeTab === 'library' && (
                <div className="flex flex-col h-full min-h-0">
                  <div className="flex items-center gap-3 mb-6 flex-shrink-0">
                    <Plus size={16} className="opacity-20" />
                    <h2 className="text-[12px] font-black tracking-[0.4em] uppercase opacity-40">Library</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
                    <LibrarySection />
                  </div>
                </div>
              )}
              {activeTab === 'settings' && (
                <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
                  <MobileSettingsPage />
                </div>
              )}
            </div>

            {/* 移动端播放器 */}
            <MobilePlayer />

            {/* 移动端底部导航 */}
            <BottomNav 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
            />
        </div>
      </>

      {/* Global Login Modal */}
      {loginModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeLoginModal}>
          <div onClick={(e) => e.stopPropagation()} className="relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeLoginModal}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
            >
              <X size={16} />
            </button>
            <LoginSection />
          </div>
        </div>
      )}
    </main>
  );
}