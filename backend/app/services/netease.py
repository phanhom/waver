import httpx
import logging
from typing import Optional, List, Dict, Any
from ..config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

class NeteaseService:
    def __init__(self):
        self.base_url = settings.NETEASE_API_BASE
        self._client = None

    def _normalize_cookie(self, cookie: Optional[str]) -> Optional[str]:
        if not cookie:
            return cookie

        attrs = {
            "max-age",
            "expires",
            "path",
            "domain",
            "samesite",
            "secure",
            "httponly",
            "priority",
        }

        parts = [p.strip() for p in cookie.split(";")]
        kv = {}
        for part in parts:
            if not part or "=" not in part:
                continue
            k, v = part.split("=", 1)
            k = k.strip()
            if k.lower() in attrs:
                continue
            kv[k] = v.strip()

        if not kv:
            return cookie

        return "; ".join([f"{k}={v}" for k, v in kv.items()])

    @property
    def client(self):
        if self._client is None:
            self._client = httpx.AsyncClient(base_url=self.base_url, timeout=10.0)
        return self._client

    def _add_real_ip(self, params: dict, real_ip: Optional[str] = None) -> dict:
        if real_ip:
            params["realIP"] = real_ip
        return params

    async def get_playlist_detail(self, playlist_id: str, cookies: Optional[str] = None, real_ip: Optional[str] = None) -> Dict[str, Any]:
        """Get playlist details and track IDs"""
        try:
            headers = {"Cookie": self._normalize_cookie(cookies)} if cookies else {}
            params = self._add_real_ip({"id": playlist_id}, real_ip)
            response = await self.client.get("/playlist/detail", params=params, headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching playlist {playlist_id}: {e}")
            return {"code": 500, "message": str(e)}

    async def get_song_url(self, song_id: str, level: str = "standard", cookies: Optional[str] = None, real_ip: Optional[str] = None) -> Dict[str, Any]:
        """Get song play URL"""
        try:
            headers = {"Cookie": self._normalize_cookie(cookies)} if cookies else {}
            params = self._add_real_ip({"id": song_id, "level": level}, real_ip)
            response = await self.client.get("/song/url/v1", params=params, headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching song url {song_id}: {e}")
            return {"code": 500, "message": str(e)}

    async def get_song_detail(self, song_ids: List[str], cookies: Optional[str] = None, real_ip: Optional[str] = None) -> Dict[str, Any]:
        """Get song details (name, artist, album art)"""
        try:
            ids_str = ",".join(song_ids)
            headers = {"Cookie": self._normalize_cookie(cookies)} if cookies else {}
            params = self._add_real_ip({"ids": ids_str}, real_ip)
            response = await self.client.get("/song/detail", params=params, headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching song details: {e}")
            return {"code": 500, "message": str(e)}

    async def get_qr_key(self, real_ip: Optional[str] = None) -> str:
        """Get QR key for login"""
        try:
            params = self._add_real_ip({}, real_ip)
            response = await self.client.get("/login/qr/key", params=params)
            response.raise_for_status()
            data = response.json()
            key = data["data"]["unikey"]
            return key
        except Exception as e:
            logger.error(f"QR key error: {e}")
            raise

    async def get_qr_image(self, key: str, real_ip: Optional[str] = None) -> str:
        """Get QR image (base64)"""
        try:
            params = self._add_real_ip({"key": key, "qrimg": "true"}, real_ip)
            response = await self.client.get("/login/qr/create", params=params)
            response.raise_for_status()
            data = response.json()
            img = data["data"]["qrimg"]
            return img
        except Exception as e:
            logger.error(f"QR image error: {e}")
            raise

    async def check_qr_status(self, key: str, real_ip: Optional[str] = None) -> Dict[str, Any]:
        """Check login status"""
        try:
            params = self._add_real_ip({"key": key}, real_ip)
            response = await self.client.get("/login/qr/check", params=params)
            response.raise_for_status()
            data = response.json()
            if isinstance(data, dict) and data.get("cookie"):
                data["cookie"] = self._normalize_cookie(data.get("cookie"))
            return data
        except Exception as e:
            logger.error(f"QR status check error: {e}")
            raise

    async def get_account_info(self, cookie: str, real_ip: Optional[str] = None) -> Dict[str, Any]:
        """Get current account info using cookie"""
        try:
            params = self._add_real_ip({}, real_ip)
            response = await self.client.get("/user/account", params=params, headers={"Cookie": self._normalize_cookie(cookie)})
            return response.json()
        except Exception as e:
            logger.error(f"Account info error: {e}")
            return {"code": 500, "message": str(e)}

    async def get_user_playlists(self, uid: str, cookies: str = None, real_ip: Optional[str] = None) -> Dict[str, Any]:
        """Get user's playlists"""
        try:
            headers = {"Cookie": self._normalize_cookie(cookies)} if cookies else {}
            params = self._add_real_ip({"uid": uid}, real_ip)
            response = await self.client.get("/user/playlist", params=params, headers=headers)
            return response.json()
        except Exception as e:
            logger.error(f"Playlists fetch error for UID {uid}: {e}")
            return {"code": 500, "message": str(e)}

    async def get_user_detail(self, uid: str, cookies: Optional[str] = None, real_ip: Optional[str] = None) -> Dict[str, Any]:
        """Get user details/profile"""
        try:
            headers = {"Cookie": self._normalize_cookie(cookies)} if cookies else {}
            params = self._add_real_ip({"uid": uid}, real_ip)
            response = await self.client.get("/user/detail", params=params, headers=headers)
            return response.json()
        except Exception as e:
            return {"code": 500, "message": str(e)}

    async def get_lyrics(self, song_id: str, cookies: Optional[str] = None, real_ip: Optional[str] = None) -> Dict[str, Any]:
        """Get song lyrics (including word-by-word lyrics)"""
        try:
            headers = {"Cookie": self._normalize_cookie(cookies)} if cookies else {}
            params: Dict[str, Any] = {"id": song_id, "lv": -1, "tv": -1, "rv": -1}
            self._add_real_ip(params, real_ip)
            response = await self.client.get("/lyric", params=params, headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching lyrics for song {song_id}: {e}")
            return {"code": 500, "message": str(e)}

    async def send_captcha(self, phone: str, ctcode: Optional[str] = None, real_ip: Optional[str] = None) -> Dict[str, Any]:
        """Send captcha to phone number"""
        try:
            params: Dict[str, Any] = {"phone": phone}
            if ctcode:
                params["ctcode"] = ctcode
            self._add_real_ip(params, real_ip)

            response = await self.client.post("/captcha/sent", data=params)
            return response.json()
        except Exception as e:
            logger.error(f"Error sending captcha to {phone}: {e}")
            return {"code": 500, "message": str(e)}

    async def login_with_cellphone(self, phone: str, password: Optional[str] = None,
                                  captcha: Optional[str] = None, countrycode: Optional[str] = None,
                                  real_ip: Optional[str] = None) -> Dict[str, Any]:
        """Login with cellphone (password or captcha)"""
        try:
            params: Dict[str, Any] = {"phone": phone}
            if password:
                params["password"] = password
            if captcha:
                params["captcha"] = captcha
            if countrycode:
                params["countrycode"] = countrycode
            self._add_real_ip(params, real_ip)

            response = await self.client.post("/login/cellphone", data=params)
            data = response.json()
            if isinstance(data, dict) and data.get("cookie"):
                data["cookie"] = self._normalize_cookie(data.get("cookie"))
            return data
        except Exception as e:
            logger.error(f"Error logging in with cellphone {phone}: {e}")
            return {"code": 500, "message": str(e)}

    async def search(self, keywords: str, limit: int = 10, search_type: int = 1, real_ip: Optional[str] = None) -> Dict[str, Any]:
        """Search for songs"""
        try:
            params = self._add_real_ip({"keywords": keywords, "limit": limit, "type": search_type}, real_ip)
            response = await self.client.get("/search", params=params)
            return response.json()
        except Exception as e:
            logger.error(f"Search Error: {e}")
            return {"code": 500, "message": str(e)}

netease_service = NeteaseService()
