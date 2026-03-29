import { io, Socket } from 'socket.io-client';
import type { PlayerStore } from './store';

const DEFAULT_BACKEND_PORT = process.env.NEXT_PUBLIC_BACKEND_PORT || '19001';

/**
 * 必须在浏览器里惰性解析：避免 SSR / 构建阶段把错误的 URL 固化进包。
 * 若 NEXT_PUBLIC_SOCKET_URL 误指到「与当前页面相同端口」（前端无 Socket.IO），则改连后端端口。
 */
function resolveSocketUrl(): string {
    const fromEnv = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (fromEnv && fromEnv !== 'undefined') {
        try {
            const u = new URL(fromEnv);
            if (typeof window !== 'undefined') {
                const pageHost = window.location.hostname;
                const pagePort =
                    window.location.port ||
                    (window.location.protocol === 'https:' ? '443' : '80');
                const socketPort = u.port || (u.protocol === 'https:' ? '443' : '80');
                // 配置的端口与当前页面端口相同，且不是后端端口：多为把 Socket 指到了 Next 前端
                if (socketPort === pagePort && pagePort !== DEFAULT_BACKEND_PORT) {
                    return `http://${pageHost}:${DEFAULT_BACKEND_PORT}`;
                }
            }
            return fromEnv.replace(/\/$/, '');
        } catch {
            return fromEnv;
        }
    }
    if (typeof window === 'undefined') {
        return `http://localhost:${DEFAULT_BACKEND_PORT}`;
    }
    return `http://${window.location.hostname}:${DEFAULT_BACKEND_PORT}`;
}

let socket: Socket | null = null;

export type StateUpdatedPayload = {
    sid?: string;
    song?: any;
    state?: 'playing' | 'paused';
    time?: number;
    room?: string;
};

export type ChatMessage = {
    id?: string;
    user: any;
    message: string;
    timestamp: string;
    status?: 'pending' | 'pass' | 'block';
    moderationNote?: string;
    ownerOnly?: boolean;
};

let stateUpdatedCb: ((payload: StateUpdatedPayload) => void) | null = null;

function onStateUpdatedEvent(payload: StateUpdatedPayload) {
    stateUpdatedCb?.(payload);
}

/** 客户端单例；SSR 返回 null */
export function getSocket(): Socket | null {
    if (typeof window === 'undefined') return null;
    if (!socket) {
        socket = io(resolveSocketUrl(), { transports: ['websocket', 'polling'] });
    }
    return socket;
}

/** 订阅 / 取消同播状态（用于跟听） */
export function onStateUpdated(cb: ((payload: StateUpdatedPayload) => void) | null) {
    const s = getSocket();
    if (!s) return;
    s.off('state_updated', onStateUpdatedEvent);
    stateUpdatedCb = cb;
    if (cb) {
        s.on('state_updated', onStateUpdatedEvent);
    }
}

let initSocketCleanup: (() => void) | null = null;

export function initSocket(
    store: Pick<
        PlayerStore,
        'setSharedWaves' | 'addSharedWave' | 'setActiveListeners' | 'updateSharedWaveLikes'
    >
) {
    const s = getSocket();
    if (!s) return;

    initSocketCleanup?.();
    initSocketCleanup = null;

    const onSharedWavesHistory = (waves: any[]) => store.setSharedWaves(waves);
    const onWaveShared = (wave: any) => store.addSharedWave(wave);
    const onActiveListeners = (listeners: any[]) => store.setActiveListeners(listeners);
    const onWaveLiked = (wave: any) => store.updateSharedWaveLikes(wave);
    const onWaveUnliked = (wave: any) => store.updateSharedWaveLikes(wave);

    s.on('shared_waves_history', onSharedWavesHistory);
    s.on('wave_shared', onWaveShared);
    s.on('active_listeners_list', onActiveListeners);
    s.on('wave_liked', onWaveLiked);
    s.on('wave_unliked', onWaveUnliked);

    s.emit('join_room', { room: 'ocean' });

    initSocketCleanup = () => {
        s.off('shared_waves_history', onSharedWavesHistory);
        s.off('wave_shared', onWaveShared);
        s.off('active_listeners_list', onActiveListeners);
        s.off('wave_liked', onWaveLiked);
        s.off('wave_unliked', onWaveUnliked);
    };
}

