import { Howl } from 'howler';
import { useAuthStore, usePlayerStore } from './store';
import { fetchSongUrl } from './api';
import { emitPlayerState } from './socket';

let player: Howl | null = null;
let progressInterval: any = null;
let suppressEmit = false;
let lastStateEmitAt = 0;
let playRequestId = 0;

const createHowl = (audioUrl: string, song: any, html5: boolean) => {
    const { setIsPlaying, setProgress, setIsLoading } = usePlayerStore.getState();
    return new Howl({
        src: [audioUrl],
        html5,
        xhr: {
            withCredentials: false
        },
        format: ['mp3'],
        volume: usePlayerStore.getState().volume,
        onplay: () => {
            setIsPlaying(true);
            setIsLoading(false);
            startProgressTimer();
            if (!suppressEmit) emitPlayerState({ song, state: 'playing', time: player?.seek() });
        },
        onload: () => {
            setIsLoading(false);
            if (player) usePlayerStore.getState().setDuration(player.duration());
        },
        onloaderror: (id: any, err: any) => {
            setIsLoading(false);
            console.error("Howler onloaderror:", err);
        },
        onplayerror: (id: any, err: any) => {
            console.error("Howler onplayerror:", err);
            player?.once('unlock', () => player?.play());
        },
        onpause: () => {
            setIsPlaying(false);
            stopProgressTimer();
            if (!suppressEmit) emitPlayerState({ song, state: 'paused', time: player?.seek() });
        },
        onstop: () => {
            setIsPlaying(false);
            stopProgressTimer();
            setProgress(0);
        },
        onend: () => {
            setIsPlaying(false);
            stopProgressTimer();
            usePlayerStore.getState().nextSong();
        }
    });
};

export const playSong = async (song: any, exitFollowMode: boolean = true) => {
    const requestId = ++playRequestId;
    if (player) {
        player.stop();
        player.unload();
    }

    const { setCurrentSong, setIsPlaying, setProgress, setCurrentTime, setDuration, setFollowingSid, setIsLoading } = usePlayerStore.getState();
    const { token } = useAuthStore.getState();
    
    setIsLoading(true);
    
    if (exitFollowMode) setFollowingSid(null);

    try {
        const urlData = await fetchSongUrl(song.id, 'standard', token || undefined);
        if (requestId !== playRequestId) return;
        const audioUrl = urlData.data?.[0]?.url;

        if (!audioUrl) {
            throw new Error('Song URL not found');
        }

        player = createHowl(audioUrl, song, false);
        // If decoding fails in WebAudio, retry with html5 audio (more compatible)
        player.once('loaderror', () => {
            if (requestId !== playRequestId) return;
            try {
                player?.stop();
                player?.unload();
            } catch (_) {}
            player = createHowl(audioUrl, song, true);
            player.play();
        });

        player.play();
        setCurrentSong(song);
    } catch (error) {
        setIsLoading(false);
        console.error('Playback error:', error);
        alert('Failed to play song. This could be due to copyright or VIP restrictions.');
    }
};

export const togglePlay = () => {
    if (!player) return;
    if (player.playing()) {
        player.pause();
    } else {
        player.play();
    }
};

export const setVolume = (val: number) => {
    if (player) player.volume(val);
};

export const seek = (val: number) => {
    if (player) {
        const duration = player.duration();
        const t = duration * (val / 100);
        player.seek(t);
        const song = usePlayerStore.getState().currentSong;
        if (song && !suppressEmit) emitPlayerState({ song, state: player.playing() ? 'playing' : 'paused', time: t });
        // 退出跟随模式
        usePlayerStore.getState().setFollowingSid(null);
    }
};

export const applyRemoteState = async (payload: { song?: any; state?: 'playing' | 'paused'; time?: number }) => {
    const { song, state, time } = payload;
    const store = usePlayerStore.getState();

    const normalizedSong = song
        ? {
              id: String(song.id === 'sleepy_lagoon' ? '464728417' : song.id),
              name: song.name,
              artist: song.artist || song.ar?.[0]?.name || 'Unknown',
              album: song.album || song.al?.name || '',
              albumArt: song.albumArt || song.al?.picUrl || '',
          }
        : null;

    suppressEmit = true;
    try {
        if (normalizedSong && normalizedSong.id && store.currentSong?.id !== normalizedSong.id) {
            await playSong(normalizedSong, false);
        }

        if (player && typeof time === 'number' && !Number.isNaN(time)) {
            player.seek(time);
            store.setCurrentTime(time);
            const duration = player.duration();
            store.setDuration(duration);
            store.setProgress(duration > 0 ? (time / duration) * 100 : 0);
        }

        if (player && state) {
            const isPlaying = player.playing();
            if (state === 'playing' && !isPlaying) player.play();
            if (state === 'paused' && isPlaying) player.pause();
        }
    } finally {
        setTimeout(() => {
            suppressEmit = false;
        }, 200);
    }
};

const startProgressTimer = () => {
    stopProgressTimer();
    progressInterval = setInterval(() => {
        if (player && player.playing()) {
            const duration = player.duration();
            const current = player.seek() as number;
            const progress = duration > 0 ? (current / duration) * 100 : 0;
            const store = usePlayerStore.getState();
            store.setProgress(progress);
            store.setCurrentTime(current);
            store.setDuration(duration);

            const now = Date.now();
            if (!suppressEmit && !store.followingSid && store.currentSong && now - lastStateEmitAt >= 1000) {
                lastStateEmitAt = now;
                emitPlayerState({
                    song: store.currentSong,
                    state: 'playing',
                    time: current
                });
            }
        }
    }, 100);
};

const stopProgressTimer = () => {
    if (progressInterval) clearInterval(progressInterval);
};
