'use client';

import React, { useState } from 'react';
import { Search, User } from 'lucide-react';
import { useAuthStore, usePlayerStore } from '@/lib/store';
import { fetchPlaylistDetail } from '@/lib/api';
export default function Header() {
    const { user, token } = useAuthStore();
    const { setPlaylist } = usePlayerStore();
    const [url, setUrl] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    const handleImport = async () => {
        if (!url) return;
        setIsImporting(true);
        try {
            // Extract ID from URL if needed
            const id = url.includes('id=') ? url.split('id=')[1].split('&')[0] : url;
            const data = await fetchPlaylistDetail(id, token || undefined);
            if (data.playlist?.tracks) {
                const tracks = data.playlist.tracks.map((t: any) => ({
                    id: t.id.toString(),
                    name: t.name,
                    artist: t.ar[0].name,
                    album: t.al.name,
                    albumArt: t.al.picUrl
                }));
                setPlaylist(tracks);
                setUrl('');
            }
        } catch (e) {
            console.error('Import failed', e);
            alert('Failed to import playlist. Make sure the ID/URL is correct.');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 px-8 py-8 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-3 text-black dark:text-white font-black text-2xl tracking-[0.2em] pointer-events-auto select-none">
                WAVER
            </div>

            <div className="flex-grow max-w-lg mx-12 pointer-events-auto">
                <div className="relative group">
                    <input
                        type="text"
                        placeholder="Paste Netease Playlist ID..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                        className="w-full bg-white dark:bg-white/10 border border-black/10 dark:border-white/20 rounded-2xl py-3 px-12 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:border-black dark:focus:border-white shadow-sm transition-all"
                    />
                    <Search className="absolute left-4 top-3.5 text-black/30 dark:text-white/30 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" size={20} />
                    <button
                        onClick={handleImport}
                        disabled={isImporting}
                        className="absolute right-2.5 top-2 bg-black dark:bg-white text-white dark:text-black text-sm font-bold px-5 py-1.5 rounded-xl hover:bg-black/90 dark:hover:bg-white/90 disabled:opacity-50 transition-colors"
                    >
                        {isImporting ? '...' : 'CONNECT'}
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4 pointer-events-auto">
                <div className="flex items-center gap-2 text-black dark:text-white bg-white dark:bg-white/10 px-5 py-2.5 rounded-2xl border border-black/10 dark:border-white/20 shadow-sm font-bold text-sm">
                    <User size={18} />
                    <span>{user ? user.nickname.toUpperCase() : 'USER'}</span>
                </div>
            </div>
        </header>
    );
}
