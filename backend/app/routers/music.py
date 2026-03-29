from fastapi import APIRouter, HTTPException, Query, Form, Request
from ..services.netease import netease_service
from typing import List, Optional

router = APIRouter()

def _get_real_ip(request: Request) -> Optional[str]:
    """Extract the client's real IP from proxy headers or direct connection."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip
    if request.client:
        return request.client.host
    return None

@router.get("/search")
async def search(request: Request, keywords: str, limit: int = 10, type: int = 1):
    return await netease_service.search(keywords, limit, type, real_ip=_get_real_ip(request))


@router.get("/playlist/{playlist_id}")
async def get_playlist(request: Request, playlist_id: str, cookie: Optional[str] = Query(None)):
    data = await netease_service.get_playlist_detail(playlist_id, cookie, real_ip=_get_real_ip(request))
    if data.get("code") != 200:
        raise HTTPException(status_code=400, detail=data.get("message", "Failed to fetch playlist"))
    return data


@router.get("/songs")
async def get_songs(request: Request, ids: str = Query(...), cookie: Optional[str] = Query(None)):
    id_list = ids.split(",")
    data = await netease_service.get_song_detail(id_list, cookie, real_ip=_get_real_ip(request))
    if data.get("code") != 200:
        raise HTTPException(status_code=400, detail=data.get("message", "Failed to fetch songs"))
    return data

@router.get("/song/url/{song_id}")
async def get_song_url(request: Request, song_id: str, level: str = "standard", cookie: Optional[str] = Query(None)):
    data = await netease_service.get_song_url(song_id, level, cookie, real_ip=_get_real_ip(request))
    if data.get("code") != 200:
        raise HTTPException(status_code=400, detail=data.get("message", "Failed to fetch song URL"))
    return data

@router.get("/login/qr/key")
async def get_qr_key(request: Request):
    try:
        key = await netease_service.get_qr_key(real_ip=_get_real_ip(request))
        return {"unikey": key}
    except Exception as e:
        return {"code": 500, "message": str(e)}

@router.get("/login/qr/image")
async def get_qr_image(request: Request, key: str):
    try:
        img = await netease_service.get_qr_image(key, real_ip=_get_real_ip(request))
        return {"qrimg": img}
    except Exception as e:
        return {"code": 500, "message": str(e)}

@router.get("/login/qr/check")
async def check_qr(request: Request, key: str):
    try:
        result = await netease_service.check_qr_status(key, real_ip=_get_real_ip(request))
        return result
    except Exception as e:
        return {"code": 500, "message": str(e)}

@router.get("/user/account")
async def get_account(request: Request, cookie: str = Query(...)):
    return await netease_service.get_account_info(cookie, real_ip=_get_real_ip(request))

@router.get("/user/playlists")
async def get_user_playlists(request: Request, uid: str, cookie: Optional[str] = Query(None)):
    return await netease_service.get_user_playlists(uid, cookie, real_ip=_get_real_ip(request))

@router.get("/lyric")
async def get_lyrics(request: Request, id: str, cookie: Optional[str] = Query(None)):
    data = await netease_service.get_lyrics(id, cookie, real_ip=_get_real_ip(request))
    if data.get("code") != 200:
        raise HTTPException(status_code=400, detail=data.get("message", "Failed to fetch lyrics"))
    return data

@router.post("/captcha/sent")
async def send_captcha(request: Request, phone: str = Form(...), ctcode: Optional[str] = Form(None)):
    return await netease_service.send_captcha(phone, ctcode, real_ip=_get_real_ip(request))

@router.post("/login/cellphone")
async def login_cellphone(request: Request, phone: str = Form(...), password: Optional[str] = Form(None),
                         captcha: Optional[str] = Form(None), countrycode: Optional[str] = Form(None)):
    if not password and not captcha:
        raise HTTPException(status_code=400, detail="Either password or captcha is required")

    return await netease_service.login_with_cellphone(phone, password, captcha, countrycode, real_ip=_get_real_ip(request))

@router.get("/user/detail")
async def get_user_detail(request: Request, uid: str, cookie: Optional[str] = Query(None)):
    return await netease_service.get_user_detail(uid, cookie, real_ip=_get_real_ip(request))
