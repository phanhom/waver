// 动态获取 API URL，支持局域网访问
const getApiBase = () => {
    if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL !== 'undefined') {
        return process.env.NEXT_PUBLIC_API_URL;
    }
    // 在浏览器环境中，使用当前访问的主机名
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        return `http://${hostname}:19001/api`;
    }
    return 'http://localhost:19001/api';
};

const API_BASE = getApiBase();

function appendCookie(params: URLSearchParams, cookie?: string) {
    if (cookie) params.set('cookie', cookie);
}

export async function searchSongs(keywords: string, limit: number = 10) {
    const res = await fetch(
        `${API_BASE}/search?keywords=${encodeURIComponent(keywords)}&limit=${limit}`
    );
    if (!res.ok) throw new Error('Failed to search tracks');
    return res.json();
}

export async function fetchPlaylistDetail(playlistId: string, cookie?: string) {
    const params = new URLSearchParams();
    appendCookie(params, cookie);
    const qs = params.toString();
    const res = await fetch(
        `${API_BASE}/playlist/${encodeURIComponent(playlistId)}${qs ? `?${qs}` : ''}`
    );
    if (!res.ok) throw new Error('Failed to fetch playlist');
    return res.json();
}

/** 与歌单详情同一接口，供曲库列表拉取 tracks */
export async function fetchPlaylistTracks(playlistId: string, cookie?: string) {
    return fetchPlaylistDetail(playlistId, cookie);
}

export async function fetchSongs(ids: string | string[], cookie?: string) {
    const idStr = Array.isArray(ids) ? ids.join(',') : ids;
    const params = new URLSearchParams({ ids: idStr });
    appendCookie(params, cookie);
    const res = await fetch(`${API_BASE}/songs?${params}`);
    if (!res.ok) throw new Error('Failed to fetch songs');
    return res.json();
}

export async function fetchSongUrl(songId: string, level: string = 'standard', cookie?: string) {
    const params = new URLSearchParams({ level });
    appendCookie(params, cookie);
    const res = await fetch(`${API_BASE}/song/url/${encodeURIComponent(songId)}?${params}`);
    if (!res.ok) throw new Error('Failed to fetch song URL');
    return res.json();
}

export async function getAccountInfo(cookie: string) {
    const params = new URLSearchParams({ cookie });
    const res = await fetch(`${API_BASE}/user/account?${params}`);
    if (!res.ok) throw new Error('Failed to fetch account');
    return res.json();
}

export async function getUserDetail(uid: string, cookie?: string) {
    const params = new URLSearchParams({ uid });
    appendCookie(params, cookie);
    const res = await fetch(`${API_BASE}/user/detail?${params}`);
    if (!res.ok) throw new Error('Failed to fetch user detail');
    return res.json();
}

export async function getUserPlaylists(uid: string, cookie?: string) {
    const params = new URLSearchParams({ uid });
    appendCookie(params, cookie);
    const res = await fetch(`${API_BASE}/user/playlists?${params}`);
    if (!res.ok) throw new Error('Failed to fetch playlists');
    return res.json();
}

export async function getQRKey() {
    const res = await fetch(`${API_BASE}/login/qr/key`);
    if (!res.ok) throw new Error('Failed to get QR key');
    return res.json();
}

export async function getQRImage(key: string) {
    const params = new URLSearchParams({ key });
    const res = await fetch(`${API_BASE}/login/qr/image?${params}`);
    if (!res.ok) throw new Error('Failed to get QR image');
    return res.json();
}

export async function checkQRStatus(key: string) {
    const params = new URLSearchParams({ key });
    const res = await fetch(`${API_BASE}/login/qr/check?${params}`);
    if (!res.ok) throw new Error('Failed to check QR status');
    return res.json();
}

export async function fetchLyrics(id: string, cookie?: string) {
    const params = new URLSearchParams({ id });
    appendCookie(params, cookie);
    const res = await fetch(`${API_BASE}/lyric?${params}`);
    if (!res.ok) throw new Error('Failed to fetch lyrics');
    return res.json();
}

export async function sendCaptcha(phone: string, ctcode?: string) {
    const body = new FormData();
    body.append('phone', phone);
    if (ctcode) body.append('ctcode', ctcode);
    const res = await fetch(`${API_BASE}/captcha/sent`, { method: 'POST', body });
    return res.json();
}

export async function loginWithCaptcha(phone: string, captcha: string, countrycode?: string) {
    const body = new FormData();
    body.append('phone', phone);
    body.append('captcha', captcha);
    if (countrycode) body.append('countrycode', countrycode);
    const res = await fetch(`${API_BASE}/login/cellphone`, { method: 'POST', body });
    return res.json();
}

export async function loginWithPhone(phone: string, password: string, countrycode?: string) {
    const body = new FormData();
    body.append('phone', phone);
    body.append('password', password);
    if (countrycode) body.append('countrycode', countrycode);
    const res = await fetch(`${API_BASE}/login/cellphone`, { method: 'POST', body });
    return res.json();
}
