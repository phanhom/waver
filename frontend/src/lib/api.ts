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


export async function searchSongs(keywords: string, limit: number = 10) {
  const res = await fetch(`${API_BASE}/search?keywords=${encodeURIComponent(keywords)}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to search tracks');
  return res.json();
