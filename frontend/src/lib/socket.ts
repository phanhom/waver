import { io, Socket } from 'socket.io-client';

// 动态获取 Socket URL，支持局域网访问
const getSocketUrl = () => {
    if (process.env.NEXT_PUBLIC_SOCKET_URL && process.env.NEXT_PUBLIC_SOCKET_URL !== 'undefined') {
        return process.env.NEXT_PUBLIC_SOCKET_URL;
    }
    // 在浏览器环境中，使用当前访问的主机名
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        return `http://${hostname}:18021`;
    }
    return 'http://localhost:18021';
};

const SOCKET_URL = getSocketUrl();

let socket: Socket | null = null;

type StateUpdatedPayload = {
    room?: string;
    sid?: string;
    song?: any;
    state?: 'playing' | 'paused';
    time?: number;
};

type StateUpdatedHandler = (payload: StateUpdatedPayload) => void;
let stateUpdatedHandler: StateUpdatedHandler | null = null;

// 聊天室消息类型定义
export interface ChatMessage {
    user: {
        userId: string;
        nickname: string;
        name?: string;
        avatarUrl: string;
        avatar?: string;
    };
    message: string;
    timestamp: string;
}

type ChatMessageHandler = (message: ChatMessage) => void;
type ChatHistoryHandler = (messages: ChatMessage[]) => void;

let chatMessageHandler: ChatMessageHandler | null = null;
let chatHistoryHandler: ChatHistoryHandler | null = null;

export const initSocket = (store: any) => {
    const s = getSocket();

    joinOceanRoom();

    s.on('shared_waves_history', (waves: any[]) => {
        store.setSharedWaves(waves);
    });

    s.on('wave_shared', (wave: any) => {
        store.addSharedWave(wave);
    });

    s.on('wave_liked', (wave: any) => {
        store.updateSharedWaveLikes(wave);
    });

    s.on('wave_unliked', (wave: any) => {
        store.updateSharedWaveLikes(wave);
    });

    s.on('active_listeners_list', (listeners: any[]) => {
        store.setActiveListeners(listeners);
    });

    s.on('state_updated', (payload: StateUpdatedPayload) => {
        if (stateUpdatedHandler) stateUpdatedHandler(payload);
    });

    // 聊天室事件
    s.on('chat_message', (message: ChatMessage) => {
        if (chatMessageHandler) chatMessageHandler(message);
    });

    s.on('chat_history', (messages: ChatMessage[]) => {
        if (chatHistoryHandler) chatHistoryHandler(messages);
    });

    return s;
};

// 聊天室相关函数
export const onChatMessage = (handler: ChatMessageHandler | null) => {
    chatMessageHandler = handler;
};

export const onChatHistory = (handler: ChatHistoryHandler | null) => {
    chatHistoryHandler = handler;
};

export const sendChatMessage = (user: any, message: string) => {
    const s = getSocket();
    s.emit('chat_message', { 
        user: {
            userId: user.userId,
            nickname: user.nickname,
            avatarUrl: user.avatarUrl,
            // 确保同时包含name和avatar字段以兼容前端显示
            name: user.nickname,
            avatar: user.avatarUrl
        },
        message,
        timestamp: new Date().toISOString()
    });
};

export const loadChatHistory = () => {
    const s = getSocket();
    s.emit('get_chat_history');
};

export const onStateUpdated = (handler: StateUpdatedHandler | null) => {
    stateUpdatedHandler = handler;
};

export const getSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL);
    }
    return socket;
};

export const emitListeningStatus = (user: any, song: any, isPlaying: boolean, followingSid: string | null) => {
    const s = getSocket();
    s.emit('report_listening', { user, song, state: isPlaying ? 'playing' : 'paused', followingSid });
};

export const broadcastWave = (playlist: any, tracks: any[], user: any) => {
    const s = getSocket();
    const payload: any = { user, timestamp: new Date().toISOString(), likes: [], likeCount: 0 };
    
    if (playlist) {
        payload.playlist = playlist;
        payload.tracks = tracks;
    } else if (tracks && tracks.length === 1) {
        payload.song = tracks[0];
    } else {
        payload.tracks = tracks;
    }
    
    s.emit('broadcast_wave', payload);
};

export const likeWave = (waveId: string | null, playlistId: string | null, songId: string | null, user: any) => {
    const s = getSocket();
    s.emit('like_wave', { waveId, playlistId, songId, user });
};

export const unlikeWave = (waveId: string | null, playlistId: string | null, songId: string | null, userId: string) => {
    const s = getSocket();
    s.emit('unlike_wave', { waveId, playlistId, songId, userId });
};

export const joinOceanRoom = () => {
    const s = getSocket();
    s.emit('join_room', { room: 'ocean' });
};

export const emitPlayerState = (state: any) => {
    const s = getSocket();
    s.emit('update_state', { room: 'ocean', ...state });
};

export const cancelWave = (playlistId: string | null, songId: string | null, userId: string) => {
    const s = getSocket();
    s.emit('cancel_wave', { playlistId, songId, userId });
};

// Comment functions
export const addComment = (resourceId: string, resourceType: 'song' | 'playlist', content: string, user: any) => {
    const s = getSocket();
    s.emit('add_comment', {
        resourceId,
        resourceType,
        content,
        user: {
            userId: user.userId,
            nickname: user.nickname,
            avatarUrl: user.avatarUrl,
            name: user.nickname,
            avatar: user.avatarUrl
        },
        timestamp: new Date().toISOString()
    });
};

export const getComments = (resourceId: string, resourceType: 'song' | 'playlist') => {
    const s = getSocket();
    s.emit('get_comments', { resourceId, resourceType });
};

// Resource Like functions
export const addResourceLike = (resourceId: string, resourceType: 'song' | 'playlist', user: any) => {
    const s = getSocket();
    s.emit('add_like', {
        resourceId,
        resourceType,
        user: {
            userId: user.userId,
            nickname: user.nickname,
            avatarUrl: user.avatarUrl,
            name: user.nickname,
            avatar: user.avatarUrl
        },
        timestamp: new Date().toISOString()
    });
};

export const removeResourceLike = (resourceId: string, resourceType: 'song' | 'playlist', userId: string) => {
    const s = getSocket();
    s.emit('remove_like', { resourceId, resourceType, userId });
};

export const getResourceLikes = (resourceId: string, resourceType: 'song' | 'playlist') => {
    const s = getSocket();
    s.emit('get_likes', { resourceId, resourceType });
};