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

    async def get_playlist_detail(self, playlist_id: str, cookies: Optional[str] = None) -> Dict[str, Any]:
        """Get playlist details and track IDs"""
        try:
            headers = {"Cookie": self._normalize_cookie(cookies)} if cookies else {}
            response = await self.client.get(f"/playlist/detail?id={playlist_id}", headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching playlist {playlist_id}: {e}")
            return {"code": 500, "message": str(e)}

    async def get_song_url(self, song_id: str, level: str = "standard", cookies: Optional[str] = None) -> Dict[str, Any]:
        """Get song play URL"""
        try:
            headers = {"Cookie": self._normalize_cookie(cookies)} if cookies else {}
            response = await self.client.get(f"/song/url/v1?id={song_id}&level={level}", headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching song url {song_id}: {e}")
            return {"code": 500, "message": str(e)}

    async def get_song_detail(self, song_ids: List[str], cookies: Optional[str] = None) -> Dict[str, Any]:
        """Get song details (name, artist, album art)"""
        try:
            ids_str = ",".join(song_ids)
            headers = {"Cookie": self._normalize_cookie(cookies)} if cookies else {}
            response = await self.client.get(f"/song/detail?ids={ids_str}", headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching song details: {e}")
            return {"code": 500, "message": str(e)}

    async def get_qr_key(self) -> str:
        """Get QR key for login"""
        try:
            print("NeteaseService: Getting QR key...")
            response = await self.client.get("/login/qr/key")
            response.raise_for_status()
            data = response.json()
            key = data["data"]["unikey"]
            print(f"NeteaseService: Got QR key: {key}")
            return key
        except Exception as e:
            print(f"NeteaseService: QR key error: {e}")
            raise

    async def get_qr_image(self, key: str) -> str:
        """Get QR image (base64)"""
        try:
            print(f"NeteaseService: Getting QR image for key: {key}")
            response = await self.client.get(f"/login/qr/create?key={key}&qrimg=true")
            response.raise_for_status()
            data = response.json()
            img = data["data"]["qrimg"]
            print(f"NeteaseService: Got QR image successfully")
            return img
        except Exception as e:
            print(f"NeteaseService: QR image error: {e}")
            raise

    async def check_qr_status(self, key: str) -> Dict[str, Any]:
        """Check login status"""
        try:
            print(f"NeteaseService: Checking QR status for key: {key}")
            response = await self.client.get(f"/login/qr/check?key={key}")
            response.raise_for_status()
            data = response.json()
            if isinstance(data, dict) and data.get("cookie"):
                data["cookie"] = self._normalize_cookie(data.get("cookie"))
            print(f"NeteaseService: QR status: {data}")
            return data
        except Exception as e:
            print(f"NeteaseService: QR status check error: {e}")
            raise

    async def get_account_info(self, cookie: str) -> Dict[str, Any]:
        """Get current account info using cookie"""
        try:
            print(f"DEBUG: Fetching account info with cookie: {cookie[:20]}...")
            response = await self.client.get("/user/account", headers={"Cookie": self._normalize_cookie(cookie)})
            data = response.json()
            print(f"DEBUG: Account Response Code: {data.get('code')}")
            return data
        except Exception as e:
            print(f"DEBUG: Account Error: {e}")
            return {"code": 500, "message": str(e)}

    async def get_user_playlists(self, uid: str, cookies: str = None) -> Dict[str, Any]:
        """Get user's playlists"""
        try:
            print(f"DEBUG: Fetching playlists for UID: {uid}")
            url = f"/user/playlist?uid={uid}"
            headers = {"Cookie": self._normalize_cookie(cookies)} if cookies else {}
            response = await self.client.get(url, headers=headers)
            data = response.json()
            
            # Check for success
            if data.get("code") == 200:
                list_data = data.get("playlist") or data.get("playlists") or []
                print(f"DEBUG: Netease API Success. Playlists found: {len(list_data)}")
            else:
                print(f"DEBUG: Netease API Error. Code: {data.get('code')}, Message: {data.get('msg') or data.get('message')}")
                
            return data
        except Exception as e:
            print(f"DEBUG: Playlists Fetch Exception: {e}")
            return {"code": 500, "message": str(e)}

    async def get_user_detail(self, uid: str, cookies: Optional[str] = None) -> Dict[str, Any]:
        """Get user details/profile"""
        try:
            headers = {"Cookie": self._normalize_cookie(cookies)} if cookies else {}
            response = await self.client.get(f"/user/detail?uid={uid}", headers=headers)
            return response.json()
        except Exception as e:
            return {"code": 500, "message": str(e)}

    async def get_lyrics(self, song_id: str, cookies: Optional[str] = None) -> Dict[str, Any]:
        """Get song lyrics (including word-by-word lyrics)"""
        try:
            headers = {"Cookie": self._normalize_cookie(cookies)} if cookies else {}
            # Add parameters for word-by-word lyrics
            params = {
                "id": song_id,
                "lv": -1,  # Enable word-by-word lyrics
                "tv": -1,  # Enable translation if available
                "rv": -1   # Enable romaji if available
            }
            print(f"NeteaseService: Fetching lyrics with params: {params}")
            response = await self.client.get("/lyric", params=params, headers=headers)
            print(f"NeteaseService: Response status: {response.status_code}")
            response.raise_for_status()
            data = response.json()
            print(f"NeteaseService: Response data keys: {list(data.keys()) if isinstance(data, dict) else 'not dict'}")
            return data
        except Exception as e:
            logger.error(f"Error fetching lyrics for song {song_id}: {e}")
            return {"code": 500, "message": str(e)}

    async def send_captcha(self, phone: str, ctcode: Optional[str] = None) -> Dict[str, Any]:
        """Send captcha to phone number"""
        try:
            params = {"phone": phone}
            if ctcode:
                params["ctcode"] = ctcode

            response = await self.client.post("/captcha/sent", data=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error sending captcha to {phone}: {e}")
            return {"code": 500, "message": str(e)}

    async def login_with_cellphone(self, phone: str, password: Optional[str] = None,
                                  captcha: Optional[str] = None, countrycode: Optional[str] = None) -> Dict[str, Any]:
        """Login with cellphone (password or captcha)"""
        try:
            params = {"phone": phone}
            if password:
                params["password"] = password
            if captcha:
                params["captcha"] = captcha
            if countrycode:
                params["countrycode"] = countrycode

            response = await self.client.post("/login/cellphone", data=params)
            response.raise_for_status()
            data = response.json()
            if isinstance(data, dict) and data.get("cookie"):
                data["cookie"] = self._normalize_cookie(data.get("cookie"))
            return data
        except Exception as e:
            logger.error(f"Error logging in with cellphone {phone}: {e}")
            return {"code": 500, "message": str(e)}

    async def search(self, keywords: str, limit: int = 10, search_type: int = 1) -> Dict[str, Any]:
        """Search for songs"""
        try:
            response = await self.client.get(f"/search?keywords={keywords}&limit={limit}&type={search_type}")
            return response.json()
        except Exception as e:
            logger.error(f"Search Error: {e}")
            return {"code": 500, "message": str(e)}

netease_service = NeteaseService()
