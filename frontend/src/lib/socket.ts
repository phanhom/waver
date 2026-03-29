import { io, Socket } from 'socket.io-client';

// 动态获取 Socket URL，支持局域网访问
const getSocketUrl = () => {
    if (process.env.NEXT_PUBLIC_SOCKET_URL && process.env.NEXT_PUBLIC_SOCKET_URL !== 'undefined') {
        return process.env.NEXT_PUBLIC_SOCKET_URL;
    }
    // 在浏览器环境中，使用当前访问的主机名
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        return `http://${hostname}:19001`;
    }
    return 'http://localhost:19001';
};

const SOCKET_URL = getSocketUrl();

let socket: Socket | null = null;

type StateUpdatedPayload = {
