from fastapi import APIRouter, HTTPException, Query, Form
from ..services.netease import netease_service
from typing import List, Optional

router = APIRouter()
@router.get("/search")
async def search(keywords: str, limit: int = 10, type: int = 1):
    return await netease_service.search(keywords, limit, type)


@router.get("/playlist/{playlist_id}")
async def get_playlist(playlist_id: str, cookie: Optional[str] = Query(None)):
    data = await netease_service.get_playlist_detail(playlist_id, cookie)
    if data.get("code") != 200:
        raise HTTPException(status_code=400, detail=data.get("message", "Failed to fetch playlist"))
    return data


@router.get("/songs")
async def get_songs(ids: str = Query(...), cookie: Optional[str] = Query(None)):
    id_list = ids.split(",")
    data = await netease_service.get_song_detail(id_list, cookie)
    if data.get("code") != 200:
        raise HTTPException(status_code=400, detail=data.get("message", "Failed to fetch songs"))
    return data

@router.get("/song/url/{song_id}")
async def get_song_url(song_id: str, level: str = "standard", cookie: Optional[str] = Query(None)):
    data = await netease_service.get_song_url(song_id, level, cookie)
    if data.get("code") != 200:
        raise HTTPException(status_code=400, detail=data.get("message", "Failed to fetch song URL"))
    return data

@router.get("/login/qr/key")
async def get_qr_key():
    try:
        print("API: Getting QR key...")
        key = await netease_service.get_qr_key()
        print(f"API: Got QR key: {key}")
        return {"unikey": key}
    except Exception as e:
        print(f"API: QR key error: {e}")
        return {"code": 500, "message": str(e)}

@router.get("/login/qr/image")
async def get_qr_image(key: str):
    try:
        print(f"API: Getting QR image for key: {key}")
        img = await netease_service.get_qr_image(key)
        print(f"API: Got QR image: {img[:50]}...")
        return {"qrimg": img}
    except Exception as e:
        print(f"API: QR image error: {e}")
        return {"code": 500, "message": str(e)}

@router.get("/login/qr/check")
async def check_qr(key: str):
    try:
        print(f"API: Checking QR status for key: {key}")
        result = await netease_service.check_qr_status(key)
        print(f"API: QR check result: {result}")
        return result
    except Exception as e:
        print(f"API: QR check error: {e}")
        return {"code": 500, "message": str(e)}

@router.get("/user/account")
async def get_account(cookie: str = Query(...)):
    return await netease_service.get_account_info(cookie)

@router.get("/user/playlists")
async def get_user_playlists(uid: str, cookie: Optional[str] = Query(None)):
    return await netease_service.get_user_playlists(uid, cookie)

@router.get("/lyric")
async def get_lyrics(id: str, cookie: Optional[str] = Query(None)):
    print(f"API: Fetching lyrics for song ID: {id}")
    data = await netease_service.get_lyrics(id, cookie)
    print(f"API: Lyrics response code: {data.get('code')}")
    print(f"API: Lyrics response keys: {list(data.keys()) if isinstance(data, dict) else 'not dict'}")

    if data.get("code") != 200:
        print(f"API: Lyrics fetch failed: {data.get('message', 'Unknown error')}")
        raise HTTPException(status_code=400, detail=data.get("message", "Failed to fetch lyrics"))
    return data

@router.post("/captcha/sent")
async def send_captcha(phone: str = Form(...), ctcode: Optional[str] = Form(None)):
    data = await netease_service.send_captcha(phone, ctcode)
    if data.get("code") != 200:
        raise HTTPException(status_code=400, detail=data.get("message", "Failed to send captcha"))
    return data

@router.post("/login/cellphone")
async def login_cellphone(phone: str = Form(...), password: Optional[str] = Form(None),
                         captcha: Optional[str] = Form(None), countrycode: Optional[str] = Form(None)):
    if not password and not captcha:
        raise HTTPException(status_code=400, detail="Either password or captcha is required")

    data = await netease_service.login_with_cellphone(phone, password, captcha, countrycode)
    if data.get("code") != 200:
        raise HTTPException(status_code=400, detail=data.get("message", "Login failed"))
    return data

@router.get("/user/detail")
async def get_user_detail(uid: str, cookie: Optional[str] = Query(None)):
    return await netease_service.get_user_detail(uid, cookie)