export function emitListeningStatus(
    user: any,
    currentSong: any,
    isPlaying: boolean,
    followingSid: string | null
) {
    const s = getSocket();
    if (!s?.connected) return;
    s.emit('report_listening', {
        user,
        song: currentSong,
        state: isPlaying ? 'playing' : 'paused',
        followingSid,
    });
}

function formatSongForWave(track: any) {
    return {
        id: String(track.id),
        name: track.name,
        artist: track.artist ?? track.ar?.[0]?.name ?? 'Unknown',
        album: track.album ?? track.al?.name ?? '',
        albumArt: track.albumArt ?? track.al?.picUrl ?? '',
    };
}

/** 分享歌单（playlist + tracks）或单曲（playlist 为 null） */
export function broadcastWave(playlist: any | null, tracks: any[], user: any) {
    const s = getSocket();
    if (!s) return;

    const timestamp = new Date().toISOString();
    const payload: Record<string, unknown> = { user, timestamp };

    if (playlist) {
        payload.playlist = {
            id: playlist.id,
            name: playlist.name,
            coverImgUrl: playlist.coverImgUrl ?? playlist.coverUrl,
        };
        if (tracks[0]) payload.song = formatSongForWave(tracks[0]);
    } else if (tracks[0]) {
        payload.song = formatSongForWave(tracks[0]);
    } else {
        return;
    }

    s.emit('broadcast_wave', payload);
}

export function cancelWave(playlistId: string | null, songId: string | null, userId: string) {
    const s = getSocket();
    if (!s) return;
    const data: Record<string, string> = { userId };
    if (playlistId) data.playlistId = String(playlistId);
    if (songId) data.songId = String(songId);
    s.emit('cancel_wave', data);
}

export function likeWave(waveId: string, playlistId: any, songId: any, user: any) {
    const s = getSocket();
    if (!s) return;
    s.emit('like_wave', {
        waveId,
        playlistId: playlistId ?? undefined,
        songId: songId ?? undefined,
        user,
    });
}

export function unlikeWave(waveId: string, playlistId: any, songId: any, userId: string) {
    const s = getSocket();
    if (!s) return;
    s.emit('unlike_wave', {
        waveId,
        playlistId: playlistId ?? undefined,
        songId: songId ?? undefined,
        userId,
    });
}

export function addComment(resourceId: string | number, resourceType: string, content: string, user: any) {
    const s = getSocket();
    if (!s) return;
    s.emit('add_comment', {
        resourceId: String(resourceId),
        resourceType,
        content,
        user,
        timestamp: new Date().toISOString(),
    });
}

export function getComments(resourceId: string | number, resourceType: string) {
    const s = getSocket();
    if (!s) return;
    s.emit('get_comments', {
        resourceId: String(resourceId),
        resourceType,
    });
}

/** 预留：后端暂无对应 socket 事件 */
export function addResourceLike() {}
export function removeResourceLike() {}
export function getResourceLikes() {}

export function emitPlayerState(payload: {
    song: any;
    state: 'playing' | 'paused';
    time?: number;
}) {
    const s = getSocket();
    if (!s) return;
    s.emit('update_state', {
        room: 'ocean',
        song: payload.song,
        state: payload.state,
        time: payload.time,
    });
}

export function sendChatMessage(user: any, message: string) {
    const s = getSocket();
    if (!s) return;
    s.emit('chat_message', {
        user,
        message,
        timestamp: new Date().toISOString(),
    });
}

/** 拉取聊天历史（连接时服务端会推一次；晚挂载的 ChatRoom / 移动端 Tab 需主动请求） */
export function requestChatHistory() {
    const s = getSocket();
    if (!s?.connected) return;
    s.emit('get_chat_history');
}
