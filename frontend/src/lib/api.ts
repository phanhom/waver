// 动态获取 API URL，支持局域网访问
const getApiBase = () => {
    if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL !== 'undefined') {
        return process.env.NEXT_PUBLIC_API_URL;
    }
    // 在浏览器环境中，使用当前访问的主机名
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        return `http://${hostname}:18021/api`;
    }
    return 'http://localhost:18021/api';
};

const API_BASE = getApiBase();


export async function searchSongs(keywords: string, limit: number = 10) {
  const res = await fetch(`${API_BASE}/search?keywords=${encodeURIComponent(keywords)}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to search tracks');
  return res.json();
}

// Fetch song details by ids
export async function fetchSongs(ids: string, cookie?: string) {
  const url = cookie
    ? `${API_BASE}/songs?ids=${ids}&cookie=${encodeURIComponent(cookie)}`
    : `${API_BASE}/songs?ids=${ids}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch tracks');
  return res.json();
}

export async function fetchSongUrl(id: string, level: string = 'standard', cookie?: string) {
    const url = cookie
        ? `${API_BASE}/song/url/${id}?level=${level}&cookie=${encodeURIComponent(cookie)}`
        : `${API_BASE}/song/url/${id}?level=${level}`;
    const res = await fetch(url);
    if (!res.ok) {
        console.error('Failed to fetch song URL:', res.status, res.statusText);
        // Return empty object instead of throwing error to avoid breaking the UI
        return {};
    }
    return res.json();
}

export async function getQRKey() {
    const res = await fetch(`${API_BASE}/login/qr/key`);
    if (!res.ok) {
        throw new Error(`Failed to get QR key: ${res.status} ${res.statusText}`);
    }
    return res.json();
}

export async function getQRImage(key: string) {
    const res = await fetch(`${API_BASE}/login/qr/image?key=${key}`);
    if (!res.ok) {
        throw new Error(`Failed to get QR image: ${res.status} ${res.statusText}`);
    }
    return res.json();
}

export async function checkQRStatus(key: string) {
    const res = await fetch(`${API_BASE}/login/qr/check?key=${key}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`QR status check failed: ${res.status} ${res.statusText}`);
    }

    return res.json();
}

export async function loginWithPhone(phone: string, password: string, countrycode?: string) {
    const params = new URLSearchParams();
    params.append('phone', phone);
    params.append('password', password);
    if (countrycode) params.append('countrycode', countrycode);
    
    const res = await fetch(`${API_BASE}/login/cellphone`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
    });
    return res.json();
}

export async function sendCaptcha(phone: string, ctcode?: string) {
    const params = new URLSearchParams();
    params.append('phone', phone);
    if (ctcode) params.append('ctcode', ctcode);
    
    const res = await fetch(`${API_BASE}/captcha/sent`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
    });
    return res.json();
}

export async function loginWithCaptcha(phone: string, captcha: string, countrycode?: string) {
    const params = new URLSearchParams();
    params.append('phone', phone);
    params.append('captcha', captcha);
    if (countrycode) params.append('countrycode', countrycode);
    
    const res = await fetch(`${API_BASE}/login/cellphone`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
    });
    return res.json();
}

export async function getAccountInfo(cookie: string) {
    const res = await fetch(`${API_BASE}/user/account?cookie=${encodeURIComponent(cookie)}`);
    return res.json();
}

export async function getUserDetail(uid: string, cookie?: string) {
    const url = cookie
        ? `${API_BASE}/user/detail?uid=${encodeURIComponent(uid)}&cookie=${encodeURIComponent(cookie)}`
        : `${API_BASE}/user/detail?uid=${encodeURIComponent(uid)}`;
    const res = await fetch(url);
    return res.json();
}

export async function getUserPlaylists(uid: string, cookie: string) {
    const res = await fetch(`${API_BASE}/user/playlists?uid=${uid}&cookie=${encodeURIComponent(cookie)}`);
    return res.json();
}

export async function fetchPlaylistDetail(id: string, cookie?: string) {
    const url = cookie
        ? `${API_BASE}/playlist/${id}?cookie=${encodeURIComponent(cookie)}`
        : `${API_BASE}/playlist/${id}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Playlist not found');
    return res.json();
}

export async function fetchPlaylistTracks(id: string, cookie?: string) {
    const url = cookie
        ? `${API_BASE}/playlist/${id}?cookie=${encodeURIComponent(cookie)}`
        : `${API_BASE}/playlist/${id}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Playlist not found');
    return res.json();
}

// 获取逐句歌词
export async function fetchLyrics(id: string, cookie?: string) {
    const url = cookie
        ? `${API_BASE}/lyric?id=${id}&cookie=${encodeURIComponent(cookie)}`
        : `${API_BASE}/lyric?id=${id}`;

    console.log('Fetching lyrics from:', url);

    try {
        const res = await fetch(url);
        console.log('Lyrics API response status:', res.status);

        if (!res.ok) {
            const errorText = await res.text();
            console.error('Lyrics API error response:', errorText);
            // Return normalized empty lyrics instead of empty object
            return { lrc: { lyric: "" }, tlyric: { lyric: "" } };
        }

        const data = await res.json();
        console.log('Lyrics API response data:', data);
        // Normalize response to ensure lrc and tlyric fields exist
        return {
            lrc: data.lrc || { lyric: "" },
            tlyric: data.tlyric || { lyric: "" },
            ...data
        };
    } catch (error) {
        console.error('Lyrics fetch error:', error);
        // Return normalized empty lyrics instead of empty object
        return { lrc: { lyric: "" }, tlyric: { lyric: "" } };
    }
}